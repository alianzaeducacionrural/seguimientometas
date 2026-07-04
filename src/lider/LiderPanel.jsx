import { Fragment, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../utils/api'
import { colorAvance, colorPorId } from '../utils/colores'
import { ejecutadoDe } from '../utils/avance'
import { totalesDe, conContexto } from '../utils/cargaPadrino'
import estilos from '../components/TarjetaResumen.module.css'
import { AvisoError, Cargando, Vacio } from '../components/Estado'
import MarcaLogo from '../components/MarcaLogo'
import Avatar from '../components/Avatar'
import Flecha from '../components/Flecha'
import TarjetaVisitaFocalizacion from '../components/TarjetaVisitaFocalizacion'
import ColumnasVisitas from '../components/ColumnasVisitas'

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
  const [abiertoId, setAbiertoId] = useState(null)
  const [municipio, setMunicipio] = useState('')
  const [padrinoId, setPadrinoId] = useState('')

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

  const metaPorId = Object.fromEntries(metas.map((m) => [String(m.id), m]))
  const convenioPorId = Object.fromEntries(convenios.map((c) => [String(c.id), c]))
  const focalizacionConContexto = focalizacion.map((f) => conContexto(f, metaPorId, convenioPorId))
  const asignacionesConContexto = asignaciones.map((a) => conContexto(a, metaPorId, convenioPorId))

  // El filtro de municipio solo aplica a focalización (asignaciones sin
  // focalizar no tienen sede fija, así que no se ven afectadas por él).
  const focalizacionFiltrada = municipio
    ? focalizacionConContexto.filter((f) => f.municipio === municipio)
    : focalizacionConContexto
  const municipios = Array.from(new Set(focalizacion.map((f) => f.municipio).filter(Boolean))).sort()

  const padrinosConCarga = padrinos.filter((p) => {
    if (padrinoId && String(p.id) !== padrinoId) return false
    return true
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
      {padrinos.length === 0 ? (
        <Vacio>Todavía no hay padrinos con visitas asignadas en tus convenios.</Vacio>
      ) : (
        <>
          <div className="filtros">
            <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
              <option value="">Todos los municipios</option>
              {municipios.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
              <option value="">Todos los padrinos</option>
              {padrinos.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.nombre}</option>
              ))}
            </select>
            {(municipio || padrinoId) && (
              <button type="button" onClick={() => { setMunicipio(''); setPadrinoId('') }}>
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th className="celda-flecha"></th>
                  <th>Padrino</th>
                  <th className="numero">Asignadas</th>
                  <th className="numero">Realizadas</th>
                  <th className="numero">Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {padrinosConCarga.map((padrino) => {
                  const { asignadas, realizadas, pendientes } = totalesDe(padrino.id, focalizacionFiltrada, asignaciones)
                  const abierto = String(abiertoId) === String(padrino.id)

                  const pendientesFocalizacion = focalizacionFiltrada.filter(
                    (f) => String(f.padrino_id) === String(padrino.id) && f.estado !== 'realizada'
                  )
                  const realizadasFocalizacion = focalizacionFiltrada.filter(
                    (f) => String(f.padrino_id) === String(padrino.id) && f.estado === 'realizada'
                  )
                  const asignacionesDelPadrino = asignacionesConContexto.filter(
                    (a) => String(a.padrino_id) === String(padrino.id)
                  )

                  return (
                    <Fragment key={padrino.id}>
                      <tr
                        className={`fila-expandible${abierto ? ' fila-abierta' : ''}`}
                        onClick={() => setAbiertoId(abierto ? null : padrino.id)}
                      >
                        <td className="celda-flecha"><Flecha abierta={abierto} /></td>
                        <td>
                          <span className="celda-persona">
                            <Avatar id={padrino.id} nombre={padrino.nombre} tamano={28} />
                            {padrino.nombre}
                          </span>
                        </td>
                        <td className="numero">{asignadas}</td>
                        <td className="numero">{realizadas}</td>
                        <td className="numero">{pendientes}</td>
                      </tr>
                      {abierto && (
                        <tr className="fila-panel">
                          <td colSpan={5}>
                            <div className="panel-acordeon">
                              <ColumnasVisitas
                                pendientes={pendientesFocalizacion}
                                realizadas={realizadasFocalizacion}
                                renderTarjeta={(item) => <TarjetaVisitaFocalizacion key={item.id} item={item} />}
                              />

                              {asignacionesDelPadrino.length > 0 && (
                                <>
                                  <h4 style={{ marginTop: '1rem' }}>Visitas sin focalizar</h4>
                                  <div className="tabla-envoltura">
                                    <table className="tabla">
                                      <thead>
                                        <tr>
                                          <th>Convenio</th>
                                          <th>Meta</th>
                                          <th className="numero">Asignadas</th>
                                          <th className="numero">Realizadas</th>
                                          <th className="numero">Pendientes</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {asignacionesDelPadrino.map((item) => {
                                          const pendiente = (Number(item.cantidad_asignada) || 0) - (Number(item.cantidad_realizada) || 0)
                                          return (
                                            <tr key={item.id}>
                                              <td>{item.convenio_nombre}</td>
                                              <td>{item.meta_descripcion}</td>
                                              <td className="numero">{item.cantidad_asignada}</td>
                                              <td className="numero">{item.cantidad_realizada || 0}</td>
                                              <td className="numero">{pendiente}</td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </>
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
        </>
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
