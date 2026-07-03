import { useState } from 'react'

// Cantidad asignada y cantidad realizada son editables inline; el botón
// "Guardar" solo se habilita si algo cambió respecto a lo ya persistido,
// para no disparar guardados innecesarios en cada tecla.
export default function FilaAsignacion({ item, padrinoNombre, onGuardar, onEliminar }) {
  const [asignada, setAsignada] = useState(item.cantidad_asignada)
  const [realizada, setRealizada] = useState(item.cantidad_realizada || 0)
  const [guardando, setGuardando] = useState(false)

  const cambio = Number(asignada) !== Number(item.cantidad_asignada)
    || Number(realizada) !== Number(item.cantidad_realizada || 0)

  async function guardar() {
    setGuardando(true)
    try {
      await onGuardar(item.id, { cantidad_asignada: asignada, cantidad_realizada: realizada })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <tr>
      <td>{padrinoNombre}</td>
      <td>
        <input type="number" min="0" value={asignada} onChange={(e) => setAsignada(e.target.value)} style={{ width: '5em' }} />
      </td>
      <td>
        <input type="number" min="0" value={realizada} onChange={(e) => setRealizada(e.target.value)} style={{ width: '5em' }} />
      </td>
      <td>
        <button type="button" disabled={!cambio || guardando} onClick={guardar}>Guardar</button>{' '}
        <button type="button" onClick={() => onEliminar(item.id)}>Eliminar</button>
      </td>
    </tr>
  )
}
