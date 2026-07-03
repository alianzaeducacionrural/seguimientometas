// Google Sheets guarda las columnas de fecha como Date; GAS las devuelve
// serializadas como timestamp ISO completo (con hora/zona). soloFecha() se
// usa para alimentar <input type="date"> (exige YYYY-MM-DD). formatearFecha()
// es para mostrar en pantalla, siempre en dd/mm/aaaa.
export function soloFecha(valor) {
  if (!valor) return ''
  return String(valor).slice(0, 10)
}

export function formatearFecha(valor) {
  const iso = soloFecha(valor)
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}
