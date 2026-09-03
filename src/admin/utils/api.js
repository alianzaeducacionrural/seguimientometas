const GAS_URL = import.meta.env.VITE_GAS_URL

// GAS a veces responde con una página HTML en vez del JSON esperado (error
// transitorio de Google, cuota agotada, sesión caducada, mantenimiento). Si
// eso pasa, res.json() lanza un SyntaxError críptico ("Unexpected token '<'")
// y la operación falla en silencio. Leemos el texto y damos un mensaje claro.
async function leerRespuesta(res) {
  const texto = await res.text()
  let datos
  try {
    datos = JSON.parse(texto)
  } catch {
    throw new Error(
      'El servidor no respondió correctamente (puede ser una caída momentánea de Google). '
      + 'Espera unos segundos y vuelve a intentarlo.',
    )
  }
  if (!datos.ok) throw new Error(datos.error || 'Error desconocido')
  return datos
}

async function apiPost(body) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    // GAS no soporta preflight: text/plain evita que el navegador lo dispare.
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body),
  })
  return leerRespuesta(res)
}

export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([clave, valor]) => url.searchParams.set(clave, valor))

  const res = await fetch(url)
  return leerRespuesta(res)
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

// Inhabilita un profesional: lo marca inactivo y deja "sin asignar" sus
// visitas (y elimina sus cuotas). Devuelve { ok, reasignadas }.
export function inhabilitarUsuario(id) {
  return apiPost({ accion: 'inhabilitarUsuario', id })
}
