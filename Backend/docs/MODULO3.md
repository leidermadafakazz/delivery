# Módulo 3 – Catálogo de productos

Este módulo agrega las categorías y los productos de cada empresa, el catálogo
público para los clientes, la búsqueda de productos y la moderación del
administrador.

## Puesta en marcha

```powershell
cd C:\Users\RYZEN\Desktop\fastdelivery\Backend

# Aplica la migración (ya aplicada en este proyecto)
npx prisma migrate dev

# Levanta la API
npm run dev
```

La migración de este módulo es `20261109052923_module3_catalog`.

## Reglas de negocio

1. Solo una empresa **aprobada** puede gestionar su catálogo. El middleware
   `requireApprovedBusiness` valida el rol `BUSINESS` y el estado `APPROVED`.
2. Cada empresa solo puede ver y modificar sus propias categorías y productos.
3. El nombre de la categoría es único dentro de la empresa.
4. El `sku` es único dentro de la empresa (si se envía).
5. El precio se guarda como `Decimal(10,2)` y debe ser mayor que 0 y menor o
   igual a `99.999.999,99`.
6. `stock` es opcional y, si se envía, debe ser un entero mayor o igual a 0.
7. La empresa controla `isAvailable` (disponibilidad del producto).
8. El administrador controla `isActive` (moderación). Un producto inactivo no
   aparece en el catálogo público.
9. La empresa elimina productos de forma lógica (`deletedAt`). Un producto
   eliminado no aparece en el catálogo público ni en el listado normal.
10. Al restaurar un producto, este queda **no disponible** hasta que la empresa
    lo vuelva a activar.
11. Al eliminar una categoría, sus productos quedan con `categoryId = null`.
12. El catálogo público solo muestra empresas `APPROVED` con usuario activo y
    productos con `isActive = true`, `isAvailable = true` y `deletedAt = null`.

## Endpoints

Todas las rutas protegidas esperan el encabezado:

```
Authorization: Bearer <token>
```

### Catálogo público (sin token)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/catalog/businesses` | Lista empresas aprobadas con filtros |
| GET | `/api/catalog/businesses/:id` | Catálogo de una empresa (categorías y productos) |
| GET | `/api/catalog/products` | Busca productos disponibles |
| GET | `/api/catalog/products/:id` | Detalle público de un producto |

Filtros de `/api/catalog/businesses`:

```
GET /api/catalog/businesses?businessType=RESTAURANT&city=Bogotá&search=pizza&page=1&limit=20
```

Filtros de `/api/catalog/products`:

```
GET /api/catalog/products?businessId=1&categoryId=2&search=pollo&minPrice=5000&maxPrice=30000&sort=price_asc&page=1&limit=20
```

`businessType` acepta `RESTAURANT` o `STORE`. `sort` acepta `name` (por
defecto), `price_asc`, `price_desc` o `newest`.

### Gestión del catálogo (empresa aprobada)

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/businesses/me/categories` | Lista mis categorías |
| POST | `/api/businesses/me/categories` | Crea una categoría |
| PUT | `/api/businesses/me/categories/:id` | Actualiza una categoría |
| DELETE | `/api/businesses/me/categories/:id` | Elimina una categoría |
| GET | `/api/businesses/me/products` | Lista mis productos |
| POST | `/api/businesses/me/products` | Crea un producto |
| GET | `/api/businesses/me/products/:id` | Detalle de un producto propio |
| PUT | `/api/businesses/me/products/:id` | Actualiza un producto |
| DELETE | `/api/businesses/me/products/:id` | Elimina lógicamente un producto |
| PATCH | `/api/businesses/me/products/:id/availability` | Cambia la disponibilidad |
| PATCH | `/api/businesses/me/products/:id/restore` | Restaura un producto eliminado |

Cuerpo para crear o actualizar una categoría:

```json
{
  "name": "Platos fuertes",
  "description": "Comidas principales",
  "sortOrder": 1
}
```

`name` es obligatorio. `sortOrder` es un entero mayor o igual a 0.

Cuerpo para crear o actualizar un producto:

```json
{
  "name": "Bandeja paisa",
  "description": "Plato típico colombiano",
  "price": 28000.5,
  "categoryId": 1,
  "sku": "BANDEJA-001",
  "stock": 10,
  "isAvailable": true,
  "imageUrl": "https://example.com/bandeja.jpg"
}
```

`name` y `price` son obligatorios. `categoryId` debe pertenecer a la misma
empresa. `isAvailable` por defecto es `true` al crear.

Cambiar disponibilidad:

```http
PATCH /api/businesses/me/products/1/availability
```

```json
{
  "isAvailable": false
}
```

Filtros de `/api/businesses/me/products`:

```
GET /api/businesses/me/products?search=bandeja&categoryId=1&isAvailable=true&includeDeleted=true&page=1&limit=20
```

### Moderación del administrador

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/admin/products` | Lista todos los productos |
| PATCH | `/api/admin/products/:id/deactivate` | Desactiva un producto |
| PATCH | `/api/admin/products/:id/activate` | Reactiva un producto |

Filtros de `/api/admin/products`:

```
GET /api/admin/products?businessId=1&categoryId=2&isActive=true&isAvailable=true&includeDeleted=true&search=bandeja&page=1&limit=20
```

Al desactivar un producto, el administrador también lo marca como no
disponible. Al reactivarlo, solo cambia `isActive`: la empresa debe volver a
marcarlo como disponible para que aparezca en el catálogo público. Un producto
eliminado por la empresa no puede reactivarse desde administración.

## Flujo recomendado para probar en Postman

### Opción rápida: colección lista para importar

En `Backend/docs/postman` están los archivos:

- `FastDelivery-Modulo3.postman_collection.json`
- `FastDelivery-Local.postman_environment.json`

Pasos:

1. Abre Postman y pulsa **Import**.
2. Importa la colección del Módulo 3 y el entorno **FastDelivery Local**.
3. Selecciona el entorno arriba a la derecha.
4. Ejecuta la colección completa con **Run collection** o abre cada request y
   pulsa **Send** en el orden en que aparece.

La colección crea un usuario empresa, lo registra, lo aprueba con el
administrador y recorre categorías, productos, catálogo público, disponibilidad,
permisos y moderación. Al finalizar, elimina los usuarios de prueba con:

```sql
DELETE FROM User
WHERE email LIKE 'empresa.%@test.com'
   OR email LIKE 'cliente.%@test.com';
```

Las categorías, productos, perfiles y roles se eliminan en cascada.

### Opción manual

1. `POST /api/auth/login` con `admin@fastdelivery.com` y guardar el token.
2. `POST /api/auth/register` para crear el usuario empresa.
3. `POST /api/businesses/register` con el token de la empresa.
4. `PATCH /api/businesses/:id/approve` con el token del administrador.
5. `POST /api/businesses/me/categories` para crear categorías.
6. `POST /api/businesses/me/products` para crear productos.
7. `GET /api/catalog/businesses/:id` para ver el catálogo público.
8. `GET /api/catalog/products?search=...` para buscar productos.
9. `PATCH /api/businesses/me/products/:id/availability` para ocultar/mostrar.
10. `PATCH /api/admin/products/:id/deactivate` para moderar.

## Prueba automatizada

Con el servidor corriendo:

```powershell
npm run test:e2e:module3
```

La prueba crea dos empresas aprobadas y un cliente temporal, valida el
aislamiento entre empresas, recorre todo el catálogo público, la moderación y la
eliminación lógica, y elimina los usuarios al finalizar.

## Archivos principales

- `prisma/schema.prisma`: modelos `Category` y `Product`.
- `src/middlewares/business.middleware.ts`: exige empresa aprobada.
- `src/controllers/category.controller.ts`
- `src/controllers/product.controller.ts`
- `src/controllers/catalog.controller.ts`
- `src/controllers/admin-product.controller.ts`
- `src/routes/business-catalog.routes.ts`
- `src/routes/catalog.routes.ts`
- `src/routes/admin.routes.ts`
- `src/utils/catalog.ts`: precios, booleanos, stock y serialización.
- `tests/module3.e2e.mjs`: prueba E2E del módulo.

## Nota sobre imágenes

`imageUrl` almacena una URL. La carga de archivos no está incluida en este
módulo; se puede agregar después con `multer` y almacenamiento local, S3 o
Cloudinary.
