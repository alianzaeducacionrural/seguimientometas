import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import SelectorInstitucion from '../components/SelectorInstitucion'
import FilaFocalizacion from '../components/FilaFocalizacion'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'

const SELECCION_VACIA = { municipio: '', institucion: '', sede: '' }

export default function FocalizacionMeta() {
  const { metaId } = useParams()
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const usuarios = useEntidad('usuarios')
  const focalizacion = useEntidad('focalizacion')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState(SELECCION_VACIA)
  const [padrinoId, setPadrinoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  if (metas.cargando || convenios.cargando || usuarios.cargando || focalizacion.cargando) return <Cargando />
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>
  if (focalizacion.error) return <AvisoError>Error: {focalizacion.error}</AvisoError>

  const meta = metas.datos.find((m) => String(m.id) === metaId)
  if (!meta) return <p>Meta no encontrada.</p>

  const convenio = convenios.datos.find((c) => String(c.id) === String(meta.convenio_id))
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')
  const items = focalizacion.datos.filter((f) => String(f.meta_id) === metaId)
  const realizadas = items.filter((f) => f.estado === 'realizada').length

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
      await focalizacion.crearItem({
        meta_id: metaId,
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

  async function reasignar(id, nuevoPadrinoId) {
    await focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })
  }

  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  return (
    <section className="vista">
      {convenio && <Link className="miga" to="/admin/convenios">← Volver a convenios ({convenio.nombre})</Link>}
      <div className="barra-vista">
        <div>
          <h2>Focalización: {meta.descripcion}</h2>
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
                  onReasignar={reasignar}
                  onProgramar={programar}
                  onMarcarRealizada={marcarRealizada}
                  onVolverPendiente={volverAPendiente}
                  onEliminar={focalizacion.eliminarItem}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
