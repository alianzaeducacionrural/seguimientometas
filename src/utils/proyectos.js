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
