// Ejecutado por tipo de meta — compartido entre el resumen de admin y el
// panel de líder, que muestran exactamente el mismo cálculo:
// - otro_indicador: el admin lo captura directo sobre la meta.
// - visita_focalizada: cuenta las focalizaciones de esa meta con estado
//   "realizada".
// - visita_sin_focalizar: suma cantidad_realizada de las asignaciones de
//   esa meta.
export function ejecutadoDe(meta, focalizacion, asignaciones) {
  if (meta.tipo === 'otro_indicador') return Number(meta.cantidad_realizada) || 0
  if (meta.tipo === 'visita_focalizada') {
    return focalizacion.filter((f) => String(f.meta_id) === String(meta.id) && f.estado === 'realizada').length
  }
  if (meta.tipo === 'visita_sin_focalizar') {
    return asignaciones
      .filter((a) => String(a.meta_id) === String(meta.id))
      .reduce((sum, a) => sum + (Number(a.cantidad_realizada) || 0), 0)
  }
  return 0
}
