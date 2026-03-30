const nodemailer = require('nodemailer');
const logger = require('../../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const send = async (to, subject, html) => {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`Email failed to ${to}: ${err.message}`);
  }
};

const baseStyle = `
  font-family: 'Helvetica Neue', sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #0a0a0a;
  color: #f5f5f5;
  border-radius: 12px;
  overflow: hidden;
`;

const btnStyle = `
  display: inline-block;
  padding: 14px 28px;
  background: #4ade80;
  color: #000;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
`;

exports.sendVerificationEmail = async (email, token, name) => {
  const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
  await send(email, 'Verify your Golf Charity account', `
    <div style="${baseStyle}">
      <div style="background:#1a1a1a; padding:32px; text-align:center;">
        <h1 style="color:#4ade80; margin:0;">⛳ Golf Charity Platform</h1>
      </div>
      <div style="padding:32px;">
        <h2>Welcome, ${name}! 👋</h2>
        <p style="color:#aaa; line-height:1.6;">Thanks for joining. Please verify your email address to get started.</p>
        <div style="text-align:center; margin:32px 0;">
          <a href="${url}" style="${btnStyle}">Verify Email</a>
        </div>
        <p style="color:#666; font-size:13px;">This link expires in 24 hours. If you didn't create this account, please ignore this email.</p>
      </div>
    </div>
  `);
};

exports.sendPasswordResetEmail = async (email, token, name) => {
  const url = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
  await send(email, 'Reset your password', `
    <div style="${baseStyle}">
      <div style="background:#1a1a1a; padding:32px; text-align:center;">
        <h1 style="color:#4ade80; margin:0;">⛳ Golf Charity Platform</h1>
      </div>
      <div style="padding:32px;">
        <h2>Password Reset Request</h2>
        <p style="color:#aaa; line-height:1.6;">Hi ${name}, we received a request to reset your password. Click below to create a new one.</p>
        <div style="text-align:center; margin:32px 0;">
          <a href="${url}" style="${btnStyle}">Reset Password</a>
        </div>
        <p style="color:#666; font-size:13px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  `);
};

exports.sendSubscriptionConfirmation = async (email, plan, amount) => {
  if (!email) return;
  await send(email, '🎉 Subscription Confirmed!', `
    <div style="${baseStyle}">
      <div style="background:#1a1a1a; padding:32px; text-align:center;">
        <h1 style="color:#4ade80; margin:0;">⛳ Golf Charity Platform</h1>
      </div>
      <div style="padding:32px;">
        <h2>You're in! 🎉</h2>
        <p style="color:#aaa; line-height:1.6;">Your <strong style="color:#4ade80;">${plan}</strong> subscription is now active. You've been entered into the next monthly draw.</p>
        <div style="background:#1a1a1a; border-radius:8px; padding:20px; margin:24px 0;">
          <p style="margin:0; color:#aaa;">Amount paid: <strong style="color:#f5f5f5;">£${amount}</strong></p>
          <p style="margin:8px 0 0; color:#aaa;">Plan: <strong style="color:#f5f5f5;">${plan}</strong></p>
        </div>
        <p style="color:#aaa; line-height:1.6;">Start entering your golf scores to be eligible for the monthly prize draw.</p>
        <div style="text-align:center; margin:32px 0;">
          <a href="${process.env.CLIENT_URL}/dashboard" style="${btnStyle}">Go to Dashboard</a>
        </div>
      </div>
    </div>
  `);
};

exports.sendWinnerVerificationUpdate = async (email, name, action, amount, notes) => {
  const approved = action === 'approve';
  await send(
    email,
    approved ? '✅ Your proof has been approved!' : '❌ Proof verification update',
    `
    <div style="${baseStyle}">
      <div style="background:#1a1a1a; padding:32px; text-align:center;">
        <h1 style="color:#4ade80; margin:0;">⛳ Golf Charity Platform</h1>
      </div>
      <div style="padding:32px;">
        <h2>${approved ? '🎉 Proof Approved!' : 'Proof Rejected'}</h2>
        <p style="color:#aaa; line-height:1.6;">Hi ${name},</p>
        ${approved
          ? `<p style="color:#aaa; line-height:1.6;">Great news! Your prize verification has been approved. Your prize of <strong style="color:#4ade80;">£${amount}</strong> will be processed shortly.</p>`
          : `<p style="color:#aaa; line-height:1.6;">Unfortunately your proof submission was rejected. ${notes ? `Reason: ${notes}` : 'Please contact support for more information.'}</p>`
        }
        <div style="text-align:center; margin:32px 0;">
          <a href="${process.env.CLIENT_URL}/dashboard/winnings" style="${btnStyle}">View Winnings</a>
        </div>
      </div>
    </div>
  `);
};

exports.sendDrawResultsNotification = async (email, name, winningNumbers, hasWon, matchType, prizeAmount) => {
  await send(email, hasWon ? '🏆 You won the monthly draw!' : 'Monthly Draw Results', `
    <div style="${baseStyle}">
      <div style="background:#1a1a1a; padding:32px; text-align:center;">
        <h1 style="color:#4ade80; margin:0;">⛳ Golf Charity Platform</h1>
      </div>
      <div style="padding:32px;">
        <h2>${hasWon ? `🏆 Congratulations ${name}!` : `Draw Results for ${name}`}</h2>
        <div style="background:#1a1a1a; border-radius:8px; padding:20px; margin:24px 0; text-align:center;">
          <p style="color:#aaa; margin:0 0 12px;">Winning numbers:</p>
          <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
            ${winningNumbers.map(n => `<span style="display:inline-block; width:44px; height:44px; line-height:44px; border-radius:50%; background:#4ade80; color:#000; font-weight:700; font-size:18px; text-align:center;">${n}</span>`).join('')}
          </div>
        </div>
        ${hasWon
          ? `<p style="color:#aaa; line-height:1.6;">You matched <strong style="color:#4ade80;">${matchType?.replace('_', ' ')}</strong> and won <strong style="color:#4ade80;">£${prizeAmount}</strong>! Please upload your proof to claim your prize.</p>`
          : `<p style="color:#aaa; line-height:1.6;">Better luck next time! Keep entering your scores to be in with a chance next month.</p>`
        }
        <div style="text-align:center; margin:32px 0;">
          <a href="${process.env.CLIENT_URL}/dashboard" style="${btnStyle}">Go to Dashboard</a>
        </div>
      </div>
    </div>
  `);
};
