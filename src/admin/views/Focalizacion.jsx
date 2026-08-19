import { Fragment, useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import Flecha from '../../components/Flecha'
import PanelFocalizacionMeta from '../components/PanelFocalizacionMeta'
import PanelAsignacionesMeta from '../components/PanelAsignacionesMeta'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'
import FilaFocalizacion from '../components/FilaFocalizacion'
import { idsDeLista, ordenDeProyecto } from '../../utils/proyectos'
import { coincideBusqueda } from '../../utils/texto'
import { PADRINO_SIN_ASIGNAR, coincidePadrinoFiltro } from '../../utils/padrino'
import { ejecutadoDe } from '../../utils/avance'
import { colorAvance, colorPorId } from '../../utils/colores'
import estilos from '../../components/TarjetaResumen.module.css'

// Gestiona toda la focalización (sedes preasignadas y visitas sin focalizar)
// sin tener que entrar a Convenios. Dos vistas conmutables:
//  - "Por convenio": acordeón de tres niveles Convenio → Proyecto → Actividad
//    (al abrir una actividad se incrusta el panel completo, el mismo que usa
//    la ruta /admin/metas/:metaId).
//  - "Todas las visitas": lista plana de TODAS las visitas de todos los
//    convenios, sin abrir cada uno, con KPIs de total.
// Los filtros (proyecto, padrino, estado, municipio y búsqueda libre) son
// globales y aplican a ambas vistas. Las metas "Manual" no aparecen acá.
export default function Focalizacion() {
  const proyectos = useEntidad('proyectos')
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')
  const usuarios = useEntidad('usuarios')

  // Filtros globales.
  const [proyectoId, setProyectoId] = useState('')
  const [padrinoId, setPadrinoId] = useState('')
  const [estado, setEstado] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [busqueda, setBusqueda] = useState('')
  // Vista de página: 'convenios' (acordeón) o 'todas' (lista plana global).
  const [vista, setVista] = useState('convenios')
  const [convenioAbierto, setConvenioAbierto] = useState(null)
  const [proyectoAbierto, setProyectoAbierto] = useState(null)
  const [metaAbierta, setMetaAbierta] = useState(null)

  const cargando = proyectos.cargando || convenios.cargando || aliados.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando || usuarios.cargando
  if (cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>

  // Padrinos y líderes: una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos
    .filter((u) => (u.rol === 'padrino' || u.rol === 'lider') && String(u.activo).trim().toLowerCase() !== 'no')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  const nombrePadrino = (id) => padrinos.find((p) => String(p.id) === String(id))?.nombre || ''
  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const proyectoPorId = Object.fromEntries(proyectos.datos.map((p) => [String(p.id), p]))
  const convenioPorId = Object.fromEntries(convenios.datos.map((c) => [String(c.id), c]))
  const aliadoPorId = Object.fromEntries(aliados.datos.map((a) => [String(a.id), a]))

  const esFocalizable = (m) => m && (m.tipo === 'visita_focalizada' || m.tipo === 'visita_sin_focalizar')
  const hayFiltro = Boolean(proyectoId || padrinoId || estado || municipio || busqueda)

  // Municipios disponibles: los que aparecen en alguna visita de una meta
  // focalizable (para el filtro global).
  const municipiosDisponibles = Array.from(new Set(
    focalizacion.datos
      .filter((f) => esFocalizable(metaPorId[String(f.meta_id)]))
      .map((f) => f.municipio)
      .filter(Boolean),
  )).sort()

  // ¿Una visita pasa los filtros globales? (proyecto se evalúa por la meta).
  function visitaCoincide(f, meta, proyecto, convenio, aliado) {
    if (!coincidePadrinoFiltro(f.padrino_id, padrinoId)) return false
    if (estado && f.estado !== estado) return false
    if (municipio && f.municipio !== municipio) return false
    return coincideBusqueda(busqueda, proyecto?.nombre, meta?.descripcion, convenio?.nombre, aliado?.nombre,
      f.municipio, f.institucion, f.sede, nombrePadrino(f.padrino_id))
  }

  // ¿Una meta debe aparecer en el árbol? Sin filtros, todas (incluidas las
  // vacías, para poder agregarles la primera sede). Con filtros, solo si tiene
  // alguna visita que coincida — o, para sin-focalizar con cuota pero sin
  // visitas, si el padrino filtrado tiene cuota (y no se filtró por
  // estado/municipio, que no aplican a una cuota).
  function metaCoincideFiltros(meta, convenio) {
    if (!hayFiltro) return true
    const proyecto = proyectoPorId[String(meta.proyecto_id)]
    const aliado = convenio && aliadoPorId[String(convenio.aliado_id)]
    const hayVisita = focalizacion.datos.some((f) => String(f.meta_id) === String(meta.id)
      && visitaCoincide(f, meta, proyecto, convenio, aliado))
    if (hayVisita) return true
    const metaMatchBusqueda = coincideBusqueda(busqueda, proyecto?.nombre, meta.descripcion, convenio?.nombre, aliado?.nombre)
    if (padrinoId && !estado && !municipio && metaMatchBusqueda && meta.tipo === 'visita_sin_focalizar') {
      return asignaciones.datos.some((a) => String(a.meta_id) === String(meta.id)
        && String(a.padrino_id) === padrinoId)
    }
    return false
  }

  function metasFocalizablesDe(convenio, proyectoIdMeta) {
    return metas.datos.filter((m) => String(m.convenio_id) === String(convenio.id)
      && String(m.proyecto_id) === String(proyectoIdMeta)
      && esFocalizable(m)
      && metaCoincideFiltros(m, convenio))
  }

  // Proyectos de un convenio, en el orden fijo del catálogo, solo los que
  // tienen alguna actividad de focalización/sin-focalizar (tras filtros).
  function proyectosDelConvenio(convenio) {
    const idsDelConvenio = idsDeLista(convenio.proyectos_ids)
    return proyectos.datos
      .filter((p) => idsDelConvenio.includes(String(p.id)))
      .map((p) => ({ proyecto: p, metas: metasFocalizablesDe(convenio, p.id) }))
      .filter(({ metas: metasDelProyecto }) => metasDelProyecto.length > 0)
  }

  const conveniosFiltrados = proyectoId
    ? convenios.datos.filter((c) => idsDeLista(c.proyectos_ids).includes(proyectoId))
    : convenios.datos
  const conveniosConProyectos = conveniosFiltrados
    .map((c) => ({
      convenio: c,
      proyectos: proyectosDelConvenio(c).filter(({ proyecto }) => !proyectoId || String(proyecto.id) === proyectoId),
    }))
    .filter(({ proyectos: proyectosDelC }) => proyectosDelC.length > 0)

  // Todas las visitas de todos los convenios en una lista plana, tras filtros,
  // ordenadas por aliado → convenio → proyecto (orden fijo) → actividad → municipio.
  function todasLasVisitas() {
    return focalizacion.datos
      .map((f) => {
        const meta = metaPorId[String(f.meta_id)]
        if (!esFocalizable(meta)) return null
        const convenio = convenioPorId[String(meta.convenio_id)]
        const proyecto = proyectoPorId[String(meta.proyecto_id)]
        const aliado = convenio && aliadoPorId[String(convenio.aliado_id)]
        return { foc: f, meta, proyecto, convenio, aliado }
      })
      .filter(Boolean)
      .filter(({ foc, meta, proyecto, convenio, aliado }) =>
        (!proyectoId || String(meta.proyecto_id) === proyectoId)
        && visitaCoincide(foc, meta, proyecto, convenio, aliado))
      .sort((a, b) => {
        const al = (a.aliado?.nombre || '').localeCompare(b.aliado?.nombre || '')
        if (al !== 0) return al
        const cn = (a.convenio?.nombre || '').localeCompare(b.convenio?.nombre || '')
        if (cn !== 0) return cn
        const oa = ordenDeProyecto(a.meta?.proyecto_id, proyectos.datos)
        const ob = ordenDeProyecto(b.meta?.proyecto_id, proyectos.datos)
        if (oa !== ob) return oa - ob
        const md = (a.meta?.descripcion || '').localeCompare(b.meta?.descripcion || '')
        if (md !== 0) return md
        return (a.foc.municipio || '').localeCompare(b.foc.municipio || '')
      })
  }

  function abrirConvenio(id) {
    setConvenioAbierto((actual) => (actual === id ? null : id))
    setProyectoAbierto(null)
    setMetaAbierta(null)
  }

  function abrirProyecto(id) {
    setProyectoAbierto((actual) => (actual === id ? null : id))
    setMetaAbierta(null)
  }

  const visitasTodas = vista === 'todas' ? todasLasVisitas() : []
  const totalRealizadas = visitasTodas.filter((v) => v.foc.estado === 'realizada').length
  const totalProgramadas = visitasTodas.filter((v) => v.foc.estado === 'programada').length
  const totalPendientes = visitasTodas.filter((v) => v.foc.estado === 'pendiente').length

  return (
    <section className="vista">
      <h2>Focalización</h2>

      <div className="barra-filtros">
        <span className="barra-filtros__titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
        </span>
        <select className={proyectoId ? 'activo' : ''} value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.datos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select className={padrinoId ? 'activo' : ''} value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
          <option value="">Todos los padrinos</option>
          <option value={PADRINO_SIN_ASIGNAR}>Sin asignar</option>
          {padrinos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select className={estado ? 'activo' : ''} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="programada">Programada</option>
          <option value="realizada">Realizada</option>
        </select>
        <select className={municipio ? 'activo' : ''} value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
          <option value="">Todos los municipios</option>
          {municipiosDisponibles.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar convenio, actividad, sede, padrino…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        {hayFiltro && (
          <button type="button" className="btn-limpiar" onClick={() => { setProyectoId(''); setPadrinoId(''); setEstado(''); setMunicipio(''); setBusqueda('') }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="conmutador-vista">
        <button
          type="button"
          className={vista === 'convenios' ? 'btn-primario' : ''}
          onClick={() => setVista('convenios')}
        >
          Por convenio
        </button>
        <button
          type="button"
          className={vista === 'todas' ? 'btn-primario' : ''}
          onClick={() => setVista('todas')}
        >
          Todas las visitas
        </button>
      </div>

      {vista === 'todas' ? (
        <>
          <div className="kpis">
            <div className="kpi"><strong>{visitasTodas.length}</strong><span>Visitas</span></div>
            <div className="kpi"><strong style={{ color: 'var(--logrado)' }}>{totalRealizadas}</strong><span>Realizadas</span></div>
            <div className="kpi"><strong style={{ color: 'var(--maduracion)' }}>{totalProgramadas}</strong><span>Programadas</span></div>
            <div className="kpi"><strong>{totalPendientes}</strong><span>Pendientes</span></div>
          </div>

          {visitasTodas.length === 0 ? (
            <Vacio>No hay visitas{hayFiltro ? ' que coincidan con los filtros' : ''}.</Vacio>
          ) : (
            <div className="tabla-envoltura">
              <table className="tabla tabla-visitas">
                <thead>
                  <tr>
                    <th>Convenio</th>
                    <th>Proyecto</th>
                    <th>Actividad</th>
                    <th>Ubicación</th>
                    <th>Padrino</th>
                    <th>Estado</th>
                    <th>Acción</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visitasTodas.map(({ foc, meta, proyecto, convenio, aliado }) => (
                    <FilaFocalizacion
                      key={foc.id}
                      item={foc}
                      padrinos={padrinos}
                      ubicacionJunta
                      celdasIniciales={(
                        <>
                          <td className="celda-ubicacion">
                            <div>{convenio?.nombre || '—'}</div>
                            <div className="celda-ubicacion-sub">{aliado?.nombre || ''}</div>
                          </td>
                          <td>
                            <span className="etiqueta-proyecto" style={{ '--acento': colorPorId(proyecto?.id) }}>
                              {proyecto?.nombre || '—'}
                            </span>
                          </td>
                          <td>{meta?.descripcion || '—'}</td>
                        </>
                      )}
                      onReasignar={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
                      onProgramar={programar}
                      onMarcarRealizada={marcarRealizada}
                      onVolverPendiente={volverAPendiente}
                      onEliminar={focalizacion.eliminarItem}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : conveniosConProyectos.length === 0 ? (
        <Vacio>
          No hay convenios con metas de focalización o visitas sin focalizar{hayFiltro ? ' que coincidan con los filtros' : ''}.
        </Vacio>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th className="celda-flecha"></th>
                <th>Aliado</th>
                <th>Convenio</th>
              </tr>
            </thead>
            <tbody>
              {conveniosConProyectos.map(({ convenio, proyectos: proyectosDelConvenioActual }) => {
                const convenioEstaAbierto = convenioAbierto === convenio.id
                const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))

                return (
                  <Fragment key={convenio.id}>
                    <tr
                      className={`fila-expandible${convenioEstaAbierto ? ' fila-abierta' : ''}`}
                      onClick={() => abrirConvenio(convenio.id)}
                    >
                      <td className="celda-flecha"><Flecha abierta={convenioEstaAbierto} /></td>
                      <td>{aliado?.nombre || '—'}</td>
                      <td>{convenio.nombre}</td>
                    </tr>
                    {convenioEstaAbierto && (
                      <tr className="fila-panel">
                        <td colSpan={3}>
                          <div className="panel-acordeon">
                            <div className="lista-proyectos">
                              {proyectosDelConvenioActual.map(({ proyecto, metas: metasDelProyecto }) => {
                                const proyectoEstaAbierto = proyectoAbierto === proyecto.id

                                return (
                                  <div key={proyecto.id}>
                                    <div
                                      className={`fila-proyecto${proyectoEstaAbierto ? ' abierta' : ''}`}
                                      style={{ '--acento': colorPorId(proyecto.id) }}
                                      onClick={() => abrirProyecto(proyecto.id)}
                                    >
                                      <Flecha abierta={proyectoEstaAbierto} />
                                      {proyecto.nombre}
                                    </div>
                                    {proyectoEstaAbierto && (
                                      <div className="panel-acordeon">
                                        <div className="tabla-envoltura">
                                          <table className="tabla">
                                            <thead>
                                              <tr>
                                                <th className="celda-flecha"></th>
                                                <th>Actividad</th>
                                                <th className="numero">Meta</th>
                                                <th>Avance</th>
                                                <th className="numero">Faltante</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {metasDelProyecto.map((meta) => {
                                                const metaEstaAbierta = metaAbierta === meta.id
                                                const metaNum = Number(meta.cantidad_meta) || 0
                                                const ejecutado = ejecutadoDe(meta, focalizacion.datos, [])
                                                const pct = metaNum > 0 ? Math.round((ejecutado / metaNum) * 100) : 0
                                                const faltante = Math.max(metaNum - ejecutado, 0)

                                                return (
                                                  <Fragment key={meta.id}>
                                                    <tr
                                                      className={`fila-expandible${metaEstaAbierta ? ' fila-abierta' : ''}`}
                                                      onClick={() => setMetaAbierta((actual) => (actual === meta.id ? null : meta.id))}
                                                    >
                                                      <td className="celda-flecha"><Flecha abierta={metaEstaAbierta} /></td>
                                                      <td>{meta.descripcion}</td>
                                                      <td className="numero">{metaNum}</td>
                                                      <td>
                                                        <div className={estilos.avanceCelda}>
                                                          <div className={estilos.track}>
                                                            <div
                                                              className={estilos.fill}
                                                              style={{ width: `${Math.min(pct, 100)}%`, background: colorAvance(pct) }}
                                                            />
                                                          </div>
                                                          <span className={estilos.pct}>{ejecutado} · {pct}%</span>
                                                        </div>
                                                      </td>
                                                      <td className="numero">{faltante}</td>
                                                    </tr>
                                                    {metaEstaAbierta && (
                                                      <tr className="fila-panel">
                                                        <td colSpan={5}>
                                                          <div className="panel-acordeon">
                                                            {meta.tipo === 'visita_focalizada' ? (
                                                              <PanelFocalizacionMeta
                                                                compacta
                                                                filtroPadrino={padrinoId}
                                                                filtroEstado={estado}
                                                                meta={meta}
                                                                items={focalizacion.datos.filter((f) => String(f.meta_id) === String(meta.id))}
                                                                padrinos={padrinos}
                                                                onCrear={focalizacion.crearItem}
                                                                onReasignar={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
                                                                onProgramar={programar}
                                                                onMarcarRealizada={marcarRealizada}
                                                                onVolverPendiente={volverAPendiente}
                                                                onEliminar={focalizacion.eliminarItem}
                                                              />
                                                            ) : (
                                                              <PanelAsignacionesMeta
                                                                compacta
                                                                filtroPadrino={padrinoId}
                                                                filtroEstado={estado}
                                                                meta={meta}
                                                                asignaciones={asignaciones.datos.filter((a) => String(a.meta_id) === String(meta.id))}
                                                                visitas={focalizacion.datos.filter((f) => String(f.meta_id) === String(meta.id))}
                                                                padrinos={padrinos}
                                                                onAsignarPadrino={asignaciones.crearItem}
                                                                onGuardarAsignacion={asignaciones.editarItem}
                                                                onEliminarAsignacion={asignaciones.eliminarItem}
                                                                onRegistrarVisita={focalizacion.crearItem}
                                                                onReasignarVisita={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
                                                                onProgramarVisita={programar}
                                                                onMarcarRealizadaVisita={marcarRealizada}
                                                                onVolverPendienteVisita={volverAPendiente}
                                                                onEliminarVisita={focalizacion.eliminarItem}
                                                              />
                                                            )}
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
                                    )}
                                  </div>
                                )
                              })}
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
