// Transiciones de estado de una focalización, compartidas entre la vista
// de Focalización por meta y la de Actividades por padrino: desde
// "pendiente" se puede pasar directo a "realizada" (sin pasar por
// "programada") o programar primero; desde "programada" se puede avanzar a
// "realizada" o volver a "pendiente" (por si se reprograma o se canceló la
// visita). "realizada" es terminal — no hay deshacer.
export function accionesEstadoFocalizacion(editarItem) {
  return {
    programar: (id, fecha) => editarItem(id, { estado: 'programada', fecha_programada: fecha }),
    marcarRealizada: (id, fecha) => editarItem(id, { estado: 'realizada', fecha_realizada: fecha }),
    volverAPendiente: (id) => editarItem(id, { estado: 'pendiente', fecha_programada: '' }),
  }
}
