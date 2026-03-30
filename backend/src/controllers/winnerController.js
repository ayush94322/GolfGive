const supabase = require('../../config/supabase');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('../services/emailService');
const multer = require('multer');
const path = require('path');

// ─── Multer config for proof upload ──────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and PDF files are allowed'));
    }
  },
});
exports.uploadMiddleware = upload.single('proof');

// ─── GET MY WINNINGS ──────────────────────────────────────────────────────────
exports.getMyWinnings = async (req, res, next) => {
  try {
    const { data } = await supabase
      .from('winners')
      .select(`
        id, match_type, prize_amount, verification_status, payment_status,
        proof_url, proof_uploaded_at, admin_notes, paid_at, created_at,
        draw:draws(id, title, draw_month, winning_numbers)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    const totalWon = (data || []).reduce((sum, w) => sum + parseFloat(w.prize_amount), 0);
    const pendingPayout = (data || [])
      .filter(w => w.payment_status === 'pending' && w.verification_status === 'approved')
      .reduce((sum, w) => sum + parseFloat(w.prize_amount), 0);

    res.json({ success: true, data: { winnings: data, totalWon, pendingPayout } });
  } catch (err) {
    next(err);
  }
};

// ─── UPLOAD PROOF ─────────────────────────────────────────────────────────────
exports.uploadProof = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) throw new AppError('Proof file is required', 400);

    // Verify this winner belongs to the current user
    const { data: winner } = await supabase
      .from('winners')
      .select('id, user_id, verification_status')
      .eq('id', id)
      .single();

    if (!winner) throw new AppError('Winner record not found', 404);
    if (winner.user_id !== req.user.id) throw new AppError('Forbidden', 403);
    if (winner.verification_status !== 'pending') {
      throw new AppError('Proof already submitted or reviewed', 400);
    }

    // Upload to Supabase Storage
    const supabaseClient = require('../../config/supabase');
    const filename = `proofs/${id}_${Date.now()}${path.extname(req.file.originalname)}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('winner-proofs')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new AppError(`Upload failed: ${uploadError.message}`, 500);

    const { data: { publicUrl } } = supabaseClient.storage
      .from('winner-proofs')
      .getPublicUrl(filename);

    await supabase.from('winners').update({
      proof_url: publicUrl,
      proof_uploaded_at: new Date().toISOString(),
    }).eq('id', id);

    res.json({ success: true, message: 'Proof uploaded. Awaiting admin review.', data: { proof_url: publicUrl } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: LIST ALL WINNERS ──────────────────────────────────────────────────
exports.adminListWinners = async (req, res, next) => {
  try {
    const { verification_status, payment_status, draw_id, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;

    let query = supabase
      .from('winners')
      .select(`
        *,
        user:users(id, email, first_name, last_name),
        draw:draws(id, title, draw_month)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1);

    if (verification_status) query = query.eq('verification_status', verification_status);
    if (payment_status) query = query.eq('payment_status', payment_status);
    if (draw_id) query = query.eq('draw_id', draw_id);

    const { data, count } = await query;
    res.json({ success: true, data: { winners: data, total: count } });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: VERIFY WINNER ─────────────────────────────────────────────────────
exports.adminVerifyWinner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      throw new AppError('action must be approve or reject', 400);
    }

    const { data: winner } = await supabase
      .from('winners')
      .select('*, user:users(email, first_name)')
      .eq('id', id)
      .single();

    if (!winner) throw new AppError('Winner not found', 404);

    const verification_status = action === 'approve' ? 'approved' : 'rejected';

    await supabase.from('winners').update({
      verification_status,
      admin_notes: notes,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id);

    // Notify winner
    await supabase.from('notifications').insert({
      user_id: winner.user_id,
      type: 'winner_alert',
      title: action === 'approve' ? '✅ Proof Approved' : '❌ Proof Rejected',
      body: action === 'approve'
        ? `Your proof has been approved. Your prize of £${winner.prize_amount} will be paid shortly.`
        : `Your proof was rejected. ${notes || 'Please contact support.'}`,
      meta: { winner_id: id },
    });

    await emailService.sendWinnerVerificationUpdate(
      winner.user.email,
      winner.user.first_name,
      action,
      winner.prize_amount,
      notes
    );

    res.json({ success: true, message: `Winner ${action}d` });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN: MARK AS PAID ──────────────────────────────────────────────────────
exports.adminMarkPaid = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: winner } = await supabase
      .from('winners')
      .select('id, user_id, prize_amount, verification_status, payment_status')
      .eq('id', id)
      .single();

    if (!winner) throw new AppError('Winner not found', 404);
    if (winner.verification_status !== 'approved') {
      throw new AppError('Winner must be verified before marking as paid', 400);
    }
    if (winner.payment_status === 'paid') {
      throw new AppError('Already marked as paid', 400);
    }

    await supabase.from('winners').update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    }).eq('id', id);

    await supabase.from('notifications').insert({
      user_id: winner.user_id,
      type: 'winner_alert',
      title: '💰 Prize Paid',
      body: `Your prize of £${winner.prize_amount} has been paid. Check your account!`,
      meta: { winner_id: id },
    });

    res.json({ success: true, message: 'Winner marked as paid' });
  } catch (err) {
    next(err);
  }
};
