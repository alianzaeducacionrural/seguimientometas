import { useState } from 'react'
import Spinner from '../../components/Spinner'
import { avisar } from '../../utils/dialogos'

// Selector del padrino (o líder) responsable de una visita. Reasigna de
// inmediato al elegir; mientras guarda muestra un spinner y avisa al padre
// (onOcupado) para que bloquee el resto de la fila.
export default function SelectorPadrino({ item, padrinos, onReasignar, disabled = false, onOcupado }) {
  const [guardando, setGuardando] = useState(false)

  async function reasignar(nuevoPadrinoId) {
    setGuardando(true)
    onOcupado?.(true)
    try {
      await onReasignar(item.id, nuevoPadrinoId)
    } catch (err) {
      await avisar(`No se pudo reasignar: ${err.message}`)
    } finally {
      setGuardando(false)
      onOcupado?.(false)
    }
  }

  if (guardando) return <Spinner texto="Reasignando…" />

  return (
    <select value={item.padrino_id || ''} disabled={disabled} onChange={(e) => reasignar(e.target.value)}>
      <option value="">Sin asignar</option>
      {padrinos.map((p) => (
        <option key={p.id} value={p.id}>{p.nombre}</option>
      ))}
    </select>
  )
}
