import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const listCategories = asyncHandler(async (request, response) => {
  const catalog = [{ name: 'Electrónica', listingType: 'product' }, { name: 'Hogar', listingType: 'product' }, { name: 'Ropa', listingType: 'product' }, { name: 'Belleza', listingType: 'service' }, { name: 'Lavado', listingType: 'service' }, { name: 'Limpieza', listingType: 'service' }, { name: 'Corte de pelo', listingType: 'service' }, { name: 'Reparaciones', listingType: 'service' }];
  const saved = await Category.find().select('name listingType icon').lean();
  const allCategories = [...catalog, ...saved].filter((item, index, list) => list.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index);
  const categories = await Promise.all(allCategories.map(async (item) => ({ id: item.name, ...item, icon: item.icon || (item.listingType === 'service' ? 'sparkles' : 'package'), productCount: await Product.countDocuments({ category: item.name, listingType: item.listingType }) })));
  response.json({ ok: true, data: categories });
});
export { listCategories };
