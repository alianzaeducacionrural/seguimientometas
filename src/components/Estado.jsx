// Estados compartidos de todas las vistas: cargando (con girador), error
// (aviso rojo cereza) y vacío (tarjeta punteada con invitación a actuar).
export function Cargando() {
  return (
    <div className="estado-cargando">
      <span className="girador" aria-hidden="true" />
      Cargando…
    </div>
  )
}

export function AvisoError({ children }) {
  return <p className="aviso-error">{children}</p>
}

export function Vacio({ children }) {
  return <p className="estado-vacio">{children}</p>
}
