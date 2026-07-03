import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'lider', label: 'Líder' },
  { value: 'padrino', label: 'Padrino' },
]

export default function Usuarios() {
  const usuarios = useEntidad('usuarios')
  const proyectos = useEntidad('proyectos')

  if (usuarios.cargando || proyectos.cargando) return <p>Cargando…</p>
  if (usuarios.error) return <p>Error: {usuarios.error}</p>
  if (proyectos.error) return <p>Error: {proyectos.error}</p>

  const campos = [
    { clave: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
    { clave: 'correo', label: 'Correo', tipo: 'text', requerido: true },
    { clave: 'rol', label: 'Rol', tipo: 'select', opciones: ROLES, requerido: true },
    {
      clave: 'proyectos_ids',
      label: 'Proyectos asociados',
      tipo: 'multiselect',
      opciones: proyectos.datos.map((p) => ({ value: String(p.id), label: p.nombre })),
      mostrarSi: (form) => form.rol === 'lider',
      columna: (fila) => String(fila.proyectos_ids)
        .split(',')
        .map((id) => proyectos.datos.find((p) => String(p.id) === id.trim())?.nombre)
        .filter(Boolean)
        .join(', '),
    },
  ]

  return (
    <TablaCrud
      titulo="Usuarios"
      campos={campos}
      columnasExtra={[{ label: 'Token', render: (fila) => fila.token }]}
      filas={usuarios.datos}
      onCrear={usuarios.crearItem}
      onEditar={usuarios.editarItem}
      onEliminar={usuarios.eliminarItem}
    />
  )
}
