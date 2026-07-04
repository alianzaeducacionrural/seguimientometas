import { useState } from 'react'
import TarjetaVisitaFocalizacion from './TarjetaVisitaFocalizacion'
import Modal from './Modal'
import { formatearFecha } from '../utils/formato'

const HOY = () => new Date().toISOString().slice(0, 10)

// Una visita focalizada editable: envuelve la tarjeta de solo lectura
// compartida y le agrega los botones de Reasignar/Cambiar estado (cada uno
// con su modal). El modal de estado ofrece las transiciones válidas según
// el estado actual: pendiente → programar o marcar realizada directo;
// programada → marcar realizada o volver a pendiente. Realizada es terminal.
// Se reutiliza en Actividades por padrino (admin) y en la pestaña de
// Focalización del panel de líder — ambos con el mismo poder de acción.
export default function TarjetaVisitaEditable({ item, padrinos, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente }) {
  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevoPadrinoId, setNuevoPadrinoId] = useState(item.padrino_id || '')
  const [guardando, setGuardando] = useState(false)

  const [modalEstadoAbierto, setModalEstadoAbierto] = useState(false)
  const [fecha, setFecha] = useState(HOY())
  const [guardandoEstado, setGuardandoEstado] = useState(false)

  function abrirModal() {
    setNuevoPadrinoId(item.padrino_id || '')
    setModalAbierto(true)
  }

  async function confirmar() {
    setGuardando(true)
    try {
      await onReasignar(item.id, nuevoPadrinoId)
      setModalAbierto(false)
    } finally {
      setGuardando(false)
    }
  }

  function abrirModalEstado() {
    setFecha(HOY())
    setModalEstadoAbierto(true)
  }

  async function cambiarA(nuevoEstado) {
    setGuardandoEstado(true)
    try {
      if (nuevoEstado === 'programada') await onProgramar(item.id, fecha)
      else if (nuevoEstado === 'realizada') await onMarcarRealizada(item.id, fecha)
      else if (nuevoEstado === 'pendiente') await onVolverPendiente(item.id)
      setModalEstadoAbierto(false)
    } finally {
      setGuardandoEstado(false)
    }
  }

  return (
    <TarjetaVisitaFocalizacion item={item}>
      <div className="tarjeta-visita-acciones">
        <button type="button" className="btn-reasignar" onClick={abrirModal}>Reasignar</button>
        {item.estado !== 'realizada' && (
          <button type="button" onClick={abrirModalEstado}>Cambiar estado</button>
        )}
      </div>

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Reasignar visita">
        <div className="formulario-modal">
          <p className="vista-descripcion">{item.municipio} - {item.institucion} - {item.sede}</p>
          <label className="campo">
            <span>Padrino</span>
            <select value={nuevoPadrinoId} onChange={(e) => setNuevoPadrinoId(e.target.value)}>
              <option value="">Sin asignar</option>
              {padrinos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </label>
          <div className="modal-pie">
            <button type="button" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="button" className="btn-primario" disabled={guardando} onClick={confirmar}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal abierto={modalEstadoAbierto} onCerrar={() => setModalEstadoAbierto(false)} titulo="Cambiar estado de la visita">
        <div className="formulario-modal">
          <p className="vista-descripcion">{item.municipio} - {item.institucion} - {item.sede}</p>
          {item.estado === 'programada' && (
            <p className="vista-descripcion">Programada para: {formatearFecha(item.fecha_programada)}</p>
          )}
          <label className="campo">
            <span>Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <div className="modal-pie modal-pie-dividido">
            <div>
              {item.estado === 'programada' && (
                <button type="button" className="btn-peligro" disabled={guardandoEstado} onClick={() => cambiarA('pendiente')}>
                  Volver a pendiente
                </button>
              )}
            </div>
            <div className="modal-pie-grupo">
              <button type="button" onClick={() => setModalEstadoAbierto(false)}>Cancelar</button>
              {item.estado === 'pendiente' && (
                <button type="button" disabled={guardandoEstado} onClick={() => cambiarA('programada')}>Programar</button>
              )}
              <button type="button" className="btn-primario" disabled={guardandoEstado} onClick={() => cambiarA('realizada')}>
                {guardandoEstado ? 'Guardando…' : 'Marcar realizada'}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </TarjetaVisitaFocalizacion>
  )
}
