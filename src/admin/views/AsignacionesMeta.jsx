import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import PanelAsignacionesMeta from '../components/PanelAsignacionesMeta'
import { AvisoError, Cargando } from '../../components/Estado'

// Ruta dedicada (/admin/metas/:metaId/asignaciones): hace el fetch y delega
// toda la gestión (cuotas, "+ Registrar visita") a PanelAsignacionesMeta,
// compartido con la pestaña Focalización.
export default function AsignacionesMeta() {
  const { metaId } = useParams()
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const usuarios = useEntidad('usuarios')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')
  const focalizacion = useEntidad('focalizacion')

  if (metas.cargando || convenios.cargando || usuarios.cargando || asignaciones.cargando || focalizacion.cargando) return <Cargando />
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>
  if (asignaciones.error) return <AvisoError>Error: {asignaciones.error}</AvisoError>

  const meta = metas.datos.find((m) => String(m.id) === metaId)
  if (!meta) return <p>Meta no encontrada.</p>

  const convenio = convenios.datos.find((c) => String(c.id) === String(meta.convenio_id))
  // Padrinos y líderes: una cuota o una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino' || u.rol === 'lider')
  const items = asignaciones.datos.filter((a) => String(a.meta_id) === metaId)
  const visitas = focalizacion.datos.filter((f) => String(f.meta_id) === metaId)

  return (
    <section className="vista">
      {convenio && <Link className="miga" to="/admin/convenios">← Volver a convenios ({convenio.nombre})</Link>}
      <PanelAsignacionesMeta
        meta={meta}
        asignaciones={items}
        visitas={visitas}
        padrinos={padrinos}
        onAsignarPadrino={asignaciones.crearItem}
        onGuardarAsignacion={asignaciones.editarItem}
        onEliminarAsignacion={asignaciones.eliminarItem}
        onRegistrarVisita={focalizacion.crearItem}
      />
    </section>
  )
}
