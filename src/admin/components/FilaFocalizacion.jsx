import { useState } from 'react'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import { formatearFecha } from '../../utils/formato'

const HOY = () => new Date().toISOString().slice(0, 10)

// Una fila de focalización: reasignar padrino es inmediato; programar,
// marcar realizada y volver a pendiente piden confirmación (fecha o
// ninguna), así que cada fila necesita su propio estado local para el
// input de fecha sin afectar a las demás.
// Transiciones permitidas: pendiente → programada o directo a realizada;
// programada → realizada o de vuelta a pendiente; realizada es terminal.
export default function FilaFocalizacion({ item, padrinos, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente, onEliminar }) {
  const [fecha, setFecha] = useState(HOY())
  const [guardando, setGuardando] = useState(false)

  async function ejecutar(accion, conFecha = true) {
    setGuardando(true)
    try {
      if (conFecha) await accion(item.id, fecha)
      else await accion(item.id)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <tr>
      <td>{item.municipio}</td>
      <td>{item.institucion}</td>
      <td>{item.sede}</td>
      <td>
        <select
          value={item.padrino_id || ''}
          onChange={(e) => onReasignar(item.id, e.target.value)}
        >
          <option value="">Sin asignar</option>
          {padrinos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </td>
      <td><EstadoFocalizacion estado={item.estado} /></td>
      <td>
        {item.estado === 'pendiente' && (
          <>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />{' '}
            <button type="button" disabled={guardando} onClick={() => ejecutar(onProgramar)}>Programar</button>{' '}
            <button type="button" disabled={guardando} onClick={() => ejecutar(onMarcarRealizada)}>Marcar realizada</button>
          </>
        )}
        {item.estado === 'programada' && (
          <>
            <span>Programada: {formatearFecha(item.fecha_programada)}</span><br />
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />{' '}
            <button type="button" disabled={guardando} onClick={() => ejecutar(onMarcarRealizada)}>Marcar realizada</button>{' '}
            <button type="button" className="btn-peligro" disabled={guardando} onClick={() => ejecutar(onVolverPendiente, false)}>
              Volver a pendiente
            </button>
          </>
        )}
        {item.estado === 'realizada' && <span>Realizada: {formatearFecha(item.fecha_realizada)}</span>}
      </td>
      <td className="celda-acciones">
        <button
          type="button"
          className="btn-peligro"
          onClick={() => confirm('¿Eliminar esta focalización?') && onEliminar(item.id)}
        >
          Eliminar
        </button>
      </td>
    </tr>
  )
}
