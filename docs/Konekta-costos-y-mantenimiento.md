# Konekta: costos y plan de mantenimiento

**Documento de entrega · 14 de octubre de 2026**  
**Producto:** Konekta, marketplace web de productos y servicios

## 1. Resumen del sistema

Konekta es una aplicación web que conecta compradores y vendedores. Incluye registro e inicio de sesión, publicación y búsqueda de productos y servicios, reseñas, favoritos, chat en tiempo real, paneles de vendedor y administrador, mapas y recuperación de contraseña por correo.

La aplicación utiliza Node.js y Express para la API, una interfaz web SPA, MongoDB Atlas para los datos, Cloudinary para imágenes, Render para alojar la aplicación y SendGrid para enviar correos transaccionales. El remitente previsto es `konekta@konekta.com`, siempre que se autentique el dominio en SendGrid.

## 2. Costos estimados de servicios

Las cantidades siguientes son cargos de los proveedores, en dólares estadounidenses. No incluyen impuestos, conversión a pesos, compra o renovación del dominio, comisiones de pago ni el tiempo de trabajo del equipo. Los niveles gratuitos tienen límites y pueden cambiar; revisar el panel de cada proveedor antes de lanzar.

| Servicio | Uso en Konekta | Escenario inicial | Riesgo o costo al crecer |
|---|---|---:|---|
| Render | API, frontend y Socket.IO | **$0/mes** en el plan Free configurado | Plan Free se duerme después de 15 minutos sin actividad, puede tardar cerca de un minuto en despertar, no conserva archivos locales y no está recomendado por Render para producción. El plan de cómputo pagado y uso adicional se cobran según selección y consumo. |
| MongoDB Atlas | Usuarios, publicaciones, reseñas y conversaciones | **$0/mes** con clúster Free; hasta 512 MB | Al agotarse capacidad o necesitar respaldos, métricas y mayor disponibilidad, se requiere un plan superior. El nivel gratuito no incluye respaldos. |
| Cloudinary | Imágenes de publicaciones y perfiles | **$0/mes** dentro de 25 créditos mensuales | Si el consumo de almacenamiento, transformaciones o entrega supera los créditos incluidos, se debe ampliar el plan. |
| SendGrid | Correos de recuperación de contraseña | **$0 inicialmente**, si la cuenta puede usar el plan gratuito publicado y el volumen cabe en su cuota | El precio depende del plan y del volumen. El envío requiere una API key con permiso de Mail Send y un remitente verificado. La verificación telefónica de cuenta puede ser requisito de acceso. |
| Dominio `konekta.com` | Dirección pública del sitio y remitente de correo | Ya adquirido, si está pagado actualmente | Renovación anual según el registrador. El precio exacto se consulta en la cuenta donde se compró. |
| Mantenimiento técnico | Actualizaciones, monitoreo y respaldos | No es una tarifa de proveedor | Como estimación de planeación, reservar 4–8 horas al mes para operación básica; incidentes, desarrollo de funciones y soporte de usuarios se cotizan aparte. |

### Lectura del presupuesto

- **Demo o piloto:** puede operar con cargos de plataforma de $0/mes mientras los servicios sigan dentro de sus niveles gratuitos. Esto no equivale a una garantía de disponibilidad ni a un presupuesto de producción.
- **Producción pública:** presupuestar al menos alojamiento sin suspensión por inactividad y respaldos de base de datos. El costo final depende del tráfico, imágenes, espacio de datos, correo y región. Confirmar las tarifas del panel antes de activar un plan pagado.
- **No presupuestado:** costo inicial del dominio, impuestos, tipo de cambio USD/MXN, horas de desarrollo, atención al cliente y eventual servicio de pagos.

## 3. Mantenimiento recomendado

| Frecuencia | Actividad | Resultado esperado |
|---|---|---|
| Semanal | Revisar disponibilidad de `/health`, logs de Render, errores de API y entregas/rechazos en SendGrid. | Detectar fallas de hosting, base de datos o correo antes de que se acumulen. |
| Semanal | Revisar uso de almacenamiento y créditos en MongoDB Atlas y Cloudinary. | Evitar alcanzar límites de recursos sin aviso. |
| Mensual | Aplicar actualizaciones de dependencias y desplegar después de revisar cambios y compatibilidad. | Reducir riesgos de seguridad y mantener el sistema compatible. |
| Mensual | Confirmar que existe una copia recuperable de la base de datos y comprobar el procedimiento de restauración. | Poder recuperar usuarios, publicaciones y conversaciones ante pérdida o corrupción. |
| Mensual | Revisar variables secretas, accesos del equipo, actividad de API keys y permisos mínimos. Rotar credenciales expuestas o innecesarias. | Reducir el impacto de una filtración y mantener el acceso controlado. |
| Mensual | Probar registro, inicio de sesión, recuperación de contraseña, publicación, imágenes, chat y permisos administrativos. | Confirmar que los flujos principales siguen funcionando después de cambios. |
| Trimestral | Revisar límites, facturación, crecimiento de datos, uso de correo y necesidad de cambiar de plan. | Actualizar el presupuesto a partir del uso real. |

### Observaciones de continuidad

- En Render Free el servicio puede despertar lentamente tras inactividad. Para una experiencia de producción con disponibilidad constante, valorar un plan de servicio pagado.
- No guardar imágenes ni datos permanentes en el disco local de Render. El filesystem de Render es efímero; los archivos que deban conservarse tienen que permanecer en almacenamiento externo como Cloudinary.
- Atlas Free tiene 512 MB y no ofrece respaldos. Programar exportaciones y guardar las copias en un lugar separado de la instancia de la aplicación; antes de depender de ellas, probar una restauración.
- Definir alertas de gasto y límites de consumo en cada proveedor, y conservar acceso de recuperación de las cuentas administrativas.

## 4. Qué muestra la imagen de SendGrid

La captura titulada **“Comprueba tu teléfono”** pertenece al proceso de seguridad de la cuenta de SendGrid. Solicita un código por SMS o llamada y señala tres usos: recuperar la cuenta de SendGrid, enviar campañas y crear una API key.

Esto **no es una pantalla de verificación telefónica de Konekta** ni significa que Konekta vaya a enviar SMS a sus usuarios. Es una comprobación de identidad del proveedor antes de habilitar acciones de la cuenta. Para completar la conexión de Konekta:

1. Completar la verificación telefónica directamente dentro de la cuenta de SendGrid.
2. Autenticar `konekta.com` en **Settings → Sender Authentication** y añadir en el DNS los registros que indique SendGrid.
3. Crear una API key limitada al permiso **Mail Send**.
4. Guardarla como variable secreta `SENDGRID_API_KEY` en Render. No pegarla en el código, documentos compartidos ni capturas.
5. Confirmar que Render conserve `MAIL_FROM` como `Konekta <konekta@konekta.com>` y que dicho remitente corresponda al dominio autenticado en SendGrid.
6. Desplegar y hacer una prueba de recuperación con una cuenta controlada. Revisar los logs sin publicar claves ni códigos.

La API de SendGrid exige que la dirección `from` sea un remitente verificado. Si SendGrid rechaza el envío con `403` o `503`, revisar autenticación del dominio, permiso de la API key, identidad del remitente y estado de cuenta.

## 5. APIs y servicios externos integrados

| API o servicio | Uso detectado en el proyecto | Clave/configuración | Consideraciones |
|---|---|---|---|
| SendGrid Mail Send API | Envío de correo de recuperación (`POST /v3/mail/send`). | `SENDGRID_API_KEY`, `MAIL_FROM`; el remitente debe estar autenticado. | El plan y límites aplican según la cuenta. No usar la API key desde el navegador ni subirla al repositorio. |
| Cloudinary | Carga, almacenamiento y entrega de imágenes. | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. | El proyecto llama al SDK oficial; las credenciales privadas deben existir solo en backend/Render. Vigilar créditos y límites del plan. |
| MongoDB Atlas | Base de datos remota mediante Mongoose. | `MONGO_URI` con usuario y contraseña de base de datos. | Restringir acceso de red cuando la plataforma lo permita, usar credenciales dedicadas y mantener copia recuperable. |
| Render | Hosting de frontend, API y Socket.IO. | Variables de entorno y secretos del servicio. | Las limitaciones del plan Free se describen arriba. Evitar depender del disco local para contenido permanente. |
| OpenStreetMap raster tiles | Mosaicos del mapa en `tile.openstreetmap.org`. | Sin API key. | Mostrar siempre `© OpenStreetMap contributors`; respetar caché y política de uso. El servicio comunitario es best effort, no tiene SLA y puede bloquear usos que incumplan su política. |
| OSRM público | Cálculo de rutas en `router.project-osrm.org`. | Sin API key. | Es un servidor de demostración externo; no se debe asumir disponibilidad ni SLA para producción. Confirmar las condiciones actuales del operador antes de uso comercial intensivo y evaluar contratar un proveedor o alojarlo. |
| Leaflet + unpkg | Biblioteca cartográfica y entrega de sus archivos JS/CSS desde CDN. | Sin API key. | Leaflet 1.9.4 se carga desde unpkg. Para reducir dependencia del CDN, considerar alojar una copia fija y conservar avisos/licencia. |
| Google Fonts | Carga de DM Sans y Space Grotesk desde Google Fonts. | Sin API key. | Requiere conexión con Google Fonts; cada familia debe conservar la licencia incluida en sus metadatos. Las familias utilizadas están publicadas bajo SIL Open Font License. |
| Google Maps URLs | Enlaces que abren una búsqueda de ubicación en Google Maps. | Sin API key para Maps URLs. | Konekta no está llamando a Google Maps Platform geocoding/routing API; solo construye enlaces que abre el usuario. |

**No se identificó** una API de pagos, SMS para usuarios, analítica de terceros ni proveedor de geocodificación en el código revisado. La geolocalización del navegador depende del permiso del usuario y del navegador/dispositivo.

### Licencias del código y dependencias directas

El `package.json` raíz declara licencia **ISC** para el proyecto, pero no se encontró un archivo `LICENSE` en el repositorio. Antes de distribuirlo, confirmar que esa licencia representa la intención del titular y agregar el texto correspondiente. Esta revisión resume dependencias directas de backend, no sustituye un inventario automático de todas las dependencias transitivas.

| Componente directo | Licencia declarada | Nota de distribución |
|---|---|---|
| bcryptjs | BSD-3-Clause | Incluir el aviso y las condiciones de la licencia al redistribuir. |
| Cloudinary SDK | MIT | Conservar el aviso MIT al redistribuir la dependencia. |
| cors | MIT | Conservar el aviso MIT. |
| dotenv | BSD-2-Clause | Conservar el aviso y las condiciones. |
| Express | MIT | Conservar el aviso MIT. |
| express-rate-limit | MIT | Conservar el aviso MIT. |
| express-validator | MIT | Conservar el aviso MIT. |
| Helmet | MIT | Conservar el aviso MIT. |
| jsonwebtoken | MIT | Conservar el aviso MIT. |
| MongoDB Node.js driver | Apache-2.0 | Conservar licencia y avisos/notices requeridos por Apache-2.0. |
| Mongoose | MIT | Conservar el aviso MIT. |
| Morgan | MIT | Conservar el aviso MIT. |
| Multer | MIT | Conservar el aviso MIT. |
| Socket.IO | MIT | Conservar el aviso MIT. |
| Leaflet 1.9.4 (CDN) | BSD-2-Clause | Mantener los avisos requeridos en documentación/materiales de distribución. |
| DM Sans y Space Grotesk | SIL Open Font License 1.1 | Si se redistribuyen los archivos de fuentes, incluir los avisos y el texto OFL correspondiente. |

OpenStreetMap como conjunto de datos se publica bajo ODbL y requiere atribución; eso es distinto de la política de uso del servidor que entrega los mosaicos. Las condiciones del proveedor de tiles y OSRM deben revisarse separadamente de las licencias del código.

## 6. Fuentes oficiales consultadas

- [Render: precios y planes](https://render.com/pricing)
- [Render: limitaciones de servicios Free](https://render.com/docs/free)
- [MongoDB Atlas: precios y nivel gratuito](https://www.mongodb.com/pricing)
- [MongoDB Atlas: límites de clúster gratuito](https://www.mongodb.com/docs/atlas/reference/free-shared-limitations/)
- [Cloudinary: planes y precios](https://cloudinary.com/pricing)
- [SendGrid: planes de Email API](https://sendgrid.com/pricing/)
- [SendGrid: API Mail Send y remitente verificado](https://www.twilio.com/docs/sendgrid/api-reference/mail-send/mail-send)
- [SendGrid: autenticación de dominio](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication)
- [OpenStreetMap Foundation: política de uso de tiles](https://operations.osmfoundation.org/policies/tiles/)
- [OSRM: API HTTP de rutas](https://project-osrm.org/docs/v26.5.0/http)
- [Leaflet: licencia BSD-2-Clause](https://github.com/Leaflet/Leaflet/blob/main/LICENSE)
- [Google Maps URLs: no requieren API key](https://developers.google.com/maps/documentation/urls/get-started)
- [DM Sans: licencia OFL](https://github.com/googlefonts/dm-fonts)
- [Space Grotesk: licencia OFL](https://github.com/floriankarsten/space-grotesk)

> **Nota de costos:** los planes, cuotas y precios publicados pueden modificarse. Esta estimación describe la configuración actual del proyecto y debe actualizarse con las facturas y paneles de Konekta antes de aprobar un presupuesto de operación.
