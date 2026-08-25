const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.email.user || !env.email.pass) {
    // Dev fallback: no SMTP credentials configured, so we log instead of
    // sending. This keeps register/forgot-password flows fully testable
    // without requiring real email credentials.
    transporter = {
      sendMail: async (opts) => {
        console.log('\n--- DEV EMAIL (no SMTP configured) ---');
        console.log(`To: ${opts.to}`);
        console.log(`Subject: ${opts.subject}`);
        console.log(opts.text || opts.html);
        console.log('--- END DEV EMAIL ---\n');
        return { messageId: 'dev-mode' };
      },
    };
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.pass },
  });
  return transporter;
}

async function sendPasswordResetEmail(to, resetUrl) {
  const t = getTransporter();
  await t.sendMail({
    from: env.email.from,
    to,
    subject: 'Reset your CollabSphere password',
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: `<p>Someone requested a password reset for your CollabSphere account.</p>
           <p><a href="${resetUrl}">Reset your password</a> (expires in 1 hour)</p>
           <p>If you didn't request this, you can safely ignore this email.</p>`,
  });
}

async function sendWelcomeEmail(to, name) {
  const t = getTransporter();
  await t.sendMail({
    from: env.email.from,
    to,
    subject: 'Welcome to CollabSphere',
    text: `Hi ${name}, welcome to CollabSphere! Create a workspace to get started.`,
    html: `<p>Hi ${name},</p><p>Welcome to CollabSphere! Create a workspace to get started.</p>`,
  });
}

async function sendWorkspaceInviteEmail(to, { workspaceName, inviterName, role, inviteUrl }) {
  const t = getTransporter();
  await t.sendMail({
    from: env.email.from,
    to,
    subject: `${inviterName} invited you to join ${workspaceName} on CollabSphere`,
    text: `${inviterName} invited you to join "${workspaceName}" as ${role}.\n\nAccept: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
    html: `<p><strong>${inviterName}</strong> invited you to join <strong>${workspaceName}</strong> on CollabSphere as <strong>${role}</strong>.</p>
           <p><a href="${inviteUrl}">View invitation</a> (expires in 7 days)</p>`,
  });
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail, sendWorkspaceInviteEmail };
