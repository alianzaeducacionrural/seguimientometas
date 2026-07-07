import { useState } from 'react'
import SelectorInstitucion from './SelectorInstitucion'
import FilaFocalizacion from './FilaFocalizacion'
import { AvisoError, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'

const SELECCION_VACIA = { municipio: '', institucion: '', sede: '' }

// Gestión de la focalización de una meta: KPIs + "+ Agregar sede" + tabla
// de sedes con reasignar/cambiar estado. Presentacional (recibe los datos
// ya filtrados y las mutaciones por props) para poder incrustarse tanto en
// la ruta dedicada (`FocalizacionMeta.jsx`) como en la pestaña Focalización
// (`Focalizacion.jsx`), sin duplicar el fetch de datos ni la lógica.
// `compacta` baja el título de h2 a h3 para cuando va anidada dentro de un
// acordeón (mismo criterio que TablaCrud/MetasDeConvenio).
export default function PanelFocalizacionMeta({ meta, items, padrinos, onCrear, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente, onEliminar, compacta = false }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState(SELECCION_VACIA)
  const [padrinoId, setPadrinoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const realizadas = items.filter((f) => f.estado === 'realizada').length
  const Titulo = compacta ? 'h3' : 'h2'

  function abrirModal() {
    setSeleccion(SELECCION_VACIA)
    setPadrinoId('')
    setError(null)
    setModalAbierto(true)
  }

  async function agregar(e) {
    e.preventDefault()
    if (!seleccion.municipio || !seleccion.institucion || !seleccion.sede) {
      setError('Selecciona municipio, institución y sede.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await onCrear({
        meta_id: meta.id,
        municipio: seleccion.municipio,
        institucion: seleccion.institucion,
        sede: seleccion.sede,
        padrino_id: padrinoId,
        estado: 'pendiente',
      })
      setModalAbierto(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className={compacta ? 'crud-compacta' : undefined}>
      <div className={compacta ? 'crud-compacta-barra' : 'barra-vista'}>
        <div>
          <Titulo>Focalización: {meta.descripcion}</Titulo>
        </div>
        <div className="barra-vista-acciones">
          <button type="button" className="btn-primario" onClick={abrirModal}>+ Agregar sede</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><strong>{meta.cantidad_meta}</strong><span>Meta</span></div>
        <div className="kpi"><strong>{items.length}</strong><span>Focalizadas</span></div>
        <div className="kpi"><strong>{realizadas}</strong><span>Realizadas</span></div>
      </div>

      {padrinos.length === 0 && <p className="vista-descripcion">No hay usuarios con rol "padrino" todavía — créalos en Usuarios para poder asignar.</p>}
      {error && !modalAbierto && <AvisoError>{error}</AvisoError>}

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Agregar sede a focalizar">
        <form onSubmit={agregar} className="formulario-modal">
          <SelectorInstitucion {...seleccion} onChange={setSeleccion} />
          <label className="campo">
            <span>Padrino</span>
            <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
              <option value="">Sin asignar</option>
              {padrinos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          {error && <AvisoError>{error}</AvisoError>}
          <div className="modal-pie">
            <button type="button" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Agregando…' : 'Agregar'}
            </button>
          </div>
        </form>
      </Modal>

      {items.length === 0 ? (
        <Vacio>Todavía no hay sedes focalizadas en esta meta — agrega la primera con el formulario de arriba.</Vacio>
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
              {items.map((item) => (
                <FilaFocalizacion
                  key={item.id}
                  item={item}
                  padrinos={padrinos}
                  onReasignar={onReasignar}
                  onProgramar={onProgramar}
                  onMarcarRealizada={onMarcarRealizada}
                  onVolverPendiente={onVolverPendiente}
                  onEliminar={onEliminar}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
