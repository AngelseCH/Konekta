import { api } from './api.js';
import { escapeHtml, showToast } from './ui.js';
import { mountRideMap } from './ride-map.js';

const value = (item, key) => escapeHtml(item?.[key] ?? '');
const days = [['monday', 'Lunes'], ['tuesday', 'Martes'], ['wednesday', 'Miercoles'], ['thursday', 'Jueves'], ['friday', 'Viernes'], ['saturday', 'Sabado'], ['sunday', 'Domingo']];
const productForm = (categories, product = null) => {
  const rideCategory = 'Viajes compartidos';
  const options = [...categories.filter((category) => category.name !== rideCategory).map((category) => `<option value="${escapeHtml(category.name)}" ${product?.category === category.name ? 'selected' : ''}>${escapeHtml(category.name)}</option>`), `<option value="${rideCategory}" ${product?.category === rideCategory ? 'selected' : ''}>${rideCategory}</option>`].join('');
  const schedule = product?.schedule || {};
  const scheduleFields = days.map(([key, label]) => `<label class="form-field"><span>${label}</span><input class="input" name="schedule.${key}" value="${escapeHtml(schedule[key] || '')}" placeholder="9:00 - 18:00"></label>`).join('');
  const ride = product?.ride || {};
  const localDeparture = ride.departureAt ? new Date(new Date(ride.departureAt).getTime() - new Date(ride.departureAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
  const rideFields = `<fieldset class="ride-fields" id="ride-fields" hidden><legend>Ruta del viaje</legend><p class="field-hint">Coloca primero la salida A y después el destino B. También puedes arrastrar los marcadores. Usa puntos públicos de encuentro, no tu domicilio.</p><div class="ride-point-fields"><label class="form-field"><span>Salida A</span><input class="input" name="ride.origin.address" value="${escapeHtml(ride.origin?.address || '')}" placeholder="Ej. Biblioteca central"><button class="btn btn-secondary" type="button" data-route-target="origin">Seleccionar salida A</button><input type="hidden" name="ride.origin.lat" value="${ride.origin?.lat ?? ''}"><input type="hidden" name="ride.origin.lng" value="${ride.origin?.lng ?? ''}"></label><label class="form-field"><span>Destino B / universidad</span><input class="input" name="ride.destination.address" value="${escapeHtml(ride.destination?.address || '')}" placeholder="Ej. Entrada principal de la universidad"><button class="btn btn-secondary" type="button" data-route-target="destination">Seleccionar destino B</button><input type="hidden" name="ride.destination.lat" value="${ride.destination?.lat ?? ''}"><input type="hidden" name="ride.destination.lng" value="${ride.destination?.lng ?? ''}"></label></div><div id="ride-editor-map" class="ride-map" role="application" aria-label="Mapa OpenStreetMap para colocar los marcadores de salida A y destino B"></div><button class="btn btn-ghost" type="button" data-map-location>Centrar mapa en mi ubicación</button><p class="field-hint" data-route-status aria-live="polite">Elige salida A y luego destino B en el mapa.</p><div class="form-grid ride-schedule-fields"><label class="form-field"><span>Fecha y hora de salida</span><input class="input" name="ride.departureAt" type="datetime-local" value="${localDeparture}"></label><label class="form-field"><span>Asientos disponibles</span><input class="input" name="ride.seatsAvailable" type="number" min="1" max="8" value="${ride.seatsAvailable ?? 3}"></label></div></fieldset>`;
  return `<form class="product-form card" id="product-form" data-product-id="${product?._id || ''}" hidden><div class="section-heading"><div><p class="eyebrow">${product ? 'Editar publicacion' : 'Publicar en Konekta'}</p><h2>${product ? 'Actualiza tu publicacion' : 'Nueva publicacion'}</h2></div><button class="btn btn-ghost" id="cancel-product" type="button">Cancelar</button></div><div class="form-grid"><label class="form-field"><span>Tipo</span><select class="input" name="listingType" required><option value="product" ${product?.listingType !== 'service' ? 'selected' : ''}>Producto</option><option value="service" ${product?.listingType === 'service' ? 'selected' : ''}>Servicio</option></select></label><label class="form-field"><span>Estado</span><select class="input" name="isActive"><option value="true" ${product?.isActive !== false ? 'selected' : ''}>Activo y visible</option><option value="false" ${product?.isActive === false ? 'selected' : ''}>Pausado</option></select></label><label class="form-field"><span>Nombre</span><input class="input" name="name" value="${value(product, 'name')}" required minlength="2" maxlength="120"></label><label class="form-field"><span>Empresa o proveedor</span><input class="input" name="company" value="${value(product, 'company')}" required></label><label class="form-field"><span>Categoria</span><select class="input" id="product-category" name="category" required>${options}<option value="__new__">+ Agregar otra categoria</option></select><input class="input category-custom-input" id="product-category-custom" name="categoryCustom" placeholder="Escribe la nueva categoria" hidden></label><label class="form-field"><span data-price-label>Precio</span><input class="input" name="price" type="number" min="0" step="0.01" value="${value(product, 'price')}" required></label><label class="form-field"><span>Telefono de contacto</span><input class="input" name="contactPhone" value="${value(product, 'contactPhone')}" placeholder="Opcional"></label><label class="form-field form-field-wide standard-location-field"><span>Direccion del servicio o punto de atencion</span><input class="input" name="location.address" value="${value(product?.location, 'address')}" placeholder="Calle, colonia, ciudad"></label><label class="form-field standard-location-field"><span>Latitud</span><input class="input" name="location.lat" type="number" step="any" value="${product?.location?.lat ?? ''}"></label><label class="form-field standard-location-field"><span>Longitud</span><input class="input" name="location.lng" type="number" step="any" value="${product?.location?.lng ?? ''}"></label><label class="form-field form-field-wide"><span>Imagenes (maximo 5)</span><div class="image-upload-dropzone"><input class="input" id="product-image" name="images" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple><span class="upload-dropzone-label">Arrastra o selecciona fotos</span></div><small class="field-hint">Opcional. En edicion reemplaza las imagenes.</small></label></div>${rideFields}<fieldset class="schedule-fieldset standard-schedule"><legend>Horario de servicio o atencion</legend><div class="schedule-grid">${scheduleFields}</div></fieldset><div id="image-preview" class="image-preview"></div><label class="form-field"><span>Descripcion</span><textarea class="input" name="desc" minlength="2" required>${value(product, 'desc')}</textarea></label><button class="btn btn-primary" id="save-product" type="submit">${product ? 'Guardar cambios' : 'Publicar'}</button></form>`;
};

export const renderDashboard = async (admin = false) => {
  const stats = (await api.get(`/stats/${admin ? 'admin' : 'seller'}`)).data;
  const products = (await api.get('/products/mine')).data;
  const categories = admin ? [] : (await api.get('/categories')).data;
  let content;
  if (admin) {
    const users = (await api.get('/users')).data;
    const currentUser = JSON.parse(localStorage.getItem('konekta_user') || 'null');
    const currentUserId = String(currentUser?.id || currentUser?._id || '');
    content = `<section class="card admin-moderation"><h2>Publicaciones</h2><p class="muted">Pausa o elimina publicaciones que incumplan las reglas.</p><div class="product-table">${products.length ? products.map((product) => `<div class="table-row admin-product-row ${product.isActive === false ? 'is-paused' : ''}"><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.owner?.name || 'Vendedor')}</span><span>${escapeHtml(product.category)}</span><span>${product.isActive === false ? 'Pausada' : 'Activa'}</span><button class="btn btn-secondary" type="button" data-admin-toggle="${product._id}" data-active="${product.isActive !== false}">${product.isActive === false ? 'Activar' : 'Pausar'}</button><button class="btn btn-ghost" type="button" data-admin-delete="${product._id}">Eliminar</button></div>`).join('') : '<p class="muted">No hay publicaciones.</p>'}</div></section><section class="card admin-moderation"><h2>Usuarios</h2><div class="product-table">${users.length ? users.map((user) => `<div class="table-row admin-user-row"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span><span>${escapeHtml(user.role)}</span>${String(user._id) === currentUserId ? '<span>Tu cuenta</span>' : `<label class="form-field"><span class="sr-only">Rol de ${escapeHtml(user.name)}</span><select class="input" data-admin-role="${user._id}" aria-label="Cambiar rol de ${escapeHtml(user.name)}"><option value="consumidor" ${user.role === 'consumidor' ? 'selected' : ''}>Consumidor</option><option value="vendedor" ${user.role === 'vendedor' ? 'selected' : ''}>Vendedor</option><option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option></select></label>`}</div>`).join('') : '<p class="muted">No hay usuarios.</p>'}</div></section>`;
  } else {
    content = `<div class="card"><div class="table-heading"><h2>Mis publicaciones</h2><button class="btn btn-primary" id="new-product" type="button">+ Nueva publicacion</button></div>${productForm(categories)}<div class="product-table">${products.map((product) => `<div class="table-row ${product.isActive === false ? 'is-paused' : ''}"><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.category)}</span><span>${product.isActive === false ? 'Pausado' : 'Activo'}</span><span>$${product.price}</span><button class="btn btn-ghost edit-product" data-product-id="${product._id}">Editar</button><button class="btn btn-ghost delete-product" data-product-id="${product._id}">Eliminar</button></div>`).join('')}</div></div>`;
  }
  return `<section class="dashboard-page"><div class="page-heading"><p class="eyebrow">${admin ? 'Administracion' : 'Workspace'}</p><h1>${admin ? 'Panel admin' : 'Panel de empresa'}</h1></div><div class="metrics">${Object.entries(stats).map(([key, item]) => `<div class="metric-card"><span>${escapeHtml(key)}</span><strong>${item}</strong></div>`).join('')}</div>${content}</section>`;
};

export const bindDashboard = (onRefresh, admin = false) => {
  if (admin) {
    document.querySelectorAll('[data-admin-toggle]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await api.patch(`/products/${button.dataset.adminToggle}/status`, { isActive: button.dataset.active !== 'true' });
        showToast('Estado de publicación actualizado', 'success');
        await onRefresh();
      } catch (error) { button.disabled = false; showToast(error.message); }
    }));
    document.querySelectorAll('[data-admin-delete]').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta publicación de forma permanente?')) return;
      button.disabled = true;
      try {
        await api.delete(`/products/${button.dataset.adminDelete}`);
        showToast('Publicación eliminada', 'success');
        await onRefresh();
      } catch (error) { button.disabled = false; showToast(error.message); }
    }));
    document.querySelectorAll('[data-admin-role]').forEach((select) => select.addEventListener('change', async () => {
      select.disabled = true;
      try {
        await api.put(`/users/${select.dataset.adminRole}`, { role: select.value });
        showToast('Rol actualizado', 'success');
      } catch (error) { showToast(error.message); await onRefresh(); }
      finally { select.disabled = false; }
    }));
    return;
  }
  let form = document.querySelector('#product-form');
  const bindForm = (current) => {
    let routeMap;
    let activeRoutePoint = 'origin';
    const syncRideFields = () => {
      const category = current.querySelector('#product-category');
      const listingType = current.querySelector('[name="listingType"]');
      const isRide = category.value === 'Viajes compartidos' && listingType.value === 'service';
      const rideFields = current.querySelector('#ride-fields');
      rideFields.hidden = !isRide;
      current.querySelectorAll('.standard-location-field, .standard-schedule').forEach((field) => { field.hidden = isRide; });
      current.querySelector('[data-price-label]').textContent = isRide ? 'Aportacion por pasajero' : 'Precio';
      current.querySelector('[name="ride.origin.address"]').required = isRide;
      current.querySelector('[name="ride.destination.address"]').required = isRide;
      current.querySelector('[name="ride.departureAt"]').required = isRide;
      current.querySelector('[name="ride.seatsAvailable"]').required = isRide;
      current.querySelector('[name="ride.departureAt"]').min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      if (!isRide) return;
      if (!routeMap) {
        const ride = {
          origin: { lat: current.querySelector('[name="ride.origin.lat"]').value, lng: current.querySelector('[name="ride.origin.lng"]').value },
          destination: { lat: current.querySelector('[name="ride.destination.lat"]').value, lng: current.querySelector('[name="ride.destination.lng"]').value }
        };
        routeMap = mountRideMap(current.querySelector('#ride-editor-map'), {
          ride,
          onPointSelected: (coordinates, setPoint, selectedPoint) => {
            const target = selectedPoint || activeRoutePoint;
            activeRoutePoint = target === 'origin' ? 'destination' : 'origin';
            const latitude = coordinates.lat.toFixed(6);
            const longitude = coordinates.lng.toFixed(6);
            current.querySelector(`[name="ride.${target}.lat"]`).value = latitude;
            current.querySelector(`[name="ride.${target}.lng"]`).value = longitude;
            setPoint(target, { lat: latitude, lng: longitude });
            current.querySelectorAll('[data-route-target]').forEach((button) => button.classList.toggle('is-active', button.dataset.routeTarget === activeRoutePoint));
            current.querySelector('[data-route-status]').textContent = `Punto ${target === 'origin' ? 'A (salida)' : 'B (destino)'} marcado. Ahora puedes colocar o arrastrar el marcador ${activeRoutePoint === 'origin' ? 'A' : 'B'}.`;
          },
          onPointMoved: (kind, coordinates) => {
            current.querySelector(`[name="ride.${kind}.lat"]`).value = coordinates.lat.toFixed(6);
            current.querySelector(`[name="ride.${kind}.lng"]`).value = coordinates.lng.toFixed(6);
          }
        });
      }
      window.requestAnimationFrame(() => routeMap?.invalidateSize());
    };
    current.syncRideFields = syncRideFields;
    current.querySelector('#cancel-product')?.addEventListener('click', () => { current.hidden = true; });
    current.querySelector('#product-category')?.addEventListener('change', (event) => {
      const custom = current.querySelector('#product-category-custom');
      custom.hidden = event.target.value !== '__new__';
      custom.required = event.target.value === '__new__';
      if (event.target.value === 'Viajes compartidos') current.querySelector('[name="listingType"]').value = 'service';
      if (!custom.hidden) custom.focus();
      syncRideFields();
    });
    current.querySelector('[name="listingType"]')?.addEventListener('change', (event) => {
      const category = current.querySelector('#product-category');
      if (event.target.value === 'product' && category.value === 'Viajes compartidos') {
        category.value = [...category.options].find((option) => option.value && !['Viajes compartidos', '__new__'].includes(option.value))?.value || '';
      }
      syncRideFields();
    });
    current.querySelectorAll('[data-route-target]').forEach((button) => button.addEventListener('click', () => {
      activeRoutePoint = button.dataset.routeTarget;
      routeMap?.selectNextPoint(activeRoutePoint);
      current.querySelectorAll('[data-route-target]').forEach((item) => item.classList.toggle('is-active', item === button));
      current.querySelector('[data-route-status]').textContent = `Haz clic en el mapa o arrastra el marcador para ajustar ${activeRoutePoint === 'origin' ? 'la salida A' : 'el destino B'}.`;
    }));
    current.querySelector('[data-map-location]')?.addEventListener('click', () => routeMap?.centerOnUser());
    current.querySelector('#product-image')?.addEventListener('change', (event) => {
      const files = [...event.target.files];
      const preview = current.querySelector('#image-preview');
      if (files.length > 5) {
        event.target.value = '';
        preview.innerHTML = '';
        showToast('Puedes subir maximo 5 imagenes');
        return;
      }
      preview.innerHTML = files.map((file) => `<img src="${URL.createObjectURL(file)}" alt="Vista previa">`).join('');
    });
    current.addEventListener('submit', async (event) => {
      event.preventDefault();
      const category = current.querySelector('#product-category');
      const custom = current.querySelector('#product-category-custom');
      if (category.value === '__new__') {
        category.value = custom.value.trim();
        if (!category.value) { showToast('Escribe la nueva categoria'); return; }
      }
      syncRideFields();
      const isRide = category.value === 'Viajes compartidos';
      if (isRide && ['origin', 'destination'].some((point) => ['lat', 'lng'].some((axis) => !current.querySelector(`[name="ride.${point}.${axis}"]`).value))) {
        showToast('Marca la salida y el destino en el mapa antes de publicar.');
        return;
      }
      if (!current.reportValidity()) return;
      const button = current.querySelector('#save-product');
      const id = current.dataset.productId;
      button.disabled = true;
      button.textContent = 'Guardando...';
      try {
        const formData = new FormData(current);
        if (isRide) formData.set('ride.departureAt', new Date(formData.get('ride.departureAt')).toISOString());
        await api.upload(id ? `/products/${id}` : '/products', formData, id ? 'PUT' : 'POST');
        showToast(id ? 'Publicacion actualizada' : 'Publicacion creada', 'success');
        await onRefresh();
      } catch (error) {
        button.disabled = false;
        button.textContent = id ? 'Guardar cambios' : 'Publicar';
        showToast(error.message);
      }
    });
    syncRideFields();
  };
  document.querySelector('#new-product')?.addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) form.syncRideFields?.();
  });
  bindForm(form);
  document.querySelectorAll('.edit-product').forEach((button) => button.addEventListener('click', async () => {
    try {
      const product = (await api.get(`/products/${button.dataset.productId}`)).data;
      const categories = (await api.get('/categories')).data;
      form.outerHTML = productForm(categories, product);
      form = document.querySelector('#product-form');
      form.hidden = false;
      bindForm(form);
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { showToast(error.message); }
  }));
  document.querySelectorAll('.delete-product').forEach((button) => button.addEventListener('click', async () => {
    if (!confirm('¿Eliminar publicacion?')) return;
    try {
      await api.delete(`/products/${button.dataset.productId}`);
      showToast('Publicacion eliminada', 'success');
      await onRefresh();
    } catch (error) { showToast(error.message); }
  }));
};
