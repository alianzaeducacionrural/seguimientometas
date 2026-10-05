import { useState } from 'react'
import Spinner from '../../components/Spinner'

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
  const [accionEnCurso, setAccionEnCurso] = useState('')

  const cambio = Number(asignada) !== Number(item.cantidad_asignada)

  async function guardar() {
    setAccionEnCurso('Guardando…')
    setGuardando(true)
    try {
      await onGuardar(item.id, { cantidad_asignada: asignada })
    } catch (err) {
      alert(`No se pudo guardar: ${err.message}`)
    } finally {
      setGuardando(false)
      setAccionEnCurso('')
    }
  }

  async function eliminar() {
    if (!confirm('¿Eliminar esta asignación?')) return
    setAccionEnCurso('Eliminando…')
    setGuardando(true)
    try {
      await onEliminar(item.id)
    } catch (err) {
      alert(`No se pudo eliminar: ${err.message}`)
      setGuardando(false)
      setAccionEnCurso('')
    }
  }

  return (
    <tr className={guardando ? 'fila-en-curso' : undefined}>
      <td>{padrinoNombre}</td>
      <td>
        <input
          type="number"
          min="0"
          value={asignada}
          disabled={guardando}
          onChange={(e) => setAsignada(e.target.value)}
          style={{ width: '5em' }}
        />
      </td>
      <td className="numero">{realizada}</td>
      <td className="celda-acciones">
        {guardando ? (
          <Spinner texto={accionEnCurso || 'Procesando…'} />
        ) : (
          <>
            <button type="button" className="btn-primario" disabled={!cambio} onClick={guardar}>Guardar</button>{' '}
            <button type="button" className="btn-peligro" onClick={eliminar}>Eliminar</button>
          </>
        )}
      </td>
    </tr>
  )
}
