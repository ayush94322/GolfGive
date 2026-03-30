const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');

// ─── CREATE CHECKOUT SESSION ──────────────────────────────────────────────────
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { plan, charity_id, charity_percentage } = req.body;
    const userId = req.user.id;

    const priceId = plan === 'yearly'
      ? process.env.STRIPE_YEARLY_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

    if (!priceId) throw new AppError('Price configuration missing', 500);

    // Validate charity_percentage
    const charityPct = parseFloat(charity_percentage) || 10;
    if (charityPct < 10 || charityPct > 100) {
      throw new AppError('Charity percentage must be between 10 and 100', 400);
    }

    // Get or create Stripe customer
    let stripeCustomerId;
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_customer_id', 'is', null)
      .limit(1)
      .single();

    if (existingSub?.stripe_customer_id) {
      stripeCustomerId = existingSub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: `${req.user.first_name} ${req.user.last_name}`,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.CLIENT_URL}/subscribe?cancelled=true`,
      metadata: { userId, plan, charity_id: charity_id || '', charity_percentage: String(charityPct) },
      subscription_data: {
        metadata: { userId, plan, charity_id: charity_id || '', charity_percentage: String(charityPct) },
      },
    });

    res.json({ success: true, data: { sessionId: session.id, url: session.url } });
  } catch (err) {
    next(err);
  }
};

// ─── GET USER SUBSCRIPTION ────────────────────────────────────────────────────
exports.getSubscription = async (req, res, next) => {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select(`
        *,
        charity:charities(id, name, logo_url)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    res.json({ success: true, data: { subscription: subscription || null } });
  } catch (err) {
    next(err);
  }
};

// ─── CANCEL SUBSCRIPTION ──────────────────────────────────────────────────────
exports.cancelSubscription = async (req, res, next) => {
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .single();

    if (!sub) throw new AppError('No active subscription found', 404);

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await supabase.from('subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('stripe_subscription_id', sub.stripe_subscription_id);

    res.json({ success: true, message: 'Subscription will cancel at end of billing period' });
  } catch (err) {
    next(err);
  }
};

// ─── UPDATE CHARITY SELECTION ─────────────────────────────────────────────────
exports.updateCharitySelection = async (req, res, next) => {
  try {
    const { charity_id, charity_percentage } = req.body;

    const charityPct = parseFloat(charity_percentage);
    if (charityPct < 10 || charityPct > 100) {
      throw new AppError('Charity percentage must be between 10 and 100', 400);
    }

    // Verify charity exists and is active
    const { data: charity } = await supabase
      .from('charities')
      .select('id')
      .eq('id', charity_id)
      .eq('is_active', true)
      .single();
    if (!charity) throw new AppError('Charity not found or inactive', 404);

    const { error } = await supabase
      .from('subscriptions')
      .update({ charity_id, charity_percentage: charityPct })
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (error) throw new AppError(error.message, 500);

    res.json({ success: true, message: 'Charity selection updated' });
  } catch (err) {
    next(err);
  }
};

// ─── PAYMENT HISTORY ──────────────────────────────────────────────────────────
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const from = (page - 1) * limit;

    const { data, count } = await supabase
      .from('payment_history')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    res.json({ success: true, data: { payments: data, total: count, page: +page, limit: +limit } });
  } catch (err) {
    next(err);
  }
};

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
exports.stripeWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const { userId, plan, charity_id, charity_percentage } = session.metadata;

        const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
        const invoice = await stripe.invoices.retrieve(session.invoice);
        const amountPaid = invoice.amount_paid / 100;

        const charityPct = parseFloat(charity_percentage) || 10;
        const prizePoolPct = parseFloat(process.env.PRIZE_POOL_PERCENTAGE) || 0.50;
        const prizeContribution = amountPaid * prizePoolPct;
        const charityContribution = amountPaid * (charityPct / 100);

        // Upsert subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan,
            status: 'active',
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            stripe_price_id: stripeSubscription.items.data[0].price.id,
            amount_paid: amountPaid,
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            charity_id: charity_id || null,
            charity_percentage: charityPct,
          }, { onConflict: 'stripe_subscription_id' })
          .select('id')
          .single();

        // Record payment
        const { data: payment } = await supabase.from('payment_history').insert({
          subscription_id: sub.id,
          user_id: userId,
          stripe_invoice_id: session.invoice,
          stripe_payment_intent: session.payment_intent,
          amount: amountPaid,
          status: 'paid',
          prize_pool_contribution: prizeContribution,
          charity_contribution: charityContribution,
          paid_at: new Date().toISOString(),
        }).select('id').single();

        // Record charity contribution
        if (charity_id) {
          await supabase.from('charity_contributions').insert({
            user_id: userId,
            charity_id,
            payment_id: payment.id,
            amount: charityContribution,
          });
        }

        await emailService.sendSubscriptionConfirmation(
          req.user?.email,
          plan,
          amountPaid
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (!invoice.subscription) break;

        const stripeSubscription = await stripe.subscriptions.retrieve(invoice.subscription);
        const amountPaid = invoice.amount_paid / 100;

        // Refresh subscription status + dates
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', invoice.subscription);

        break;
      }

      case 'invoice.payment_failed': {
        await supabase
          .from('subscriptions')
          .update({ status: 'lapsed' })
          .eq('stripe_subscription_id', event.data.object.subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('stripe_subscription_id', event.data.object.id);
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: List all subscriptions ───────────────────────────────────────────
exports.adminListSubscriptions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const from = (page - 1) * limit;

    let query = supabase
      .from('subscriptions')
      .select(`*, user:users(id, email, first_name, last_name)`, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, count } = await query;
    res.json({ success: true, data: { subscriptions: data, total: count } });
  } catch (err) {
    next(err);
  }
};
