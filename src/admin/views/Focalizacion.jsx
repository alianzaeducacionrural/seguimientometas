import { Fragment, useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import Flecha from '../../components/Flecha'
import PanelFocalizacionMeta from '../components/PanelFocalizacionMeta'
import PanelAsignacionesMeta from '../components/PanelAsignacionesMeta'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'
import { idsDeLista } from '../../utils/proyectos'
import { ejecutadoDe } from '../../utils/avance'
import { colorAvance, colorPorId } from '../../utils/colores'
import estilos from '../../components/TarjetaResumen.module.css'

// Gestiona toda la focalización (sedes preasignadas y visitas sin
// focalizar) sin tener que entrar a Convenios: filtro por proyecto arriba,
// y un acordeón de tres niveles — Convenio → Proyecto → Actividad — porque
// un convenio puede tocar varios proyectos y cada proyecto puede tener
// varias actividades (metas). Al abrir una actividad se incrusta el panel
// completo (PanelFocalizacionMeta/PanelAsignacionesMeta, los mismos que usa
// la ruta /admin/metas/:metaId — nada se duplica), con sus propios filtros
// de municipio/institución. Las metas "Manual" no aparecen acá, esas se
// gestionan desde el acordeón de Convenios.
export default function Focalizacion() {
  const proyectos = useEntidad('proyectos')
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')
  const usuarios = useEntidad('usuarios')

  const [proyectoId, setProyectoId] = useState('')
  const [padrinoId, setPadrinoId] = useState('')
  const [estado, setEstado] = useState('')
  const [convenioAbierto, setConvenioAbierto] = useState(null)
  const [proyectoAbierto, setProyectoAbierto] = useState(null)
  const [metaAbierta, setMetaAbierta] = useState(null)

  const cargando = proyectos.cargando || convenios.cargando || aliados.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando || usuarios.cargando
  if (cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>

  // Padrinos y líderes: una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos
    .filter((u) => u.rol === 'padrino' || u.rol === 'lider')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  // Los filtros globales de padrino/estado acotan el árbol igual que el de
  // proyecto: una meta solo aparece si tiene alguna visita que coincida
  // (mismo padrino y/o mismo estado). Para metas sin focalizar, un padrino
  // con solo cuota asignada (aún sin visitas) también cuenta, mientras no se
  // esté filtrando por estado.
  function metaCoincideFiltros(meta) {
    if (!padrinoId && !estado) return true
    const visitas = focalizacion.datos.filter((f) => String(f.meta_id) === String(meta.id))
    const hayVisita = visitas.some((f) =>
      (!padrinoId || String(f.padrino_id) === padrinoId)
      && (!estado || f.estado === estado))
    if (hayVisita) return true
    if (padrinoId && !estado && meta.tipo === 'visita_sin_focalizar') {
      return asignaciones.datos.some((a) => String(a.meta_id) === String(meta.id)
        && String(a.padrino_id) === padrinoId)
    }
    return false
  }

  function metasFocalizablesDe(convenioId, proyectoIdMeta) {
    return metas.datos.filter((m) => String(m.convenio_id) === String(convenioId)
      && String(m.proyecto_id) === String(proyectoIdMeta)
      && (m.tipo === 'visita_focalizada' || m.tipo === 'visita_sin_focalizar')
      && metaCoincideFiltros(m))
  }

  // Proyectos de un convenio, en el orden fijo del catálogo, solo los que
  // tienen alguna actividad de focalización/sin-focalizar.
  function proyectosDelConvenio(convenio) {
    const idsDelConvenio = idsDeLista(convenio.proyectos_ids)
    return proyectos.datos
      .filter((p) => idsDelConvenio.includes(String(p.id)))
      .map((p) => ({ proyecto: p, metas: metasFocalizablesDe(convenio.id, p.id) }))
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

  function abrirConvenio(id) {
    setConvenioAbierto((actual) => (actual === id ? null : id))
    setProyectoAbierto(null)
    setMetaAbierta(null)
  }

  function abrirProyecto(id) {
    setProyectoAbierto((actual) => (actual === id ? null : id))
    setMetaAbierta(null)
  }

  return (
    <section className="vista">
      <h2>Focalización</h2>

      <div className="filtros">
        <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.datos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
          <option value="">Todos los padrinos</option>
          {padrinos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="programada">Programada</option>
          <option value="realizada">Realizada</option>
        </select>
        {(proyectoId || padrinoId || estado) && (
          <button type="button" onClick={() => { setProyectoId(''); setPadrinoId(''); setEstado('') }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {conveniosConProyectos.length === 0 ? (
        <Vacio>
          No hay convenios con metas de focalización o visitas sin focalizar{proyectoId || padrinoId || estado ? ' que coincidan con los filtros' : ''}.
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
