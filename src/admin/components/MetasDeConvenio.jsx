import { Link } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import TablaCrud from './TablaCrud'
import { AvisoError, Cargando } from '../../components/Estado'
import { ejecutadoDe } from '../../utils/avance'

const TIPOS_META = [
  { value: 'visita_focalizada', label: 'Visita focalizada' },
  { value: 'visita_sin_focalizar', label: 'Visita sin focalizar' },
  { value: 'otro_indicador', label: 'Otro indicador' },
]

// Panel de acordeón de un convenio: sus metas/actividades con CRUD completo.
// En el alta primero se elige el proyecto (solo los asociados al convenio) y
// la actividad se escoge en cascada del catálogo de ese proyecto.
export default function MetasDeConvenio({ convenio }) {
  const proyectos = useEntidad('proyectos')
  const actividades = useEntidad('actividades')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  const cargando = proyectos.cargando || actividades.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando
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
      mostrarSi: (form) => form.tipo === 'otro_indicador',
      // Para visita_focalizada/visita_sin_focalizar el ejecutado se calcula
      // de la focalización/asignaciones (igual que en Avance por convenio),
      // no del campo crudo de la meta, que solo se llena a mano para
      // otro_indicador.
      columna: (fila) => ejecutadoDe(fila, focalizacion.datos, asignaciones.datos),
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
