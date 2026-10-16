import { useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import TarjetaAvanceConvenio from '../../components/TarjetaAvanceConvenio'
import { ordenarPorProyecto } from '../../utils/proyectos'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { ejecutadoDe, programadasDe } from '../../utils/avance'
import { descargarCsv } from '../../utils/csv'

export default function ResumenConvenios() {
  // 'realizadas': solo lo ya hecho. 'proyectadas': suma también las visitas
  // programadas, para ver cuántas faltan por programar.
  const [modo, setModo] = useState('realizadas')
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
          const prog = programadasDe(meta, focalizacion.datos)
          return {
            convenio: convenio.nombre,
            aliado: aliado?.nombre,
            proyecto: proyectos.datos.find((p) => String(p.id) === String(meta.proyecto_id))?.nombre,
            actividad: meta.descripcion,
            meta: total,
            ejecutado: hecho,
            programadas: prog,
            faltante: Math.max(total - hecho, 0),
            faltanteProgramando: Math.max(total - hecho - prog, 0),
            avance: total > 0 ? Math.round((hecho / total) * 100) : 0,
            proyectado: total > 0 ? Math.round(((hecho + prog) / total) * 100) : 0,
          }
        })
    })
    descargarCsv('avance-por-convenio', [
      { titulo: 'Convenio', valor: (f) => f.convenio },
      { titulo: 'Aliado', valor: (f) => f.aliado },
      { titulo: 'Proyecto', valor: (f) => f.proyecto },
      { titulo: 'Actividad', valor: (f) => f.actividad },
      { titulo: 'Meta', valor: (f) => f.meta },
      { titulo: 'Realizadas', valor: (f) => f.ejecutado },
      { titulo: 'Programadas', valor: (f) => f.programadas },
      { titulo: 'Faltante (solo realizadas)', valor: (f) => f.faltante },
      { titulo: 'Faltante (descontando programadas)', valor: (f) => f.faltanteProgramando },
      { titulo: 'Avance realizadas %', valor: (f) => f.avance },
      { titulo: 'Avance proyectado %', valor: (f) => f.proyectado },
    ], filas)
  }

  return (
    <section className="vista">
      <div className="adm-cabecera">
        <div>
          <h2>Avance por convenio</h2>
          <p className="adm-sub">Meta, realizadas y faltante de cada actividad; opcionalmente descontando lo ya programado.</p>
        </div>
        <div className="adm-acciones">
          <div className="conmutador-vista" style={{ margin: 0 }} role="group" aria-label="Qué visitas contar">
            <button type="button" className={modo === 'realizadas' ? 'btn-primario' : ''} onClick={() => setModo('realizadas')}>
              Solo realizadas
            </button>
            <button type="button" className={modo === 'proyectadas' ? 'btn-primario' : ''} onClick={() => setModo('proyectadas')}>
              Realizadas + programadas
            </button>
          </div>
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
            conProgramadas={modo === 'proyectadas'}
          />
        )
      })}
    </section>
  )
}
