const GAS_URL = import.meta.env.VITE_GAS_URL

// El padrino es 100% solo lectura; el líder además puede reasignar padrino y
// cambiar el estado de su propia focalización/asignaciones (ver pestaña
// Focalización de LiderPanel), así que este archivo también expone editar().
// No crea ni elimina — eso sigue siendo exclusivo del panel admin, que tiene
// su propio utils/api.js con el resto de las mutaciones.
// GAS a veces responde con una página HTML en vez del JSON esperado (error
// transitorio de Google, cuota agotada, sesión caducada). res.json() lanzaría
// un error críptico y la operación fallaría en silencio — damos un mensaje claro.
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

export async function apiGet(action, params = {}) {
  const url = new URL(GAS_URL)
  url.searchParams.set('action', action)
  Object.entries(params).forEach(([clave, valor]) => url.searchParams.set(clave, valor))

  const res = await fetch(url)
  return leerRespuesta(res)
}

export async function editar(entidad, id, datos) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    // GAS no soporta preflight: text/plain evita que el navegador lo dispare.
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ accion: 'editar', entidad, id, datos }),
  })
  return leerRespuesta(res)
}
