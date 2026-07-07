// Los 7 proyectos siempre se muestran en el mismo orden en toda la app
// (Escuela Nueva, Posprimaria, Educación Media, Escuela y Café, Seguridad
// Alimentaria, Escuela Virtual, La Universidad en el Campo) — el orden en
// que están en la hoja `proyectos` (ids 1-7). Nunca el orden en que
// quedaron guardados los ids en un campo `..._ids` (comma-list), que
// depende del orden en que se fueron marcando los checkboxes.
export function idsDeLista(valor) {
  return String(valor || '').split(',').map((v) => v.trim()).filter(Boolean)
}

export function nombresProyectosDe(idsTexto, proyectos) {
  const ids = idsDeLista(idsTexto)
  return proyectos.filter((p) => ids.includes(String(p.id))).map((p) => p.nombre)
}

// Posición de un proyecto en el orden fijo del catálogo (Infinity si no se
// encuentra, para que quede al final en vez de reventar el ordenamiento).
// Se usa para ordenar listas de items que ya traen su propio proyecto_id
// (p.ej. las tarjetas de visita en Actividades por padrino / panel líder).
export function ordenDeProyecto(proyectoId, proyectos) {
  const i = proyectos.findIndex((p) => String(p.id) === String(proyectoId))
  return i === -1 ? Infinity : i
}

// Ordena una lista de items (cada uno con `proyecto_id`) por el orden fijo
// del catálogo de proyectos, manteniendo el orden relativo original entre
// items del mismo proyecto.
export function ordenarPorProyecto(items, proyectos) {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => ordenDeProyecto(a.item.proyecto_id, proyectos) - ordenDeProyecto(b.item.proyecto_id, proyectos) || a.i - b.i)
    .map(({ item }) => item)
}
