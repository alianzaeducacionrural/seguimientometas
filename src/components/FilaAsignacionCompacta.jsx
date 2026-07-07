import { useState } from 'react'

// Una cuota sin focalizar (sin sede fija), con su propio reasignar — no
// tiene visitas individuales que listar, solo el agregado asignada/realizada.
// `realizadas` viene calculado por quien la usa (contando las visitas
// registradas en `focalizacion` para esta meta+padrino, ver
// PanelAsignacionesMeta) — el campo crudo cantidad_realizada ya no se usa.
// Se reutiliza en Actividades por padrino (admin) y en la pestaña de
// Focalización del panel de líder.
export default function FilaAsignacionCompacta({ item, padrinos, realizadas, onReasignar }) {
  const [guardando, setGuardando] = useState(false)
  const pendiente = (Number(item.cantidad_asignada) || 0) - realizadas

  async function reasignar(nuevoPadrinoId) {
    setGuardando(true)
    try {
      await onReasignar(item.id, nuevoPadrinoId)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <tr>
      <td>{item.convenio_nombre}</td>
      <td>{item.meta_descripcion}</td>
      <td className="numero">{item.cantidad_asignada}</td>
      <td className="numero">{realizadas}</td>
      <td className="numero">{pendiente}</td>
      <td>
        <select value={item.padrino_id || ''} disabled={guardando} onChange={(e) => reasignar(e.target.value)}>
          <option value="">Sin asignar</option>
          {padrinos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </td>
    </tr>
  )
}
