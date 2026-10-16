import { useState } from 'react'
import Spinner from '../../components/Spinner'
import { formatearFecha, hoy, soloFecha } from '../../utils/formato'
import { avisar, confirmar } from '../../utils/dialogos'

// Acciones sobre el estado de UNA visita: programar / reprogramar, marcar
// realizada, volver a pendiente, corregir la fecha de una realizada y
// eliminar. Transiciones: pendiente → programada o directo a realizada;
// programada → realizada o de vuelta a pendiente; realizada se corrige o
// vuelve a pendiente. Mientras una acción está en curso se muestra un
// spinner con su nombre y se avisa al padre (onOcupado) para bloquear la fila.
// Se usa tanto en la fila del árbol "Por convenio" como en el panel lateral.
export default function AccionesVisita({ item, onProgramar, onMarcarRealizada, onVolverPendiente, onEliminar, onOcupado, bloqueado = false }) {
  const [fecha, setFecha] = useState(item.estado === 'programada' ? soloFecha(item.fecha_programada) || hoy() : hoy())
  const [accionEnCurso, setAccionEnCurso] = useState('')
  const [corrigiendo, setCorrigiendo] = useState(false)

  function ocupar(texto) {
    setAccionEnCurso(texto)
    onOcupado?.(true)
  }

  function liberar() {
    setAccionEnCurso('')
    onOcupado?.(false)
  }

  async function ejecutar(accion, texto, conFecha = true) {
    ocupar(texto)
    try {
      if (conFecha) await accion(item.id, fecha)
      else await accion(item.id)
      setCorrigiendo(false)
    } catch (err) {
      await avisar(`No se pudo completar la acción: ${err.message}`)
    } finally {
      liberar()
    }
  }

  async function eliminar() {
    if (!(await confirmar('¿Eliminar esta focalización?'))) return
    ocupar('Eliminando…')
    try {
      await onEliminar(item.id)
    } catch (err) {
      await avisar(`No se pudo eliminar: ${err.message}`)
      liberar()
    }
    // Si onEliminar tuvo éxito la visita desaparece y este componente se
    // desmonta con ella — no se toca estado de un componente ya desmontado.
  }

  function abrirCorreccion() {
    setFecha(soloFecha(item.fecha_realizada) || hoy())
    setCorrigiendo(true)
  }

  if (accionEnCurso) return <Spinner texto={accionEnCurso} />
  // Otra parte de la fila (p.ej. el selector de padrino) está guardando.
  if (bloqueado) return <Spinner texto="Guardando…" />

  // Todas las acciones (incl. Eliminar) van juntas y envuelven: así Eliminar
  // siempre queda visible aunque el contenedor sea angosto.
  return (
    <div className="acciones-foco">
      {item.estado === 'pendiente' && (
        <>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <button type="button" onClick={() => ejecutar(onProgramar, 'Programando…')}>Programar</button>
          <button type="button" onClick={() => ejecutar(onMarcarRealizada, 'Marcando como realizada…')}>Marcar realizada</button>
        </>
      )}
      {item.estado === 'programada' && (
        <>
          <span className="acciones-foco__nota">Programada: {formatearFecha(item.fecha_programada)}</span>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <button type="button" disabled={fecha === soloFecha(item.fecha_programada)} onClick={() => ejecutar(onProgramar, 'Reprogramando…')}>Reprogramar</button>
          <button type="button" onClick={() => ejecutar(onMarcarRealizada, 'Marcando como realizada…')}>Marcar realizada</button>
          <button type="button" className="btn-peligro" onClick={() => ejecutar(onVolverPendiente, 'Volviendo a pendiente…', false)}>
            Volver a pendiente
          </button>
        </>
      )}
      {item.estado === 'realizada' && (
        corrigiendo ? (
          <>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <button type="button" onClick={() => ejecutar(onMarcarRealizada, 'Guardando fecha…')}>Guardar fecha</button>
            <button type="button" className="btn-peligro" onClick={() => ejecutar(onVolverPendiente, 'Volviendo a pendiente…', false)}>
              Volver a pendiente
            </button>
            <button type="button" onClick={() => setCorrigiendo(false)}>Cancelar</button>
          </>
        ) : (
          <>
            <span className="acciones-foco__nota">Realizada: {formatearFecha(item.fecha_realizada)}</span>
            <button type="button" onClick={abrirCorreccion}>Corregir</button>
          </>
        )
      )}
      <button type="button" className="btn-peligro" onClick={eliminar}>Eliminar</button>
    </div>
  )
}
