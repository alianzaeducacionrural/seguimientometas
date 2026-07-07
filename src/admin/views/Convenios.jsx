import { Link } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import TablaCrud from '../components/TablaCrud'
import MetasDeConvenio from '../components/MetasDeConvenio'
import { AvisoError, Cargando } from '../../components/Estado'
import { nombresProyectosDe } from '../../utils/proyectos'

const ESTADOS = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Cerrado', label: 'Cerrado' },
]

export default function Convenios() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const proyectos = useEntidad('proyectos')

  if (convenios.cargando || aliados.cargando || proyectos.cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>
  if (aliados.error) return <AvisoError>Error: {aliados.error}</AvisoError>
  if (proyectos.error) return <AvisoError>Error: {proyectos.error}</AvisoError>

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
      columna: (fila) => nombresProyectosDe(fila.proyectos_ids, proyectos.datos).join(', '),
    },
  ]

  return (
    <>
      <TablaCrud
        titulo="Convenios"
        etiquetaNueva="Nuevo convenio"
        campos={campos}
        filas={convenios.datos}
        onCrear={convenios.crearItem}
        onEditar={convenios.editarItem}
        onEliminar={convenios.eliminarItem}
        panelFila={(fila) => <MetasDeConvenio convenio={fila} />}
      />
      <p style={{ marginTop: '1rem' }}><Link to="/admin/resumen">Ver tabla de avance por convenio →</Link></p>
    </>
  )
}
