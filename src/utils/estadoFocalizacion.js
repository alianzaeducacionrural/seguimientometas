import { soloFecha } from './formato'

// Transiciones de estado de una focalización, compartidas entre la vista
// de Focalización por meta y la de Actividades por padrino: desde
// "pendiente" se puede pasar directo a "realizada" (sin pasar por
// "programada") o programar primero; desde "programada" se puede avanzar a
// "realizada" o volver a "pendiente" (por si se reprograma o se canceló la
// visita). "realizada" también se puede corregir: volver a pendiente (limpia
// las fechas) o remarcar realizada con otra fecha, por si se registró mal.
// Fecha que "cuenta" de una visita (YYYY-MM-DD): la realizada si ya se hizo,
// la programada si está programada, '' si está pendiente.
export function fechaVisita(f) {
  const v = f.estado === 'realizada' ? f.fecha_realizada : f.estado === 'programada' ? f.fecha_programada : ''
  return soloFecha(v)
}

export function accionesEstadoFocalizacion(editarItem) {
  return {
    programar: (id, fecha) => editarItem(id, { estado: 'programada', fecha_programada: fecha }),
    marcarRealizada: (id, fecha) => editarItem(id, { estado: 'realizada', fecha_realizada: fecha }),
    // Sirve tanto para volver desde "programada" como desde "realizada": limpia
    // ambas fechas para no dejar una fecha huérfana de un estado anterior.
    volverAPendiente: (id) => editarItem(id, { estado: 'pendiente', fecha_programada: '', fecha_realizada: '' }),
  }
}
