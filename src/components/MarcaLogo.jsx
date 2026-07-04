// Isotipo de la plataforma: hoja de cafeto sobre azul aguamarina. SVG
// inline para no depender de assets externos (GitHub Pages + basename).
// `invertido` es para fondos aguamarina (barra lateral, bandas): cuadro
// blanco con hoja aguamarina.
export default function MarcaLogo({ tamano = 34, invertido = false }) {
  const fondo = invertido ? '#ffffff' : 'var(--aguamarina)'
  const hoja = invertido ? 'var(--aguamarina)' : '#ffffff'
  return (
    <span className="marca-logo" aria-hidden="true">
      <svg width={tamano} height={tamano} viewBox="0 0 34 34">
        <rect width="34" height="34" rx="9" fill={fondo} />
        <path
          d="M24.5 9.5C17 9.9 12.2 14.6 11 24c9.4-1.2 14.1-6 13.5-14.5z"
          fill={hoja}
          opacity="0.92"
        />
        <path
          d="M23 11c-4.5 1.8-8.3 5.6-10 12"
          stroke={fondo}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}
