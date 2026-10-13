import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

const sendPasswordResetEmail = async (recipient, token) => {
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
    throw new ApiError(502, 'No se pudo enviar el correo de recuperación. Inténtalo de nuevo más tarde.');
  }
};

export { sendPasswordResetEmail };
