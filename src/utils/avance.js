// Ejecutado por tipo de meta — compartido entre el resumen de admin y el
// panel de líder, que muestran exactamente el mismo cálculo:
// - visita_focalizada y visita_sin_focalizar: ambas cuentan filas de
//   `focalizacion` de esa meta con estado "realizada" — una visita sin
//   focalizar registrada (Registrar visita, en PanelAsignacionesMeta) es
//   una fila de `focalizacion` como cualquier otra, solo que nace directo
//   en estado "realizada" en vez de pasar por pendiente/programada.
// - otro_indicador ("Manual" en la interfaz): suma `cantidad` de los
//   registros de `avances_manuales` de esa meta, en vez de un campo crudo
//   editado a mano.
export function ejecutadoDe(meta, focalizacion, avancesManuales) {
  if (meta.tipo === 'otro_indicador') {
    return avancesManuales
      .filter((a) => String(a.meta_id) === String(meta.id))
      .reduce((sum, a) => sum + (Number(a.cantidad) || 0), 0)
  }
  if (meta.tipo === 'visita_focalizada' || meta.tipo === 'visita_sin_focalizar') {
    return focalizacion.filter((f) => String(f.meta_id) === String(meta.id) && f.estado === 'realizada').length
  }
  return 0
}

// Visitas programadas (con fecha, aún sin realizar) de una meta: lo que ya
// está "proyectado" para completar la meta. Las metas Manual no programan.
export function programadasDe(meta, focalizacion) {
  if (meta.tipo !== 'visita_focalizada' && meta.tipo !== 'visita_sin_focalizar') return 0
  return focalizacion.filter((f) => String(f.meta_id) === String(meta.id) && f.estado === 'programada').length
}
