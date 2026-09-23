import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const authRequired = asyncHandler(async (request, response, next) => {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new ApiError(401, 'Autenticación requerida');
  let payload;
  try { payload = verifyToken(header.slice(7)); } catch { throw new ApiError(401, 'Token inválido o expirado'); }
  const user = await User.findById(payload.id).select('-password');
  if (!user) throw new ApiError(401, 'Usuario no encontrado');
  request.user = user;
  next();
});

const allowRoles = (...roles) => (request, response, next) => {
  if (!roles.includes(request.user.role)) return next(new ApiError(403, 'No tienes permisos para esta acción'));
  next();
};

export { authRequired, allowRoles };
