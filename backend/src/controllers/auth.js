import crypto from 'crypto';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/email.js';

const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, favorites: user.favorites });

/** Registra consumidores y vendedores desde el endpoint público. */
const register = asyncHandler(async (request, response) => {
  const { name, email, password, role = 'consumidor' } = request.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, 'El email ya está registrado');
  const user = await User.create({ name, email, password, role });
  response.status(201).json({ ok: true, data: { user: publicUser(user), token: signToken(user) }, message: 'Registro exitoso' });
});

/** Autentica con mensaje genérico para no revelar cuentas existentes. */
const login = asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Credenciales inválidas');
  response.json({ ok: true, data: { user: publicUser(user), token: signToken(user) }, message: 'Inicio de sesión exitoso' });
});

const forgotPassword = asyncHandler(async (request, response) => {
  const { email } = request.body;
  const user = await User.findOne({ email });
  if (!user) {
    return response.json({ ok: true, message: 'Si existe una cuenta con ese email, te enviamos un código para recuperar la contraseña.' });
  }

  const token = crypto.randomBytes(16).toString('hex');
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch (error) {
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    throw error;
  }

  response.json({
    ok: true,
    message: 'Si existe una cuenta con ese email, te enviamos un código para recuperar la contraseña.'
  });
});

const resetPassword = asyncHandler(async (request, response) => {
  const { email, token, password } = request.body;
  const user = await User.findOne({ email }).select('+password passwordResetToken passwordResetExpires');
  if (!user || !user.passwordResetToken || !user.passwordResetExpires) {
    throw new ApiError(400, 'El código de recuperación no es válido o ya expiró.');
  }

  if (user.passwordResetExpires.getTime() < Date.now()) {
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    throw new ApiError(400, 'El código de recuperación ha expirado. Solicita uno nuevo.');
  }

  if (user.passwordResetToken !== token) {
    throw new ApiError(400, 'El código de recuperación no coincide.');
  }

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  response.json({ ok: true, message: 'Contraseña actualizada correctamente.' });
});

const me = asyncHandler(async (request, response) => response.json({ ok: true, data: { user: publicUser(request.user) } }));
const logout = asyncHandler(async (request, response) => response.json({ ok: true, message: 'Sesión cerrada en el cliente' }));

export { register, login, me, logout, forgotPassword, resetPassword };
