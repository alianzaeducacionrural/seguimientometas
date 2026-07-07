import { useState } from 'react'
import FilaAsignacion from './FilaAsignacion'
import SelectorInstitucion from './SelectorInstitucion'
import { AvisoError, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'
import { formatearFecha, hoy } from '../../utils/formato'
import { coincideBusqueda } from '../../utils/texto'

const SELECCION_VACIA = { municipio: '', institucion: '', sede: '' }

// Gestión de una meta "visita sin focalizar", con dos secciones siempre
// visibles para poder hacer seguimiento desde ambos lados a la vez:
// "Visitas realizadas" (trazabilidad — municipio/institución/sede/padrino/
// fecha de cada visita registrada con "+ Registrar visita", que crea una
// fila normal de `focalizacion` en estado "realizada" y por eso también
// cuenta en el ejecutado de la meta y aparece en Visitas por sede; con
// filtros de municipio/institución + una búsqueda libre que filtra
// mientras se escribe, sin botón) y "Asignación por padrino" (la cuota de
// cada uno vía "+ Asignar padrino" + la FilaAsignacion table). Al elegir un
// padrino en el modal de asignar, si ya tiene visitas realizadas sin cuota,
// se precarga esa cantidad como punto de partida (editable).
// Presentacional, igual que PanelFocalizacionMeta: recibe datos y
// mutaciones por props para poder incrustarse en la pestaña Focalización.
export default function PanelAsignacionesMeta({ meta, asignaciones, visitas, padrinos, onAsignarPadrino, onGuardarAsignacion, onEliminarAsignacion, onRegistrarVisita, compacta = false }) {
  const [municipioFiltro, setMunicipioFiltro] = useState('')
  const [institucionFiltro, setInstitucionFiltro] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false)
  const [padrinoId, setPadrinoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [guardandoAsignar, setGuardandoAsignar] = useState(false)
  const [errorAsignar, setErrorAsignar] = useState(null)

  const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState(SELECCION_VACIA)
  const [padrinoVisitaId, setPadrinoVisitaId] = useState('')
  const [fechaVisita, setFechaVisita] = useState(hoy())
  const [guardandoVisita, setGuardandoVisita] = useState(false)
  const [errorVisita, setErrorVisita] = useState(null)

  const padrinosAsignadosIds = new Set(asignaciones.map((a) => String(a.padrino_id)))
  const padrinosDisponibles = padrinos.filter((p) => !padrinosAsignadosIds.has(String(p.id)))

  const visitasRealizadas = visitas.filter((v) => v.estado === 'realizada')
  const totalAsignado = asignaciones.reduce((sum, a) => sum + (Number(a.cantidad_asignada) || 0), 0)
  const metaNum = Number(meta.cantidad_meta) || 0
  const cuadra = totalAsignado === metaNum
  const Titulo = compacta ? 'h3' : 'h2'

  function nombreDe(padrinoId2) {
    return padrinos.find((p) => String(p.id) === String(padrinoId2))?.nombre || '—'
  }

  // Filtros de la pestaña "Visitas realizadas": municipio/institución salen
  // de las visitas ya registradas en esta meta, más una búsqueda libre que
  // filtra mientras se escribe (municipio, institución, sede o padrino).
  const municipiosVisitas = Array.from(new Set(visitasRealizadas.map((v) => v.municipio).filter(Boolean))).sort()
  const institucionesVisitas = Array.from(new Set(
    visitasRealizadas.filter((v) => !municipioFiltro || v.municipio === municipioFiltro).map((v) => v.institucion).filter(Boolean)
  )).sort()
  const visitasFiltradas = visitasRealizadas.filter((v) => {
    if (municipioFiltro && v.municipio !== municipioFiltro) return false
    if (institucionFiltro && v.institucion !== institucionFiltro) return false
    return coincideBusqueda(busqueda, v.municipio, v.institucion, v.sede, nombreDe(v.padrino_id))
  })

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
    setFechaVisita(hoy())
    setErrorVisita(null)
    setModalVisitaAbierto(true)
  }

  async function registrarVisita(e) {
    e.preventDefault()
    if (!seleccion.municipio || !seleccion.institucion || !seleccion.sede) {
      setErrorVisita('Selecciona municipio, institución y sede.')
      return
    }
    setGuardandoVisita(true)
    setErrorVisita(null)
    try {
      await onRegistrarVisita({
        meta_id: meta.id,
        municipio: seleccion.municipio,
        institucion: seleccion.institucion,
        sede: seleccion.sede,
        padrino_id: padrinoVisitaId,
        estado: 'realizada',
        fecha_realizada: fechaVisita,
      })
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
          <button type="button" className="btn-primario" onClick={abrirModalVisita}>+ Registrar visita</button>
          <button type="button" onClick={abrirModalAsignar} disabled={padrinosDisponibles.length === 0}>
            + Asignar padrino
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><strong>{metaNum}</strong><span>Meta</span></div>
        <div className="kpi"><strong>{visitasRealizadas.length}</strong><span>Realizado</span></div>
      </div>

      {padrinos.length === 0 && <p className="vista-descripcion">No hay usuarios con rol "padrino" todavía — créalos en Usuarios para poder asignar.</p>}

      <Modal abierto={modalVisitaAbierto} onCerrar={() => setModalVisitaAbierto(false)} titulo="Registrar visita">
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
            <span>Fecha de la visita</span>
            <input type="date" required value={fechaVisita} onChange={(e) => setFechaVisita(e.target.value)} />
          </label>
          {errorVisita && <AvisoError>{errorVisita}</AvisoError>}
          <div className="modal-pie">
            <button type="button" onClick={() => setModalVisitaAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardandoVisita}>
              {guardandoVisita ? 'Guardando…' : 'Registrar'}
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

      <h4>Visitas realizadas</h4>
      {visitasRealizadas.length === 0 ? (
        <Vacio>Todavía no hay visitas registradas en esta meta — registra la primera con el botón de arriba.</Vacio>
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
            <input
              type="search"
              placeholder="Buscar municipio, institución, sede o padrino…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {(municipioFiltro || institucionFiltro || busqueda) && (
              <button type="button" onClick={() => { setMunicipioFiltro(''); setInstitucionFiltro(''); setBusqueda('') }}>
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
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {visitasFiltradas.map((v) => (
                    <tr key={v.id}>
                      <td>{v.municipio}</td>
                      <td>{v.institucion}</td>
                      <td>{v.sede}</td>
                      <td>{nombreDe(v.padrino_id)}</td>
                      <td>{formatearFecha(v.fecha_realizada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <h4 style={{ marginTop: '1.5rem' }}>Asignación por padrino</h4>
      {!cuadra && asignaciones.length > 0 && (
        <p className="vista-descripcion">
          <span className="insignia insignia-programada">Lo asignado no cuadra con la meta</span>
        </p>
      )}
      {asignaciones.length === 0 ? (
        <Vacio>Todavía no hay cuotas asignadas a esta meta.</Vacio>
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
              {asignaciones.map((item) => (
                <FilaAsignacion
                  key={item.id}
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
    </div>
  )
}
