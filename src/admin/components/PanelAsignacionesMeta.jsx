import { useEffect, useRef, useState } from 'react'
import FilaAsignacion from './FilaAsignacion'
import FilaFocalizacion from './FilaFocalizacion'
import SelectorInstitucion from './SelectorInstitucion'
import { AvisoError, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'
import Flecha from '../../components/Flecha'
import { hoy } from '../../utils/formato'
import { coincideBusqueda } from '../../utils/texto'

const SELECCION_VACIA = { municipio: '', institucion: '', sede: '' }

// Gestión de una meta "visita sin focalizar", con dos secciones siempre
// visibles para poder hacer seguimiento desde ambos lados a la vez:
// "Visitas" (trazabilidad — cada visita agregada con "+ Agregar visita"
// puede quedar pendiente, programada o ya realizada, mismo ciclo de
// estados que visita_focalizada — ver FilaFocalizacion — así que se
// reasigna/programa/marca realizada/vuelve a pendiente exactamente igual;
// filtros de municipio/institución/estado + una búsqueda libre que filtra
// mientras se escribe, sin botón) y "Asignación por padrino" (la cuota de
// cada uno vía "+ Asignar padrino" + la FilaAsignacion table). Al elegir un
// padrino en el modal de asignar, si ya tiene visitas realizadas sin cuota,
// se precarga esa cantidad como punto de partida (editable). Además, la
// cuota de cada padrino se mantiene sincronizada sola con lo realizado
// (ver el useEffect de reconciliación más abajo, que solo cuenta visitas ya
// realizadas — una pendiente/programada no cuenta todavía): cubre tanto
// visitas nuevas como las que ya estaban registradas antes de esta función
// existir.
// Presentacional, igual que PanelFocalizacionMeta: recibe datos y
// mutaciones por props para poder incrustarse en la pestaña Focalización.
export default function PanelAsignacionesMeta({
  meta, asignaciones, visitas, padrinos,
  onAsignarPadrino, onGuardarAsignacion, onEliminarAsignacion,
  onRegistrarVisita, onReasignarVisita, onProgramarVisita, onMarcarRealizadaVisita, onVolverPendienteVisita, onEliminarVisita,
  compacta = false, filtroPadrino = '', filtroEstado = '',
}) {
  const [municipioFiltro, setMunicipioFiltro] = useState('')
  const [institucionFiltro, setInstitucionFiltro] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false)
  const [padrinoId, setPadrinoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [guardandoAsignar, setGuardandoAsignar] = useState(false)
  const [errorAsignar, setErrorAsignar] = useState(null)

  const [visitasAbiertas, setVisitasAbiertas] = useState(true)
  const [asignacionAbierta, setAsignacionAbierta] = useState(false)

  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState(SELECCION_VACIA)
  const [padrinoVisitaId, setPadrinoVisitaId] = useState('')
  const [estadoNuevaVisita, setEstadoNuevaVisita] = useState('realizada')
  const [fechaVisita, setFechaVisita] = useState(hoy())
  const [guardandoVisita, setGuardandoVisita] = useState(false)
  const [errorVisita, setErrorVisita] = useState(null)

  const padrinosAsignadosIds = new Set(asignaciones.map((a) => String(a.padrino_id)))
  const padrinosDisponibles = padrinos.filter((p) => !padrinosAsignadosIds.has(String(p.id)))

  const visitasRealizadas = visitas.filter((v) => v.estado === 'realizada')
  const visitasProgramadas = visitas.filter((v) => v.estado === 'programada')
  const totalAsignado = asignaciones.reduce((sum, a) => sum + (Number(a.cantidad_asignada) || 0), 0)
  const metaNum = Number(meta.cantidad_meta) || 0
  const Titulo = compacta ? 'h3' : 'h2'

  function nombreDe(padrinoId2) {
    return padrinos.find((p) => String(p.id) === String(padrinoId2))?.nombre || '—'
  }

  // Filtros de la sección "Visitas": municipio/institución salen de las
  // visitas ya registradas en esta meta (en cualquier estado), más un
  // filtro de estado (para "ver solo las programadas", por ejemplo) y una
  // búsqueda libre que filtra mientras se escribe.
  const municipiosVisitas = Array.from(new Set(visitas.map((v) => v.municipio).filter(Boolean))).sort()
  const institucionesVisitas = Array.from(new Set(
    visitas.filter((v) => !municipioFiltro || v.municipio === municipioFiltro).map((v) => v.institucion).filter(Boolean)
  )).sort()
  const visitasFiltradas = visitas.filter((v) => {
    // Filtros globales (padrino/estado) de la vista Focalización, si vienen.
    if (filtroPadrino && String(v.padrino_id) !== String(filtroPadrino)) return false
    if (filtroEstado && v.estado !== filtroEstado) return false
    if (municipioFiltro && v.municipio !== municipioFiltro) return false
    if (institucionFiltro && v.institucion !== institucionFiltro) return false
    if (estadoFiltro && v.estado !== estadoFiltro) return false
    return coincideBusqueda(busqueda, v.municipio, v.institucion, v.sede, nombreDe(v.padrino_id))
  })

  // La tabla de cuotas por padrino se acota solo por el filtro global de
  // padrino (una cuota no tiene estado, así que el filtro de estado no aplica).
  const asignacionesMostradas = filtroPadrino
    ? asignaciones.filter((a) => String(a.padrino_id) === String(filtroPadrino))
    : asignaciones

  function abrirModalAsignar() {
    setPadrinoId('')
    setCantidad('')
    setErrorAsignar(null)
    setModalAsignarAbierto(true)
  }

  // Si el padrino elegido ya tiene visitas realizadas para esta meta (pero
  // todavía sin cuota), se precarga esa cantidad como punto de partida.
  function elegirPadrinoAsignar(id) {
    setPadrinoId(id)
    const realizadasDelPadrino = visitasRealizadas.filter((v) => String(v.padrino_id) === String(id)).length
    if (realizadasDelPadrino > 0) setCantidad(String(realizadasDelPadrino))
  }

  async function agregarAsignacion(e) {
    e.preventDefault()
    if (!padrinoId || !cantidad) {
      setErrorAsignar('Selecciona un padrino y una cantidad.')
      return
    }
    setGuardandoAsignar(true)
    setErrorAsignar(null)
    try {
      await onAsignarPadrino({ meta_id: meta.id, padrino_id: padrinoId, cantidad_asignada: cantidad, cantidad_realizada: 0 })
      setModalAsignarAbierto(false)
    } catch (err) {
      setErrorAsignar(err.message)
    } finally {
      setGuardandoAsignar(false)
    }
  }

  function abrirModalVisita() {
    setSeleccion(SELECCION_VACIA)
    setPadrinoVisitaId('')
    setEstadoNuevaVisita('realizada')
    setFechaVisita(hoy())
    setErrorVisita(null)
    setModalVisitaAbierto(true)
  }

  // Conteo de visitas realizadas por padrino, para reconciliar la cuota
  // (abajo) y para "Cantidad realizada" en la tabla de asignaciones. Solo
  // cuenta las ya realizadas — una pendiente o programada todavía no debe
  // subir la cuota sola.
  const conteoPorPadrino = {}
  visitasRealizadas.forEach((v) => {
    const id = String(v.padrino_id || '')
    if (id) conteoPorPadrino[id] = (conteoPorPadrino[id] || 0) + 1
  })
  // Firmas estables (no cambian de identidad en cada render) para disparar
  // la reconciliación solo cuando el conteo real o las cuotas cambian.
  const firmaConteo = Object.entries(conteoPorPadrino).sort().map(([id, n]) => `${id}:${n}`).join(',')
  const firmaAsignaciones = asignaciones.map((a) => `${a.padrino_id}:${a.cantidad_asignada}`).sort().join(',')

  // Mantiene "Asignación por padrino" sincronizada sola con lo realizado:
  // cualquier padrino con visitas registradas para esta meta —nuevas o ya
  // existentes de antes de esta función— debe tener cantidad_asignada al
  // menos igual a lo realizado. Crea la fila si falta, o sube la cuota si
  // quedó corta; nunca baja una cuota que el admin puso más alta a
  // propósito. Corre en cada cambio real de datos, no solo tras registrar.
  // `firmaEnCursoRef` evita que la misma combinación de datos se reconcilie
  // dos veces en paralelo (p.ej. el doble-invoke de efectos de StrictMode en
  // desarrollo) — sin esto, dos "crear" concurrentes para el mismo padrino
  // podían ganarle la carrera al id autoincremental de la hoja y dejar dos
  // filas duplicadas.
  const firmaEnCursoRef = useRef(null)
  useEffect(() => {
    const firma = `${meta.id}|${firmaConteo}|${firmaAsignaciones}`
    if (firmaEnCursoRef.current === firma) return
    firmaEnCursoRef.current = firma
    let cancelado = false
    async function reconciliar() {
      for (const [padrinoIdConVisitas, cantidad] of Object.entries(conteoPorPadrino)) {
        if (cancelado) return
        const existente = asignaciones.find((a) => String(a.padrino_id) === padrinoIdConVisitas)
        if (!existente) {
          await onAsignarPadrino({ meta_id: meta.id, padrino_id: padrinoIdConVisitas, cantidad_asignada: cantidad, cantidad_realizada: 0 })
        } else if ((Number(existente.cantidad_asignada) || 0) < cantidad) {
          await onGuardarAsignacion(existente.id, { cantidad_asignada: cantidad })
        }
      }
    }
    reconciliar()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.id, firmaConteo, firmaAsignaciones])

  async function registrarVisita(e) {
    e.preventDefault()
    if (!seleccion.municipio || !seleccion.institucion || !seleccion.sede) {
      setErrorVisita('Selecciona municipio, institución y sede.')
      return
    }
    setGuardandoVisita(true)
    setErrorVisita(null)
    try {
      const datos = {
        meta_id: meta.id,
        municipio: seleccion.municipio,
        institucion: seleccion.institucion,
        sede: seleccion.sede,
        padrino_id: padrinoVisitaId,
        estado: estadoNuevaVisita,
      }
      if (estadoNuevaVisita === 'programada') datos.fecha_programada = fechaVisita
      if (estadoNuevaVisita === 'realizada') datos.fecha_realizada = fechaVisita
      await onRegistrarVisita(datos)
      setModalVisitaAbierto(false)
    } catch (err) {
      setErrorVisita(err.message)
    } finally {
      setGuardandoVisita(false)
    }
  }

  return (
    <div className={compacta ? 'crud-compacta' : undefined}>
      <div className={compacta ? 'crud-compacta-barra' : 'barra-vista'}>
        <div>
          <Titulo>Visitas sin focalizar: {meta.descripcion}</Titulo>
        </div>
        <div className="barra-vista-acciones">
          <button type="button" className="btn-primario" onClick={abrirModalVisita}>+ Agregar visita</button>
          <button type="button" onClick={abrirModalAsignar} disabled={padrinosDisponibles.length === 0}>
            + Asignar padrino
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><strong>{metaNum}</strong><span>Meta</span></div>
        <div className="kpi"><strong>{visitasRealizadas.length}</strong><span>Realizado</span></div>
        <div className="kpi"><strong>{visitasProgramadas.length}</strong><span>Programadas</span></div>
        <div className="kpi"><strong>{totalAsignado}</strong><span>Asignado a padrinos</span></div>
      </div>

      {padrinos.length === 0 && <p className="vista-descripcion">No hay usuarios con rol "padrino" todavía — créalos en Usuarios para poder asignar.</p>}

      <Modal abierto={modalVisitaAbierto} onCerrar={() => setModalVisitaAbierto(false)} titulo="Agregar visita">
        <form onSubmit={registrarVisita} className="formulario-modal">
          <SelectorInstitucion {...seleccion} onChange={setSeleccion} />
          <label className="campo">
            <span>Padrino</span>
            <select value={padrinoVisitaId} onChange={(e) => setPadrinoVisitaId(e.target.value)}>
              <option value="">Sin asignar</option>
              {padrinos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Estado</span>
            <select value={estadoNuevaVisita} onChange={(e) => setEstadoNuevaVisita(e.target.value)}>
              <option value="realizada">Ya se realizó</option>
              <option value="programada">Programar para una fecha</option>
              <option value="pendiente">Dejar pendiente (sin fecha todavía)</option>
            </select>
          </label>
          {estadoNuevaVisita !== 'pendiente' && (
            <label className="campo">
              <span>{estadoNuevaVisita === 'programada' ? 'Fecha programada' : 'Fecha de la visita'}</span>
              <input type="date" required value={fechaVisita} onChange={(e) => setFechaVisita(e.target.value)} />
            </label>
          )}
          {errorVisita && <AvisoError>{errorVisita}</AvisoError>}
          <div className="modal-pie">
            <button type="button" onClick={() => setModalVisitaAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardandoVisita}>
              {guardandoVisita ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal abierto={modalAsignarAbierto} onCerrar={() => setModalAsignarAbierto(false)} titulo="Asignar padrino">
        <form onSubmit={agregarAsignacion} className="formulario-modal">
          <label className="campo">
            <span>Padrino</span>
            <select value={padrinoId} onChange={(e) => elegirPadrinoAsignar(e.target.value)}>
              <option value="">Seleccionar…</option>
              {padrinosDisponibles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Cantidad asignada</span>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </label>
          {errorAsignar && <AvisoError>{errorAsignar}</AvisoError>}
          <div className="modal-pie">
            <button type="button" onClick={() => setModalAsignarAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardandoAsignar}>
              {guardandoAsignar ? 'Agregando…' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      <div className="encabezado-plegable" onClick={() => setVisitasAbiertas((v) => !v)}>
        <Flecha abierta={visitasAbiertas} />
        <h4>Visitas ({visitas.length})</h4>
      </div>
      {visitasAbiertas && (
        visitas.length === 0 ? (
          <Vacio>Todavía no hay visitas registradas en esta meta — agrega la primera con el botón de arriba.</Vacio>
        ) : (
          <>
            <div className="filtros">
              <select value={municipioFiltro} onChange={(e) => { setMunicipioFiltro(e.target.value); setInstitucionFiltro('') }}>
                <option value="">Todos los municipios</option>
                {municipiosVisitas.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select value={institucionFiltro} onChange={(e) => setInstitucionFiltro(e.target.value)}>
                <option value="">Todas las instituciones</option>
                {institucionesVisitas.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="pendiente">Solo pendientes</option>
                <option value="programada">Solo programadas</option>
                <option value="realizada">Solo realizadas</option>
              </select>
              <input
                type="search"
                placeholder="Buscar municipio, institución, sede o padrino…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {(municipioFiltro || institucionFiltro || estadoFiltro || busqueda) && (
                <button type="button" onClick={() => { setMunicipioFiltro(''); setInstitucionFiltro(''); setEstadoFiltro(''); setBusqueda('') }}>
                  Limpiar filtros
                </button>
              )}
            </div>

            {visitasFiltradas.length === 0 ? (
              <Vacio>Ninguna visita coincide con el filtro.</Vacio>
            ) : (
              <div className="tabla-envoltura">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Municipio</th>
                      <th>Institución</th>
                      <th>Sede</th>
                      <th>Padrino</th>
                      <th>Estado</th>
                      <th>Acción</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitasFiltradas.map((v) => (
                      <FilaFocalizacion
                        key={v.id}
                        item={v}
                        padrinos={padrinos}
                        onReasignar={onReasignarVisita}
                        onProgramar={onProgramarVisita}
                        onMarcarRealizada={onMarcarRealizadaVisita}
                        onVolverPendiente={onVolverPendienteVisita}
                        onEliminar={onEliminarVisita}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}

      <div className="encabezado-plegable" onClick={() => setAsignacionAbierta((v) => !v)}>
        <Flecha abierta={asignacionAbierta} />
        <h4>Asignación por padrino ({asignacionesMostradas.length})</h4>
      </div>
      {asignacionAbierta && (
        <>
          {asignacionesMostradas.length === 0 ? (
            <Vacio>{filtroPadrino ? 'Este padrino no tiene cuota asignada en esta meta.' : 'Todavía no hay cuotas asignadas a esta meta.'}</Vacio>
          ) : (
            <div className="tabla-envoltura">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Padrino</th>
                    <th>Cantidad asignada</th>
                    <th>Cantidad realizada</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {asignacionesMostradas.map((item) => (
                    <FilaAsignacion
                      key={`${item.id}-${item.cantidad_asignada}`}
                      item={item}
                      padrinoNombre={nombreDe(item.padrino_id)}
                      realizada={visitasRealizadas.filter((v) => String(v.padrino_id) === String(item.padrino_id)).length}
                      onGuardar={onGuardarAsignacion}
                      onEliminar={onEliminarAsignacion}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
