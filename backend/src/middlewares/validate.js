import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

const validate = (request, response, next) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) return next(new ApiError(422, 'Datos inválidos', errors.array()));
  next();
};

export { validate };
