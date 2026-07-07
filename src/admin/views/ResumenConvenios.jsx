import useEntidad from '../hooks/useEntidad'
import TarjetaAvanceConvenio from '../../components/TarjetaAvanceConvenio'
import { ordenarPorProyecto } from '../../utils/proyectos'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'

export default function ResumenConvenios() {
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const proyectos = useEntidad('proyectos')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const avancesManuales = useEntidad('avances_manuales')

  if (convenios.cargando || aliados.cargando || proyectos.cargando || metas.cargando || focalizacion.cargando || avancesManuales.cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>
  if (metas.error) return <AvisoError>Error: {metas.error}</AvisoError>

  if (convenios.datos.length === 0) {
    return (
      <section className="vista">
        <h2>Avance por convenio</h2>
        <Vacio>Todavía no hay convenios creados. Ve a "Convenios" para crear el primero.</Vacio>
      </section>
    )
  }

  return (
    <section className="vista">
      <h2>Avance por convenio</h2>
      {convenios.datos.map((convenio) => {
        const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))
        // Orden fijo de proyectos (ver utils/proyectos.js), no el orden en
        // que se crearon las metas.
        const metasDelConvenio = ordenarPorProyecto(
          metas.datos.filter((m) => String(m.convenio_id) === String(convenio.id)),
          proyectos.datos
        )

        return (
          <TarjetaAvanceConvenio
            key={convenio.id}
            convenio={convenio}
            aliado={aliado}
            metasDelConvenio={metasDelConvenio}
            proyectos={proyectos.datos}
            focalizacion={focalizacion.datos}
            avancesManuales={avancesManuales.datos}
          />
        )
      })}
    </section>
  )
}
