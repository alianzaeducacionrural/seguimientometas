import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../utils/api'
import { colorAvance, colorPorId } from '../utils/colores'
import { ejecutadoDe } from '../utils/avance'
import estilos from '../components/TarjetaResumen.module.css'
import { AvisoError, Cargando, Vacio } from '../components/Estado'
import MarcaLogo from '../components/MarcaLogo'

// Solo lectura: convenios/metas/focalización/carga de los proyectos que
// lidera, filtrados en el servidor por el token (ver getLiderConvenios en
// Code.gs) — acá no hay ningún dato de otros proyectos que ocultar, porque
// el backend nunca lo manda.
export default function LiderPanel() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(token ? null : 'Falta el token en el enlace.')
  const [cargando, setCargando] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    apiGet('liderConvenios', { token })
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [token])

  if (cargando) return <Envoltorio><Cargando /></Envoltorio>
  if (error) return <Envoltorio><AvisoError>{error}</AvisoError></Envoltorio>

  const { usuario, convenios, metas, focalizacion, asignaciones, aliados, proyectos, padrinos } = datos

  const cargaPorPadrino = padrinos.map((padrino) => {
    const items = [
      ...focalizacion.filter((f) => String(f.padrino_id) === String(padrino.id)).map((f) => ({ asignadas: 1, realizadas: f.estado === 'realizada' ? 1 : 0 })),
      ...asignaciones.filter((a) => String(a.padrino_id) === String(padrino.id)).map((a) => ({ asignadas: Number(a.cantidad_asignada) || 0, realizadas: Number(a.cantidad_realizada) || 0 })),
    ]
    return {
      padrino,
      asignadas: items.reduce((s, i) => s + i.asignadas, 0),
      realizadas: items.reduce((s, i) => s + i.realizadas, 0),
    }
  })

  return (
    <Envoltorio nombre={usuario.nombre} proyectos={proyectos}>
      <h2>Avance de tus convenios</h2>
      {convenios.length === 0 && <Vacio>Todavía no hay convenios en tus proyectos.</Vacio>}
      {convenios.map((convenio) => {
        const aliado = aliados.find((a) => String(a.id) === String(convenio.aliado_id))
        const metasDelConvenio = metas.filter((m) => String(m.convenio_id) === String(convenio.id))
        const color = colorPorId(convenio.id)

        return (
          <div key={convenio.id} className={estilos.card} style={{ '--acento': color }}>
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
                    <th>Actividad</th>
                    <th className={estilos.numero}>Meta</th>
                    <th className={estilos.numero}>Ejecutado</th>
                    <th>% Avance</th>
                  </tr>
                </thead>
                <tbody>
                  {metasDelConvenio.map((meta) => {
                    const metaNum = Number(meta.cantidad_meta) || 0
                    const ejecutado = ejecutadoDe(meta, focalizacion, asignaciones)
                    const pct = metaNum > 0 ? Math.round((ejecutado / metaNum) * 100) : 0
                    return (
                      <tr key={meta.id}>
                        <td>{meta.descripcion}</td>
                        <td className={estilos.numero}>{metaNum}</td>
                        <td className={estilos.numero}>{ejecutado}</td>
                        <td>
                          <div className={estilos.avanceCelda}>
                            <div className={estilos.track}>
                              <div className={estilos.fill} style={{ width: `${Math.min(pct, 100)}%`, background: colorAvance(pct) }} />
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

      <h2>Carga de padrinos</h2>
      {cargaPorPadrino.length === 0 ? (
        <Vacio>Todavía no hay padrinos con visitas asignadas en tus convenios.</Vacio>
      ) : (
        <div className="tabla-envoltura">
        <table className={estilos.tabla}>
          <thead>
            <tr>
              <th>Padrino</th>
              <th className={estilos.numero}>Asignadas</th>
              <th className={estilos.numero}>Realizadas</th>
            </tr>
          </thead>
          <tbody>
            {cargaPorPadrino.map(({ padrino, asignadas, realizadas }) => (
              <tr key={padrino.id}>
                <td>{padrino.nombre}</td>
                <td className={estilos.numero}>{asignadas}</td>
                <td className={estilos.numero}>{realizadas}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </Envoltorio>
  )
}

function Envoltorio({ nombre, proyectos, children }) {
  return (
    <>
      <div className="banda-persona">
        <div className="banda-persona-interior">
          <MarcaLogo invertido />
          <h1>{nombre ? `Hola, ${nombre}` : 'Vista de líder'}</h1>
          <span className="panel-persona-rol">Líder</span>
        </div>
        {nombre && (
          <p className="banda-persona-sub">
            Solo lectura de {proyectos?.map((p) => p.nombre).join(', ') || 'tus proyectos'}.
          </p>
        )}
      </div>
      <div className="panel-persona">{children}</div>
    </>
  )
}
