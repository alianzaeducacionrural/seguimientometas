import { useState } from 'react'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import EncabezadoOrdenable from '../../components/EncabezadoOrdenable'
import { fechaVisita } from '../../utils/estadoFocalizacion'
import { formatearFecha, hoy } from '../../utils/formato'
import { colorPorId } from '../../utils/colores'

const PAGINA = 150

// Tabla plana y densa de visitas (una fila = una visita). Seleccionable (casilla
// por fila, para asignar en lote) y con orden por columna; hacer clic en una
// fila abre su panel lateral. Pinta de a 150 filas para no cargar el DOM con
// cientos de filas cuando no hay filtros.
export default function TablaVisitas({ filas, orden, onOrdenar, seleccion, onSeleccion, onAbrir, nombrePadrino }) {
  const [limite, setLimite] = useState(PAGINA)
  const hoyIso = hoy()
  const visibles = filas.slice(0, limite)
  const todasMarcadas = filas.length > 0 && filas.every(({ foc }) => seleccion.has(String(foc.id)))

  function alternarTodas() {
    onSeleccion(todasMarcadas ? new Set() : new Set(filas.map(({ foc }) => String(foc.id))))
  }

  function alternar(id) {
    const nueva = new Set(seleccion)
    if (nueva.has(id)) nueva.delete(id)
    else nueva.add(id)
    onSeleccion(nueva)
  }

  return (
    <div className="tabla-envoltura">
      <table className="tabla tabla-visitas">
        <thead>
          <tr>
            <th className="col-chk">
              <input type="checkbox" checked={todasMarcadas} onChange={alternarTodas} aria-label="Seleccionar todas las visitas filtradas" />
            </th>
            <EncabezadoOrdenable columna="fecha" orden={orden} onOrdenar={onOrdenar} title="Ordenar por fecha">Fecha</EncabezadoOrdenable>
            <EncabezadoOrdenable columna="estado" orden={orden} onOrdenar={onOrdenar}>Estado</EncabezadoOrdenable>
            <EncabezadoOrdenable columna="municipio" orden={orden} onOrdenar={onOrdenar}>Ubicación</EncabezadoOrdenable>
            <th>Convenio</th>
            <th>Proyecto · Actividad</th>
            <EncabezadoOrdenable columna="padrino" orden={orden} onOrdenar={onOrdenar}>Responsable</EncabezadoOrdenable>
          </tr>
        </thead>
        <tbody>
          {visibles.map(({ foc, meta, proyecto, convenio, aliado }) => {
            const id = String(foc.id)
            const fecha = fechaVisita(foc)
            const vencida = foc.estado === 'programada' && fecha && fecha < hoyIso
            const nombre = nombrePadrino(foc.padrino_id)
            return (
              <tr
                key={foc.id}
                className={`fila-clic${seleccion.has(id) ? ' fila-seleccionada' : ''}`}
                onClick={() => onAbrir(foc.id)}
              >
                <td className="col-chk" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={seleccion.has(id)} onChange={() => alternar(id)} aria-label="Seleccionar visita" />
                </td>
                <td className={vencida ? 'fecha-vencida' : undefined} title={vencida ? 'Programada con fecha vencida' : undefined}>
                  {formatearFecha(fecha) || '—'}
                </td>
                <td><EstadoFocalizacion estado={foc.estado} /></td>
                <td className="celda-ubicacion">
                  <div>{foc.municipio}</div>
                  <div className="celda-ubicacion-sub">{[foc.institucion, foc.sede].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="celda-ubicacion">
                  <div>{convenio?.nombre || '—'}</div>
                  <div className="celda-ubicacion-sub">{aliado?.nombre || ''}</div>
                </td>
                <td className="celda-ubicacion">
                  <span className="etiqueta-proyecto" style={{ '--acento': colorPorId(proyecto?.id) }}>{proyecto?.nombre || '—'}</span>
                  <div className="celda-ubicacion-sub">{meta?.descripcion || ''}</div>
                </td>
                <td>{nombre ? <span className="nombre-padrino">{nombre}</span> : <span className="sin-asignar-txt">Sin asignar</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {filas.length > limite && (
        <div className="mostrar-mas">
          <button type="button" onClick={() => setLimite((l) => l + PAGINA)}>
            Mostrar {Math.min(PAGINA, filas.length - limite)} más ({filas.length - limite} restantes)
          </button>
        </div>
      )}
    </div>
  )
}
