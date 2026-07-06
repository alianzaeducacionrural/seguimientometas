import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, editar } from '../utils/api'
import { colorAvance, colorPorId } from '../utils/colores'
import { ejecutadoDe } from '../utils/avance'
import { totalesDe, conContexto } from '../utils/cargaPadrino'
import { accionesEstadoFocalizacion } from '../utils/estadoFocalizacion'
import estilos from '../components/TarjetaResumen.module.css'
import { AvisoError, Cargando, Vacio } from '../components/Estado'
import MarcaLogo from '../components/MarcaLogo'
import Avatar from '../components/Avatar'
import Flecha from '../components/Flecha'
import TarjetaVisitaEditable from '../components/TarjetaVisitaEditable'
import ColumnasVisitas from '../components/ColumnasVisitas'
import FilaAsignacionCompacta from '../components/FilaAsignacionCompacta'

const PESTANAS = [
  { id: 'metas', etiqueta: 'Seguimiento a metas' },
  { id: 'padrinos', etiqueta: 'Vista de padrinos' },
  { id: 'focalizacion', etiqueta: 'Focalización' },
]

// El líder ve convenios/metas/focalización/carga de sus proyectos (uno o
// varios, filtrados en el servidor por el token — ver getLiderConvenios en
// Code.gs) en tres pestañas: avance de metas (lectura), carga por padrino
// (lectura, para nivelar el equipo) y focalización (acá SÍ puede actuar:
// reasignar padrino y avanzar/revertir el estado de la visita, igual que
// Actividades por padrino en el admin — ver TarjetaVisitaEditable).
export default function LiderPanel() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(token ? null : 'Falta el token en el enlace.')
  const [cargando, setCargando] = useState(Boolean(token))
  const [todosProyectos, setTodosProyectos] = useState([])
  const [pestana, setPestana] = useState('metas')
  const [proyectoId, setProyectoId] = useState('')
  const [abiertoId, setAbiertoId] = useState(null)
  const [municipio, setMunicipio] = useState('')
  const [padrinoId, setPadrinoId] = useState('')

  const cargar = useCallback(() => {
    if (!token) return Promise.resolve()
    return apiGet('liderConvenios', { token })
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [token])

  useEffect(() => { cargar() }, [cargar])
  // El catálogo completo de proyectos (no solo los que lidera) para poder
  // mostrar el nombre del proyecto de una meta aunque no sea uno de los
  // suyos (un convenio puede abarcar proyectos que él no lidera).
  useEffect(() => { apiGet('proyectos').then((r) => setTodosProyectos(r.datos)).catch(() => {}) }, [])

  if (cargando) return <Envoltorio><Cargando /></Envoltorio>
  if (error) return <Envoltorio><AvisoError>{error}</AvisoError></Envoltorio>

  const { usuario, convenios, metas, focalizacion, asignaciones, aliados, proyectos, padrinos } = datos

  async function editarFocalizacion(id, campos) {
    await editar('focalizacion', id, campos)
    await cargar()
  }

  async function editarAsignacion(id, campos) {
    await editar('asignaciones_sin_focalizacion', id, campos)
    await cargar()
  }

  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(editarFocalizacion)

  // El filtro de proyecto solo aplica si el líder tiene más de uno: filtra
  // convenios por proyectos_ids y, dentro de ellos, metas por proyecto_id
  // (cayendo al convenio ya filtrado si la meta es vieja y no lo tiene).
  const conveniosFiltrados = proyectoId
    ? convenios.filter((c) => String(c.proyectos_ids).split(',').map((v) => v.trim()).includes(proyectoId))
    : convenios
  const convenioIdsFiltrados = new Set(conveniosFiltrados.map((c) => String(c.id)))
  const metasFiltradas = metas.filter((m) => {
    if (!convenioIdsFiltrados.has(String(m.convenio_id))) return false
    if (!proyectoId) return true
    const proyectoMeta = String(m.proyecto_id || '').trim()
    return proyectoMeta ? proyectoMeta === proyectoId : true
  })
  const metaIdsFiltradas = new Set(metasFiltradas.map((m) => String(m.id)))

  const metaPorId = Object.fromEntries(metas.map((m) => [String(m.id), m]))
  const convenioPorId = Object.fromEntries(convenios.map((c) => [String(c.id), c]))
  const proyectoPorId = Object.fromEntries(todosProyectos.map((p) => [String(p.id), p]))

  const focalizacionPorProyecto = (proyectoId ? focalizacion.filter((f) => metaIdsFiltradas.has(String(f.meta_id))) : focalizacion)
    .map((f) => conContexto(f, metaPorId, convenioPorId, proyectoPorId))
  const asignacionesPorProyecto = (proyectoId ? asignaciones.filter((a) => metaIdsFiltradas.has(String(a.meta_id))) : asignaciones)
    .map((a) => conContexto(a, metaPorId, convenioPorId, proyectoPorId))

  // El filtro de municipio solo aplica a focalización (asignaciones sin
  // focalizar no tienen sede fija, así que no se ven afectadas por él).
  const focalizacionFiltrada = municipio
    ? focalizacionPorProyecto.filter((f) => f.municipio === municipio)
    : focalizacionPorProyecto
  const municipios = Array.from(new Set(focalizacionPorProyecto.map((f) => f.municipio).filter(Boolean))).sort()

  const padrinosConCargaTotal = padrinos.filter(
    (p) => totalesDe(p.id, focalizacionFiltrada, asignacionesPorProyecto).asignadas > 0
  )
  const padrinosConCarga = padrinoId
    ? padrinosConCargaTotal.filter((p) => String(p.id) === padrinoId)
    : padrinosConCargaTotal

  return (
    <Envoltorio nombre={usuario.nombre} proyectos={proyectos}>
      {proyectos.length > 1 && (
        <div className="filtros">
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">Todos tus proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}

      <div className="pestanas">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`pestana${pestana === p.id ? ' pestana-activa' : ''}`}
            onClick={() => setPestana(p.id)}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      {pestana === 'metas' && (
        <SeguimientoMetas convenios={conveniosFiltrados} metas={metasFiltradas} aliados={aliados} focalizacion={focalizacion} asignaciones={asignaciones} />
      )}

      {pestana === 'padrinos' && (
        <VistaPadrinos
          padrinos={padrinosConCargaTotal}
          focalizacion={focalizacionFiltrada}
          asignaciones={asignacionesPorProyecto}
          municipio={municipio}
          setMunicipio={setMunicipio}
          municipios={municipios}
        />
      )}

      {pestana === 'focalizacion' && (
        <TablaFocalizacion
          padrinos={padrinos}
          padrinosConCarga={padrinosConCarga}
          focalizacion={focalizacionFiltrada}
          asignaciones={asignacionesPorProyecto}
          municipio={municipio}
          setMunicipio={setMunicipio}
          municipios={municipios}
          padrinoId={padrinoId}
          setPadrinoId={setPadrinoId}
          padrinosParaFiltro={padrinosConCargaTotal}
          abiertoId={abiertoId}
          setAbiertoId={setAbiertoId}
          onReasignarFocalizacion={(id, nuevoPadrinoId) => editarFocalizacion(id, { padrino_id: nuevoPadrinoId })}
          onProgramar={programar}
          onMarcarRealizada={marcarRealizada}
          onVolverPendiente={volverAPendiente}
          onReasignarAsignacion={(id, nuevoPadrinoId) => editarAsignacion(id, { padrino_id: nuevoPadrinoId })}
        />
      )}
    </Envoltorio>
  )
}

function SeguimientoMetas({ convenios, metas, aliados, focalizacion, asignaciones }) {
  return (
    <>
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
    </>
  )
}

// Vista rápida de solo lectura para nivelar la carga del equipo: una fila
// por padrino con sus cifras, sin acordeón — para actuar sobre una visita
// puntual está la pestaña Focalización.
function VistaPadrinos({ padrinos, focalizacion, asignaciones, municipio, setMunicipio, municipios }) {
  return (
    <>
      <h2>Carga de tus padrinos</h2>
      {padrinos.length === 0 ? (
        <Vacio>Todavía no hay padrinos con visitas asignadas en tus convenios.</Vacio>
      ) : (
        <>
          {municipios.length > 1 && (
            <div className="filtros">
              <select value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
                <option value="">Todos los municipios</option>
                {municipios.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              {municipio && (
                <button type="button" onClick={() => setMunicipio('')}>Limpiar filtro</button>
              )}
            </div>
          )}
          <div className="tabla-envoltura">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Padrino</th>
                  <th className="numero">Asignadas</th>
                  <th className="numero">Realizadas</th>
                  <th className="numero">Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {padrinos.map((padrino) => {
                  const { asignadas, realizadas, pendientes } = totalesDe(padrino.id, focalizacion, asignaciones)
                  return (
                    <tr key={padrino.id}>
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}

// Vista accionable: mismo patrón acordeón-por-padrino que Actividades por
// padrino en el admin, pero acotada a los proyectos del líder. Las tarjetas
// son editables (reasignar padrino, cambiar estado) porque acá el líder sí
// gestiona la focalización de su equipo.
function TablaFocalizacion({
  padrinos, padrinosConCarga, focalizacion, asignaciones, municipio, setMunicipio, municipios,
  padrinoId, setPadrinoId, padrinosParaFiltro, abiertoId, setAbiertoId,
  onReasignarFocalizacion, onProgramar, onMarcarRealizada, onVolverPendiente, onReasignarAsignacion,
}) {
  return (
    <>
      <h2>Focalización de tu equipo</h2>
      {padrinosParaFiltro.length === 0 ? (
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
              {padrinosParaFiltro.map((p) => (
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
                  const { asignadas, realizadas, pendientes } = totalesDe(padrino.id, focalizacion, asignaciones)
                  const abierto = String(abiertoId) === String(padrino.id)

                  const pendientesFocalizacion = focalizacion.filter(
                    (f) => String(f.padrino_id) === String(padrino.id) && f.estado !== 'realizada'
                  )
                  const realizadasFocalizacion = focalizacion.filter(
                    (f) => String(f.padrino_id) === String(padrino.id) && f.estado === 'realizada'
                  )
                  const asignacionesDelPadrino = asignaciones.filter(
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
                                renderTarjeta={(item) => (
                                  <TarjetaVisitaEditable
                                    key={item.id}
                                    item={item}
                                    padrinos={padrinos}
                                    onReasignar={onReasignarFocalizacion}
                                    onProgramar={onProgramar}
                                    onMarcarRealizada={onMarcarRealizada}
                                    onVolverPendiente={onVolverPendiente}
                                  />
                                )}
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
                                          <th>Reasignar</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {asignacionesDelPadrino.map((item) => (
                                          <FilaAsignacionCompacta
                                            key={item.id}
                                            item={item}
                                            padrinos={padrinos}
                                            onReasignar={onReasignarAsignacion}
                                          />
                                        ))}
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
    </>
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
            {proyectos?.length > 1 ? 'Líder de ' : 'Solo lectura de '}
            {proyectos?.map((p) => p.nombre).join(', ') || 'tus proyectos'}.
          </p>
        )}
      </div>
      <div className="panel-persona">{children}</div>
    </>
  )
}
