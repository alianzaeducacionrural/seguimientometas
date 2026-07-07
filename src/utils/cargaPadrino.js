// Totales de carga por padrino, compartidos entre el admin (Actividades por
// padrino) y el líder (carga de su equipo). Una fila de `focalizacion`
// puede venir de dos fuentes muy distintas y hay que tratarlas distinto:
// - meta visita_focalizada: sede preasignada de antemano → cuenta siempre
//   en "asignadas" (haya pasado o no), y en "realizadas" si su estado es
//   "realizada".
// - meta visita_sin_focalizar: fila creada por "Registrar visita" (nace
//   directo en estado "realizada" porque ya ocurrió) → siempre cuenta en
//   "realizadas", y también en "asignadas" — cada visita ya hecha prueba
//   que como mínimo había esa "asignación", así que la cuota
//   (cantidad_asignada) y lo ya registrado no se suman aparte: se toma el
//   mayor de los dos. Si no fuera así, un padrino que ya hizo más visitas
//   de las que tenía en cuota mostraría "pendientes" negativos a nivel
//   agregado que no cuadran con las tarjetas (que solo pueden mostrar
//   pendientes de visita_focalizada, la única con estado "pendiente" real).
// Pendientes = asignadas - realizadas, igual que en cualquier otro resumen
// de avance de la app. `metaPorId` es requerido para distinguir el tipo.
export function totalesDe(padrinoId, focalizacion, asignaciones, metaPorId) {
  const focDelPadrino = focalizacion.filter((f) => String(f.padrino_id) === String(padrinoId))
  const focPreasignada = focDelPadrino.filter((f) => metaPorId?.[String(f.meta_id)]?.tipo !== 'visita_sin_focalizar')
  const focSinFocalizarRegistrada = focDelPadrino.filter((f) => metaPorId?.[String(f.meta_id)]?.tipo === 'visita_sin_focalizar')
  const asigDelPadrino = asignaciones.filter((a) => String(a.padrino_id) === String(padrinoId))

  const cuotaSinFocalizar = asigDelPadrino.reduce((s, a) => s + (Number(a.cantidad_asignada) || 0), 0)
  const asignadas = focPreasignada.length + Math.max(cuotaSinFocalizar, focSinFocalizarRegistrada.length)
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
    proyecto_id: meta?.proyecto_id || '',
  }
}
