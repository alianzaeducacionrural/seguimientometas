import { colorAvance, colorPorId } from '../utils/colores'
import { ejecutadoDe } from '../utils/avance'
import estilos from './TarjetaResumen.module.css'

// Tarjeta de avance de un convenio: Proyecto | Actividad | Meta | Ejecutado
// | Faltante | % Avance — compartida entre el admin (Avance por convenio) y
// el líder (Seguimiento a metas) para que ambas vistas se vean igual. El
// encabezado solo muestra aliado/año/estado; la lista de proyectos del
// convenio no se repite ahí porque ya aparece por fila en la columna
// Proyecto. `metasDelConvenio` debe llegar ya filtrada (y ordenada por el
// orden fijo del catálogo, ver utils/proyectos.js `ordenarPorProyecto`) por
// el llamador.
export default function TarjetaAvanceConvenio({ convenio, aliado, metasDelConvenio, proyectos, focalizacion, avancesManuales }) {
  const color = colorPorId(convenio.id)

  return (
    <div className={estilos.card} style={{ '--acento': color }}>
      <div className={estilos.header}>
        <h3>{convenio.nombre}</h3>
        <p>{aliado?.nombre || '—'} · {convenio.anio_vigencia} · {convenio.estado}</p>
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
                <th className={estilos.numero}>Faltante</th>
                <th>% Avance</th>
              </tr>
            </thead>
            <tbody>
              {metasDelConvenio.map((meta) => {
                const metaNum = Number(meta.cantidad_meta) || 0
                const ejecutado = ejecutadoDe(meta, focalizacion, avancesManuales)
                const pct = metaNum > 0 ? Math.round((ejecutado / metaNum) * 100) : 0
                const pctBarra = Math.min(pct, 100)
                const proyectoMeta = proyectos.find((p) => String(p.id) === String(meta.proyecto_id))
                const faltante = Math.max(metaNum - ejecutado, 0)
                return (
                  <tr key={meta.id}>
                    <td>{proyectoMeta?.nombre || '—'}</td>
                    <td>{meta.descripcion}</td>
                    <td className={estilos.numero}>{metaNum}</td>
                    <td className={estilos.numero}>{ejecutado}</td>
                    <td className={estilos.numero}>{faltante}</td>
                    <td>
                      <div className={estilos.avanceCelda}>
                        <div className={estilos.track}>
                          <div className={estilos.fill} style={{ width: `${pctBarra}%`, background: colorAvance(pct) }} />
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
}
