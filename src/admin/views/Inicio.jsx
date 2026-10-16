import { Link } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import { AvisoError, Cargando } from '../../components/Estado'
import { ejecutadoDe } from '../../utils/avance'
import { fechaVisita } from '../../utils/estadoFocalizacion'
import { hoy } from '../../utils/formato'
import { colorAvance } from '../../utils/colores'
import { PADRINO_SIN_ASIGNAR } from '../../utils/padrino'

const sinPadrino = (f) => !String(f.padrino_id ?? '').trim()

// Panel de control: qué requiere atención hoy (cada línea lleva a Visitas ya
// filtrada) y cómo va cada convenio. No tiene datos propios — solo resume.
export default function Inicio() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const avances = useEntidad('avances_manuales')

  if ([convenios, aliados, metas, focalizacion, avances].some((e) => e.cargando)) return <Cargando />
  const error = [convenios, metas, focalizacion].find((e) => e.error)
  if (error) return <AvisoError>Error: {error.error}</AvisoError>

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const visitas = focalizacion.datos.filter((f) => {
    const t = metaPorId[String(f.meta_id)]?.tipo
    return t === 'visita_focalizada' || t === 'visita_sin_focalizar'
  })
  const cuenta = (fn) => visitas.filter(fn).length

  const hoyIso = hoy()
  const en7 = new Date(Date.parse(hoyIso) + 7 * 864e5).toISOString().slice(0, 10)
  const total = visitas.length
  const realizadas = cuenta((f) => f.estado === 'realizada')
  const programadas = cuenta((f) => f.estado === 'programada')
  const pendientes = cuenta((f) => f.estado === 'pendiente')

  const alertas = [
    {
      n: cuenta((f) => f.estado === 'programada' && fechaVisita(f) && fechaVisita(f) < hoyIso),
      nivel: 'alto',
      titulo: 'Programadas vencidas',
      detalle: 'La fecha programada ya pasó y no se marcaron realizadas',
      a: '/admin/visitas?estado=programada&vencidas=1',
    },
    {
      n: cuenta((f) => f.estado === 'pendiente' && sinPadrino(f)),
      nivel: 'medio',
      titulo: 'Pendientes sin asignar',
      detalle: 'Visitas por hacer que todavía no tienen padrino',
      a: `/admin/visitas?estado=pendiente&padrino=${PADRINO_SIN_ASIGNAR}`,
    },
    {
      n: cuenta((f) => f.estado === 'programada' && sinPadrino(f)),
      nivel: 'medio',
      titulo: 'Programadas sin asignar',
      detalle: 'Tienen fecha pero nadie responsable',
      a: `/admin/visitas?estado=programada&padrino=${PADRINO_SIN_ASIGNAR}`,
    },
    {
      n: cuenta((f) => f.estado === 'realizada' && sinPadrino(f)),
      nivel: 'medio',
      titulo: 'Realizadas sin responsable',
      detalle: 'Se hicieron pero no queda quién las realizó',
      a: `/admin/visitas?estado=realizada&padrino=${PADRINO_SIN_ASIGNAR}`,
    },
    {
      n: cuenta((f) => f.estado === 'programada' && fechaVisita(f) >= hoyIso && fechaVisita(f) <= en7),
      nivel: 'info',
      titulo: 'Próximos 7 días',
      detalle: 'Visitas programadas para esta semana',
      a: '/admin/visitas?estado=programada&orden=fecha',
    },
  ]

  // Avance por convenio: cada meta aporta como máximo su propia meta (un
  // exceso en una actividad no tapa el atraso de otra).
  const filasConvenio = convenios.datos.map((c) => {
    const delConvenio = metas.datos.filter((m) => String(m.convenio_id) === String(c.id))
    const meta = delConvenio.reduce((s, m) => s + (Number(m.cantidad_meta) || 0), 0)
    const hecho = delConvenio.reduce((s, m) => {
      const mm = Number(m.cantidad_meta) || 0
      return s + Math.min(ejecutadoDe(m, focalizacion.datos, avances.datos), mm)
    }, 0)
    const aliado = aliados.datos.find((a) => String(a.id) === String(c.aliado_id))
    return { c, aliado, meta, hecho, pct: meta > 0 ? Math.round((hecho / meta) * 100) : 0 }
  })

  return (
    <section className="vista">
      <div className="adm-cabecera">
        <div>
          <h2>Inicio</h2>
          <p className="adm-sub">Resumen de la focalización y lo que requiere atención.</p>
        </div>
        <div className="adm-acciones">
          <Link to="/admin/visitas" className="btn-enlace">Ver todas las visitas →</Link>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><strong>{total}</strong><span>Visitas</span></div>
        <div className="kpi"><strong style={{ color: 'var(--logrado)' }}>{realizadas}</strong><span>Realizadas</span></div>
        <div className="kpi"><strong style={{ color: 'var(--maduracion)' }}>{programadas}</strong><span>Programadas</span></div>
        <div className="kpi"><strong>{pendientes}</strong><span>Pendientes</span></div>
        <div className="kpi">
          <strong>{total ? Math.round((realizadas / total) * 100) : 0}%</strong>
          <span>Realizadas / total</span>
        </div>
      </div>

      <div className="inicio-rejilla">
        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab"><h3>Requiere atención</h3></div>
          <ul className="alerta-lista">
            {alertas.map((al) => (
              <li key={al.titulo}>
                <Link to={al.a} className="alerta-item">
                  <span className={`alerta-item__n ${al.n === 0 ? 'ok' : al.nivel === 'info' ? '' : al.nivel}`}>{al.n}</span>
                  <span className="alerta-item__txt">
                    <strong>{al.titulo}</strong>
                    <small>{al.detalle}</small>
                  </span>
                  <span className="alerta-item__ir">Ver →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab">
            <h3>Avance por convenio</h3>
            <Link to="/admin/reportes">Detalle →</Link>
          </div>
          {filasConvenio.length === 0 && <p className="adm-sub" style={{ padding: '0.9rem' }}>Todavía no hay convenios.</p>}
          {filasConvenio.map(({ c, aliado, meta, hecho, pct }) => (
            <div key={c.id} className="avance-fila">
              <div className="avance-fila__nombre">
                <strong>{c.nombre}</strong>
                <small>{aliado?.nombre || '—'} · {hecho} de {meta}</small>
              </div>
              <div className="avance-barra"><span style={{ width: `${Math.min(pct, 100)}%`, background: colorAvance(pct) }} /></div>
              <div className="avance-fila__pct">{pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
