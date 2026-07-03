// Insignia de estado de una focalización (paleta de estado del sistema:
// nunca color-solo, el punto de color siempre va acompañado del texto).
const ETIQUETAS = {
  pendiente: 'Pendiente',
  programada: 'Programada',
  realizada: 'Realizada',
}

export default function EstadoFocalizacion({ estado }) {
  const clase = ETIQUETAS[estado] ? `insignia-${estado}` : 'insignia-neutra'
  return <span className={`insignia ${clase}`}>{ETIQUETAS[estado] || estado}</span>
}
