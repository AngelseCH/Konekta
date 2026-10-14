import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const getSender = () => {
  const configuredSender = env.mailFrom.trim();
  const namedSender = configuredSender.match(/^(.*?)\s*<([^<>]+)>$/);
  return namedSender
    ? { name: namedSender[1].replace(/^['"]|['"]$/g, ''), email: namedSender[2].trim() }
    : { email: configuredSender };
};

const sendPasswordResetEmail = async (recipient, token) => {
  if (!env.sendgridApiKey || !env.mailFrom) {
    throw new ApiError(503, 'Configura SENDGRID_API_KEY y MAIL_FROM para habilitar la recuperación por correo.');
  }

  let response;
  try {
    response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient }] }],
        from: getSender(),
        subject: 'Recupera tu contraseña de Konekta',
        content: [
          {
            type: 'text/plain',
            value: `Tu código de recuperación de Konekta es: ${token}. Vence en una hora. Si no solicitaste este cambio, ignora este correo.`
          },
          {
            type: 'text/html',
            value: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#30272a"><h1 style="color:#711027">Recupera tu contraseña</h1><p>Usa este código en Konekta para crear una contraseña nueva:</p><p style="padding:16px;background:#f5f0eb;border-radius:8px;font-size:20px;letter-spacing:2px;font-weight:bold">${token}</p><p>El código vence en una hora. Si no solicitaste este cambio, ignora este correo.</p></div>`
          }
        ]
      }),
      signal: AbortSignal.timeout(10000)
    });
  } catch {
    throw new ApiError(502, 'No se pudo contactar al servicio de correo. Inténtalo de nuevo más tarde.');
  }

  if (!response.ok) {
    const providerError = await response.json().catch(() => ({}));
    console.error('[password-reset-email] SendGrid rejected the request', {
      status: response.status,
      errors: providerError.errors?.map(({ message, field, help }) => ({ message, field, help }))
    });
    throw new ApiError(response.status >= 500 ? 502 : 503, 'SendGrid rechazó el correo. Revisa la clave y la autenticación del remitente.');
  }
};

export { sendPasswordResetEmail };
