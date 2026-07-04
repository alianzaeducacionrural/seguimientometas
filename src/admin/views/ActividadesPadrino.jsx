import { Fragment, useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import Avatar from '../../components/Avatar'
import Flecha from '../../components/Flecha'
import TarjetaVisitaFocalizacion from '../../components/TarjetaVisitaFocalizacion'
import ColumnasVisitas from '../../components/ColumnasVisitas'
import { formatearFecha } from '../../utils/formato'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import Modal from '../../components/Modal'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'
import { totalesDe, conContexto } from '../../utils/cargaPadrino'

const HOY = () => new Date().toISOString().slice(0, 10)

// Una visita focalizada editable: envuelve la tarjeta de solo lectura
// compartida y le agrega los botones de Reasignar/Cambiar estado (cada uno
// con su modal). El modal de estado ofrece las transiciones válidas según
// el estado actual: pendiente → programar o marcar realizada directo;
// programada → marcar realizada o volver a pendiente. Realizada es terminal.
function TarjetaVisitaEditable({ item, padrinos, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente }) {
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

// Una cuota sin focalizar (sin sede fija), con su propio reasignar — no
// tiene visitas individuales que listar, solo el agregado asignada/realizada.
function FilaAsignacionCompacta({ item, padrinos, onReasignar }) {
  const [guardando, setGuardando] = useState(false)
  const pendiente = (Number(item.cantidad_asignada) || 0) - (Number(item.cantidad_realizada) || 0)

  async function reasignar(nuevoPadrinoId) {
    setGuardando(true)
    try {
      await onReasignar(item.id, nuevoPadrinoId)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <tr>
      <td>{item.convenio_nombre}</td>
      <td>{item.meta_descripcion}</td>
      <td className="numero">{item.cantidad_asignada}</td>
      <td className="numero">{item.cantidad_realizada || 0}</td>
      <td className="numero">{pendiente}</td>
      <td>
        <select value={item.padrino_id || ''} disabled={guardando} onChange={(e) => reasignar(e.target.value)}>
          <option value="">Sin asignar</option>
          {padrinos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </td>
    </tr>
  )
}

export default function ActividadesPadrino() {
  const usuarios = useEntidad('usuarios')
  const convenios = useEntidad('convenios')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  const [abiertoId, setAbiertoId] = useState(null)

  const cargando = usuarios.cargando || convenios.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando
  if (cargando) return <Cargando />
  if (usuarios.error) return <AvisoError>Error: {usuarios.error}</AvisoError>

  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')
  if (padrinos.length === 0) {
    return (
      <section className="vista">
        <h2>Actividades por padrino</h2>
        <Vacio>Todavía no hay usuarios con rol "padrino". Créalos en Usuarios.</Vacio>
      </section>
    )
  }

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const convenioPorId = Object.fromEntries(convenios.datos.map((c) => [String(c.id), c]))
  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  const focalizacionConContexto = focalizacion.datos.map((f) => conContexto(f, metaPorId, convenioPorId))
  const asignacionesConContexto = asignaciones.datos.map((a) => conContexto(a, metaPorId, convenioPorId))

  return (
    <section className="vista">
      <h2>Actividades por padrino</h2>

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
            {padrinos.map((padrino) => {
              const { asignadas, realizadas, pendientes } = totalesDe(padrino.id, focalizacion.datos, asignaciones.datos)
              const abierto = String(abiertoId) === String(padrino.id)

              const pendientesFocalizacion = focalizacionConContexto.filter(
                (f) => String(f.padrino_id) === String(padrino.id) && f.estado !== 'realizada'
              )
              const realizadasFocalizacion = focalizacionConContexto.filter(
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
                            renderTarjeta={(item) => (
                              <TarjetaVisitaEditable
                                key={item.id}
                                item={item}
                                padrinos={padrinos}
                                onReasignar={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
                                onProgramar={programar}
                                onMarcarRealizada={marcarRealizada}
                                onVolverPendiente={volverAPendiente}
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
                                        onReasignar={(id, nuevoPadrinoId) => asignaciones.editarItem(id, { padrino_id: nuevoPadrinoId })}
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
    </section>
  )
}
