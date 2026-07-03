import { useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import { formatearFecha } from '../../utils/formato'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'

export default function VisitasSede() {
  const focalizacion = useEntidad('focalizacion')
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const proyectos = useEntidad('proyectos')
  const usuarios = useEntidad('usuarios')

  const [proyectoId, setProyectoId] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [padrinoId, setPadrinoId] = useState('')

  const cargando = focalizacion.cargando || metas.cargando || convenios.cargando || proyectos.cargando || usuarios.cargando
  if (cargando) return <Cargando />
  if (focalizacion.error) return <AvisoError>Error: {focalizacion.error}</AvisoError>

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const convenioPorId = Object.fromEntries(convenios.datos.map((c) => [String(c.id), c]))
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')

  const filas = focalizacion.datos.map((f) => {
    const meta = metaPorId[f.meta_id]
    const convenio = meta ? convenioPorId[String(meta.convenio_id)] : null
    const padrino = usuarios.datos.find((u) => String(u.id) === String(f.padrino_id))
    return { ...f, meta, convenio, padrinoNombre: padrino?.nombre || '—' }
  })

  const municipios = Array.from(new Set(focalizacion.datos.map((f) => f.municipio).filter(Boolean))).sort()

  const filtradas = filas.filter((f) => {
    if (proyectoId) {
      // Si la meta ya tiene proyecto asignado se filtra por él (preciso);
      // para metas viejas sin proyecto_id se cae al proyecto del convenio.
      const proyectoMeta = String(f.meta?.proyecto_id || '').trim()
      const coincide = proyectoMeta
        ? proyectoMeta === proyectoId
        : String(f.convenio?.proyectos_ids).split(',').map((v) => v.trim()).includes(proyectoId)
      if (!coincide) return false
    }
    if (municipio && f.municipio !== municipio) return false
    if (padrinoId && String(f.padrino_id) !== padrinoId) return false
    return true
  })

  const realizadas = filtradas.filter((f) => f.estado === 'realizada').length
  const programadas = filtradas.filter((f) => f.estado === 'programada').length

  return (
    <section className="vista">
      <h2>Visitas por sede</h2>

      <div className="filtros">
        <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.datos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
          <option value="">Todos los municipios</option>
          {municipios.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
          <option value="">Todos los padrinos</option>
          {padrinos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        {(proyectoId || municipio || padrinoId) && (
          <button type="button" onClick={() => { setProyectoId(''); setMunicipio(''); setPadrinoId('') }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="kpis">
        <div className="kpi"><strong style={{ color: 'var(--logrado)' }}>{realizadas}</strong><span>Realizadas</span></div>
        <div className="kpi"><strong style={{ color: 'var(--maduracion)' }}>{programadas}</strong><span>Programadas</span></div>
        <div className="kpi"><strong>{realizadas + programadas}</strong><span>Proyectado</span></div>
        <div className="kpi"><strong>{filtradas.length}</strong><span>Focalizadas</span></div>
      </div>

      {filtradas.length === 0 ? (
        <Vacio>No hay focalización que coincida con los filtros.</Vacio>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Municipio</th>
                <th>Institución</th>
                <th>Sede</th>
                <th>Convenio</th>
                <th>Padrino</th>
                <th>Estado</th>
                <th>Fecha programada</th>
                <th>Fecha realizada</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id}>
                  <td>{f.municipio}</td>
                  <td>{f.institucion}</td>
                  <td>{f.sede}</td>
                  <td>{f.convenio?.nombre || '—'}</td>
                  <td>{f.padrinoNombre}</td>
                  <td><EstadoFocalizacion estado={f.estado} /></td>
                  <td>{formatearFecha(f.fecha_programada)}</td>
                  <td>{formatearFecha(f.fecha_realizada)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
