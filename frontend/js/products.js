import { api } from './api.js';
import { API_ORIGIN } from './config.js';
import { getState } from './store.js';
import { escapeHtml, showToast } from './ui.js';

export const productState = { products: [], categories: [], filters: { search: '', category: '', listingType: '', minPrice: '', maxPrice: '', sort: 'recent', page: 1 }, pagination: {} };
export const loadCategories = async () => { const response = await api.get('/categories'); productState.categories = response.data; return productState.categories; };
export const loadProducts = async () => { const params = new URLSearchParams(Object.entries(productState.filters).filter(([, value]) => value !== '')); const response = await api.get(`/products?${params}`); productState.products = response.data.products || []; productState.pagination = response.data.pagination || {}; return productState.products; };
export const imageUrl = (image) => image ? (image.startsWith('http') ? image : `${API_ORIGIN}${image}`) : './assets/placeholder.svg';
export const imageFallback = (event) => {
  const image = event.currentTarget;
  image.removeEventListener('error', imageFallback);
  image.src = './assets/placeholder.svg';
};
const bindImageFallbacks = (container) => container.querySelectorAll('img[data-image-fallback]').forEach((image) => image.addEventListener('error', imageFallback, { once: true }));
export const rating = (average = 0) => `${'★'.repeat(Math.round(average))}${'☆'.repeat(5 - Math.round(average))}`;
const productGallery = (product) => {
  const images = product.images?.length ? product.images : ['./assets/placeholder.svg'];
  const slides = images.map((image, index) => `<div class="product-image-slide ${index === 0 ? 'is-active' : ''}"><img class="product-image" data-image-fallback src="${imageUrl(image)}" alt="${escapeHtml(product.name)}"></div>`).join('');
  const dots = images.length > 1 ? images.map((_, index) => `<span class="product-gallery-dot ${index === 0 ? 'is-active' : ''}" data-image-index="${index}" data-product-id="${product._id}"></span>`).join('') : '';
  const nav = images.length > 1 ? `<button class="product-gallery-btn prev" type="button" data-direction="prev" data-product-id="${product._id}" aria-label="Anterior">‹</button><button class="product-gallery-btn next" type="button" data-direction="next" data-product-id="${product._id}" aria-label="Siguiente">›</button>` : '';
  return `<div class="product-image-slider" data-product-id="${product._id}" aria-label="Galería de imágenes"><div class="product-image-track">${slides}</div>${nav}<div class="product-gallery-dots">${dots}</div></div>`;
};
export const bindProductGalleries = () => {
  document.querySelectorAll('.product-image-slider').forEach((slider) => {
    const track = slider.querySelector('.product-image-track');
    const slides = [...slider.querySelectorAll('.product-image-slide')];
    if (!track || slides.length <= 1) return;
    let index = 0;
    const render = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      slider.querySelectorAll('.product-gallery-dot').forEach((dot) => dot.classList.toggle('is-active', Number(dot.dataset.imageIndex) === index));
    };
    slider.querySelectorAll('.product-gallery-btn').forEach((button) => button.addEventListener('click', () => {
      const direction = button.dataset.direction === 'next' ? 1 : -1;
      index = (index + direction + slides.length) % slides.length;
      render();
    }));
    slider.querySelectorAll('.product-gallery-dot').forEach((dot) => dot.addEventListener('click', () => {
      index = Number(dot.dataset.imageIndex);
      render();
    }));
    render();
  });
};
export const productCard = (product) => { const favorites = getState().user?.favorites?.map(String) || []; const favorite = favorites.includes(String(product._id)); const typeLabel = product.listingType === 'service' ? 'Servicio' : 'Producto'; return `<article class="product-card"><div class="product-image-wrap">${productGallery(product)}<span class="product-category">${typeLabel} · ${escapeHtml(product.category)}</span><button class="icon-button favorite-button ${favorite ? 'is-favorite' : ''}" data-favorite="${product._id}" aria-label="${favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}">♡</button></div><div class="product-card-body"><h3>${escapeHtml(product.name)}</h3><p class="product-company">${escapeHtml(product.company)}</p><p class="product-description">${escapeHtml(product.desc)}</p><div class="product-meta"><strong>$${Number(product.price).toLocaleString('es-MX')}</strong><span class="rating">${rating(product.rating?.average)} <small>(${product.rating?.count || 0})</small></span></div><div class="product-actions"><a class="btn btn-secondary" href="#/product/${product._id}">Ver detalle</a><button class="btn btn-primary chat-product" data-chat-product="${product._id}">Chatear</button></div></div></article>`; };
export const renderProducts = (container) => { container.innerHTML = productState.products.length ? productState.products.map(productCard).join('') : `<div class="empty-state"><div class="empty-icon">⌕</div><h2>No hay productos</h2><p>Prueba con otra búsqueda o limpia los filtros.</p><button class="btn btn-secondary" data-clear-filters>Limpiar filtros</button></div>`; bindImageFallbacks(container); bindProductGalleries(); };
export const toggleFavorite = async (productId) => { const user = getState().user; if (!user) return showToast('Inicia sesión para guardar favoritos'); const response = await api.post(`/users/${user.id || user._id}/favorites/${productId}`, {}); user.favorites = response.data.favorites; localStorage.setItem('konekta_user', JSON.stringify(user)); showToast('Favoritos actualizados', 'success'); };
