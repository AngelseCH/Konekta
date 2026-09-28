# Konekta

Marketplace de productos y servicios con SPA vanilla, autenticación JWT, productos, reseñas, favoritos, chat Socket.IO y dashboards.

## Instalación

```bash
npm install
copy backend\\.env.example backend\\.env
npm run dev
```

El backend sirve también el frontend desde `http://localhost:4000`, por lo que no es necesario abrir `index.html` con `file://`. Se requiere MongoDB accesible mediante `MONGO_URI`.

## Comandos

- `npm start`: servidor.
- `npm run dev`: servidor con reinicio al detectar cambios.
- `npm run frontend`: servidor frontend independiente en `http://localhost:5500`.
- `npm run seed`: recrea los tres usuarios demo.
- `npm test`: comprobación sintáctica del servidor.

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/health` | Público |
| POST | `/api/auth/register` | Público |
| POST | `/api/auth/login` | Público, 5 intentos/15 min |
| GET | `/api/auth/me` | Bearer JWT |
| POST | `/api/auth/logout` | Bearer JWT |
| GET | `/api/categories` | Público |
| GET | `/api/products` | Público, filtros y paginación |
| GET | `/api/products/:id` | Público |
| GET | `/api/products/mine` | Vendedor/admin |
| POST/PUT/DELETE | `/api/products` | Vendedor/admin / dueño |
| GET/POST | `/api/products/:id/reviews` | Público / autenticado |
| DELETE | `/api/products/:id/reviews/:reviewId` | Autor/admin |
| GET/POST | `/api/chat/conversations` | Autenticado |
| GET/POST/DELETE | `/api/chat/conversations/:id` | Participante |
| GET | `/api/stats/seller` | Vendedor/admin |
| GET | `/api/stats/admin` | Admin |

Ejemplo de registro:

```bash
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Ana Perez\",\"email\":\"ana@example.com\",\"password\":\"Clave123\",\"passwordConfirmation\":\"Clave123\",\"role\":\"consumidor\"}"
```

Usuarios seed: `admin@demo.com / Admin123`, `vendedor@demo.com / Vendedor123`, `consumidor@demo.com / Consumidor123`.

## Variables

`NODE_ENV`, `PORT`, `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN` y `FRONTEND_URL` se documentan en `backend/.env.example`.

## Frontend

Con el backend disponible en `http://localhost:4000`, ejecuta en otra terminal:

```bash
npm run frontend
```

La SPA usa `konekta_token` y `konekta_user` en `localStorage`, consume la API con Fetch y conecta Socket.IO para conversaciones. Incluye autenticación, home con filtros, detalle y reseñas, favoritos, chat y dashboards base.

## Despliegue en Render

El archivo `render.yaml` configura un servicio Node que sirve el frontend, la API y Socket.IO desde el mismo dominio. Las imágenes subidas se guardan en un disco persistente de Render.

1. Crea una base de datos MongoDB Atlas y agrega `0.0.0.0/0` en Network Access para permitir conexiones desde Render. Usa una contraseña de base de datos fuerte en la URI.
2. En Render, selecciona **New > Blueprint**, conecta `AngelseCH/Konekta` y confirma el servicio descrito por `render.yaml`.
3. En el Environment del servicio, configura `MONGO_URI` con la URI de Atlas. Render genera `JWT_SECRET` automáticamente.
4. Confirma el primer deploy y abre la URL del servicio. `/health` debe responder con `status: up`.

No uses el URI local de MongoDB (`mongodb://127.0.0.1...`) en Render. El disco persistente necesita un plan de Render que admita discos; si cambias el servicio a un plan sin disco, las imágenes cargadas se perderán al reiniciar o desplegar. Para dominios personalizados, agrega sus orígenes separados por comas en `FRONTEND_URL` para autorizar CORS y Socket.IO.

## Diagnóstico de MongoDB Atlas

Si Node muestra `querySrv ECONNREFUSED`, el problema está en el DNS local al resolver la URI `mongodb+srv`, no en Express. Comprueba el DNS activo con:

```powershell
Get-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4
```

En PowerShell como administrador puedes configurar `1.1.1.1` y `8.8.8.8`, limpiar la caché y volver a iniciar:

```powershell
Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ServerAddresses ("1.1.1.1","8.8.8.8")
ipconfig /flushdns
npm.cmd run dev
```
