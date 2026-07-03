import { useState } from 'react'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import { formatearFecha } from '../../utils/formato'

const HOY = () => new Date().toISOString().slice(0, 10)

// Una fila de focalización: reasignar padrino es inmediato; programar y
// marcar realizada piden una fecha antes de confirmar, así que cada fila
// necesita su propio estado local para ese input sin afectar a las demás.
export default function FilaFocalizacion({ item, padrinos, onReasignar, onProgramar, onMarcarRealizada, onEliminar }) {
  const [fecha, setFecha] = useState(HOY())
  const [guardando, setGuardando] = useState(false)

  async function ejecutar(accion) {
    setGuardando(true)
    try {
      await accion(item.id, fecha)
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
            <button type="button" disabled={guardando} onClick={() => ejecutar(onProgramar)}>Programar</button>
          </>
        )}
        {item.estado === 'programada' && (
          <>
            <span>Programada: {formatearFecha(item.fecha_programada)}</span><br />
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />{' '}
            <button type="button" disabled={guardando} onClick={() => ejecutar(onMarcarRealizada)}>Marcar realizada</button>
          </>
        )}
        {item.estado === 'realizada' && <span>Realizada: {formatearFecha(item.fecha_realizada)}</span>}
      </td>
      <td>
        <button type="button" onClick={() => onEliminar(item.id)}>Eliminar</button>
      </td>
    </tr>
  )
}
