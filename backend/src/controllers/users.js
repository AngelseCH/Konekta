import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { persistUpload } from '../middlewares/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const listUsers = asyncHandler(async (request, response) => response.json({ ok: true, data: await User.find().select('-password').sort({ createdAt: -1 }) }));
const getUser = asyncHandler(async (request, response) => { if (request.user.role !== 'admin' && request.user._id.toString() !== request.params.id) throw new ApiError(403, 'No tienes permisos'); const user = await User.findById(request.params.id).select('-password'); if (!user) throw new ApiError(404, 'Usuario no encontrado'); response.json({ ok: true, data: user }); });
const updateUser = asyncHandler(async (request, response) => { if (request.user.role !== 'admin' && request.user._id.toString() !== request.params.id) throw new ApiError(403, 'No tienes permisos'); const updates = { ...request.body }; if (request.file) updates.avatar = await persistUpload(request.file); if (updates.password) updates.password = await bcrypt.hash(updates.password, 10); if (request.user.role !== 'admin') delete updates.role; delete updates.avatarFile; const user = await User.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true }).select('-password'); response.json({ ok: true, data: user }); });
const deleteUser = asyncHandler(async (request, response) => { if (request.user.role !== 'admin' && request.user._id.toString() !== request.params.id) throw new ApiError(403, 'No tienes permisos'); await User.findByIdAndDelete(request.params.id); response.json({ ok: true, message: 'Usuario eliminado' }); });
const toggleFavorite = asyncHandler(async (request, response) => { const user = await User.findById(request.params.id); if (!user || (request.user.role !== 'admin' && user._id.toString() !== request.user._id.toString())) throw new ApiError(403, 'No tienes permisos'); const index = user.favorites.findIndex((id) => id.toString() === request.params.productId); if (index >= 0) user.favorites.splice(index, 1); else user.favorites.push(request.params.productId); await user.save(); response.json({ ok: true, data: { favorites: user.favorites } }); });
export { listUsers, getUser, updateUser, deleteUser, toggleFavorite };
