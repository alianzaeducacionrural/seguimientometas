import useEntidad from '../hooks/useEntidad'
import TarjetaAvanceConvenio from '../../components/TarjetaAvanceConvenio'
import { ordenarPorProyecto } from '../../utils/proyectos'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { ejecutadoDe } from '../../utils/avance'
import { descargarCsv } from '../../utils/csv'

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

  // Una fila por meta (actividad) de cada convenio, en el orden fijo de proyectos.
  function exportarCsv() {
    const filas = convenios.datos.flatMap((convenio) => {
      const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))
      return ordenarPorProyecto(metas.datos.filter((m) => String(m.convenio_id) === String(convenio.id)), proyectos.datos)
        .map((meta) => {
          const total = Number(meta.cantidad_meta) || 0
          const hecho = ejecutadoDe(meta, focalizacion.datos, avancesManuales.datos)
          return {
            convenio: convenio.nombre,
            aliado: aliado?.nombre,
            proyecto: proyectos.datos.find((p) => String(p.id) === String(meta.proyecto_id))?.nombre,
            actividad: meta.descripcion,
            meta: total,
            ejecutado: hecho,
            faltante: Math.max(total - hecho, 0),
            avance: total > 0 ? Math.round((hecho / total) * 100) : 0,
          }
        })
    })
    descargarCsv('avance-por-convenio', [
      { titulo: 'Convenio', valor: (f) => f.convenio },
      { titulo: 'Aliado', valor: (f) => f.aliado },
      { titulo: 'Proyecto', valor: (f) => f.proyecto },
      { titulo: 'Actividad', valor: (f) => f.actividad },
      { titulo: 'Meta', valor: (f) => f.meta },
      { titulo: 'Ejecutado', valor: (f) => f.ejecutado },
      { titulo: 'Faltante', valor: (f) => f.faltante },
      { titulo: 'Avance %', valor: (f) => f.avance },
    ], filas)
  }

  return (
    <section className="vista">
      <div className="adm-cabecera">
        <div>
          <h2>Avance por convenio</h2>
          <p className="adm-sub">Meta, ejecutado y faltante de cada actividad.</p>
        </div>
        <div className="adm-acciones">
          <button type="button" onClick={exportarCsv}>Exportar CSV</button>
        </div>
      </div>
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
