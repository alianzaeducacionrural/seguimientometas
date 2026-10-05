import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal'
import { registrarManejadorDialogos } from '../utils/dialogos'

// Un único modal montado en la raíz de la app (ver App.jsx) que atiende
// todas las llamadas a confirmar()/avisar() de utils/dialogos.js — así
// cualquier componente, en cualquier parte del árbol, puede pedir una
// confirmación o mostrar un error sin tener que montar su propio modal ni
// pasar props de arriba abajo.
export default function DialogosGlobales() {
  const [dialogo, setDialogo] = useState(null)

  const mostrar = useCallback((opciones) => (
    new Promise((resolver) => setDialogo({ ...opciones, resolver }))
  ), [])

  useEffect(() => {
    registrarManejadorDialogos(mostrar)
    return () => registrarManejadorDialogos(null)
  }, [mostrar])

  if (!dialogo) return null

  const esConfirmacion = dialogo.tipo === 'confirmar'

  function cerrar(resultado) {
    dialogo.resolver(resultado)
    setDialogo(null)
  }

  return (
    <Modal
      abierto
      titulo={dialogo.titulo || (esConfirmacion ? 'Confirmar' : 'No se pudo completar')}
      onCerrar={() => cerrar(esConfirmacion ? false : undefined)}
    >
      <div className="formulario-modal">
        <p className="vista-descripcion dialogo-mensaje">{dialogo.mensaje}</p>
        <div className="modal-pie">
          {esConfirmacion && (
            <button type="button" onClick={() => cerrar(false)}>Cancelar</button>
          )}
          <button
            type="button"
            className={esConfirmacion ? 'btn-peligro' : 'btn-primario'}
            autoFocus
            onClick={() => cerrar(esConfirmacion ? true : undefined)}
          >
            {esConfirmacion ? (dialogo.textoConfirmar || 'Eliminar') : 'Aceptar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
