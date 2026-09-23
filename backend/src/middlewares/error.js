import { env } from '../config/env.js';

const notFound = (request, response) => response.status(404).json({ ok: false, message: `Ruta no encontrada: ${request.method} ${request.originalUrl}` });

const errorHandler = (error, request, response, next) => {
  if (response.headersSent) return next(error);
  const status = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
  const details = error.errors ? Object.values(error.errors).map(({ message }) => message) : error.details;
  response.status(status).json({ ok: false, message: status === 500 && env.nodeEnv === 'production' ? 'Error interno del servidor' : error.message, ...(details ? { details } : {}) });
};

export { notFound, errorHandler };
