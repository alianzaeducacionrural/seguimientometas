const GAS_URL = import.meta.env.VITE_GAS_URL

async function apiPost(body) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    // GAS no soporta preflight: text/plain evita que el navegador lo dispare.
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  const datos = await res.json()
  if (!datos.ok) throw new Error(datos.error || 'Error desconocido')
  return datos
}

export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([clave, valor]) => url.searchParams.set(clave, valor))

  const res = await fetch(url)
  const datos = await res.json()
  if (!datos.ok) throw new Error(datos.error || 'Error desconocido')
  return datos
}

export function crear(entidad, datos) {
  return apiPost({ accion: 'crear', entidad, datos })
}

export function editar(entidad, id, datos) {
  return apiPost({ accion: 'editar', entidad, id, datos })
}

export function eliminar(entidad, id) {
  return apiPost({ accion: 'eliminar', entidad, id })
}

// Crea usuarios rol "padrino" para todos los padrinos del catálogo externo
// que aún no existan (deduplica por correo en el servidor — idempotente).
export function importarPadrinos() {
  return apiPost({ accion: 'importarPadrinos' })
}
