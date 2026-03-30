const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');

// ─── LIST CHARITIES (public) ──────────────────────────────────────────────────
exports.listCharities = async (req, res, next) => {
  try {
    const { search, featured, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;

    let query = supabase
      .from('charities')
      .select('id, name, slug, short_bio, logo_url, banner_url, is_featured, total_received', { count: 'exact' })
      .eq('is_active', true)
      .order('is_featured', { ascending: false })
      .order('name', { ascending: true })
      .range(from, from + limit - 1);

    if (search) query = query.ilike('name', `%${search}%`);
    if (featured === 'true') query = query.eq('is_featured', true);

    const { data, count } = await query;
    res.json({ success: true, data: { charities: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── GET SINGLE CHARITY ───────────────────────────────────────────────────────
exports.getCharity = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const { data: charity } = await supabase
      .from('charities')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!charity) throw new AppError('Charity not found', 404);

    const { data: events } = await supabase
      .from('charity_events')
      .select('*')
      .eq('charity_id', charity.id)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5);

    res.json({ success: true, data: { charity, events } });
  } catch (err) {
    next(err);
  }
};

// ─── INDEPENDENT DONATION ─────────────────────────────────────────────────────
exports.donate = async (req, res, next) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { charity_id, amount } = req.body;

    if (amount < 1) throw new AppError('Minimum donation is £1', 400);

    const { data: charity } = await supabase
      .from('charities')
      .select('id, name')
      .eq('id', charity_id)
      .eq('is_active', true)
      .single();
    if (!charity) throw new AppError('Charity not found', 404);

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'gbp',
      metadata: { userId: req.user.id, charity_id, type: 'independent_donation' },
      description: `Independent donation to ${charity.name}`,
    });

    // Record pending contribution (confirmed on webhook)
    await supabase.from('charity_contributions').insert({
      user_id: req.user.id,
      charity_id,
      amount,
      is_independent: true,
      stripe_payment_intent: intent.id,
    });

    res.json({ success: true, data: { clientSecret: intent.client_secret } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: CREATE CHARITY ────────────────────────────────────────────────────
exports.adminCreateCharity = async (req, res, next) => {
  try {
    const { name, slug, description, short_bio, logo_url, banner_url, website_url, is_featured } = req.body;

    const { data, error } = await supabase
      .from('charities')
      .insert({ name, slug, description, short_bio, logo_url, banner_url, website_url, is_featured: !!is_featured })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new AppError('Charity slug already exists', 409);
      throw new AppError(error.message, 500);
    }

    res.status(201).json({ success: true, data: { charity: data } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: UPDATE CHARITY ────────────────────────────────────────────────────
exports.adminUpdateCharity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const fields = ['name', 'description', 'short_bio', 'logo_url', 'banner_url', 'website_url', 'is_featured', 'is_active'];
    const updates = {};
    for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];

    const { data, error } = await supabase
      .from('charities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    if (!data) throw new AppError('Charity not found', 404);

    res.json({ success: true, data: { charity: data } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: DELETE CHARITY ────────────────────────────────────────────────────
exports.adminDeleteCharity = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Soft delete: set inactive
    await supabase.from('charities').update({ is_active: false }).eq('id', id);
    res.json({ success: true, message: 'Charity deactivated' });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: ADD CHARITY EVENT ─────────────────────────────────────────────────
exports.adminAddCharityEvent = async (req, res, next) => {
  try {
    const { charity_id } = req.params;
    const { title, description, event_date, location, image_url } = req.body;

    const { data, error } = await supabase
      .from('charity_events')
      .insert({ charity_id, title, description, event_date, location, image_url })
      .select()
      .single();

    if (error) throw new AppError(error.message, 500);
    res.status(201).json({ success: true, data: { event: data } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: CONTRIBUTION STATS ────────────────────────────────────────────────
exports.adminCharityStats = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('charities')
      .select('id, name, total_received')
      .eq('is_active', true)
      .order('total_received', { ascending: false });

    const total = (data || []).reduce((sum, c) => sum + parseFloat(c.total_received), 0);

    res.json({ success: true, data: { charities: data, grandTotal: parseFloat(total.toFixed(2)) } });
  } catch (err) {
    next(err);
  }
};
