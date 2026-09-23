import { ApiError } from '../utils/ApiError.js';

const canManage = (resourceOwner) => (request, response, next) => {
  if (request.user.role === 'admin' || resourceOwner.toString() === request.user._id.toString()) return next();
  next(new ApiError(403, 'No tienes permisos para modificar este recurso'));
};

export { canManage };
