# Módulo 4 – Pedidos

Este módulo agrega el flujo completo de pedidos: creación por parte del cliente,
aceptación y preparación por la empresa, asignación y entrega por parte del
domiciliario, seguimiento del historial de estados y gestión administrativa.

## Puesta en marcha

```powershell
cd C:\Users\RYZEN\Desktop\fastdelivery\Backend

# Aplica la migración (ya aplicada en este proyecto)
npx prisma migrate dev

# Levanta la API
npm run dev
```

La migración de este módulo es `20261109053717_module4_orders`.

## Reglas de negocio

1. Un pedido pertenece a **una sola empresa** y a un **único cliente**.
2. Solo las empresas `APPROVED` con usuario activo pueden recibir pedidos.
3. Cada producto debe pertenecer a la empresa indicada y estar `isActive = true`,
   `isAvailable = true` y `deletedAt = null`.
4. El **stock** se descuenta de forma atómica al crear el pedido. Si un producto
   tiene `stock = null`, se considera ilimitado y no se descuenta.
5. Al rechazar o cancelar un pedido se **restaura** el stock de sus productos.
   Un pedido entregado no restaura stock.
6. La cantidad por producto debe ser un entero entre 1 y 99.
7. El `subtotal` es la suma de `precio unitario × cantidad`; el `deliveryFee` se
   toma de la empresa en el momento de crear el pedido y el `total` es
   `subtotal + deliveryFee`. Todos los valores se devuelven como números.
8. El cliente solo puede cancelar pedidos en estado `PENDING` o `ACCEPTED`.
9. La empresa solo puede rechazar pedidos `PENDING`.
10. La empresa solo puede pasar de `ACCEPTED` a `PREPARING` y de `PREPARING` a
    `READY`.
11. El administrador solo puede asignar un domiciliario aprobado a un pedido en
    estado `READY`.
12. El domiciliario puede **tomar** un pedido `READY` disponible o **recoger** un
    pedido que le asignó el administrador. En ambos casos pasa a `ON_THE_WAY`.
13. El domiciliario marca la entrega (`DELIVERED`) solo si el pedido está
    `ON_THE_WAY` y le pertenece.
14. El administrador puede cancelar cualquier pedido que no esté en estado
    terminal (`DELIVERED`, `REJECTED` o `CANCELLED`).
15. Cada cambio de estado queda registrado en el historial del pedido.

## Estados

```
PENDING → ACCEPTED → PREPARING → READY → ON_THE_WAY → DELIVERED
   │          │
   │          └──────────────→ CANCELLED (cliente)
   ├──────────────────────────→ REJECTED (empresa)
   └──────────────────────────→ CANCELLED (cliente o administrador)
```

- `PENDING`: creado por el cliente, pendiente de respuesta de la empresa.
- `ACCEPTED`: aceptado por la empresa.
- `PREPARING`: en preparación.
- `READY`: listo para entrega y disponible para domiciliarios.
- `ON_THE_WAY`: recogido o tomado por el domiciliario.
- `DELIVERED`: entregado al cliente.
- `REJECTED`: rechazado por la empresa (motivo obligatorio).
- `CANCELLED`: cancelado por el cliente o el administrador (motivo obligatorio).

## Endpoints

Todas las rutas protegidas esperan el encabezado:

```
Authorization: Bearer <token>
```

### Cliente

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/orders` | Crea un pedido |
| GET | `/api/orders` | Lista mis pedidos |
| GET | `/api/orders/:id` | Detalle de un pedido propio |
| PATCH | `/api/orders/:id/cancel` | Cancela un pedido propio |

Cuerpo para crear un pedido:

```json
{
  "businessId": 1,
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 2, "quantity": 1 }
  ],
  "address": "Calle 100 #20-30",
  "city": "Bogotá",
  "department": "Cundinamarca",
  "contactPhone": "3001112233",
  "paymentMethod": "CASH",
  "notes": "Sin cebolla"
}
```

`businessId`, `items` (al menos uno), `address` y `city` son obligatorios.
`paymentMethod` acepta `CASH` (por defecto), `CARD` o `TRANSFER`.

Cancelar un pedido:

```json
{
  "reason": "Cambié de opinión"
}
```

El motivo es obligatorio y debe tener al menos 5 caracteres.

### Empresa

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/businesses/me/orders` | Lista los pedidos de mi empresa |
| GET | `/api/businesses/me/orders/:id` | Detalle de un pedido de mi empresa |
| PATCH | `/api/businesses/me/orders/:id/accept` | Acepta un pedido pendiente |
| PATCH | `/api/businesses/me/orders/:id/reject` | Rechaza un pedido pendiente |
| PATCH | `/api/businesses/me/orders/:id/status` | Pasa a `PREPARING` o `READY` |

Rechazar un pedido:

```json
{
  "reason": "Producto agotado para hoy"
}
```

Cambiar de estado:

```json
{
  "status": "PREPARING"
}
```

`status` solo acepta `PREPARING` o `READY`.

Filtros de `/api/businesses/me/orders`:

```
GET /api/businesses/me/orders?status=PENDING&search=Calle&page=1&limit=20
```

`status` acepta `PENDING`, `ACCEPTED`, `PREPARING`, `READY`, `ON_THE_WAY`,
`DELIVERED`, `REJECTED` o `CANCELLED`.

### Domiciliario

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/deliveries/me/available-orders` | Pedidos `READY` sin asignar |
| GET | `/api/deliveries/me/orders` | Pedidos asignados a mí |
| GET | `/api/deliveries/me/orders/:id` | Detalle de un pedido asignado |
| PATCH | `/api/deliveries/me/orders/:id/accept` | Toma un pedido disponible |
| PATCH | `/api/deliveries/me/orders/:id/pickup` | Recoge un pedido asignado |
| PATCH | `/api/deliveries/me/orders/:id/deliver` | Marca la entrega |

El domiciliario debe estar `APPROVED`; de lo contrario recibe `403`.

### Administrador

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/admin/orders` | Lista todos los pedidos |
| GET | `/api/admin/orders/:id` | Detalle de cualquier pedido |
| PATCH | `/api/admin/orders/:id/assign` | Asigna un domiciliario |
| PATCH | `/api/admin/orders/:id/cancel` | Cancela un pedido |

Filtros de `/api/admin/orders`:

```
GET /api/admin/orders?status=READY&businessId=1&clientId=2&deliveryId=3&search=Juan&page=1&limit=20
```

Asignar un domiciliario:

```json
{
  "deliveryId": 1
}
```

El pedido debe estar `READY` y sin domiciliario asignado. Después de asignarlo
sigue en `READY` hasta que el domiciliario lo recoja.

Cancelar un pedido:

```json
{
  "reason": "Pedido bloqueado por administración"
}
```

El dashboard administrativo (`GET /api/admin/dashboard`) incluye
`stats.orders` con el conteo por estado y el total.

## Flujo recomendado para probar en Postman

### Opción rápida: colección lista para importar

En `Backend/docs/postman` están los archivos:

- `FastDelivery-Modulo4.postman_collection.json`
- `FastDelivery-Local.postman_environment.json`

Pasos:

1. Abre Postman y pulsa **Import**.
2. Importa la colección del Módulo 4 y el entorno **FastDelivery Local**.
3. Selecciona el entorno arriba a la derecha.
4. Ejecuta la colección completa con **Run collection** o abre cada request y
   pulsa **Send** en el orden en que aparece.

La colección crea una empresa aprobada, un domiciliario aprobado, un cliente y
dos productos; luego recorre el pedido feliz, el rechazo, las cancelaciones, la
asignación administrativa, las validaciones y los permisos.

Al finalizar, elimina los usuarios de prueba con:

```sql
DELETE FROM User
WHERE email LIKE 'empresa.%@test.com'
   OR email LIKE 'domiciliario.%@test.com'
   OR email LIKE 'cliente.%@test.com';
```

Los perfiles, roles, productos, categorías y pedidos se eliminan en cascada.

### Opción manual

1. `POST /api/auth/login` con `admin@fastdelivery.com` y guardar el token.
2. Registrar y aprobar una empresa con `deliveryFee`.
3. Crear categorías y productos desde `/api/businesses/me/...`.
4. Registrar y aprobar un domiciliario.
5. Registrar un cliente.
6. `POST /api/orders` con el token del cliente.
7. Aceptar, preparar y marcar `READY` desde la empresa.
8. Tomar el pedido con `/api/deliveries/me/orders/:id/accept` y entregarlo con
   `/deliver`.
9. Probar el rechazo, las cancelaciones y la asignación administrativa.
10. Consultar `GET /api/admin/orders` y `GET /api/admin/dashboard`.

## Prueba automatizada

Con el servidor corriendo:

```powershell
npm run test:e2e:module4
```

La prueba crea dos empresas, un cliente y dos domiciliarios temporales, valida
el aislamiento entre empresas, el cálculo de totales, el stock, el flujo de
estados completo, el rechazo, las cancelaciones del cliente y del administrador,
la asignación administrativa y los permisos. Al finalizar elimina los usuarios
de prueba.

## Archivos principales

- `prisma/schema.prisma`: modelos `Order`, `OrderItem` y `OrderStatusHistory`,
  enums `OrderStatus` y `PaymentMethod`, y campo `deliveryFee`.
- `src/utils/orders.ts`: estados, dinero, serialización y restauración de stock.
- `src/middlewares/delivery.middleware.ts`: exige domiciliario aprobado.
- `src/controllers/order.controller.ts`: creación, consulta y cancelación del
  cliente.
- `src/controllers/business-order.controller.ts`: aceptación, rechazo y estados
  de la empresa.
- `src/controllers/delivery-order.controller.ts`: pedidos disponibles, recogida
  y entrega.
- `src/controllers/admin-order.controller.ts`: listado, detalle, asignación y
  cancelación administrativa.
- `src/routes/order.routes.ts`
- `src/routes/business-order.routes.ts`
- `src/routes/delivery-order.routes.ts`
- `src/routes/admin.routes.ts`
- `tests/module4.e2e.mjs`: prueba E2E del módulo.

## Notas

- Los valores monetarios se guardan como `Decimal(10,2)` y se serializan como
  números en las respuestas.
- El precio y el nombre del producto se copian al ítem del pedido, de modo que
  el historial no cambia si la empresa edita el producto después.
- El administrador puede consultar cualquier pedido; la empresa, el cliente y el
  domiciliario solo ven los suyos.
- Las rutas `/me` se montan después de los routers generales para que los
  guards de rol no intercepten solicitudes de usuarios sin ese rol (por ejemplo,
  un cliente consultando su propio perfil de empresa rechazada).
