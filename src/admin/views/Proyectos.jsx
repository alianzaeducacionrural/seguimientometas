import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'
import ActividadesDeProyecto from '../components/ActividadesDeProyecto'
import { AvisoError, Cargando } from '../../components/Estado'

const CAMPOS = [
  { clave: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
]

// lideres_ids en la hoja de proyectos queda sin usar por ahora: la relación
// proyecto↔líder se administra desde Usuarios (proyectos_ids) para no
// duplicar el mismo vínculo en dos hojas y arriesgar que se desincronicen.
// Acá solo se muestra, calculada, a partir de usuarios con rol "lider".
export default function Proyectos() {
  const proyectos = useEntidad('proyectos')
  const usuarios = useEntidad('usuarios')

  function lideresDe(proyectoId) {
    return usuarios.datos
      .filter((u) => u.rol === 'lider' && String(u.proyectos_ids).split(',').includes(String(proyectoId)))
      .map((u) => u.nombre)
      .join(', ')
  }

  if (proyectos.cargando) return <Cargando />
  if (proyectos.error) return <AvisoError>Error: {proyectos.error}</AvisoError>

  return (
    <TablaCrud
      titulo="Proyectos"
      etiquetaNueva="Nuevo proyecto"
      campos={CAMPOS}
      columnasExtra={[{ label: 'Líderes', render: (fila) => lideresDe(fila.id) || '—' }]}
      filas={proyectos.datos}
      onCrear={proyectos.crearItem}
      onEditar={proyectos.editarItem}
      onEliminar={proyectos.eliminarItem}
      panelFila={(fila) => <ActividadesDeProyecto proyectoId={fila.id} />}
    />
  )
}
