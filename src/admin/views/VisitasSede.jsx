import { Fragment, useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import Flecha from '../../components/Flecha'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import EncabezadoOrdenable from '../../components/EncabezadoOrdenable'
import { formatearFecha } from '../../utils/formato'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { abreviaturaProyecto, idsDeLista } from '../../utils/proyectos'
import { colorPorId } from '../../utils/colores'

// Agrupada por sede (no una fila plana por visita): cada sede muestra
// cuántas visitas tiene por proyecto ("Escuela Nueva: 3 visitas"), y al
// expandir un proyecto se ve el detalle (fecha, padrino, estado) de esas
// visitas puntuales — acordeón de dos niveles (sede → proyecto). Solo se
// listan sedes con al menos una visita (no las ~1300 del catálogo
// completo). Los filtros de proyecto/municipio/padrino se aplican antes
// de agrupar, para acotar qué sedes aparecen.
export default function VisitasSede() {
  const focalizacion = useEntidad('focalizacion')
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const proyectos = useEntidad('proyectos')
  const usuarios = useEntidad('usuarios')

  const [proyectoId, setProyectoId] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [padrinoId, setPadrinoId] = useState('')
  const [sedeAbierta, setSedeAbierta] = useState(null)
  const [proyectoAbierto, setProyectoAbierto] = useState(null)
  const [orden, setOrden] = useState({ columna: 'sede', asc: true })

  function ordenarPor(columna) {
    setOrden((actual) => (actual.columna === columna ? { columna, asc: !actual.asc } : { columna, asc: true }))
  }

  const cargando = focalizacion.cargando || metas.cargando || convenios.cargando || proyectos.cargando || usuarios.cargando
  if (cargando) return <Cargando />
  if (focalizacion.error) return <AvisoError>Error: {focalizacion.error}</AvisoError>

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const convenioPorId = Object.fromEntries(convenios.datos.map((c) => [String(c.id), c]))
  const padrinoPorId = Object.fromEntries(usuarios.datos.map((u) => [String(u.id), u]))
  // Padrinos y líderes: cualquiera de los dos puede aparecer como visitante.
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino' || u.rol === 'lider')

  const filas = focalizacion.datos.map((f) => {
    const meta = metaPorId[String(f.meta_id)]
    const convenio = meta && convenioPorId[String(meta.convenio_id)]
    // Si la meta ya tiene proyecto asignado se usa ese (preciso); para
    // metas viejas sin proyecto_id se cae al primer proyecto del convenio.
    const proyectoIdDeLaVisita = String(meta?.proyecto_id || '').trim()
      || idsDeLista(convenio?.proyectos_ids)[0]
      || ''
    return {
      ...f,
      proyectoIdDeLaVisita,
      padrinoNombre: padrinoPorId[String(f.padrino_id)]?.nombre || '—',
    }
  })

  const municipios = Array.from(new Set(focalizacion.datos.map((f) => f.municipio).filter(Boolean))).sort()

  const filtradas = filas.filter((f) => {
    if (proyectoId && f.proyectoIdDeLaVisita !== proyectoId) return false
    if (municipio && f.municipio !== municipio) return false
    if (padrinoId && String(f.padrino_id) !== padrinoId) return false
    return true
  })

  const realizadas = filtradas.filter((f) => f.estado === 'realizada').length
  const programadas = filtradas.filter((f) => f.estado === 'programada').length

  // Agrupar por sede (municipio + institución + sede).
  const sedesMap = new Map()
  filtradas.forEach((f) => {
    const clave = `${f.municipio}||${f.institucion}||${f.sede}`
    if (!sedesMap.has(clave)) sedesMap.set(clave, { clave, municipio: f.municipio, institucion: f.institucion, sede: f.sede, visitas: [] })
    sedesMap.get(clave).visitas.push(f)
  })
  const sedesSinOrdenar = Array.from(sedesMap.values())

  // Dentro de una sede, los proyectos en el orden fijo del catálogo (1-7),
  // no en el orden en que se insertaron sus visitas.
  function proyectosDeSede(sedeItem) {
    const porProyecto = new Map()
    sedeItem.visitas.forEach((v) => {
      if (!porProyecto.has(v.proyectoIdDeLaVisita)) porProyecto.set(v.proyectoIdDeLaVisita, [])
      porProyecto.get(v.proyectoIdDeLaVisita).push(v)
    })
    return proyectos.datos
      .filter((p) => porProyecto.has(String(p.id)))
      .map((p) => ({ proyecto: p, visitas: porProyecto.get(String(p.id)) }))
  }

  // Columnas de la tabla principal: solo los proyectos que efectivamente
  // tienen visitas entre las sedes filtradas (si hay filtro de proyecto,
  // queda solo ese), en el orden fijo del catálogo — para que el conteo
  // por proyecto se vea de una sin tener que desplegar cada sede.
  const proyectosConVisitas = proyectos.datos.filter((p) =>
    filtradas.some((f) => f.proyectoIdDeLaVisita === String(p.id))
  )

  function conteoPorProyecto(sedeItem) {
    const mapa = {}
    sedeItem.visitas.forEach((v) => {
      mapa[v.proyectoIdDeLaVisita] = (mapa[v.proyectoIdDeLaVisita] || 0) + 1
    })
    return mapa
  }

  const totalColumnas = 3 + proyectosConVisitas.length

  // El orden se aplica sobre `sedesSinOrdenar`, que ya viene de `filtradas`
  // (proyecto/municipio/padrino aplicados) — nunca sobre datos sin filtrar.
  const sedes = [...sedesSinOrdenar].sort((a, b) => {
    let cmp
    if (orden.columna === 'sede') {
      cmp = `${a.municipio} - ${a.institucion} - ${a.sede}`.localeCompare(`${b.municipio} - ${b.institucion} - ${b.sede}`)
    } else if (orden.columna === 'total') {
      cmp = a.visitas.length - b.visitas.length
    } else {
      const idProyecto = orden.columna.replace('proy_', '')
      cmp = (conteoPorProyecto(a)[idProyecto] || 0) - (conteoPorProyecto(b)[idProyecto] || 0)
    }
    return orden.asc ? cmp : -cmp
  })

  function abrirSede(clave) {
    setSedeAbierta((actual) => (actual === clave ? null : clave))
    setProyectoAbierto(null)
  }

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

      {sedes.length === 0 ? (
        <Vacio>No hay visitas que coincidan con los filtros.</Vacio>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th className="celda-flecha"></th>
                <EncabezadoOrdenable columna="sede" orden={orden} onOrdenar={ordenarPor}>Sede</EncabezadoOrdenable>
                {proyectosConVisitas.map((p) => (
                  <EncabezadoOrdenable
                    key={p.id}
                    columna={`proy_${p.id}`}
                    orden={orden}
                    onOrdenar={ordenarPor}
                    numero
                    title={p.nombre}
                    className="celda-proyecto-abrev"
                    style={{ '--acento': colorPorId(p.id) }}
                  >
                    {abreviaturaProyecto(p.nombre)}
                  </EncabezadoOrdenable>
                ))}
                <EncabezadoOrdenable columna="total" orden={orden} onOrdenar={ordenarPor} numero>Total</EncabezadoOrdenable>
              </tr>
            </thead>
            <tbody>
              {sedes.map((sedeItem) => {
                const abierta = sedeAbierta === sedeItem.clave
                const gruposProyecto = proyectosDeSede(sedeItem)
                const conteo = conteoPorProyecto(sedeItem)

                return (
                  <Fragment key={sedeItem.clave}>
                    <tr
                      className={`fila-expandible${abierta ? ' fila-abierta' : ''}`}
                      onClick={() => abrirSede(sedeItem.clave)}
                    >
                      <td className="celda-flecha"><Flecha abierta={abierta} /></td>
                      <td>{sedeItem.municipio} - {sedeItem.institucion} - {sedeItem.sede}</td>
                      {proyectosConVisitas.map((p) => {
                        const cantidad = conteo[String(p.id)] || 0
                        return (
                          <td key={p.id} className="numero celda-proyecto-abrev">
                            {cantidad > 0
                              ? <span style={{ color: colorPorId(p.id), fontWeight: 700 }}>{cantidad}</span>
                              : <span className="celda-vacia">—</span>}
                          </td>
                        )
                      })}
                      <td className="numero">{sedeItem.visitas.length}</td>
                    </tr>
                    {abierta && (
                      <tr className="fila-panel">
                        <td colSpan={totalColumnas}>
                          <div className="panel-acordeon">
                            <div className="tabla-envoltura">
                              <table className="tabla">
                                <thead>
                                  <tr>
                                    <th className="celda-flecha"></th>
                                    <th>Proyecto</th>
                                    <th className="numero">Visitas</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {gruposProyecto.map(({ proyecto, visitas }) => {
                                    const abiertoProyecto = proyectoAbierto === String(proyecto.id)
                                    return (
                                      <Fragment key={proyecto.id}>
                                        <tr
                                          className={`fila-expandible${abiertoProyecto ? ' fila-abierta' : ''}`}
                                          onClick={() => setProyectoAbierto((actual) => (actual === String(proyecto.id) ? null : String(proyecto.id)))}
                                        >
                                          <td className="celda-flecha"><Flecha abierta={abiertoProyecto} /></td>
                                          <td>{proyecto.nombre}</td>
                                          <td className="numero">{visitas.length}</td>
                                        </tr>
                                        {abiertoProyecto && (
                                          <tr className="fila-panel">
                                            <td colSpan={3}>
                                              <div className="panel-acordeon">
                                                <div className="tabla-envoltura">
                                                  <table className="tabla">
                                                    <thead>
                                                      <tr>
                                                        <th>Fecha</th>
                                                        <th>Padrino</th>
                                                        <th>Estado</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {visitas.map((v) => (
                                                        <tr key={v.id}>
                                                          <td>
                                                            {v.estado === 'realizada' ? formatearFecha(v.fecha_realizada)
                                                              : v.estado === 'programada' ? formatearFecha(v.fecha_programada)
                                                                : '—'}
                                                          </td>
                                                          <td>{v.padrinoNombre}</td>
                                                          <td><EstadoFocalizacion estado={v.estado} /></td>
                                                        </tr>
                                                      ))}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </Fragment>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
