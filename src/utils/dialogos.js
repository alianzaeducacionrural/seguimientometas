// API imperativa para confirmaciones y avisos con el modal propio de la
// página (en vez de confirm()/alert() del navegador, que no se pueden
// estilizar y en iOS/Safari bloquean el hilo de forma distinta a como lo
// esperan los componentes). <DialogosGlobales/> (montado una vez en
// App.jsx) registra el manejador real; si por lo que sea no se montó
// todavía, se cae de vuelta a confirm()/alert() nativos para no romper.
let mostrarInterno = null

export function registrarManejadorDialogos(fn) {
  mostrarInterno = fn
}

// Devuelve una promesa que resuelve a true/false según el botón elegido.
export function confirmar(mensaje, opciones = {}) {
  if (!mostrarInterno) return Promise.resolve(window.confirm(mensaje))
  return mostrarInterno({ tipo: 'confirmar', mensaje, ...opciones })
}

// Devuelve una promesa que resuelve cuando se cierra el aviso.
export function avisar(mensaje, opciones = {}) {
  if (!mostrarInterno) {
    window.alert(mensaje)
    return Promise.resolve()
  }
  return mostrarInterno({ tipo: 'aviso', mensaje, ...opciones })
}
