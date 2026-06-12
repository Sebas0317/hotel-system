'use strict';

const nodemailer = require('nodemailer');
const logger = require('./logger');
const {
  verificationEmail,
  recoveryEmail,
  twoFactorEmail,
  passwordChangedEmail,
  welcomeEmail,
} = require('./emailTemplates');

let transporter = null;

function getConfig() {
  return {
    host: process.env.EMAIL_HOST || process.env.SMTP_HOST,
    port: parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587'),
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASS || process.env.SMTP_PASS,
    fromName: process.env.EMAIL_FROM_NAME || process.env.SMTP_FROM_NAME || 'EcoBosque Hotel',
    fromAddr: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || process.env.SMTP_USER,
    adminEmail: process.env.ADMIN_EMAIL,
  };
}

function isConfigured() {
  const cfg = getConfig();
  return !!(cfg.host && cfg.user && cfg.pass);
}

function getTransporter() {
  if (transporter) return transporter;
  const cfg = getConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) return null;

  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

async function sendEmail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Email not sent: SMTP not configured');
    return { success: false, reason: 'SMTP not configured' };
  }

  const cfg = getConfig();

  try {
    const info = await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.fromAddr}>`,
      to,
      subject,
      html,
    });
    logger.info({ messageId: info.messageId, to, subject }, 'Email sent');
    return { success: true, messageId: info.messageId };
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    return { success: false, reason: err.message };
  }
}

async function sendVerificationCode(email, code, expiresInMin = 5) {
  return sendEmail({
    to: email,
    subject: 'Verifica tu correo - EcoBosque Hotel',
    html: verificationEmail(code, expiresInMin),
  });
}

async function sendRecoveryCode(email, code, expiresInMin = 10) {
  return sendEmail({
    to: email,
    subject: 'Recuperacion de contrasena - EcoBosque Hotel',
    html: recoveryEmail(code, expiresInMin),
  });
}

async function send2FACode(email, code, expiresInMin = 5) {
  return sendEmail({
    to: email,
    subject: 'Tu codigo de verificacion - EcoBosque Hotel',
    html: twoFactorEmail(code, expiresInMin),
  });
}

async function sendPasswordChanged(email) {
  return sendEmail({
    to: email,
    subject: 'Contrasena actualizada - EcoBosque Hotel',
    html: passwordChangedEmail(),
  });
}

async function sendWelcome(email) {
  return sendEmail({
    to: email,
    subject: 'Bienvenido a EcoBosque Hotel',
    html: welcomeEmail(email),
  });
}

module.exports = {
  sendEmail,
  sendVerificationCode,
  sendRecoveryCode,
  send2FACode,
  sendPasswordChanged,
  sendWelcome,
  isConfigured,
  getConfig,
};
