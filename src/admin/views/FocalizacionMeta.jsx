import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import PanelFocalizacionMeta from '../components/PanelFocalizacionMeta'
import { AvisoError, Cargando } from '../../components/Estado'
import { accionesEstadoFocalizacion } from '../../utils/estadoFocalizacion'

// Ruta dedicada (/admin/metas/:metaId): hace el fetch y delega toda la
// gestión (KPIs, agregar sede, reasignar, cambiar estado) a
// PanelFocalizacionMeta, compartido con la pestaña Focalización.
export default function FocalizacionMeta() {
  const { metaId } = useParams()
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const usuarios = useEntidad('usuarios')
  const focalizacion = useEntidad('focalizacion')

  if (metas.cargando || convenios.cargando || usuarios.cargando || focalizacion.cargando) return <Cargando />
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>
  if (focalizacion.error) return <AvisoError>Error: {focalizacion.error}</AvisoError>

  const meta = metas.datos.find((m) => String(m.id) === metaId)
  if (!meta) return <p>Meta no encontrada.</p>

  const convenio = convenios.datos.find((c) => String(c.id) === String(meta.convenio_id))
  // Padrinos y líderes: una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino' || u.rol === 'lider')
  const items = focalizacion.datos.filter((f) => String(f.meta_id) === metaId)

  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  return (
    <section className="vista">
      {convenio && <Link className="miga" to="/admin/convenios">← Volver a convenios ({convenio.nombre})</Link>}
      <PanelFocalizacionMeta
        meta={meta}
        items={items}
        padrinos={padrinos}
        onCrear={focalizacion.crearItem}
        onReasignar={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
        onProgramar={programar}
        onMarcarRealizada={marcarRealizada}
        onVolverPendiente={volverAPendiente}
        onEliminar={focalizacion.eliminarItem}
      />
    </section>
  )
}
