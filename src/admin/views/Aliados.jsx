import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'
import { AvisoError, Cargando } from '../../components/Estado'

const CAMPOS = [
  { clave: 'nombre', label: 'Nombre', tipo: 'text', requerido: true },
]

export default function Aliados() {
  const aliados = useEntidad('aliados')

  if (aliados.cargando) return <Cargando />
  if (aliados.error) return <AvisoError>Error: {aliados.error}</AvisoError>

  return (
    <TablaCrud
      titulo="Aliados"
      etiquetaNueva="Nuevo aliado"
      campos={CAMPOS}
      filas={aliados.datos}
      onCrear={aliados.crearItem}
      onEditar={aliados.editarItem}
      onEliminar={aliados.eliminarItem}
    />
  )
}
