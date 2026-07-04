// Chevron de acordeón compartido: rota 90° y se pinta aguamarina cuando el
// panel que controla está abierto. Usado por TablaCrud y por cualquier
// otra fila expandible (p.ej. ActividadesPadrino).
export default function Flecha({ abierta }) {
  return (
    <svg
      className={`flecha-acordeon${abierta ? ' abierta' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}
