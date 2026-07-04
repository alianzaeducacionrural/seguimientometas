// Totales de carga por padrino, compartidos entre el admin (Actividades por
// padrino) y el líder (carga de su equipo): una focalización cuenta 1
// visita (asignada siempre; realizada solo si su estado es "realizada");
// una asignación sin focalizar aporta su cantidad_asignada/realizada.
// Pendientes = asignadas - realizadas, igual que en cualquier otro resumen
// de avance de la app.
export function totalesDe(padrinoId, focalizacion, asignaciones) {
  const focDelPadrino = focalizacion.filter((f) => String(f.padrino_id) === String(padrinoId))
  const asigDelPadrino = asignaciones.filter((a) => String(a.padrino_id) === String(padrinoId))

  const asignadas = focDelPadrino.length
    + asigDelPadrino.reduce((s, a) => s + (Number(a.cantidad_asignada) || 0), 0)
  const realizadas = focDelPadrino.filter((f) => f.estado === 'realizada').length
    + asigDelPadrino.reduce((s, a) => s + (Number(a.cantidad_realizada) || 0), 0)

  return { asignadas, realizadas, pendientes: asignadas - realizadas }
}

// Enriquece una focalización/asignación con el nombre del convenio y la
// descripción de la meta a la que pertenece, buscando en los mapas ya
// indexados por id — evita que cada tarjeta tenga que volver a buscarlos.
export function conContexto(item, metaPorId, convenioPorId) {
  const meta = metaPorId[String(item.meta_id)]
  const convenio = meta && convenioPorId[String(meta.convenio_id)]
  return { ...item, meta_descripcion: meta?.descripcion || '—', convenio_nombre: convenio?.nombre || '—' }
}
