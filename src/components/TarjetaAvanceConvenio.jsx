import { colorAvance, colorPorId } from '../utils/colores'
import { ejecutadoDe, programadasDe } from '../utils/avance'
import { Anillo } from './Graficos'
import estilos from './TarjetaResumen.module.css'

// Tarjeta de avance de un convenio: Proyecto | Actividad | Meta | Ejecutado
// | Faltante | % Avance — compartida entre el admin (Avance por convenio) y
// el líder (Seguimiento a metas) para que ambas vistas se vean igual.
// `conProgramadas` (solo el admin lo activa) cambia las columnas a Meta |
// Realizadas | Programadas | Faltante | % Proyectado, donde Faltante descuenta
// también las visitas ya programadas — así se ve cuánto queda por programar. El
// encabezado solo muestra aliado/año/estado; la lista de proyectos del
// convenio no se repite ahí porque ya aparece por fila en la columna
// Proyecto. `metasDelConvenio` debe llegar ya filtrada (y ordenada por el
// orden fijo del catálogo, ver utils/proyectos.js `ordenarPorProyecto`) por
// el llamador.
export default function TarjetaAvanceConvenio({ convenio, aliado, metasDelConvenio, proyectos, focalizacion, avancesManuales, conProgramadas = false, visual = false }) {
  const color = colorPorId(convenio.id)

  // Resumen con anillo (solo admin): cada actividad aporta como máximo su meta.
  let metaTotal = 0
  let realizadasTotal = 0
  let programadasTotal = 0
  if (visual) {
    metasDelConvenio.forEach((m) => {
      const meta = Number(m.cantidad_meta) || 0
      const r = Math.min(ejecutadoDe(m, focalizacion, avancesManuales), meta)
      metaTotal += meta
      realizadasTotal += r
      programadasTotal += Math.min(programadasDe(m, focalizacion), Math.max(meta - r, 0))
    })
  }
  const pctDe = (n) => (metaTotal > 0 ? Math.round((n / metaTotal) * 100) : 0)

  return (
    <div className={estilos.card} style={{ '--acento': color }}>
      <div className={estilos.header}>
        <div className={visual ? 'cabecera-visual' : undefined}>
          <div>
            <h3>{convenio.nombre}</h3>
            <p>{aliado?.nombre || '—'} · {convenio.anio_vigencia} · {convenio.estado}</p>
            {visual && (
              <ul className="chips-resumen">
                <li><b>{metaTotal}</b> meta</li>
                <li className="ok"><b>{realizadasTotal}</b> realizadas</li>
                <li className="prog"><b>{programadasTotal}</b> programadas</li>
                <li className="falta"><b>{Math.max(metaTotal - realizadasTotal - programadasTotal, 0)}</b> por programar</li>
              </ul>
            )}
          </div>
          {visual && (
            <Anillo valor={pctDe(realizadasTotal)} extra={pctDe(programadasTotal)} tamano={104} grosor={11} color={color}>
              <strong>{pctDe(realizadasTotal)}%</strong>
            </Anillo>
          )}
        </div>
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
                <th className={estilos.numero}>{conProgramadas ? 'Realizadas' : 'Ejecutado'}</th>
                {conProgramadas && <th className={estilos.numero}>Programadas</th>}
                <th className={estilos.numero}>Faltante</th>
                <th>{conProgramadas ? '% Proyectado' : '% Avance'}</th>
              </tr>
            </thead>
            <tbody>
              {metasDelConvenio.map((meta) => {
                const metaNum = Number(meta.cantidad_meta) || 0
                const ejecutado = ejecutadoDe(meta, focalizacion, avancesManuales)
                const programadas = conProgramadas ? programadasDe(meta, focalizacion) : 0
                const proyectado = ejecutado + programadas
                const pct = metaNum > 0 ? Math.round((proyectado / metaNum) * 100) : 0
                const pctReal = metaNum > 0 ? Math.min(Math.round((ejecutado / metaNum) * 100), 100) : 0
                const pctBarra = Math.min(pct, 100)
                const proyectoMeta = proyectos.find((p) => String(p.id) === String(meta.proyecto_id))
                const faltante = Math.max(metaNum - proyectado, 0)
                return (
                  <tr key={meta.id}>
                    <td>{proyectoMeta?.nombre || '—'}</td>
                    <td>{meta.descripcion}</td>
                    <td className={estilos.numero}>{metaNum}</td>
                    <td className={estilos.numero}>{ejecutado}</td>
                    {conProgramadas && <td className={estilos.numero}>{programadas}</td>}
                    <td className={estilos.numero}>{faltante}</td>
                    <td>
                      <div className={estilos.avanceCelda}>
                        {conProgramadas ? (
                          <div className={`${estilos.track} ${estilos.dosTramos}`} title={`Realizadas ${pctReal}% · con programadas ${pct}%`}>
                            <div className={estilos.fill} style={{ width: `${pctReal}%`, background: colorAvance(pct), borderRadius: 0 }} />
                            <div className={estilos.fillProg} style={{ width: `${Math.max(pctBarra - pctReal, 0)}%` }} />
                          </div>
                        ) : (
                          <div className={estilos.track}>
                            <div className={estilos.fill} style={{ width: `${pctBarra}%`, background: colorAvance(pct) }} />
                          </div>
                        )}
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
