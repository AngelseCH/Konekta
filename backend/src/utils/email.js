import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';
import tls from 'node:tls';

const sendThroughSmtp = async (recipient, token) => {
  if (!env.smtpUser || !env.smtpPass) throw new ApiError(503, 'Configura SMTP_USER y SMTP_PASS para habilitar la recuperación por correo.');
  const host = env.smtpHost;
  const socket = tls.connect({ host, port: env.smtpPort, servername: host });
  socket.setTimeout(12000, () => socket.destroy(new Error('SMTP timeout')));
  let buffer = '';
  let lines = [];
  let waiter;
  const rejectWaiter = (error) => { if (waiter) { waiter.reject(error); waiter = null; } };
  socket.on('error', rejectWaiter);
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');
    let end;
    while ((end = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      lines.push(line);
      if (/^\d{3} /.test(line) && waiter) {
        const responseLines = lines;
        lines = [];
        const activeWaiter = waiter;
        waiter = null;
        activeWaiter.resolve({ code: Number(line.slice(0, 3)), text: responseLines.join('\n') });
      }
    }
  });
  const expect = (codes) => new Promise((resolve, reject) => {
    waiter = { resolve: (result) => codes.includes(result.code) ? resolve(result) : reject(new Error(`SMTP ${result.code}: ${result.text}`)), reject };
  });
  const command = async (value, codes) => { const result = expect(codes); socket.write(`${value}\r\n`); return result; };
  const encode = (value) => `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  const base64 = (value) => Buffer.from(value, 'utf8').toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
  try {
    await Promise.all([new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); }), expect([220])]);
    await command('EHLO konekta.app', [250]);
    await command('AUTH LOGIN', [334]);
    await command(Buffer.from(env.smtpUser, 'utf8').toString('base64'), [334]);
    await command(Buffer.from(env.smtpPass.replace(/\s/g, ''), 'utf8').toString('base64'), [235]);
    await command(`MAIL FROM:<${env.smtpUser}>`, [250]);
    await command(`RCPT TO:<${recipient}>`, [250, 251]);
    await command('DATA', [354]);
    const subject = 'Recupera tu contraseña de Konekta';
    const text = `Tu código de recuperación de Konekta es: ${token}. Vence en una hora. Si no solicitaste este cambio, ignora este correo.`;
    const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#30272a"><h1 style="color:#711027">Recupera tu contraseña</h1><p>Usa este código en Konekta para crear una contraseña nueva:</p><p style="padding:16px;background:#f5f0eb;border-radius:8px;font-size:20px;letter-spacing:2px;font-weight:bold">${token}</p><p>El código vence en una hora. Si no solicitaste este cambio, ignora este correo.</p></div>`;
    const boundary = `konekta-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const body = [
      `From: ${encode('Konekta')} <${env.smtpUser}>`, `To: <${recipient}>`, `Subject: ${encode(subject)}`,
      'MIME-Version: 1.0', `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
      `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64(text),
      `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', base64(html),
      `--${boundary}--`, ''
    ].join('\r\n').replace(/(^|\r\n)\./g, '$1..');
    await command(`${body}\r\n.`, [250]);
    await command('QUIT', [221]);
  } catch {
    socket.destroy();
    throw new ApiError(502, 'No se pudo enviar el correo de recuperación. Revisa la configuración SMTP.');
  } finally { socket.end(); }
};

const sendPasswordResetEmail = async (recipient, token) => {
  if (!env.resendApiKey && env.nodeEnv !== 'production') return sendThroughSmtp(recipient, token);
  if (!env.resendApiKey) throw new ApiError(503, 'Configura RESEND_API_KEY y MAIL_FROM en producción para enviar correos.');
  if (!env.resendApiKey || !env.mailFrom) {
    throw new ApiError(503, 'La recuperación por correo todavía no está configurada. Contacta al administrador.');
  }

  let response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.mailFrom,
        to: [recipient],
        subject: 'Recupera tu contraseña de Konekta',
        text: `Tu código de recuperación de Konekta es: ${token}. Vence en una hora. Si no solicitaste este cambio, ignora este correo.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#30272a"><h1 style="color:#711027">Recupera tu contraseña</h1><p>Usa este código en Konekta para crear una contraseña nueva:</p><p style="padding:16px;background:#f5f0eb;border-radius:8px;font-size:20px;letter-spacing:2px;font-weight:bold">${token}</p><p>El código vence en una hora. Si no solicitaste este cambio, ignora este correo.</p></div>`
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new ApiError(502, 'No se pudo contactar al servicio de correo. Inténtalo de nuevo más tarde.');
  }

  if (!response.ok) {
    const providerError = await response.json().catch(() => ({}));
    console.error('[password-reset-email] Resend rejected the request', {
      status: response.status,
      code: providerError.name,
      message: providerError.message
    });
    const status = response.status >= 500 ? 502 : 503;
    throw new ApiError(status, 'No se pudo enviar el correo de recuperación. Revisa la configuración del servicio de correo.');
  }
};

export { sendPasswordResetEmail };
