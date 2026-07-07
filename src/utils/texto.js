// Coincidencia de texto libre, sin distinguir mayúsculas — usada por las
// cajas de búsqueda en vivo (sin botón, filtra mientras se escribe) de las
// tablas de visitas (focalizadas y sin focalizar).
export function coincideBusqueda(busqueda, ...campos) {
  if (!busqueda.trim()) return true
  const q = busqueda.trim().toLowerCase()
  return campos.some((c) => String(c || '').toLowerCase().includes(q))
}
