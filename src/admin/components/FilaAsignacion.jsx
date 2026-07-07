import { useState } from 'react'

// Cantidad asignada (la cuota) es editable inline; cantidad realizada ya no
// se escribe a mano — la calcula quien usa esta fila contando las visitas
// registradas en `focalizacion` para esta meta+padrino (ver
// PanelAsignacionesMeta), y llega aquí como `realizada` de solo lectura.
// Si la cuota cambia por fuera (p.ej. sincronizarCuota la sube sola al
// registrar una visita), el padre le pasa una `key` que incluye
// cantidad_asignada para forzar un remount con el valor nuevo — el
// useState inicial no se vuelve a evaluar solo porque cambie la prop.
export default function FilaAsignacion({ item, padrinoNombre, realizada, onGuardar, onEliminar }) {
  const [asignada, setAsignada] = useState(item.cantidad_asignada)
  const [guardando, setGuardando] = useState(false)

  const cambio = Number(asignada) !== Number(item.cantidad_asignada)

  async function guardar() {
    setGuardando(true)
    try {
      await onGuardar(item.id, { cantidad_asignada: asignada })
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
      <td className="numero">{realizada}</td>
      <td className="celda-acciones">
        <button type="button" className="btn-primario" disabled={!cambio || guardando} onClick={guardar}>Guardar</button>{' '}
        <button
          type="button"
          className="btn-peligro"
          onClick={() => confirm('¿Eliminar esta asignación?') && onEliminar(item.id)}
        >
          Eliminar
        </button>
      </td>
    </tr>
  )
}
