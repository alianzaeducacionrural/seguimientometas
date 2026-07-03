const GAS_URL = import.meta.env.VITE_GAS_URL

// GET-only: lo usan las vistas de líder y padrino, que solo leen (el token
// ya viene filtrado por rol desde el servidor). El panel admin tiene su
// propio utils/api.js con las mutaciones (crear/editar/eliminar).
export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([clave, valor]) => url.searchParams.set(clave, valor))

  const res = await fetch(url)
  const datos = await res.json()
  if (!datos.ok) throw new Error(datos.error || 'Error desconocido')
  return datos
}
