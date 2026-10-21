# Práctica: integración de una API remota en la PWA existente

## 1. Contexto del proyecto analizado

El proyecto es una SPA PWA vanilla, sin framework, con módulos ES import/export y un backend propio en Node.js/Express. La estructura actual confirma que la app ya tiene una arquitectura frontal modular y un modelo de almacenamiento local para sesión:

- Entrypoint principal: [frontend/index.html](../frontend/index.html)
- Lógica principal de la app: [frontend/js/app.js](../frontend/js/app.js)
- Configuración de la API local: [frontend/js/config.js](../frontend/js/config.js)
- Estado global y sesión: [frontend/js/store.js](../frontend/js/store.js)
- Cliente HTTP centralizado: [frontend/js/api.js](../frontend/js/api.js)
- PWA / manifest / service worker: [frontend/manifest.webmanifest](../frontend/manifest.webmanifest), [frontend/sw.js](../frontend/sw.js)
- Mapa y rutas: [frontend/js/ride-map.js](../frontend/js/ride-map.js)

### Stack detectado

- Framework: Vanilla JavaScript
- Arquitectura: SPA modular con módulos ES6
- Gestor de estado: almacenamiento local en `localStorage` + módulo `store.js`
- Service worker: manual, con caché de shell y estrategia básica para assets estáticos
- Manifest: PWA con `standalone`, iconos y configuración de inicio

## 2. API real que ya usa el proyecto

Se eligió la API pública de OSRM (Open Source Routing Machine), porque la app ya la consume para calcular rutas en el mapa de viajes compartidos.

### Datos de la API

- Nombre: OSRM Routing API
- URL base: `https://router.project-osrm.org`
- Endpoint: `/route/v1/driving/{coordinates}?overview=full&geometries=geojson`
- Método: `GET`
- Parámetros:
  - `coordinates`: cadena de coordenadas `lng,lat;lng,lat`
  - `overview=full`
  - `geometries=geojson`
- Autenticación: ninguna
- Headers requeridos: ninguno para la llamada pública
- Uso real en la app: cálculo de ruta entre origen y destino en el mapa de viajes compartidos

Ejemplo de llamada que ya usa la app:

```js
const path = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`);
const result = await response.json();
```

## 3. Qué hace esta API en la app

La API se usa para calcular y mostrar la ruta del viaje en el módulo [frontend/js/ride-map.js](../frontend/js/ride-map.js), dentro de la experiencia de viajes compartidos. El flujo es:

1. El usuario visualiza origen y destino del viaje.
2. El mapa valida que ambos puntos tengan coordenadas.
3. La app arma una URL con las coordenadas.
4. La API responde con una ruta, distancia y duración estimada.
5. La app dibuja la ruta en el mapa con Leaflet.

Esto encaja perfectamente con la PWA porque la llamada es una petición remota con datos geográficos y la app ya maneja estados de carga y mensajes de error de forma visual.

## 4. Estructura recomendada para una integración limpia

Aunque no se conectó nada en este documento, la práctica correcta en una PWA como esta sería respetar la separación que ya usa el proyecto:

### Capa 1: cliente HTTP centralizado

La idea sería crear un módulo de cliente con:

- `baseURL` configurable
- `timeout` con `AbortController`
- headers por defecto
- manejo único de `fetch`
- transformación de errores a clases personalizadas

Ejemplo conceptual:

```js
export class NetworkError extends Error {}
export class TimeoutError extends Error {}
export class ServerError extends Error {}
export class NotFoundError extends Error {}
export class InvalidResponseError extends Error {}
export class AuthError extends Error {}
```

### Capa 2: modelos / DTOs

Se deberían definir modelos para representar la respuesta real de la API, por ejemplo:

```js
export class RouteResponse {
  constructor({ code, routes = [] }) {
    this.code = code;
    this.routes = routes.map((route) => ({
      distance: route.distance,
      duration: route.duration,
      geometry: route.geometry
    }));
  }
}
```

Y luego un mapper:

```js
export const routeFromJson = (json) => {
  if (!json || json.code !== 'Ok' || !Array.isArray(json.routes)) {
    throw new InvalidResponseError('La respuesta de la ruta no tiene el formato esperado.');
  }

  return new RouteResponse(json);
};
```

### Capa 3: servicio / repositorio

Encapsula la petición y el procesamiento:

```js
export const getRoute = async ({ origin, destination, signal }) => {
  const url = `${ROUTE_API_BASE}/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  const response = await remoteClient.get(url, { signal });
  return routeFromJson(response);
};
```

### Capa 4: integración con la vista

En esta app, la vista natural es el módulo [frontend/js/ride-map.js](../frontend/js/ride-map.js), porque es donde se muestra el mapa y la ruta. El patrón correcto sería:

- cargar el estado de la ruta
- mostrar loader / texto “Calculando ruta…”
- en éxito, renderizar la línea en el mapa
- en vacío, mostrar mensaje amigable
- en error, mostrar toast o estado visual con botón “Reintentar”

## 5. Manejo de errores requerido

La práctica debe centralizar los errores para que el usuario vea mensajes claros en la interfaz, sin mostrar JSON en consola solamente.

### Casos a cubrir

- Sin conexión: `navigator.onLine === false` o fallo de `fetch`
- Error del servidor: `5xx`
- Recurso no encontrado: `404`
- Respuesta inválida: estructura inesperada
- Timeout agotado: `AbortController`
- Error de autenticación: `401 / 403`

### Mensajes sugeridos

- Sin conexión: “Parece que no hay conexión a internet. Revisa tu red e inténtalo de nuevo.”
- 5xx: “El servicio de rutas no está disponible en este momento.”
- 404: “No se encontró la ruta solicitada.”
- Timeout: “La solicitud tardó demasiado. Inténtalo otra vez.”
- Respuesta inválida: “La respuesta del servicio no es válida.”
- 401/403: “Tu sesión o permisos no son válidos para esta consulta.”

## 6. Service worker y caché para esta API

La estrategia más segura para la PWA actual es no romper el shell y dejar las llamadas remotas en una estrategia de caché sensible:

### Recomendación

- Assets estáticos: cache-first
- Navegación: network-first con fallback al HTML
- API remota: network-first con fallback a caché

Esto ya es consistente con el patrón presente en [frontend/sw.js](../frontend/sw.js), que usa caché para assets estáticos y fallback para navegación. Para la API de rutas, el `fetch` del servicio remoto debería contemplar una capa adicional:

```js
if (request.url.includes('router.project-osrm.org')) {
  return caches.match(request).then((cached) => {
    return fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open('routes-cache').then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => cached || Response.error());
  });
}
```

### Aviso al usuario

Cuando la PWA muestre datos desde caché, hay que avisar de forma amable:

- “Se está mostrando una versión reciente del mapa. Verifica la conexión si necesitas la ruta más actual.”

Esto ayuda a mantener la UX clara sin ocultar que se está usando una copia local.

## 7. Flujo real de la app donde encaja esta práctica

La integración no debería ir a una página aislada; debe hacerse dentro del flujo real de la aplicación. En este proyecto, el punto ideal es:

- usuario entra a la app
- accede a la sección de viajes compartidos
- selecciona origen/destino
- la app consulta la API de rutas
- el mapa dibuja la ruta
- muestra estado de carga, éxito, vacíos y errores

Eso se corresponde directamente con el módulo [frontend/js/ride-map.js](../frontend/js/ride-map.js) y la lógica de presentación de [frontend/js/app.js](../frontend/js/app.js).

## 8. Recomendación final de implementación

Para una práctica de nivel profesional en esta PWA, la estructura ideal sería:

1. Mantener el mismo patrón de módulos vanilla.
2. Reutilizar `localStorage` y `store.js` como sesión.
3. No tocar el manifest ni el service worker base salvo agregar la estrategia de caché para la API remota.
4. Centralizar errores en una clase base y un mapper de respuesta.
5. Hacer visible la información en el mapa y en texto, no solo en consola.

## 9. Cómo simular errores en Chrome DevTools

Aunque esta práctica no se conecta a producción, la forma correcta de probarla en Chrome es:

### A) Sin conexión

- Open DevTools > Network > Online/Offline
- selecciona “Offline”
- recarga la pantalla y comprueba el estado visual

### B) Throttling

- Network > Slow 3G o Fast 3G
- observa el estado de carga / spinner y timeout

### C) Error de servidor

- Network > bloquea la URL de OSRM o cambia el endpoint a uno inexistente
- revisa mensaje “El servicio no está disponible”

### D) 404 o respuesta inválida

- Mock response con JSON no esperado
- cambia el body para que no contenga `code` o `routes`

### E) Timeout

- en Network > Throttling, usa Slow 3G + ctrl+shift+p > “Emulate network conditions” si es necesario
- con `AbortController`, fuerza una demora artificial para verificar el tiempo de espera

### F) Cache fallback

- desactiva la conexión, recarga una vez y revisa si el servicio muestra el aviso de datos en caché

## 10. Mensaje de commit sugerido

```bash
git commit -m "feat: integración de API remota"
```

## 11. Conclusión

La práctica más real para este proyecto no es inventar una API ajena, sino documentar la integración que ya usa la PWA: la API de rutas de OSRM. Eso permite demostrar arquitectura, manejo de errores, caché PWA y experiencia de usuario sin romper la base existente.

## 12. Inventario completo de APIs y servicios del proyecto

Esta sección amplía la práctica para incluir las APIs y servicios identificados en el código. Se separan las APIs HTTP, la comunicación en tiempo real y los servicios que son infraestructura o recursos externos, pero no APIs REST.

### 12.1 API REST propia de Konekta

La app consume su backend Express mediante Fetch. En desarrollo, la base suele ser `http://localhost:4000/api`; en producción frontend y backend se sirven desde el mismo dominio. El frontend independiente en el puerto `5500` dirige las llamadas a `http://localhost:4000`.

Las rutas protegidas requieren `Authorization: Bearer <JWT>`. Las peticiones JSON usan `Content-Type: application/json`; las cargas de imagen usan `multipart/form-data`. Las respuestas siguen el formato habitual `{ "ok": true, "data": ... }`; los errores contienen `ok: false` y un mensaje.

| Método | Endpoint | Acceso y propósito |
|---|---|---|
| GET | `/health` | Público; estado del servicio. |
| POST | `/api/auth/register` | Público; registrar usuario. |
| POST | `/api/auth/login` | Público; iniciar sesión, limitado por intentos. |
| POST | `/api/auth/forgot-password` | Público; solicitar código de recuperación. |
| POST | `/api/auth/reset-password` | Público; cambiar contraseña con código. |
| GET | `/api/auth/me` | Autenticado; consultar sesión/usuario actual. |
| POST | `/api/auth/logout` | Autenticado; cerrar sesión en el cliente/API. |
| GET | `/api/categories` | Público; listar categorías. |
| GET | `/api/products` | Público; listar, buscar, filtrar y paginar publicaciones. |
| GET | `/api/products/mine` | Vendedor/admin; listar publicaciones propias. |
| POST | `/api/products` | Vendedor/admin; crear publicación; admite hasta cinco imágenes. |
| GET | `/api/products/:id` | Público; consultar detalle. |
| PUT | `/api/products/:id` | Autenticado y sujeto a autorización; editar publicación; admite imágenes. |
| DELETE | `/api/products/:id` | Autenticado y sujeto a autorización; eliminar publicación. |
| PATCH | `/api/products/:id/status` | Admin; cambiar estado de una publicación. |
| GET | `/api/products/:productId/reviews` | Público; listar reseñas. |
| POST | `/api/products/:productId/reviews` | Autenticado; crear reseña. |
| DELETE | `/api/products/:productId/reviews/:id` | Autor/admin; eliminar reseña. |
| GET | `/api/users` | Admin; listar usuarios. |
| GET | `/api/users/:id` | Autenticado; consultar perfil. |
| PUT | `/api/users/:id` | Autenticado y sujeto a autorización; actualizar perfil y avatar. |
| DELETE | `/api/users/:id` | Autenticado y sujeto a autorización; eliminar usuario. |
| POST | `/api/users/:id/favorites/:productId` | Autenticado; alternar favorito. |
| GET | `/api/chat/conversations` | Autenticado; listar conversaciones. |
| POST | `/api/chat/conversations` | Autenticado; iniciar conversación. |
| GET | `/api/chat/conversations/:id` | Participante; consultar mensajes. |
| POST | `/api/chat/conversations/:id/messages` | Participante; enviar texto o imagen. |
| DELETE | `/api/chat/conversations/:id` | Participante; eliminar conversación. |
| DELETE | `/api/chat/messages/:messageId` | Autenticado, sujeto a autorización; eliminar mensaje. |
| GET | `/api/stats/seller` | Vendedor/admin; obtener estadísticas del vendedor. |
| GET | `/api/stats/admin` | Admin; obtener estadísticas administrativas. |

Los identificadores `:id`, `:productId` y `:messageId` se sustituyen por sus valores. Los permisos se comprueban en backend; ocultar una opción en la interfaz no sustituye la autorización del servidor.

### 12.2 Socket.IO para chat en tiempo real

Además de REST, el chat usa Socket.IO conectado al mismo origen del backend, configurado desde `SOCKET_URL`. La autenticación se realiza en el handshake con el JWT: `{ auth: { token } }`. El servidor valida el token y limita la entrada a conversaciones de las que el usuario sea participante.

| Evento | Dirección | Datos / comportamiento |
|---|---|---|
| `conversation:join` | Cliente → servidor | `{ conversationId }`; solicita unirse a la sala de la conversación si es participante. |
| `message:send` | Cliente → servidor | `{ conversationId, text }`; guarda el mensaje y lo distribuye a la sala. |
| `message:new` | Servidor → sala | Mensaje nuevo con información del emisor. |
| `message:read` | Cliente → servidor y servidor → sala | `{ conversationId, messageId }`; marca como leído y notifica. |
| `user:typing` | Cliente → servidor y servidor → sala | `{ conversationId }`; avisa a los demás participantes que alguien está escribiendo. |

Las imágenes se envían por el endpoint REST de mensajes como carga multipart, no mediante el evento Socket.IO de texto.

### 12.3 OSRM Routing API

- URL base: `https://router.project-osrm.org`
- Endpoint: `/route/v1/driving/{lng1},{lat1};{lng2},{lat2}`
- Método: `GET`
- Parámetros usados: `overview=full` y `geometries=geojson`
- Autenticación: ninguna
- Uso: calcular una ruta entre origen y destino; la app dibuja `routes[0].geometry` con Leaflet y presenta distancia y duración.
- Código consumidor: [frontend/js/ride-map.js](../frontend/js/ride-map.js)

La respuesta válida de OSRM incluye `code: "Ok"` y una lista `routes`; cada ruta puede incluir `distance` en metros, `duration` en segundos y `geometry` GeoJSON. OSRM puede responder con un código propio distinto de `Ok` aunque la petición HTTP sea exitosa. El servidor público de demostración no ofrece SLA y no debe tratarse como servicio de producción garantizado.

### 12.4 OpenStreetMap tile service

- URL de mosaicos: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`
- Tipo: servicio de teselas de mapa, no una API de rutas ni geocodificación.
- Uso: Leaflet descarga las imágenes de mapa que componen el fondo cartográfico.
- Atribución mostrada por la app: `© OpenStreetMap contributors`.
- Clave: no requiere API key.

El servicio comunitario de tiles es best effort. Deben respetarse su política de uso, atribución y caché; no se debe asumir un SLA ni usarlo para cargas intensivas sin revisar las condiciones vigentes.

### 12.5 SendGrid Mail Send API

- URL: `https://api.sendgrid.com/v3/mail/send`
- Método: `POST`
- Autenticación: `Authorization: Bearer <SENDGRID_API_KEY>`; la clave se mantiene en backend.
- Headers: `Content-Type: application/json`.
- Uso: enviar el código de recuperación de contraseña al correo de destino.
- Configuración: `SENDGRID_API_KEY` y `MAIL_FROM`.
- Código consumidor: [backend/src/utils/email.js](../backend/src/utils/email.js)

El backend envía destinatario, remitente, asunto y contenido de texto/HTML. El remitente debe estar validado/autenticado en SendGrid y la API key debe tener permiso de envío de correo. No se envía SMS de Konekta a usuarios mediante este servicio.

### 12.6 Cloudinary

- Servicio: almacenamiento y entrega de imágenes.
- Integración: SDK oficial de Node (`cloudinary`), que usa la API de carga de Cloudinary desde el backend.
- Uso: subir imágenes de publicaciones, perfiles y mensajes que admiten archivos.
- Configuración: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y opcionalmente `CLOUDINARY_FOLDER`.
- Código consumidor: [backend/src/config/cloudinary.js](../backend/src/config/cloudinary.js) y [backend/src/middlewares/upload.js](../backend/src/middlewares/upload.js).

Las credenciales privadas nunca deben ponerse en el frontend. Las URL de entrega de imágenes suelen servirse desde `https://res.cloudinary.com`; el navegador recibe la URL, pero la carga autenticada se realiza en backend.

### 12.7 Google Maps URLs

- URL construida por la app: `https://www.google.com/maps/search/?api=1&query=...`
- Tipo: enlace de navegación abierto por el usuario, no una llamada a Google Maps Platform API.
- Uso: abrir una búsqueda de ubicación en Google Maps desde una publicación.
- Clave: no requiere API key para este formato de URL.

El proyecto no utiliza aquí geocoding, cálculo de rutas ni Maps JavaScript API de Google.

## 13. Servicios y dependencias externas que no son APIs de datos

| Servicio/recurso | Uso real | Clasificación |
|---|---|---|
| MongoDB Atlas / MongoDB | Persistencia de usuarios, publicaciones, mensajes, reseñas y categorías mediante Mongoose. | Base de datos y protocolo de base de datos; no API HTTP consumida por el navegador. |
| Render | Alojamiento del frontend, backend y Socket.IO. | Plataforma de hosting/despliegue; no API de negocio consumida por la PWA. |
| Leaflet 1.9.4 en unpkg | Biblioteca de mapas cargada desde CDN. | Biblioteca JavaScript; no servicio de datos. |
| Google Fonts | Descarga de las familias DM Sans y Space Grotesk mediante CSS. | Servicio de fuentes; no API de negocio. |
| Node.js / Express | Ejecutan y exponen la API REST propia de Konekta. | Runtime y framework backend. |

## 14. Seguridad, CORS y disponibilidad

- Las integraciones remotas del navegador deben usar HTTPS en producción, requisito para que funcionen correctamente en la PWA instalada y para mantener contenido seguro.
- No colocar `SENDGRID_API_KEY`, secretos de Cloudinary, contraseñas de base de datos ni tokens privados en JavaScript cliente. Si una API requiere secreto, la llamada debe pasar por el backend propio.
- El backend configura CORS desde `FRONTEND_URL`. Si el navegador reporta un error CORS, el origen de la PWA debe autorizarse en el servidor proveedor o se debe usar un proxy backend permitido; no se debe desactivar la política del navegador.
- El Content Security Policy del backend permite explícitamente los orígenes externos que usa la app: OSRM, unpkg, Google Fonts, Cloudinary y OpenStreetMap tiles. Si se agrega un host, hay que revisar y ajustar la directiva correspondiente de forma explícita.
- MongoDB Atlas y Render deben tener reglas de red y secretos configurados correctamente. El archivo de entorno local no se debe publicar.
- OSRM público y OpenStreetMap tiles comunitarios no son servicios con disponibilidad garantizada. Para uso comercial o tráfico alto, revisar sus políticas y evaluar un proveedor con SLA.

## 15. Alcance de esta documentación

Este inventario describe integraciones encontradas en el código y no modifica ni añade conexiones. La API REST `/api/...` es propiedad de Konekta; las APIs externas usadas para funciones remotas son OSRM, SendGrid y Cloudinary, además del servicio de teselas de OpenStreetMap. Socket.IO proporciona el canal en tiempo real. MongoDB, Render, Leaflet, Google Fonts y Google Maps URLs se documentan por separado según su función, sin presentarlos erróneamente como APIs REST.
