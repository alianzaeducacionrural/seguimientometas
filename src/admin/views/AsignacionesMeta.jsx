import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import FilaAsignacion from '../components/FilaAsignacion'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'

export default function AsignacionesMeta() {
  const { metaId } = useParams()
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const usuarios = useEntidad('usuarios')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [padrinoId, setPadrinoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  if (metas.cargando || convenios.cargando || usuarios.cargando || asignaciones.cargando) return <Cargando />
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>
  if (asignaciones.error) return <AvisoError>Error: {asignaciones.error}</AvisoError>

  const meta = metas.datos.find((m) => String(m.id) === metaId)
  if (!meta) return <p>Meta no encontrada.</p>

  const convenio = convenios.datos.find((c) => String(c.id) === String(meta.convenio_id))
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')
  const items = asignaciones.datos.filter((a) => String(a.meta_id) === metaId)
  const padrinosAsignadosIds = new Set(items.map((a) => String(a.padrino_id)))
  const padrinosDisponibles = padrinos.filter((p) => !padrinosAsignadosIds.has(String(p.id)))

  const totalAsignado = items.reduce((sum, a) => sum + (Number(a.cantidad_asignada) || 0), 0)
  const totalRealizado = items.reduce((sum, a) => sum + (Number(a.cantidad_realizada) || 0), 0)
  const metaNum = Number(meta.cantidad_meta) || 0
  const cuadra = totalAsignado === metaNum

  function abrirModal() {
    setPadrinoId('')
    setCantidad('')
    setError(null)
    setModalAbierto(true)
  }

  async function agregar(e) {
    e.preventDefault()
    if (!padrinoId || !cantidad) {
      setError('Selecciona un padrino y una cantidad.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await asignaciones.crearItem({
        meta_id: metaId,
        padrino_id: padrinoId,
        cantidad_asignada: cantidad,
        cantidad_realizada: 0,
      })
      setModalAbierto(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="vista">
      {convenio && <Link className="miga" to="/admin/convenios">← Volver a convenios ({convenio.nombre})</Link>}
      <div className="barra-vista">
        <div>
          <h2>Asignación sin focalizar: {meta.descripcion}</h2>
        </div>
        <div className="barra-vista-acciones">
          <button type="button" className="btn-primario" onClick={abrirModal} disabled={padrinosDisponibles.length === 0}>
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
      {padrinos.length > 0 && padrinosDisponibles.length === 0 && <p className="vista-descripcion">Todos los padrinos ya tienen una asignación en esta meta.</p>}
      {error && !modalAbierto && <AvisoError>{error}</AvisoError>}

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Asignar padrino">
        <form onSubmit={agregar} className="formulario-modal">
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
              {items.map((item) => (
                <FilaAsignacion
                  key={item.id}
                  item={item}
                  padrinoNombre={padrinos.find((p) => String(p.id) === String(item.padrino_id))?.nombre || '—'}
                  onGuardar={asignaciones.editarItem}
                  onEliminar={asignaciones.eliminarItem}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
