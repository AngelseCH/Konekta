import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { persistUpload } from '../middlewares/upload.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const listProducts = asyncHandler(async (request, response) => {
  const { category, listingType, search, minPrice, maxPrice, sort = 'recent', page = 1, limit = 12 } = request.query;
  const filter = { isActive: { $ne: false } };
  if (category) filter.category = category;
  if (listingType) filter.listingType = listingType;
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { company: { $regex: search, $options: 'i' } }, { desc: { $regex: search, $options: 'i' } }];
  if (minPrice || maxPrice) filter.price = { ...(minPrice ? { $gte: Number(minPrice) } : {}), ...(maxPrice ? { $lte: Number(maxPrice) } : {}) };
  const sortMap = { recent: { createdAt: -1 }, price_asc: { price: 1 }, price_desc: { price: -1 }, name: { name: 1 } };
  const pageNumber = Number(page); const pageLimit = Number(limit);
  const [items, total] = await Promise.all([Product.find(filter).populate('owner', 'name avatar').sort(sortMap[sort] || sortMap.recent).skip((pageNumber - 1) * pageLimit).limit(pageLimit), Product.countDocuments(filter)]);
  response.json({ ok: true, data: { products: items, pagination: { page: pageNumber, limit: pageLimit, total, pages: Math.ceil(total / pageLimit) } } });
});
const getProduct = asyncHandler(async (request, response) => { const product = await Product.findOne({ _id: request.params.id, isActive: { $ne: false } }).populate('owner', 'name avatar role'); if (!product) throw new ApiError(404, 'Publicación no disponible'); response.json({ ok: true, data: product }); });
const listMine = asyncHandler(async (request, response) => { const filter = request.user.role === 'admin' && request.query.owner ? { owner: request.query.owner } : request.user.role === 'admin' ? {} : { owner: request.user._id }; response.json({ ok: true, data: await Product.find(filter).populate('owner', 'name') }); });
const formDataFields = (body) => ({ location: { address: body['location.address'], lat: body['location.lat'] ? Number(body['location.lat']) : undefined, lng: body['location.lng'] ? Number(body['location.lng']) : undefined }, ride: { origin: { address: body['ride.origin.address'], lat: body['ride.origin.lat'] !== '' && body['ride.origin.lat'] != null ? Number(body['ride.origin.lat']) : undefined, lng: body['ride.origin.lng'] !== '' && body['ride.origin.lng'] != null ? Number(body['ride.origin.lng']) : undefined }, destination: { address: body['ride.destination.address'], lat: body['ride.destination.lat'] !== '' && body['ride.destination.lat'] != null ? Number(body['ride.destination.lat']) : undefined, lng: body['ride.destination.lng'] !== '' && body['ride.destination.lng'] != null ? Number(body['ride.destination.lng']) : undefined }, departureAt: body['ride.departureAt'] || undefined, seatsAvailable: body['ride.seatsAvailable'] ? Number(body['ride.seatsAvailable']) : undefined }, schedule: { monday: body['schedule.monday'] || '', tuesday: body['schedule.tuesday'] || '', wednesday: body['schedule.wednesday'] || '', thursday: body['schedule.thursday'] || '', friday: body['schedule.friday'] || '', saturday: body['schedule.saturday'] || '', sunday: body['schedule.sunday'] || '' } });
const createProduct = asyncHandler(async (request, response) => { const listingType = request.body.listingType === 'service' ? 'service' : 'product'; const categoryName = request.body.category.trim(); await Category.findOneAndUpdate({ name: categoryName }, { $setOnInsert: { name: categoryName, listingType, icon: listingType === 'service' ? 'sparkles' : 'package' } }, { upsert: true, new: true, setDefaultsOnInsert: true }); const uploadedImages = request.files?.length ? await Promise.all(request.files.map((file) => persistUpload(file))) : []; const product = await Product.create({ ...request.body, ...formDataFields(request.body), listingType, category: categoryName, isActive: request.body.isActive !== 'false', price: Number(request.body.price), owner: request.user._id, images: uploadedImages.filter(Boolean) }); response.status(201).json({ ok: true, data: product, message: 'Publicación creada' }); });
const updateProduct = asyncHandler(async (request, response) => { const product = await Product.findById(request.params.id); if (!product) throw new ApiError(404, 'Producto no encontrado'); if (request.user.role !== 'admin' && product.owner.toString() !== request.user._id.toString()) throw new ApiError(403, 'No tienes permisos'); const updates = { ...request.body, ...formDataFields(request.body), isActive: request.body.isActive !== 'false', price: Number(request.body.price) }; if (request.files?.length) updates.images = (await Promise.all(request.files.map((file) => persistUpload(file)))).filter(Boolean); const updated = await Product.findByIdAndUpdate(product._id, updates, { new: true, runValidators: true }); response.json({ ok: true, data: updated, message: 'Publicación actualizada' }); });
const deleteProduct = asyncHandler(async (request, response) => {
  const product = await Product.findById(request.params.id);
  if (!product) throw new ApiError(404, 'Producto no encontrado');
  if (request.user.role !== 'admin' && product.owner.toString() !== request.user._id.toString()) throw new ApiError(403, 'No tienes permisos');
  const conversations = await Conversation.find({ product: product._id }).select('_id');
  const conversationIds = conversations.map(({ _id }) => _id);
  await Promise.all([
    product.deleteOne(),
    Review.deleteMany({ product: product._id }),
    Conversation.deleteMany({ _id: { $in: conversationIds } }),
    Message.deleteMany({ conversation: { $in: conversationIds } }),
    User.updateMany({ favorites: product._id }, { $pull: { favorites: product._id } })
  ]);
  response.json({ ok: true, message: 'Producto eliminado' });
});
const setProductStatus = asyncHandler(async (request, response) => {
  if (typeof request.body.isActive !== 'boolean') throw new ApiError(422, 'Indica si la publicación debe estar activa');
  const product = await Product.findByIdAndUpdate(request.params.id, { isActive: request.body.isActive }, { new: true, runValidators: true });
  if (!product) throw new ApiError(404, 'Publicación no encontrada');
  response.json({ ok: true, data: product, message: request.body.isActive ? 'Publicación activada' : 'Publicación pausada' });
});
export { listProducts, getProduct, listMine, createProduct, updateProduct, deleteProduct, setProductStatus };
