'use strict';

const BASE_STYLE = `
  body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Segoe UI', Arial, sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 32px 24px; }
  .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #166534, #22c55e); padding: 32px 24px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; }
  .header p { color: #bbf7d0; margin: 4px 0 0; font-size: 14px; }
  .body { padding: 32px 24px; }
  .body h2 { color: #1a1a1a; font-size: 18px; margin: 0 0 12px; }
  .body p { color: #555; font-size: 14px; line-height: 1.6; margin: 0 0 16px; }
  .code-box { text-align: center; margin: 28px 0; }
  .code-box span { display: inline-block; font-size: 36px; font-weight: 700; letter-spacing: 8px;
    color: #166534; background: #f0fdf4; padding: 16px 28px; border-radius: 8px;
    font-family: 'Courier New', monospace; }
  .footer { padding: 20px 24px; background: #f9fafb; text-align: center; }
  .footer p { color: #999; font-size: 11px; margin: 4px 0; }
  .btn { display: inline-block; padding: 12px 28px; border-radius: 8px; text-decoration: none;
    font-size: 14px; font-weight: 600; }
  .btn-primary { background: #166534; color: #ffffff; }
  .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
  .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px;
    color: #991b1b; font-size: 13px; margin: 16px 0; }
  @media only screen and (max-width: 480px) {
    .container { padding: 16px 12px; }
    .code-box span { font-size: 28px; letter-spacing: 4px; padding: 12px 16px; }
  }
`;

function wrap(title, content) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - EcoBosque Hotel</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
<div class="container" style="max-width:560px;margin:0 auto;padding:32px 24px;">
<div class="card" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
<div class="header" style="background:linear-gradient(135deg,#166534,#22c55e);padding:32px 24px;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:1px;">🌿 EcoBosque</h1>
<p style="color:#bbf7d0;margin:4px 0 0;font-size:14px;">Hotel Boutique — Doradal, Colombia</p>
</div>
<div class="body" style="padding:32px 24px;">
${content}
</div>
<div class="footer" style="padding:20px 24px;background:#f9fafb;text-align:center;">
<p style="color:#999;font-size:11px;margin:4px 0;">EcoBosque Hotel Boutique</p>
<p style="color:#999;font-size:11px;margin:4px 0;">Doradal, Antioquia — Colombia</p>
<p style="color:#999;font-size:11px;margin:4px 0;">Este es un mensaje automatico, no responder.</p>
</div>
</div>
</div>
</body>
</html>`;
}

function verificationEmail(code, expiresInMin = 5) {
  return wrap('Verifica tu correo', `
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">Verifica tu direccion de correo</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Gracias por registrarte en EcoBosque Hotel. Usa el siguiente codigo para verificar tu direccion de correo electronico:
    </p>
    <div class="code-box" style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#166534;background:#f0fdf4;padding:16px 28px;border-radius:8px;font-family:'Courier New',monospace;">${code}</span>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Este codigo expira en <strong>${expiresInMin} minutos</strong>.
    </p>
    <p style="color:#999;font-size:12px;margin:16px 0 0;">
      Si no creaste una cuenta, ignora este mensaje.
    </p>
  `);
}

function recoveryEmail(code, expiresInMin = 10) {
  return wrap('Recuperacion de contrasena', `
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">Recuperacion de contrasena</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Has solicitado restablecer tu contrasena de administrador. Ingresa el siguiente codigo para continuar:
    </p>
    <div class="code-box" style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#166534;background:#f0fdf4;padding:16px 28px;border-radius:8px;font-family:'Courier New',monospace;">${code}</span>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Este codigo expira en <strong>${expiresInMin} minutos</strong>.
    </p>
    <div class="alert" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;color:#991b1b;font-size:13px;margin:16px 0;">
      Si no solicitaste este cambio, ignora este mensaje y tu contrasena seguira siendo la misma.
    </div>
  `);
}

function twoFactorEmail(code, expiresInMin = 5) {
  return wrap('Codigo de verificacion 2FA', `
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">Codigo de verificacion</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Se ha iniciado sesion en tu cuenta de administrador. Ingresa el siguiente codigo para completar el acceso:
    </p>
    <div class="code-box" style="text-align:center;margin:28px 0;">
      <span style="display:inline-block;font-size:36px;font-weight:700;letter-spacing:8px;color:#166534;background:#f0fdf4;padding:16px 28px;border-radius:8px;font-family:'Courier New',monospace;">${code}</span>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Este codigo expira en <strong>${expiresInMin} minutos</strong>. Si no fuiste tu, ignora este mensaje.
    </p>
    <p style="color:#999;font-size:12px;margin:16px 0 0;">
      Por seguridad, no compartas este codigo con nadie.
    </p>
  `);
}

function passwordChangedEmail() {
  return wrap('Contrasena actualizada', `
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">Contrasena actualizada exitosamente</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Te confirmamos que tu contrasena de administrador ha sido cambiada exitosamente.
    </p>
    <div class="alert" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;color:#166534;font-size:13px;margin:16px 0;">
      Si realizaste este cambio, no necesitas hacer nada mas. Si no lo hiciste, contacta al soporte del sistema inmediatamente.
    </div>
  `);
}

function welcomeEmail(email) {
  return wrap('Bienvenido a EcoBosque', `
    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">Bienvenido al panel de administracion</h2>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      La cuenta de administrador ha sido registrada con el correo <strong>${email}</strong>.
    </p>
    <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 16px;">
      Ya puedes iniciar sesion y gestionar el hotel. Te recomendamos activar la verificacion en dos pasos (2FA) para mayor seguridad.
    </p>
  `);
}

module.exports = { verificationEmail, recoveryEmail, twoFactorEmail, passwordChangedEmail, welcomeEmail };
