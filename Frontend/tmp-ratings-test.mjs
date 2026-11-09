import { io } from 'socket.io-client'

const API = 'http://localhost:3000'
const stamp = `${Date.now()}`
const password = 'Prueba1234!'
const domain = '@rating.local'

const emails = {
  client: `rt.cli.${stamp}${domain}`,
  business: `rt.biz.${stamp}${domain}`,
  delivery: `rt.domi.${stamp}${domain}`,
}

const results = []
const ok = (name) => { results.push({ ok: true, name }); console.log(`OK   ${name}`) }
const fail = (name, detail) => { results.push({ ok: false, name, detail }); console.log(`FAIL ${name} :: ${detail}`) }
const expect = (name, cond, extra) => cond ? ok(name) : fail(name, typeof extra === 'string' ? extra : JSON.stringify(extra).slice(0, 300))

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  return { status: res.status, data }
}

async function register(name, email) {
  const res = await call('POST', '/api/auth/register', { body: { name, email, password } })
  if (res.status !== 201) throw new Error(`registro ${email}: ${JSON.stringify(res.data)}`)
  return res.data.token
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(API, { auth: { token }, transports: ['websocket'], reconnection: false })
    const events = []
    socket.on('rating:new', (payload) => events.push(payload))
    socket.on('connect', () => resolve({ socket, events }))
    socket.on('connect_error', reject)
    setTimeout(() => reject(new Error('timeout socket')), 8000)
  })
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const admin = await call('POST', '/api/auth/login', { body: { email: 'admin@fastdelivery.com', password: 'Admin1234!' } })
const adminToken = admin.data.token

const clientToken = await register('Cliente Rating', emails.client)
const businessToken = await register('Negocio Rating', emails.business)
const deliveryToken = await register('Domi Rating', emails.delivery)

const business = await call('POST', '/api/businesses/register', {
  token: businessToken,
  body: {
    businessName: `Rating Burger ${stamp}`,
    businessType: 'RESTAURANT',
    address: 'Calle 1 #2-3',
    city: 'Bogotá',
    deliveryFee: 2000,
  },
})
await call('PATCH', `/api/businesses/${business.data.business.id}/approve`, { token: adminToken })
const businessId = business.data.business.id

const delivery = await call('POST', '/api/deliveries/register', {
  token: deliveryToken,
  body: { documentType: 'CC', documentNumber: `RT${stamp}`, address: 'Calle 4 #5-6', city: 'Bogotá', vehicleType: 'MOTORCYCLE' },
})
await call('PATCH', `/api/deliveries/${delivery.data.delivery.id}/approve`, { token: adminToken })
const deliveryId = delivery.data.delivery.id

const product = await call('POST', '/api/businesses/me/products', {
  token: businessToken,
  body: { name: `Producto ${stamp}`, price: 15000, stock: 10 },
})
const productId = product.data.product.id

async function createDeliveredOrder() {
  const order = await call('POST', '/api/orders', {
    token: clientToken,
    body: { businessId, items: [{ productId, quantity: 1 }], address: 'Calle 100 #1-2', city: 'Bogotá', paymentMethod: 'CASH' },
  })
  const id = order.data.order.id
  await call('PATCH', `/api/businesses/me/orders/${id}/accept`, { token: businessToken })
  await call('PATCH', `/api/businesses/me/orders/${id}/status`, { token: businessToken, body: { status: 'PREPARING' } })
  await call('PATCH', `/api/businesses/me/orders/${id}/status`, { token: businessToken, body: { status: 'READY' } })
  await call('PATCH', `/api/deliveries/me/orders/${id}/accept`, { token: deliveryToken })
  await call('PATCH', `/api/deliveries/me/orders/${id}/deliver`, { token: deliveryToken })
  return id
}

const orderId = await createDeliveredOrder()

// Sockets conectados antes de calificar
const businessSocket = await connect(businessToken)
const deliverySocket = await connect(deliveryToken)
const clientSocket = await connect(clientToken)

const rate = (path, body, token = clientToken) => call('POST', path, { token, body })

const r1 = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'BUSINESS', score: 5, comment: 'Excelente comida' })
expect('cliente califica negocio', r1.status === 201 && r1.data.rating.score === 5, r1)

const r2 = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'DELIVERY', score: 4, comment: 'Llegó rápido' })
expect('cliente califica domiciliario', r2.status === 201 && r2.data.rating.score === 4, r2)

const r3 = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'CLIENT', score: 5 }, businessToken)
expect('negocio califica cliente', r3.status === 201 && r3.data.rating.targetType === 'CLIENT', r3)

const r4 = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'CLIENT', score: 3 }, deliveryToken)
expect('domiciliario califica cliente', r4.status === 201, r4)

await wait(600)

expect('negocio recibe notificación en tiempo real', businessSocket.events.length === 1 && businessSocket.events[0].targetType === 'BUSINESS' && businessSocket.events[0].score === 5, businessSocket.events)
expect('domiciliario recibe notificación en tiempo real', deliverySocket.events.length === 1 && deliverySocket.events[0].targetType === 'DELIVERY', deliverySocket.events)
expect('cliente recibe dos notificaciones (negocio y domiciliario)', clientSocket.events.length === 2, clientSocket.events)

// Resumen del pedido
const orderRatings = await call('GET', `/api/ratings/orders/${orderId}`, { token: clientToken })
expect('el pedido tiene 4 calificaciones', orderRatings.data.ratings.length === 4, orderRatings.data.ratings?.length)

// Mi reputación (cliente)
const myRatings = await call('GET', '/api/ratings/me', { token: clientToken })
expect('reputación como cliente: promedio 4', myRatings.data.stats.client.average === 4 && myRatings.data.stats.client.count === 2, myRatings.data.stats)
expect('reputación como negocio del dueño', myRatings.data.stats.business.count === 0, myRatings.data.stats.business)

// Reputación del negocio y del domiciliario
const bizMe = await call('GET', '/api/businesses/me', { token: businessToken })
expect('perfil de empresa incluye promedio 5', bizMe.data.business.rating.average === 5 && bizMe.data.business.rating.count === 1, bizMe.data.business.rating)

const domiMe = await call('GET', '/api/deliveries/me', { token: deliveryToken })
expect('perfil de domiciliario incluye promedio 4', domiMe.data.delivery.rating.average === 4, domiMe.data.delivery.rating)

const catalog = await call('GET', `/api/catalog/businesses/${businessId}`)
expect('catálogo público incluye calificación del negocio', catalog.data.business.rating.average === 5 && catalog.data.business.rating.count === 1, catalog.data.business.rating)

const catalogList = await call('GET', '/api/catalog/businesses?limit=50')
const listed = catalogList.data.businesses.find((item) => item.id === businessId)
expect('listado de tiendas incluye calificación', listed?.rating.average === 5, listed?.rating)

// Actualizar calificación (sin duplicar ni re-notificar)
const update = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'BUSINESS', score: 4 })
expect('actualizar calificación responde 200', update.status === 200, update.status)
await wait(500)
expect('no se re-notifica al actualizar', businessSocket.events.length === 1, businessSocket.events.length)
const bizMe2 = await call('GET', '/api/businesses/me', { token: businessToken })
expect('promedio actualizado a 4', bizMe2.data.business.rating.average === 4, bizMe2.data.business.rating)

// Detalle del pedido incluye calificaciones
const orderDetail = await call('GET', `/api/orders/${orderId}`, { token: clientToken })
expect('el detalle del pedido trae 4 calificaciones', orderDetail.data.order.ratings.length === 4, orderDetail.data.order.ratings?.length)

// Validaciones
const badScore = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'BUSINESS', score: 9 })
expect('puntuación fuera de rango (400)', badScore.status === 400, badScore.status)

const notAllowed = await rate(`/api/ratings/orders/${orderId}`, { targetType: 'BUSINESS', score: 2 }, deliveryToken)
expect('domiciliario no puede calificar al negocio (403)', notAllowed.status === 403, notAllowed.status)

const pendingOrder = await call('POST', '/api/orders', {
  token: clientToken,
  body: { businessId, items: [{ productId, quantity: 1 }], address: 'Calle 1', city: 'Bogotá' },
})
const early = await rate(`/api/ratings/orders/${pendingOrder.data.order.id}`, { targetType: 'BUSINESS', score: 5 })
expect('no se puede calificar un pedido no entregado (409)', early.status === 409, early.status)

const otherUserToken = await register('Intruso Rating', `rt.other.${stamp}${domain}`)
const intruder = await call('GET', `/api/ratings/orders/${orderId}`, { token: otherUserToken })
expect('un ajeno no ve las calificaciones (403)', intruder.status === 403, intruder.status)

businessSocket.socket.close()
deliverySocket.socket.close()
clientSocket.socket.close()

console.log('\n===== RESUMEN =====')
const failed = results.filter((item) => !item.ok)
console.log(`Pruebas: ${results.length} | OK: ${results.length - failed.length} | Fallos: ${failed.length}`)
if (failed.length) {
  console.log(JSON.stringify(failed, null, 2))
  process.exitCode = 1
}
console.log(`EMAILS ${emails.client}|${emails.business}|${emails.delivery}|rt.other.${stamp}${domain}`)
