// Totales de carga por padrino, compartidos entre el admin (Actividades por
// padrino) y el líder (carga de su equipo). Una fila de `focalizacion`
// puede venir de dos fuentes muy distintas y hay que tratarlas distinto:
// - meta visita_focalizada: sede preasignada de antemano → cuenta siempre
//   en "asignadas" (haya pasado o no), y en "realizadas" si su estado es
//   "realizada".
// - meta visita_sin_focalizar: fila creada por "Registrar visita" (nace
//   directo en estado "realizada", nunca fue "asignada" de antemano) → no
//   suma en "asignadas" (eso ya lo aporta la cuota de la asignación), solo
//   en "realizadas".
// Las asignaciones sin focalizar aportan su cantidad_asignada (la cuota)
// a "asignadas"; su cantidad_realizada ya no se usa (el realizado real se
// cuenta desde `focalizacion`, ver ejecutadoDe en avance.js).
// Pendientes = asignadas - realizadas, igual que en cualquier otro resumen
// de avance de la app. `metaPorId` es requerido para distinguir el tipo.
export function totalesDe(padrinoId, focalizacion, asignaciones, metaPorId) {
  const focDelPadrino = focalizacion.filter((f) => String(f.padrino_id) === String(padrinoId))
  const focPreasignada = focDelPadrino.filter((f) => metaPorId?.[String(f.meta_id)]?.tipo !== 'visita_sin_focalizar')
  const focSinFocalizarRegistrada = focDelPadrino.filter((f) => metaPorId?.[String(f.meta_id)]?.tipo === 'visita_sin_focalizar')
  const asigDelPadrino = asignaciones.filter((a) => String(a.padrino_id) === String(padrinoId))

  const asignadas = focPreasignada.length
    + asigDelPadrino.reduce((s, a) => s + (Number(a.cantidad_asignada) || 0), 0)
  const realizadas = focPreasignada.filter((f) => f.estado === 'realizada').length
    + focSinFocalizarRegistrada.length

  return { asignadas, realizadas, pendientes: asignadas - realizadas }
}

// Enriquece una focalización/asignación con el nombre del convenio, la
// descripción de la meta y el nombre del proyecto a los que pertenece,
// buscando en los mapas ya indexados por id — evita que cada tarjeta tenga
// que volver a buscarlos. `proyectoPorId` es opcional (solo lo necesitan las
// vistas que muestran el proyecto en la tarjeta).
export function conContexto(item, metaPorId, convenioPorId, proyectoPorId) {
  const meta = metaPorId[String(item.meta_id)]
  const convenio = meta && convenioPorId[String(meta.convenio_id)]
  const proyecto = proyectoPorId && meta && proyectoPorId[String(meta.proyecto_id)]
  return {
    ...item,
    meta_descripcion: meta?.descripcion || '—',
    convenio_nombre: convenio?.nombre || '—',
    proyecto_nombre: proyecto?.nombre || '',
  }
}
