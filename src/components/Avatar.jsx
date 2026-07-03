import { colorPorId } from '../utils/colores'

// Círculo de iniciales con el color estable de la persona (colorPorId por
// id, igual que las tarjetas), para reconocerla de un vistazo en tablas.
export default function Avatar({ id, nombre, tamano = 30 }) {
  const iniciales = String(nombre || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

  return (
    <span
      className="avatar"
      style={{ background: colorPorId(id), width: tamano, height: tamano, fontSize: tamano * 0.38 }}
      aria-hidden="true"
    >
      {iniciales}
    </span>
  )
}
