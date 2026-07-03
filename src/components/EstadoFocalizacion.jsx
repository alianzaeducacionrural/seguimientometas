// Colores de estado (paleta de status, nunca color-solo: siempre va con texto).
const COLOR_POR_ESTADO = {
  pendiente: '#898781',
  programada: '#fab219',
  realizada: '#0ca30c',
}

export default function EstadoFocalizacion({ estado }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: COLOR_POR_ESTADO[estado] || '#898781',
          display: 'inline-block',
        }}
      />
      {estado}
    </span>
  )
}
