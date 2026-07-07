import { Fragment, useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import Avatar from '../../components/Avatar'
import Flecha from '../../components/Flecha'
import TarjetaVisitaEditable from '../../components/TarjetaVisitaEditable'
import ColumnasVisitas from '../../components/ColumnasVisitas'
import FilaAsignacionCompacta from '../../components/FilaAsignacionCompacta'
import EncabezadoOrdenable from '../../components/EncabezadoOrdenable'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'
import { totalesDe, conContexto } from '../../utils/cargaPadrino'
import { ordenarPorProyecto } from '../../utils/proyectos'

export default function ActividadesPadrino() {
  const usuarios = useEntidad('usuarios')
  const convenios = useEntidad('convenios')
  const proyectos = useEntidad('proyectos')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  const [abiertoId, setAbiertoId] = useState(null)
  const [orden, setOrden] = useState({ columna: 'nombre', asc: true })

  function ordenarPor(columna) {
    setOrden((actual) => (actual.columna === columna ? { columna, asc: !actual.asc } : { columna, asc: true }))
  }

  const cargando = usuarios.cargando || convenios.cargando || proyectos.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando
  if (cargando) return <Cargando />
  if (usuarios.error) return <AvisoError>Error: {usuarios.error}</AvisoError>

  // Padrinos y líderes: una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino' || u.rol === 'lider')
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
  const proyectoPorId = Object.fromEntries(proyectos.datos.map((p) => [String(p.id), p]))
  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  const focalizacionConContexto = focalizacion.datos.map((f) => conContexto(f, metaPorId, convenioPorId, proyectoPorId))
  const asignacionesConContexto = asignaciones.datos.map((a) => conContexto(a, metaPorId, convenioPorId, proyectoPorId))

  const filas = padrinos.map((padrino) => ({
    padrino,
    ...totalesDe(padrino.id, focalizacion.datos, asignaciones.datos, metaPorId),
  }))
  const filasOrdenadas = [...filas].sort((a, b) => {
    const cmp = orden.columna === 'nombre'
      ? a.padrino.nombre.localeCompare(b.padrino.nombre)
      : a[orden.columna] - b[orden.columna]
    return orden.asc ? cmp : -cmp
  })

  return (
    <section className="vista">
      <h2>Actividades por padrino</h2>

      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              <th className="celda-flecha"></th>
              <EncabezadoOrdenable columna="nombre" orden={orden} onOrdenar={ordenarPor}>Padrino</EncabezadoOrdenable>
              <EncabezadoOrdenable columna="asignadas" orden={orden} onOrdenar={ordenarPor} numero>Asignadas</EncabezadoOrdenable>
              <EncabezadoOrdenable columna="realizadas" orden={orden} onOrdenar={ordenarPor} numero>Realizadas</EncabezadoOrdenable>
              <EncabezadoOrdenable columna="pendientes" orden={orden} onOrdenar={ordenarPor} numero>Pendientes</EncabezadoOrdenable>
            </tr>
          </thead>
          <tbody>
            {filasOrdenadas.map(({ padrino, asignadas, realizadas, pendientes }) => {
              const abierto = String(abiertoId) === String(padrino.id)

              const pendientesFocalizacion = ordenarPorProyecto(focalizacionConContexto.filter(
                (f) => String(f.padrino_id) === String(padrino.id) && f.estado !== 'realizada'
              ), proyectos.datos)
              const realizadasFocalizacion = ordenarPorProyecto(focalizacionConContexto.filter(
                (f) => String(f.padrino_id) === String(padrino.id) && f.estado === 'realizada'
              ), proyectos.datos)
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
                                        realizadas={focalizacion.datos.filter(
                                          (f) => String(f.meta_id) === String(item.meta_id)
                                            && String(f.padrino_id) === String(item.padrino_id)
                                            && f.estado === 'realizada'
                                        ).length}
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
