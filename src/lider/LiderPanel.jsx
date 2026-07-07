import { Fragment, useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet, editar } from '../utils/api'
import { totalesDe, conContexto } from '../utils/cargaPadrino'
import { accionesEstadoFocalizacion } from '../utils/estadoFocalizacion'
import { idsDeLista, ordenarPorProyecto } from '../utils/proyectos'
import { AvisoError, Cargando, Vacio } from '../components/Estado'
import MarcaLogo from '../components/MarcaLogo'
import Avatar from '../components/Avatar'
import Flecha from '../components/Flecha'
import TarjetaVisitaFocalizacion from '../components/TarjetaVisitaFocalizacion'
import TarjetaVisitaEditable from '../components/TarjetaVisitaEditable'
import TarjetaAvanceConvenio from '../components/TarjetaAvanceConvenio'
import ColumnasVisitas from '../components/ColumnasVisitas'
import FilaAsignacionCompacta from '../components/FilaAsignacionCompacta'
import estilosPadrino from '../padrino/PadrinoPanel.module.css'

const PESTANAS = [
  { id: 'metas', etiqueta: 'Seguimiento a metas' },
  { id: 'focalizacion', etiqueta: 'Focalización' },
  { id: 'misVisitas', etiqueta: 'Tus visitas focalizadas' },
]

// El líder ve convenios/metas/focalización/carga de sus proyectos (uno o
// varios, filtrados en el servidor por el token — ver getLiderConvenios en
// Code.gs) en tres pestañas: avance de metas (lectura, igual que Avance por
// convenio en el admin), focalización (acá SÍ puede actuar: reasignar
// padrino y avanzar/revertir el estado de la visita, igual que Actividades
// por padrino en el admin — ver TarjetaVisitaEditable) y sus propias
// visitas asignadas como visitante (de solo lectura, igual que el panel de
// un padrino — un líder es asignable en cualquier proyecto, no solo en los
// que lidera, así que esta pestaña no se limita a sus proyectos).
export default function LiderPanel() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(token ? null : 'Falta el token en el enlace.')
  const [cargando, setCargando] = useState(Boolean(token))
  const [todosProyectos, setTodosProyectos] = useState([])
  const [avancesManuales, setAvancesManuales] = useState([])
  const [pestana, setPestana] = useState('metas')
  const [proyectoId, setProyectoId] = useState('')
  const [abiertoId, setAbiertoId] = useState(null)
  const [municipio, setMunicipio] = useState('')
  const [padrinoId, setPadrinoId] = useState('')
  const [misMunicipio, setMisMunicipio] = useState('')
  const [misProyectoId, setMisProyectoId] = useState('')

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
  // Para calcular el ejecutado de metas Manual en la pestaña de metas.
  useEffect(() => { apiGet('avances_manuales').then((r) => setAvancesManuales(r.datos)).catch(() => {}) }, [])

  if (cargando) return <Envoltorio><Cargando /></Envoltorio>
  if (error) return <Envoltorio><AvisoError>{error}</AvisoError></Envoltorio>

  const { usuario, convenios, metas, focalizacion, asignaciones, aliados, proyectos, padrinos, misVisitas, misAsignaciones } = datos

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
    ? convenios.filter((c) => idsDeLista(c.proyectos_ids).includes(proyectoId))
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
    (p) => totalesDe(p.id, focalizacionFiltrada, asignacionesPorProyecto, metaPorId).asignadas > 0
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
        <SeguimientoMetas
          convenios={conveniosFiltrados}
          metas={metasFiltradas}
          aliados={aliados}
          proyectos={todosProyectos}
          focalizacion={focalizacion}
          avancesManuales={avancesManuales}
        />
      )}

      {pestana === 'focalizacion' && (
        <TablaFocalizacion
          padrinos={padrinos}
          padrinosConCarga={padrinosConCarga}
          focalizacion={focalizacionFiltrada}
          asignaciones={asignacionesPorProyecto}
          metaPorId={metaPorId}
          todosProyectos={todosProyectos}
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

      {pestana === 'misVisitas' && (
        <TusVisitas
          misVisitas={misVisitas}
          misAsignaciones={misAsignaciones}
          todosProyectos={todosProyectos}
          municipio={misMunicipio}
          setMunicipio={setMisMunicipio}
          proyectoId={misProyectoId}
          setProyectoId={setMisProyectoId}
        />
      )}
    </Envoltorio>
  )
}

function SeguimientoMetas({ convenios, metas, aliados, proyectos, focalizacion, avancesManuales }) {
  return (
    <>
      <h2>Avance de tus convenios</h2>
      {convenios.length === 0 && <Vacio>Todavía no hay convenios en tus proyectos.</Vacio>}
      {convenios.map((convenio) => {
        const aliado = aliados.find((a) => String(a.id) === String(convenio.aliado_id))
        // Orden fijo de proyectos (ver utils/proyectos.js), no el orden en
        // que se crearon las metas.
        const metasDelConvenio = ordenarPorProyecto(
          metas.filter((m) => String(m.convenio_id) === String(convenio.id)),
          proyectos
        )

        return (
          <TarjetaAvanceConvenio
            key={convenio.id}
            convenio={convenio}
            aliado={aliado}
            metasDelConvenio={metasDelConvenio}
            proyectos={proyectos}
            focalizacion={focalizacion}
            avancesManuales={avancesManuales}
          />
        )
      })}
    </>
  )
}

// Vista accionable: mismo patrón acordeón-por-padrino que Actividades por
// padrino en el admin, pero acotada a los proyectos del líder. Las tarjetas
// son editables (reasignar padrino, cambiar estado) porque acá el líder sí
// gestiona la focalización de su equipo.
function TablaFocalizacion({
  padrinos, padrinosConCarga, focalizacion, asignaciones, metaPorId, todosProyectos, municipio, setMunicipio, municipios,
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
                  const { asignadas, realizadas, pendientes } = totalesDe(padrino.id, focalizacion, asignaciones, metaPorId)
                  const abierto = String(abiertoId) === String(padrino.id)

                  const pendientesFocalizacion = ordenarPorProyecto(focalizacion.filter(
                    (f) => String(f.padrino_id) === String(padrino.id) && f.estado !== 'realizada'
                  ), todosProyectos)
                  const realizadasFocalizacion = ordenarPorProyecto(focalizacion.filter(
                    (f) => String(f.padrino_id) === String(padrino.id) && f.estado === 'realizada'
                  ), todosProyectos)
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
                                            realizadas={focalizacion.filter(
                                              (f) => String(f.meta_id) === String(item.meta_id)
                                                && String(f.padrino_id) === String(item.padrino_id)
                                                && f.estado === 'realizada'
                                            ).length}
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

// Las visitas propias del líder como visitante (no como quien gestiona a su
// equipo) — de solo lectura, con los mismos filtros y tarjetas que usa un
// padrino en su propio panel (proyecto en botones + municipio en select),
// porque en esto un líder es exactamente un padrino más.
function TusVisitas({ misVisitas, misAsignaciones, todosProyectos, municipio, setMunicipio, proyectoId, setProyectoId }) {
  const focalizacionPreasignada = misVisitas.filter((f) => f.meta_tipo !== 'visita_sin_focalizar')
  const focalizacionSinFocalizarRegistrada = misVisitas.filter((f) => f.meta_tipo === 'visita_sin_focalizar')
  const cuotaSinFocalizar = misAsignaciones.reduce((s, a) => s + (Number(a.cantidad_asignada) || 0), 0)
  const totalAsignadas = focalizacionPreasignada.length + Math.max(cuotaSinFocalizar, focalizacionSinFocalizarRegistrada.length)
  const totalRealizadas = misVisitas.filter((f) => f.estado === 'realizada').length

  const municipios = Array.from(new Set(misVisitas.map((f) => f.municipio).filter(Boolean))).sort()
  const proyectosConVisitas = todosProyectos.filter((p) => misVisitas.some((f) => String(f.proyecto_id) === String(p.id)))
  const visitasFiltradas = misVisitas.filter((f) =>
    (!municipio || f.municipio === municipio) && (!proyectoId || String(f.proyecto_id) === proyectoId)
  )
  const pendientes = ordenarPorProyecto(visitasFiltradas.filter((f) => f.estado !== 'realizada'), todosProyectos)
  const realizadas = ordenarPorProyecto(visitasFiltradas.filter((f) => f.estado === 'realizada'), todosProyectos)

  return (
    <>
      <div className="kpis">
        <div className="kpi"><strong>{totalAsignadas}</strong><span>Asignadas</span></div>
        <div className="kpi"><strong>{totalRealizadas}</strong><span>Realizadas</span></div>
      </div>

      <h2>Tus visitas focalizadas</h2>
      {misVisitas.length === 0 ? (
        <Vacio>No tienes sedes focalizadas asignadas.</Vacio>
      ) : (
        <>
          {proyectosConVisitas.length > 1 && (
            <div className="chips">
              <button type="button" className={`chip${!proyectoId ? ' activo' : ''}`} onClick={() => setProyectoId('')}>
                Todos los proyectos
              </button>
              {proyectosConVisitas.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`chip${proyectoId === String(p.id) ? ' activo' : ''}`}
                  onClick={() => setProyectoId(String(p.id))}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          )}
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
          <ColumnasVisitas
            pendientes={pendientes}
            realizadas={realizadas}
            renderTarjeta={(item) => <TarjetaVisitaFocalizacion key={item.id} item={item} />}
          />
        </>
      )}

      <h2>Tus visitas sin focalizar</h2>
      {misAsignaciones.length === 0 ? (
        <Vacio>No tienes asignaciones sin focalizar.</Vacio>
      ) : (
        misAsignaciones.map((a) => {
          const realizadasDeLaMeta = misVisitas.filter((f) => String(f.meta_id) === String(a.meta_id) && f.estado === 'realizada').length
          return (
            <div key={a.id} className={estilosPadrino.tarjeta}>
              <h3>{a.convenio_nombre}</h3>
              <p>{a.meta_descripcion}</p>
              <div className={estilosPadrino.filaNumeros}>
                <div className={estilosPadrino.numero}><span>{a.cantidad_asignada}</span><span>Asignadas</span></div>
                <div className={estilosPadrino.numero}><span>{realizadasDeLaMeta}</span><span>Realizadas</span></div>
              </div>
            </div>
          )
        })
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
