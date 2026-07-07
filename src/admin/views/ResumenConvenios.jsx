import useEntidad from '../hooks/useEntidad'
import estilos from '../../components/TarjetaResumen.module.css'
import { colorAvance, colorPorId } from '../../utils/colores'
import { ejecutadoDe } from '../../utils/avance'
import { nombresProyectosDe } from '../../utils/proyectos'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'

export default function ResumenConvenios() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const proyectos = useEntidad('proyectos')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const avancesManuales = useEntidad('avances_manuales')

  if (convenios.cargando || aliados.cargando || proyectos.cargando || metas.cargando || focalizacion.cargando || avancesManuales.cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>

  if (convenios.datos.length === 0) {
    return (
      <section className="vista">
        <h2>Avance por convenio</h2>
        <Vacio>Todavía no hay convenios creados. Ve a "Convenios" para crear el primero.</Vacio>
      </section>
    )
  }

  return (
    <section className="vista">
      <h2>Avance por convenio</h2>
      {convenios.datos.map((convenio) => {
        const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))
        const nombresProyectos = nombresProyectosDe(convenio.proyectos_ids, proyectos.datos).join(', ')
        // Mismo orden fijo de proyectos que en el resto de la app (ver
        // utils/proyectos.js): agrupa las metas por proyecto en el orden
        // del catálogo, no en el orden en que se crearon.
        const metasDelConvenio = metas.datos
          .filter((m) => String(m.convenio_id) === String(convenio.id))
          .map((m, i) => ({ meta: m, i }))
          .sort((a, b) => {
            const ordenA = proyectos.datos.findIndex((p) => String(p.id) === String(a.meta.proyecto_id))
            const ordenB = proyectos.datos.findIndex((p) => String(p.id) === String(b.meta.proyecto_id))
            return (ordenA === -1 ? Infinity : ordenA) - (ordenB === -1 ? Infinity : ordenB) || a.i - b.i
          })
          .map(({ meta: m }) => m)
        const color = colorPorId(convenio.id)

        return (
          <div key={convenio.id} className={estilos.card} style={{ '--acento': color }}>
            <div className={estilos.header}>
              <h3>{convenio.nombre}</h3>
              <p>
                {aliado?.nombre || '—'} · {convenio.anio_vigencia} · {convenio.estado}
                {nombresProyectos && ` · ${nombresProyectos}`}
              </p>
            </div>

            {metasDelConvenio.length === 0 ? (
              <p className={estilos.sinMetas}>Sin metas todavía.</p>
            ) : (
              <div className={estilos.tablaWrap}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Actividad</th>
                    <th className={estilos.numero}>Meta</th>
                    <th className={estilos.numero}>Ejecutado</th>
                    <th>% Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {metasDelConvenio.map((meta) => {
                    const metaNum = Number(meta.cantidad_meta) || 0
                    const ejecutado = ejecutadoDe(meta, focalizacion.datos, avancesManuales.datos)
                    const pct = metaNum > 0 ? Math.round((ejecutado / metaNum) * 100) : 0
                    const pctBarra = Math.min(pct, 100)
                    const proyectoMeta = proyectos.datos.find((p) => String(p.id) === String(meta.proyecto_id))
                    return (
                      <tr key={meta.id}>
                        <td>{proyectoMeta?.nombre || '—'}</td>
                        <td>{meta.descripcion}</td>
                        <td className={estilos.numero}>{metaNum}</td>
                        <td className={estilos.numero}>{ejecutado}</td>
                        <td>
                          <div className={estilos.avanceCelda}>
                            <div className={estilos.track}>
                              <div
                                className={estilos.fill}
                                style={{ width: `${pctBarra}%`, background: colorAvance(pct) }}
                              />
                            </div>
                            <span className={estilos.pct}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
