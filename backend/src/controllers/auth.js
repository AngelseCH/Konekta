import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';

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

const me = asyncHandler(async (request, response) => response.json({ ok: true, data: { user: publicUser(request.user) } }));
const logout = asyncHandler(async (request, response) => response.json({ ok: true, message: 'Sesión cerrada en el cliente' }));

export { register, login, me, logout };
