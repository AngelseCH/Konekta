const mapCenter = [23.6345, -102.5528];

const hasCoordinates = (point) => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)) && point?.lat !== '' && point?.lng !== '';
const toCoordinates = (point) => [Number(point.lat), Number(point.lng)];

export const mountRideMap = (element, { ride = {}, onPointSelected, onPointMoved } = {}) => {
  if (!element || !window.L) {
    if (element) element.textContent = 'El mapa no está disponible. Revisa tu conexión.';
    return null;
  }

  const leaflet = window.L;
  const origin = { ...(ride.origin || {}) };
  const destination = { ...(ride.destination || {}) };
  const startingPoint = hasCoordinates(origin) ? toCoordinates(origin) : hasCoordinates(destination) ? toCoordinates(destination) : mapCenter;
  const map = leaflet.map(element, { scrollWheelZoom: false }).setView(startingPoint, hasCoordinates(origin) || hasCoordinates(destination) ? 12 : 11);
  leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const markers = {};
  let routeLine;
  let routeRequest = 0;
  let routeController;
  let nextPoint = hasCoordinates(origin) ? 'destination' : 'origin';
  const status = element.parentElement?.querySelector('[data-route-status]');

  const setStatus = (message) => { if (status) status.textContent = message; };
  const updateRoute = async () => {
    const requestId = ++routeRequest;
    routeController?.abort();
    routeLine?.remove();
    if (!hasCoordinates(origin) || !hasCoordinates(destination)) {
      setStatus(onPointSelected ? 'Marca salida y destino en el mapa.' : 'Ruta del viaje');
      return;
    }

    const bounds = leaflet.latLngBounds(toCoordinates(origin), toCoordinates(destination));
    map.fitBounds(bounds.pad(0.18), { maxZoom: 14 });
    setStatus('Calculando ruta…');
    try {
      routeController = new AbortController();
      const path = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`, { signal: routeController.signal });
      const result = await response.json();
      if (requestId !== routeRequest) return;
      if (!response.ok || result.code !== 'Ok' || !result.routes?.[0]) throw new Error('No se encontró una ruta para esos puntos.');
      routeLine = leaflet.geoJSON(result.routes[0].geometry, { style: { color: '#711027', weight: 5, opacity: 0.82 } }).addTo(map);
      const distanceKm = result.routes[0].distance / 1000;
      const durationMinutes = Math.round(result.routes[0].duration / 60);
      setStatus(`${distanceKm.toFixed(1)} km · aproximadamente ${durationMinutes} min en auto`);
    } catch {
      if (requestId === routeRequest) setStatus('No se pudo calcular la ruta. Verifica los puntos seleccionados.');
    }
  };

  const setPoint = (kind, point) => {
    Object.assign(kind === 'origin' ? origin : destination, point);
    const coordinates = toCoordinates(point);
    markers[kind]?.remove();
    const label = kind === 'origin' ? 'A' : 'B';
    const title = kind === 'origin' ? 'Salida' : 'Destino';
    const icon = leaflet.divIcon({
      className: 'ride-pin-wrap',
      html: `<span class="ride-pin ride-pin-${kind}"><span>${label}</span></span>`,
      iconSize: [36, 44],
      iconAnchor: [18, 40]
    });
    markers[kind] = leaflet.marker(coordinates, { icon, draggable: Boolean(onPointSelected), bubblingMouseEvents: false }).addTo(map);
    markers[kind].bindTooltip(title, { direction: 'top', offset: [0, -34] });
    markers[kind].on('dragend', (event) => {
      const moved = event.target.getLatLng();
      Object.assign(kind === 'origin' ? origin : destination, moved);
      onPointMoved?.(kind, moved);
      updateRoute();
    });
    updateRoute();
  };

  if (hasCoordinates(origin)) setPoint('origin', origin);
  if (hasCoordinates(destination)) setPoint('destination', destination);
  if (onPointSelected) map.on('click', (event) => {
    const kind = nextPoint;
    onPointSelected(event.latlng, setPoint, kind);
    nextPoint = kind === 'origin' ? 'destination' : 'origin';
  });
  window.requestAnimationFrame(() => map.invalidateSize());

  return {
    map,
    setPoint,
    selectNextPoint: (kind) => { nextPoint = kind; },
    invalidateSize: () => map.invalidateSize(),
    centerOnUser: () => {
      if (!navigator.geolocation) {
        setStatus('Este dispositivo no permite consultar la ubicación.');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => map.setView([coords.latitude, coords.longitude], 14),
        () => setStatus('No se pudo obtener tu ubicación. Puedes mover el mapa manualmente.'),
        { enableHighAccuracy: false, timeout: 8000 }
      );
    }
  };
};