import { useEffect } from 'react'

// Modal compartido: overlay con desenfoque, tarjeta animada, cierre con
// Escape, clic afuera o el botón ×. El contenido (formulario) lo pone el
// que lo usa; el pie va dentro del propio formulario para que el submit
// funcione con Enter.
export default function Modal({ titulo, abierto, onCerrar, children }) {
  useEffect(() => {
    if (!abierto) return
    const alTeclear = (e) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = ''
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  return (
    <div
      className="modal-fondo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <header className="modal-cabecera">
          <h3>{titulo}</h3>
          <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </header>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  )
}
