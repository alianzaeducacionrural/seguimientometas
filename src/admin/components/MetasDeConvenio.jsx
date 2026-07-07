import { useState } from 'react'
import { Link } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import TablaCrud from './TablaCrud'
import Modal from '../../components/Modal'
import { AvisoError, Cargando } from '../../components/Estado'
import { ejecutadoDe } from '../../utils/avance'
import { hoy } from '../../utils/formato'

const TIPOS_META = [
  { value: 'visita_focalizada', label: 'Visita focalizada' },
  { value: 'visita_sin_focalizar', label: 'Visita sin focalizar' },
  { value: 'otro_indicador', label: 'Manual' },
]

// Una meta "Manual" (otro_indicador, p.ej. Microcentros Rurales) no se
// edita con una cifra fija: se le van agregando incrementos con fecha
// (avances_manuales), igual que las visitas se van registrando una por
// una — el ejecutado de la meta es la suma de esos registros.
function BotonRegistrarAvance({ meta, onRegistrar }) {
  const [abierto, setAbierto] = useState(false)
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function abrir() {
    setCantidad('')
    setFecha(hoy())
    setError(null)
    setAbierto(true)
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await onRegistrar({ meta_id: meta.id, cantidad, fecha })
      setAbierto(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <>
      <button type="button" onClick={abrir}>Registrar avance →</button>
      <Modal abierto={abierto} onCerrar={() => setAbierto(false)} titulo={`Registrar avance: ${meta.descripcion}`}>
        <form onSubmit={guardar} className="formulario-modal">
          <label className="campo">
            <span>Cantidad</span>
            <input type="number" min="0" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
          <label className="campo">
            <span>Fecha</span>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          {error && <AvisoError>{error}</AvisoError>}
          <div className="modal-pie">
            <button type="button" onClick={() => setAbierto(false)}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

// Panel de acordeón de un convenio: sus metas/actividades con CRUD completo.
// En el alta primero se elige el proyecto (solo los asociados al convenio) y
// la actividad se escoge en cascada del catálogo de ese proyecto.
export default function MetasDeConvenio({ convenio }) {
  const proyectos = useEntidad('proyectos')
  const actividades = useEntidad('actividades')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const avancesManuales = useEntidad('avances_manuales')

  const cargando = proyectos.cargando || actividades.cargando || metas.cargando
    || focalizacion.cargando || avancesManuales.cargando
  if (cargando) return <Cargando />
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>

  const metasDelConvenio = metas.datos.filter((m) => String(m.convenio_id) === String(convenio.id))

  const idsProyectosConvenio = String(convenio.proyectos_ids || '').split(',').map((v) => v.trim()).filter(Boolean)
  const proyectosDelConvenio = idsProyectosConvenio.length > 0
    ? proyectos.datos.filter((p) => idsProyectosConvenio.includes(String(p.id)))
    : proyectos.datos

  const campos = [
    {
      clave: 'proyecto_id',
      label: 'Proyecto',
      tipo: 'select',
      requerido: true,
      opciones: proyectosDelConvenio.map((p) => ({ value: String(p.id), label: p.nombre })),
      // Al cambiar de proyecto se limpia la actividad elegida (ya no aplica).
      alCambiar: () => ({ descripcion: '' }),
      columna: (fila) => proyectos.datos.find((p) => String(p.id) === String(fila.proyecto_id))?.nombre || '—',
    },
    {
      clave: 'descripcion',
      label: 'Actividad',
      tipo: 'text',
      requerido: true,
      // Con proyecto elegido y actividades cargadas, la actividad se escoge
      // del catálogo de ese proyecto; si el proyecto aún no tiene
      // actividades, queda como texto libre.
      opcionesSi: (form) => {
        const delProyecto = actividades.datos.filter((a) => String(a.proyecto_id) === String(form.proyecto_id))
        return delProyecto.length > 0
          ? delProyecto.map((a) => ({ value: a.nombre, label: a.nombre }))
          : null
      },
    },
    { clave: 'cantidad_meta', label: 'Cantidad meta', tipo: 'number', requerido: true },
    { clave: 'tipo', label: 'Tipo', tipo: 'select', requerido: true, opciones: TIPOS_META, ocultarColumna: true },
    {
      clave: 'cantidad_realizada',
      label: 'Cantidad realizada',
      tipo: 'number',
      // Ya no se edita a mano en ningún tipo: para visitas se cuenta desde
      // focalización (Registrar visita) y para Manual desde avances_manuales
      // (Registrar avance) — ver ejecutadoDe en utils/avance.js.
      mostrarSi: () => false,
      columna: (fila) => ejecutadoDe(fila, focalizacion.datos, avancesManuales.datos),
    },
  ]

  return (
    <TablaCrud
      compacta
      titulo="Metas / actividades del convenio"
      etiquetaNueva="Nueva meta"
      campos={campos}
      columnasExtra={[{
        label: '',
        render: (fila) => {
          if (fila.tipo === 'visita_focalizada') return <Link to={`/admin/metas/${fila.id}`}>Focalización →</Link>
          if (fila.tipo === 'visita_sin_focalizar') return <Link to={`/admin/metas/${fila.id}/asignaciones`}>Asignaciones →</Link>
          if (fila.tipo === 'otro_indicador') return <BotonRegistrarAvance meta={fila} onRegistrar={avancesManuales.crearItem} />
          return null
        },
      }]}
      filas={metasDelConvenio}
      onCrear={(datos) => metas.crearItem({ ...datos, convenio_id: String(convenio.id) })}
      onEditar={metas.editarItem}
      onEliminar={metas.eliminarItem}
    />
  )
}
