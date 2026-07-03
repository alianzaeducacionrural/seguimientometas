import useEntidad from '../hooks/useEntidad'
import estilos from '../../components/TarjetaResumen.module.css'
import { colorAvance, colorPorId } from '../../utils/colores'
import { ejecutadoDe } from '../../utils/avance'

export default function ResumenConvenios() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const proyectos = useEntidad('proyectos')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  if (convenios.cargando || aliados.cargando || proyectos.cargando || metas.cargando || focalizacion.cargando || asignaciones.cargando) return <p>Cargando…</p>
  if (convenios.error) return <p>Error: {convenios.error}</p>
  if (metas.error) return <p>Error: {metas.error}</p>

  if (convenios.datos.length === 0) {
    return <p>Todavía no hay convenios creados. Ve a "Convenios" para crear el primero.</p>
  }

  return (
    <section>
      <h2>Avance por convenio</h2>
      {convenios.datos.map((convenio) => {
        const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))
        const nombresProyectos = String(convenio.proyectos_ids)
          .split(',')
          .map((id) => proyectos.datos.find((p) => String(p.id) === id.trim())?.nombre)
          .filter(Boolean)
          .join(', ')
        const metasDelConvenio = metas.datos.filter((m) => String(m.convenio_id) === String(convenio.id))
        const color = colorPorId(convenio.id)

        return (
          <div key={convenio.id} className={estilos.card}>
            <div className={estilos.header} style={{ background: color }}>
              <h3>{convenio.nombre}</h3>
              <p>
                {aliado?.nombre || '—'} · {convenio.anio_vigencia} · {convenio.estado}
                {nombresProyectos && ` · ${nombresProyectos}`}
              </p>
            </div>

            {metasDelConvenio.length === 0 ? (
              <p style={{ padding: '0.75rem 1rem', margin: 0, color: '#898781' }}>Sin metas todavía.</p>
            ) : (
              <div className={estilos.tablaWrap}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>Actividad</th>
                    <th className={estilos.numero}>Meta</th>
                    <th className={estilos.numero}>Ejecutado</th>
                    <th>% Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {metasDelConvenio.map((meta) => {
                    const metaNum = Number(meta.cantidad_meta) || 0
                    const ejecutado = ejecutadoDe(meta, focalizacion.datos, asignaciones.datos)
                    const pct = metaNum > 0 ? Math.round((ejecutado / metaNum) * 100) : 0
                    const pctBarra = Math.min(pct, 100)
                    return (
                      <tr key={meta.id}>
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
