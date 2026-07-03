import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'

const TIPOS_META = [
  { value: 'visita_focalizada', label: 'Visita focalizada' },
  { value: 'visita_sin_focalizar', label: 'Visita sin focalizar' },
  { value: 'otro_indicador', label: 'Otro indicador' },
]

export default function ConvenioDetalle() {
  const { id } = useParams()
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const metas = useEntidad('metas')

  if (convenios.cargando || aliados.cargando || metas.cargando) return <p>Cargando…</p>
  if (convenios.error) return <p>Error: {convenios.error}</p>
  if (metas.error) return <p>Error: {metas.error}</p>

  const convenio = convenios.datos.find((c) => String(c.id) === id)
  if (!convenio) return <p>Convenio no encontrado. <Link to="/admin/convenios">← Volver</Link></p>

  const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))
  const metasDelConvenio = metas.datos.filter((m) => String(m.convenio_id) === id)

  const campos = [
    { clave: 'descripcion', label: 'Descripción de la actividad', tipo: 'text', requerido: true },
    { clave: 'cantidad_meta', label: 'Cantidad meta', tipo: 'number', requerido: true },
    { clave: 'tipo', label: 'Tipo', tipo: 'select', requerido: true, opciones: TIPOS_META },
    {
      clave: 'cantidad_realizada',
      label: 'Cantidad realizada',
      tipo: 'number',
      mostrarSi: (form) => form.tipo === 'otro_indicador',
    },
  ]

  return (
    <section>
      <p><Link to="/admin/convenios">← Volver a convenios</Link></p>
      <h2>{convenio.nombre}</h2>
      <p>Aliado: {aliado?.nombre || '—'} · Vigencia: {convenio.anio_vigencia} · Estado: {convenio.estado}</p>

      <TablaCrud
        titulo="Metas / actividades"
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
        onCrear={(datos) => metas.crearItem({ ...datos, convenio_id: id })}
        onEditar={metas.editarItem}
        onEliminar={metas.eliminarItem}
      />
    </section>
  )
}
