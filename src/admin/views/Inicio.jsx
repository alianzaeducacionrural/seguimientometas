import { Link } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import { AvisoError, Cargando } from '../../components/Estado'
import Avatar from '../../components/Avatar'
import { Anillo, BarrasH, BarrasMes, Dona, Mosaico } from '../../components/Graficos'
import { IconoAlerta, IconoCalendario, IconoCheck, IconoReloj } from '../../components/Iconos'
import { ejecutadoDe } from '../../utils/avance'
import { fechaVisita } from '../../utils/estadoFocalizacion'
import { hoy } from '../../utils/formato'
import { colorPorId } from '../../utils/colores'
import { PADRINO_SIN_ASIGNAR } from '../../utils/padrino'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const sinPadrino = (f) => !String(f.padrino_id ?? '').trim()
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0)

// Tablero de control del programa: avance global, estado de las visitas,
// ritmo por mes, agenda, convenios, responsables y municipios. No tiene datos
// propios: solo resume, y cada bloque enlaza a Visitas ya filtrada.
export default function Inicio() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const avances = useEntidad('avances_manuales')
  const usuarios = useEntidad('usuarios')

  if ([convenios, aliados, metas, focalizacion, avances, usuarios].some((e) => e.cargando)) return <Cargando />
  const error = [convenios, metas, focalizacion].find((e) => e.error)
  if (error) return <AvisoError>Error: {error.error}</AvisoError>

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const nombreDe = (id) => usuarios.datos.find((u) => String(u.id) === String(id))?.nombre || ''
  const visitas = focalizacion.datos.filter((f) => {
    const t = metaPorId[String(f.meta_id)]?.tipo
    return t === 'visita_focalizada' || t === 'visita_sin_focalizar'
  })
  const cuenta = (fn) => visitas.filter(fn).length
  const hoyIso = hoy()
  const en14 = new Date(Date.parse(hoyIso) + 14 * 864e5).toISOString().slice(0, 10)

  const total = visitas.length
  const realizadas = cuenta((f) => f.estado === 'realizada')
  const programadas = cuenta((f) => f.estado === 'programada')
  const pendientes = cuenta((f) => f.estado === 'pendiente')

  // Avance global contra las metas: cada actividad aporta como máximo su meta.
  const metasVisita = metas.datos.filter((m) => m.tipo === 'visita_focalizada' || m.tipo === 'visita_sin_focalizar')
  let metaTotal = 0
  let hechas = 0
  let proyectadas = 0
  metasVisita.forEach((m) => {
    const meta = Number(m.cantidad_meta) || 0
    const r = Math.min(ejecutadoDe(m, focalizacion.datos, []), meta)
    const p = Math.min(focalizacion.datos.filter((f) => String(f.meta_id) === String(m.id) && f.estado === 'programada').length, meta - r)
    metaTotal += meta
    hechas += r
    proyectadas += p
  })

  const alertas = [
    { n: cuenta((f) => f.estado === 'programada' && fechaVisita(f) && fechaVisita(f) < hoyIso), nivel: 'alto', titulo: 'Programadas vencidas', detalle: 'La fecha ya pasó y no se marcaron realizadas', a: '/admin/visitas?estado=programada&vencidas=1' },
    { n: cuenta((f) => f.estado === 'pendiente' && sinPadrino(f)), nivel: 'medio', titulo: 'Pendientes sin asignar', detalle: 'Visitas por hacer sin padrino', a: `/admin/visitas?estado=pendiente&padrino=${PADRINO_SIN_ASIGNAR}` },
    { n: cuenta((f) => f.estado === 'programada' && sinPadrino(f)), nivel: 'medio', titulo: 'Programadas sin asignar', detalle: 'Tienen fecha pero nadie responsable', a: `/admin/visitas?estado=programada&padrino=${PADRINO_SIN_ASIGNAR}` },
    { n: cuenta((f) => f.estado === 'realizada' && sinPadrino(f)), nivel: 'medio', titulo: 'Realizadas sin responsable', detalle: 'No queda quién las realizó', a: `/admin/visitas?estado=realizada&padrino=${PADRINO_SIN_ASIGNAR}` },
  ]
  const hayAlertas = alertas.some((a) => a.n > 0)

  // Ritmo por mes (realizadas por fecha_realizada, programadas por fecha_programada).
  const porMes = {}
  visitas.forEach((f) => {
    const fecha = fechaVisita(f)
    if (!fecha) return
    const clave = fecha.slice(0, 7)
    porMes[clave] ||= { realizadas: 0, programadas: 0 }
    porMes[clave][f.estado === 'realizada' ? 'realizadas' : 'programadas']++
  })
  const datosMes = Object.keys(porMes).sort().slice(-9).map((k) => ({
    etiqueta: `${MESES[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`,
    ...porMes[k],
  }))

  // Agenda: próximas visitas programadas (14 días).
  const agenda = visitas
    .filter((f) => f.estado === 'programada' && fechaVisita(f) >= hoyIso && fechaVisita(f) <= en14)
    .sort((a, b) => fechaVisita(a).localeCompare(fechaVisita(b)))

  // Convenios.
  const filasConvenio = convenios.datos.map((c) => {
    const delConvenio = metasVisita.filter((m) => String(m.convenio_id) === String(c.id))
    const meta = delConvenio.reduce((s, m) => s + (Number(m.cantidad_meta) || 0), 0)
    const r = delConvenio.reduce((s, m) => s + Math.min(ejecutadoDe(m, focalizacion.datos, []), Number(m.cantidad_meta) || 0), 0)
    const p = delConvenio.reduce((s, m) => {
      const mm = Number(m.cantidad_meta) || 0
      const rr = Math.min(ejecutadoDe(m, focalizacion.datos, []), mm)
      return s + Math.min(focalizacion.datos.filter((f) => String(f.meta_id) === String(m.id) && f.estado === 'programada').length, mm - rr)
    }, 0)
    return { c, aliado: aliados.datos.find((a) => String(a.id) === String(c.aliado_id)), meta, r, p }
  })

  // Responsables con más visitas realizadas.
  const porPadrino = {}
  visitas.forEach((f) => {
    if (sinPadrino(f)) return
    porPadrino[f.padrino_id] ||= { realizadas: 0, programadas: 0 }
    if (f.estado === 'realizada') porPadrino[f.padrino_id].realizadas++
    else if (f.estado === 'programada') porPadrino[f.padrino_id].programadas++
  })
  const topPadrinos = Object.entries(porPadrino)
    .sort((a, b) => b[1].realizadas - a[1].realizadas)
    .slice(0, 7)
    .map(([id, v]) => ({ etiqueta: nombreDe(id) || `#${id}`, valor: v.realizadas, extra: v.programadas, color: colorPorId(id), avatar: <Avatar id={id} nombre={nombreDe(id)} tamano={24} /> }))

  // Municipios: % de visitas realizadas.
  const porMunicipio = {}
  visitas.forEach((f) => {
    if (!f.municipio) return
    porMunicipio[f.municipio] ||= { total: 0, hechas: 0 }
    porMunicipio[f.municipio].total++
    if (f.estado === 'realizada') porMunicipio[f.municipio].hechas++
  })
  const mosaico = Object.entries(porMunicipio)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([m, v]) => ({ etiqueta: m, pct: pct(v.hechas, v.total), texto: `${v.hechas} de ${v.total} visitas`, a: `/admin/visitas?municipio=${encodeURIComponent(m)}` }))

  return (
    <section className="vista tablero">
      <div className="hero">
        <div className="hero__texto">
          <span className="hero__etq">Programa de focalización 2026</span>
          <h2>{pct(hechas, metaTotal)}% de la meta cumplida</h2>
          <p>
            <b>{hechas}</b> de <b>{metaTotal}</b> visitas realizadas · <b>{proyectadas}</b> más ya programadas ·
            faltan por programar <b>{Math.max(metaTotal - hechas - proyectadas, 0)}</b>
          </p>
          <div className="hero__acciones">
            <Link to="/admin/visitas" className="hero__boton">Gestionar visitas →</Link>
            <Link to="/admin/reportes" className="hero__boton hero__boton--suave">Ver reportes</Link>
          </div>
        </div>
        <Anillo valor={pct(hechas, metaTotal)} extra={pct(proyectadas, metaTotal)} tamano={176} grosor={16} color="#8ff0e2" colorExtra="#ffc964">
          <strong>{pct(hechas, metaTotal)}%</strong>
          <span>realizado</span>
        </Anillo>
      </div>

      <div className="kpis-grandes">
        <Link to="/admin/visitas?estado=realizada" className="kpi-grande kpi-grande--ok">
          <span className="kpi-grande__icono"><IconoCheck tamano={22} /></span>
          <strong>{realizadas}</strong><span>Realizadas</span><small>{pct(realizadas, total)}% del total</small>
        </Link>
        <Link to="/admin/visitas?estado=programada" className="kpi-grande kpi-grande--prog">
          <span className="kpi-grande__icono"><IconoCalendario tamano={22} /></span>
          <strong>{programadas}</strong><span>Programadas</span><small>{agenda.length} en los próximos 14 días</small>
        </Link>
        <Link to="/admin/visitas?estado=pendiente" className="kpi-grande kpi-grande--pend">
          <span className="kpi-grande__icono"><IconoReloj tamano={22} /></span>
          <strong>{pendientes}</strong><span>Pendientes</span><small>por programar</small>
        </Link>
        <div className={`kpi-grande ${hayAlertas ? 'kpi-grande--alerta' : 'kpi-grande--ok'}`}>
          <span className="kpi-grande__icono"><IconoAlerta tamano={22} /></span>
          <strong>{alertas.reduce((s, a) => s + a.n, 0)}</strong><span>Requieren atención</span><small>ver detalle abajo</small>
        </div>
      </div>

      <div className="tablero__rejilla tablero__rejilla--2-1">
        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab"><h3>Ritmo de visitas por mes</h3><span className="leyenda-mini"><i className="ley ley--ok" />Realizadas <i className="ley ley--prog" />Programadas</span></div>
          <div className="tarjeta-adm__cuerpo">{datosMes.length ? <BarrasMes datos={datosMes} /> : <p className="adm-sub">Aún no hay visitas con fecha.</p>}</div>
        </div>
        <div className="tarjeta-adm tarjeta-adm--centrada">
          <div className="tarjeta-adm__cab"><h3>Estado de las visitas</h3></div>
          <div className="tarjeta-adm__cuerpo">
            <Dona
              segmentos={[
                { etiqueta: 'Realizadas', valor: realizadas, color: 'var(--logrado)' },
                { etiqueta: 'Programadas', valor: programadas, color: '#e9a825' },
                { etiqueta: 'Pendientes', valor: pendientes, color: '#9bb0b5' },
              ]}
              centro={<><strong>{total}</strong><span>visitas</span></>}
            />
          </div>
        </div>
      </div>

      <div className="tablero__rejilla tablero__rejilla--1-1">
        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab"><h3>Requiere atención</h3></div>
          <ul className="alerta-lista">
            {alertas.map((al) => (
              <li key={al.titulo}>
                <Link to={al.a} className="alerta-item">
                  <span className={`alerta-item__n ${al.n === 0 ? 'ok' : al.nivel}`}>{al.n}</span>
                  <span className="alerta-item__txt"><strong>{al.titulo}</strong><small>{al.detalle}</small></span>
                  <span className="alerta-item__ir">Ver →</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab"><h3>Agenda · próximos 14 días</h3><Link to="/admin/visitas?estado=programada&orden=fecha">Ver todas →</Link></div>
          {agenda.length === 0 ? <p className="adm-sub" style={{ padding: '0.9rem' }}>No hay visitas programadas en los próximos 14 días.</p> : (
            <ul className="agenda">
              {agenda.slice(0, 7).map((f) => {
                const fecha = fechaVisita(f)
                return (
                  <li key={f.id}>
                    <span className="agenda__dia"><b>{fecha.slice(8, 10)}</b><small>{MESES[Number(fecha.slice(5, 7)) - 1]}</small></span>
                    <span className="agenda__txt"><strong>{f.municipio}</strong><small>{[f.institucion, f.sede].filter(Boolean).join(' · ')}</small></span>
                    <span className="agenda__quien">{sinPadrino(f) ? <em>Sin asignar</em> : <><Avatar id={f.padrino_id} nombre={nombreDe(f.padrino_id)} tamano={22} />{nombreDe(f.padrino_id).split(' ')[0]}</>}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="tablero__rejilla tablero__rejilla--1-1">
        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab"><h3>Avance por convenio</h3><Link to="/admin/reportes">Detalle →</Link></div>
          <div className="convenios-anillos">
            {filasConvenio.map(({ c, aliado, meta, r, p }) => (
              <div key={c.id} className="convenio-anillo">
                <Anillo valor={pct(r, meta)} extra={pct(p, meta)} tamano={92} grosor={10} color={colorPorId(c.id)}>
                  <strong>{pct(r, meta)}%</strong>
                </Anillo>
                <div><strong>{aliado?.nombre || c.nombre}</strong><small>{c.nombre}</small><small>{r} de {meta} · +{p} programadas</small></div>
              </div>
            ))}
          </div>
        </div>
        <div className="tarjeta-adm">
          <div className="tarjeta-adm__cab"><h3>Quién más ha visitado</h3><Link to="/admin/equipo/carga">Carga →</Link></div>
          <BarrasH items={topPadrinos} />
        </div>
      </div>

      <div className="tarjeta-adm">
        <div className="tarjeta-adm__cab"><h3>Avance por municipio</h3><span className="adm-sub">% de visitas realizadas · clic para ver sus visitas</span></div>
        <div className="tarjeta-adm__cuerpo"><Mosaico items={mosaico} /></div>
      </div>
    </section>
  )
}
