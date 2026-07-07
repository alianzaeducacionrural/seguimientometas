import { useState } from 'react'
import FilaAsignacion from './FilaAsignacion'
import SelectorInstitucion from './SelectorInstitucion'
import { AvisoError, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'
import { hoy } from '../../utils/formato'

const SELECCION_VACIA = { municipio: '', institucion: '', sede: '' }

// Gestión de una meta "visita sin focalizar": cuotas por padrino (KPIs +
// "+ Asignar padrino") y, aparte, el registro de visitas reales ("+
// Registrar visita": municipio/institución/sede/padrino/fecha) para tener
// trazabilidad de qué sede se visitó — cada registro crea una fila normal
// de `focalizacion` en estado "realizada" (no pasa por pendiente/programada
// porque se carga después de ocurrida), así que también cuenta en el
// ejecutado de la meta y aparece en Visitas por sede. La cantidad
// realizada por padrino ya no se edita a mano: se cuenta desde esas
// visitas registradas (`visitas`, filtradas por esta meta).
// Presentacional, igual que PanelFocalizacionMeta: recibe datos y
// mutaciones por props para poder incrustarse en la pestaña Focalización.
export default function PanelAsignacionesMeta({ meta, asignaciones, visitas, padrinos, onAsignarPadrino, onGuardarAsignacion, onEliminarAsignacion, onRegistrarVisita, compacta = false }) {
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

  const totalAsignado = asignaciones.reduce((sum, a) => sum + (Number(a.cantidad_asignada) || 0), 0)
  const totalRealizado = visitas.filter((v) => v.estado === 'realizada').length
  const metaNum = Number(meta.cantidad_meta) || 0
  const cuadra = totalAsignado === metaNum
  const Titulo = compacta ? 'h3' : 'h2'

  function abrirModalAsignar() {
    setPadrinoId('')
    setCantidad('')
    setErrorAsignar(null)
    setModalAsignarAbierto(true)
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
        <div className="kpi">
          <strong style={{ color: cuadra ? 'var(--logrado)' : 'var(--maduracion)' }}>{totalAsignado}</strong>
          <span>Asignado</span>
        </div>
        <div className="kpi"><strong>{totalRealizado}</strong><span>Realizado</span></div>
      </div>
      {!cuadra && (
        <p className="vista-descripcion">
          <span className="insignia insignia-programada">Lo asignado no cuadra con la meta</span>
        </p>
      )}

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
            <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
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

      {asignaciones.length === 0 ? (
        <Vacio>Todavía no hay padrinos asignados a esta meta.</Vacio>
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
                  padrinoNombre={padrinos.find((p) => String(p.id) === String(item.padrino_id))?.nombre || '—'}
                  realizada={visitas.filter((v) => String(v.padrino_id) === String(item.padrino_id) && v.estado === 'realizada').length}
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
