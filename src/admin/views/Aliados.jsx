import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'

const CAMPOS = [
  { clave: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
]

export default function Aliados() {
  const aliados = useEntidad('aliados')

  if (aliados.cargando) return <p>Cargando…</p>
  if (aliados.error) return <p>Error: {aliados.error}</p>

  return (
    <TablaCrud
      titulo="Aliados"
      campos={CAMPOS}
      filas={aliados.datos}
      onCrear={aliados.crearItem}
      onEditar={aliados.editarItem}
      onEliminar={aliados.eliminarItem}
    />
  )
}
