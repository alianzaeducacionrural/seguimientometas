import { useState } from 'react'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import Spinner from '../../components/Spinner'
import { formatearFecha, hoy, soloFecha } from '../../utils/formato'
import { avisar, confirmar } from '../../utils/dialogos'

// Una fila de focalización: reasignar padrino es inmediato; programar,
// marcar realizada y volver a pendiente piden confirmación (fecha o
// ninguna), así que cada fila necesita su propio estado local para el
// input de fecha sin afectar a las demás.
// Transiciones permitidas: pendiente → programada o directo a realizada;
// programada → realizada o de vuelta a pendiente; realizada es terminal.
// Mientras cualquier acción está en curso, toda la fila queda bloqueada y
// muestra un spinner con el nombre de la acción — antes el único indicio
// era el texto de un botón, fácil de perderse mientras GAS responde.
export default function FilaFocalizacion({ item, padrinos, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente, onEliminar, celdasIniciales = null, ubicacionJunta = false }) {
  const [fecha, setFecha] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [accionEnCurso, setAccionEnCurso] = useState('')
  // Edición de una visita ya realizada (por si se registró por error).
  const [corrigiendo, setCorrigiendo] = useState(false)

  async function ejecutar(accion, texto, conFecha = true) {
    setAccionEnCurso(texto)
    setGuardando(true)
    try {
      if (conFecha) await accion(item.id, fecha)
      else await accion(item.id)
      setCorrigiendo(false)
    } catch (err) {
      await avisar(`No se pudo completar la acción: ${err.message}`)
    } finally {
      setGuardando(false)
      setAccionEnCurso('')
    }
  }

  async function reasignar(nuevoPadrinoId) {
    setAccionEnCurso('Reasignando…')
    setGuardando(true)
    try {
      await onReasignar(item.id, nuevoPadrinoId)
    } catch (err) {
      await avisar(`No se pudo reasignar: ${err.message}`)
    } finally {
      setGuardando(false)
      setAccionEnCurso('')
    }
  }

  async function eliminar() {
    if (!(await confirmar('¿Eliminar esta focalización?'))) return
    setAccionEnCurso('Eliminando…')
    setGuardando(true)
    try {
      await onEliminar(item.id)
    } catch (err) {
      await avisar(`No se pudo eliminar: ${err.message}`)
      setGuardando(false)
      setAccionEnCurso('')
    }
    // Si onEliminar tuvo éxito la fila desaparece con la propia visita — no
    // hace falta (ni conviene) tocar estado en un componente ya desmontado.
  }

  function abrirCorreccion() {
    setFecha(soloFecha(item.fecha_realizada) || hoy())
    setCorrigiendo(true)
  }

  return (
    <tr className={guardando ? 'fila-en-curso' : undefined}>
      {celdasIniciales}
      {ubicacionJunta ? (
        <td className="celda-ubicacion">
          <div>{item.municipio}</div>
          <div className="celda-ubicacion-sub">{[item.institucion, item.sede].filter(Boolean).join(' · ')}</div>
        </td>
      ) : (
        <>
          <td>{item.municipio}</td>
          <td>{item.institucion}</td>
          <td>{item.sede}</td>
        </>
      )}
      <td>
        <select
          value={item.padrino_id || ''}
          disabled={guardando}
          onChange={(e) => reasignar(e.target.value)}
        >
          <option value="">Sin asignar</option>
          {padrinos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </td>
      <td><EstadoFocalizacion estado={item.estado} /></td>
      <td>
        {/* Todas las acciones (incl. Eliminar) van en la misma celda y
            envuelven: antes Eliminar estaba en una columna aparte al final
            que, en los paneles embebidos (Focalización → por convenio), se
            salía del ancho visible con estados "programada"/"realizada" y
            parecía que no se podía borrar. */}
        {guardando ? (
          <Spinner texto={accionEnCurso || 'Procesando…'} />
        ) : (
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
        )}
      </td>
    </tr>
  )
}
