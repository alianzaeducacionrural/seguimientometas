import { Fragment, useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import Flecha from '../../components/Flecha'
import PanelFocalizacionMeta from '../components/PanelFocalizacionMeta'
import PanelAsignacionesMeta from '../components/PanelAsignacionesMeta'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'
import { idsDeLista, nombresProyectosDe } from '../../utils/proyectos'

// Gestiona toda la focalización (sedes preasignadas y visitas sin
// focalizar) sin tener que entrar a Convenios: filtro por proyecto +
// acordeón por convenio, y dentro de cada uno se anida el panel completo
// de cada una de sus metas de tipo visita_focalizada/visita_sin_focalizar
// (PanelFocalizacionMeta/PanelAsignacionesMeta, los mismos que usa la ruta
// /admin/metas/:metaId — nada se duplica). Las metas "Manual" no aparecen
// acá, esas se gestionan desde el acordeón de Convenios.
export default function Focalizacion() {
  const proyectos = useEntidad('proyectos')
  const convenios = useEntidad('convenios')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')
  const usuarios = useEntidad('usuarios')

  const [proyectoId, setProyectoId] = useState('')
  const [abiertoId, setAbiertoId] = useState(null)

  const cargando = proyectos.cargando || convenios.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando || usuarios.cargando
  if (cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>

  // Padrinos y líderes: una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino' || u.rol === 'lider')
  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  function metasFocalizablesDe(convenioId) {
    return metas.datos.filter((m) => String(m.convenio_id) === String(convenioId)
      && (m.tipo === 'visita_focalizada' || m.tipo === 'visita_sin_focalizar'))
  }

  const conveniosFiltrados = proyectoId
    ? convenios.datos.filter((c) => idsDeLista(c.proyectos_ids).includes(proyectoId))
    : convenios.datos
  const conveniosConMetas = conveniosFiltrados
    .map((c) => ({ convenio: c, metas: metasFocalizablesDe(c.id) }))
    .filter(({ metas: metasDelConvenio }) => metasDelConvenio.length > 0)

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
      </div>

      {conveniosConMetas.length === 0 ? (
        <Vacio>
          No hay convenios con metas de focalización o visitas sin focalizar{proyectoId ? ' en este proyecto' : ''}.
        </Vacio>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th className="celda-flecha"></th>
                <th>Convenio</th>
                <th>Proyectos</th>
              </tr>
            </thead>
            <tbody>
              {conveniosConMetas.map(({ convenio, metas: metasDelConvenio }) => {
                const abierto = String(abiertoId) === String(convenio.id)

                return (
                  <Fragment key={convenio.id}>
                    <tr
                      className={`fila-expandible${abierto ? ' fila-abierta' : ''}`}
                      onClick={() => setAbiertoId(abierto ? null : convenio.id)}
                    >
                      <td className="celda-flecha"><Flecha abierta={abierto} /></td>
                      <td>{convenio.nombre}</td>
                      <td>{nombresProyectosDe(convenio.proyectos_ids, proyectos.datos).join(', ') || '—'}</td>
                    </tr>
                    {abierto && (
                      <tr className="fila-panel">
                        <td colSpan={3}>
                          <div className="panel-acordeon">
                            {metasDelConvenio.map((meta, i) => (
                              <div key={meta.id} style={{ marginTop: i === 0 ? 0 : '1.75rem' }}>
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
                                  />
                                )}
                              </div>
                            ))}
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
