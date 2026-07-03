import { Link } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'

const ESTADOS = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Cerrado', label: 'Cerrado' },
]

export default function Convenios() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const proyectos = useEntidad('proyectos')

  if (convenios.cargando || aliados.cargando || proyectos.cargando) return <p>Cargando…</p>
  if (convenios.error) return <p>Error: {convenios.error}</p>
  if (aliados.error) return <p>Error: {aliados.error}</p>
  if (proyectos.error) return <p>Error: {proyectos.error}</p>

  const campos = [
    { clave: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
    {
      clave: 'aliado_id',
      label: 'Aliado',
      tipo: 'select',
      requerido: true,
      opciones: aliados.datos.map((a) => ({ value: String(a.id), label: a.nombre })),
      columna: (fila) => aliados.datos.find((a) => String(a.id) === String(fila.aliado_id))?.nombre || '—',
    },
    { clave: 'anio_vigencia', label: 'Año de vigencia', tipo: 'number', requerido: true },
    { clave: 'fecha_inicio', label: 'Fecha inicio', tipo: 'date' },
    { clave: 'fecha_fin', label: 'Fecha fin', tipo: 'date' },
    { clave: 'estado', label: 'Estado', tipo: 'select', requerido: true, opciones: ESTADOS },
    {
      clave: 'proyectos_ids',
      label: 'Proyectos asociados',
      tipo: 'multiselect',
      opciones: proyectos.datos.map((p) => ({ value: String(p.id), label: p.nombre })),
      columna: (fila) => String(fila.proyectos_ids)
        .split(',')
        .map((id) => proyectos.datos.find((p) => String(p.id) === id.trim())?.nombre)
        .filter(Boolean)
        .join(', '),
    },
  ]

  return (
    <>
      <TablaCrud
        titulo="Convenios"
        campos={campos}
        columnasExtra={[{ label: '', render: (fila) => <Link to={`/admin/convenios/${fila.id}`}>Metas →</Link> }]}
        filas={convenios.datos}
        onCrear={convenios.crearItem}
        onEditar={convenios.editarItem}
        onEliminar={convenios.eliminarItem}
      />
      <p><Link to="/admin/resumen">Ver tabla de avance por convenio →</Link></p>
    </>
  )
}
