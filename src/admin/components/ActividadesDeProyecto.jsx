import useEntidad from '../hooks/useEntidad'
import TablaCrud from './TablaCrud'
import { AvisoError, Cargando } from '../../components/Estado'

const CAMPOS = [
  { clave: 'nombre', label: 'Nombre de la actividad', tipo: 'text', requerido: true },
]

// Panel de acordeón de un proyecto: su catálogo de actividades, con CRUD
// completo ahí mismo. Estas actividades son las opciones que ofrece el alta
// de metas cuando se elige este proyecto (cascada proyecto→actividad).
export default function ActividadesDeProyecto({ proyectoId }) {
  const actividades = useEntidad('actividades')

  if (actividades.cargando) return <Cargando />
  if (actividades.error) return <AvisoError>Error: {actividades.error}</AvisoError>

  const delProyecto = actividades.datos.filter((a) => String(a.proyecto_id) === String(proyectoId))

  return (
    <TablaCrud
      compacta
      titulo="Actividades del proyecto"
      etiquetaNueva="Nueva actividad"
      campos={CAMPOS}
      filas={delProyecto}
      onCrear={(datos) => actividades.crearItem({ ...datos, proyecto_id: String(proyectoId) })}
      onEditar={actividades.editarItem}
      onEliminar={actividades.eliminarItem}
    />
  )
}
