# Módulo 2 – Empresas y domiciliarios

Este módulo agrega el registro de restaurantes/tiendas y domiciliarios, los
estados de aprobación (`PENDING`, `APPROVED`, `REJECTED`), los permisos
independientes por tipo de cuenta y los endpoints del panel de administración.

## Puesta en marcha

```powershell
cd C:\Users\RYZEN\Desktop\fastdelivery\Backend

# Aplica la migración (ya aplicada en este proyecto)
npx prisma migrate dev

# Crea los roles y el administrador inicial (ya ejecutado)
npm run seed

# Levanta la API
npm run dev
```

Credenciales del administrador creado por el seed:

- Correo: `admin@fastdelivery.com`
- Contraseña: `Admin1234!` (o el valor de `ADMIN_PASSWORD` en `.env`)

> Cambia esta contraseña antes de publicar la aplicación.

## Reglas de negocio

1. Cualquier usuario autenticado puede enviar **una** solicitud de empresa y
   **una** solicitud de domiciliario.
2. Toda solicitud nueva nace en estado `PENDING`.
3. Al aprobar una empresa se asigna el rol `BUSINESS`; al aprobar un
   domiciliario se asigna el rol `DELIVERY`.
4. Si una solicitud aprobada se rechaza, se revoca el rol correspondiente.
5. Si una solicitud rechazada se edita, vuelve a `PENDING` y se limpia el
   motivo de rechazo.
6. Una solicitud aprobada no puede editarse desde `/me`.
7. Un administrador no puede aprobar ni rechazar su propia solicitud.
8. Solo los usuarios con rol `ADMIN` pueden listar, ver, aprobar o rechazar
   solicitudes.

## Endpoints

Todas las rutas protegidas esperan el encabezado:

```
Authorization: Bearer <token>
```

### Autenticación (Módulo 1)

| Método | Ruta | Permiso | Descripción |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Público | Crea un usuario `CLIENT` |
| POST | `/api/auth/login` | Público | Devuelve el token JWT |
| GET | `/api/auth/me` | Autenticado | Perfil, roles y estado de sus solicitudes |

`GET /api/auth/me` ahora incluye `businessProfile` y `deliveryProfile` con su
estado, para que el cliente sepa si está pendiente, aprobado o rechazado.

### Empresas y tiendas

| Método | Ruta | Permiso | Descripción |
| --- | --- | --- | --- |
| POST | `/api/businesses/register` | Autenticado | Registra la solicitud (PENDING) |
| GET | `/api/businesses/me` | Autenticado | Consulta mi solicitud |
| PUT | `/api/businesses/me` | Autenticado | Edita/reenvía mi solicitud |
| GET | `/api/businesses` | ADMIN | Lista con filtros y paginación |
| GET | `/api/businesses/:id` | ADMIN | Detalle de una solicitud |
| PATCH | `/api/businesses/:id/approve` | ADMIN | Aprueba y asigna rol BUSINESS |
| PATCH | `/api/businesses/:id/reject` | ADMIN | Rechaza y revoca rol si aplica |

Cuerpo para registrar o actualizar:

```json
{
  "businessName": "Restaurante El Buen Sabor",
  "legalName": "El Buen Sabor SAS",
  "taxId": "900123456-7",
  "businessType": "RESTAURANT",
  "description": "Comida típica colombiana",
  "address": "Calle 123 #45-67",
  "city": "Bogotá",
  "department": "Cundinamarca",
  "contactPhone": "3001234567",
  "contactEmail": "contacto@buensabor.com",
  "logoUrl": "https://...",
  "documentUrl": "https://.../camara-comercio.pdf"
}
```

Campos obligatorios: `businessName`, `businessType`, `address` y `city`.
`businessType` acepta `RESTAURANT` o `STORE`. `taxId` es único si se envía.

Filtros del listado administrativo:

```
GET /api/businesses?status=PENDING&businessType=RESTAURANT&search=sabor&page=1&limit=20
```

### Domiciliarios

| Método | Ruta | Permiso | Descripción |
| --- | --- | --- | --- |
| POST | `/api/deliveries/register` | Autenticado | Registra la solicitud (PENDING) |
| GET | `/api/deliveries/me` | Autenticado | Consulta mi solicitud |
| PUT | `/api/deliveries/me` | Autenticado | Edita/reenvía mi solicitud |
| GET | `/api/deliveries` | ADMIN | Lista con filtros y paginación |
| GET | `/api/deliveries/:id` | ADMIN | Detalle de una solicitud |
| PATCH | `/api/deliveries/:id/approve` | ADMIN | Aprueba y asigna rol DELIVERY |
| PATCH | `/api/deliveries/:id/reject` | ADMIN | Rechaza y revoca rol si aplica |

Cuerpo para registrar o actualizar:

```json
{
  "documentType": "CC",
  "documentNumber": "1012345678",
  "birthDate": "1995-05-20",
  "address": "Carrera 10 #20-30",
  "city": "Medellín",
  "vehicleType": "MOTORCYCLE",
  "vehiclePlate": "ABC12D",
  "licenseNumber": "LIC-123456",
  "documentUrl": "https://.../cedula.pdf",
  "licenseUrl": "https://.../licencia.pdf",
  "emergencyContactName": "María Pérez",
  "emergencyContactPhone": "3009876543"
}
```

Campos obligatorios: `documentType`, `documentNumber`, `address`, `city` y
`vehicleType`. `vehicleType` acepta `MOTORCYCLE`, `BICYCLE`, `CAR` u `OTHER`.
`documentNumber` es único.

Filtros del listado administrativo:

```
GET /api/deliveries?status=PENDING&vehicleType=MOTORCYCLE&search=1012&page=1&limit=20
```

### Rechazo

```http
PATCH /api/businesses/5/reject
PATCH /api/deliveries/3/reject
```

```json
{
  "reason": "La documentación está incompleta o no es legible"
}
```

El motivo es obligatorio y debe tener al menos 5 caracteres.

### Panel de administración

| Método | Ruta | Permiso | Descripción |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | ADMIN | Totales por estado y últimas pendientes |
| GET | `/api/admin/requests` | ADMIN | Solicitudes combinadas con filtros |

Ejemplos:

```
GET /api/admin/dashboard
GET /api/admin/requests?type=all&status=PENDING&page=1&limit=20
GET /api/admin/requests?type=business&status=REJECTED
GET /api/admin/requests?type=delivery&status=APPROVED
```

`type` acepta `all`, `business` o `delivery`. `status` acepta `PENDING`,
`APPROVED` o `REJECTED` (si se omite, devuelve todos).

## Flujo recomendado para probar en Postman

### Opción rápida: colección lista para importar

En `Backend/docs/postman` hay dos archivos:

- `FastDelivery-Modulo2.postman_collection.json`
- `FastDelivery-Local.postman_environment.json`

Pasos:

1. Abre Postman y pulsa **Import**.
2. Importa los dos archivos.
3. Selecciona el entorno **FastDelivery Local** (arriba a la derecha).
4. Ejecuta la colección completa con **Run collection**, o abre cada request y
   pulsa **Send** en el orden en que aparece.

La colección guarda automáticamente los tokens y los IDs en el entorno. Cada
ejecución crea dos usuarios nuevos con correos únicos; al finalizar puedes
eliminarlos con:

```sql
DELETE FROM User
WHERE email LIKE 'empresa.%@test.com'
   OR email LIKE 'domiciliario.%@test.com';
```

Las relaciones de perfiles y roles se eliminan en cascada.

### Opción manual

1. `POST /api/auth/register` y guardar el `token` del cliente.
2. `POST /api/businesses/register` o `POST /api/deliveries/register` con ese token.
3. `POST /api/auth/login` con `admin@fastdelivery.com` y guardar el token admin.
4. `GET /api/admin/requests?status=PENDING` con el token admin.
5. `PATCH /api/businesses/:id/approve` o `PATCH /api/deliveries/:id/approve`.
6. `GET /api/auth/me` con el token del cliente para ver el nuevo rol.
7. Para probar el rechazo: `PATCH /api/.../:id/reject` con `{ "reason": "..." }`.
8. Corregir la solicitud con `PUT /api/businesses/me` o `/api/deliveries/me`.

## Prueba automatizada

Con el servidor corriendo:

```powershell
npm run test:e2e
```

La prueba crea usuarios temporales, recorre todo el flujo y los elimina al
finalizar.

## Archivos principales

- `prisma/schema.prisma`: modelos `BusinessProfile`, `DeliveryProfile` y enums.
- `prisma/seed.ts`: roles iniciales y cuenta administradora.
- `src/middlewares/roles.middleware.ts`: permisos por rol.
- `src/controllers/business.controller.ts`
- `src/controllers/delivery.controller.ts`
- `src/controllers/admin.controller.ts`
- `src/routes/business.routes.ts`
- `src/routes/delivery.routes.ts`
- `src/routes/admin.routes.ts`

## Nota sobre documentos

`logoUrl`, `documentUrl` y `licenseUrl` almacenan URLs. La carga
de archivos (multipart/form-data) no está incluida en este módulo; se puede
agregar después con `multer` y almacenamiento local, S3 o Cloudinary.
