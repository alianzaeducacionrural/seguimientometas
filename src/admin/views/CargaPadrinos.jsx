import useEntidad from '../hooks/useEntidad'
import estilos from '../../components/TarjetaResumen.module.css'
import { colorPorId } from '../../utils/colores'

// Carga de trabajo por padrino: cuánto tiene asignado y cuánto ha realizado,
// desglosado por convenio (una focalización cuenta 1 visita; una asignación
// sin focalizar aporta su cantidad_asignada/realizada).
function cargaPorConvenio(padrinoId, focalizacion, asignaciones, metaPorId) {
  const porConvenio = {}

  function sumar(convenioId, asignadas, realizadas) {
    if (!porConvenio[convenioId]) porConvenio[convenioId] = { asignadas: 0, realizadas: 0 }
    porConvenio[convenioId].asignadas += asignadas
    porConvenio[convenioId].realizadas += realizadas
  }

  focalizacion
    .filter((f) => String(f.padrino_id) === String(padrinoId))
    .forEach((f) => {
      const meta = metaPorId[f.meta_id]
      if (!meta) return
      sumar(meta.convenio_id, 1, f.estado === 'realizada' ? 1 : 0)
    })

  asignaciones
    .filter((a) => String(a.padrino_id) === String(padrinoId))
    .forEach((a) => {
      const meta = metaPorId[a.meta_id]
      if (!meta) return
      sumar(meta.convenio_id, Number(a.cantidad_asignada) || 0, Number(a.cantidad_realizada) || 0)
    })

  return porConvenio
}

export default function CargaPadrinos() {
  const usuarios = useEntidad('usuarios')
  const convenios = useEntidad('convenios')
  const proyectos = useEntidad('proyectos')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  const cargando = usuarios.cargando || convenios.cargando || proyectos.cargando
    || metas.cargando || focalizacion.cargando || asignaciones.cargando
  if (cargando) return <p>Cargando…</p>
  if (usuarios.error) return <p>Error: {usuarios.error}</p>

  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')
  if (padrinos.length === 0) {
    return <p>Todavía no hay usuarios con rol "padrino". Créalos en Usuarios.</p>
  }

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))

  return (
    <section>
      <h2>Carga de padrinos</h2>
      <p>Visitas asignadas y realizadas por padrino, desglosadas por convenio — sirve para nivelar el trabajo del equipo.</p>

      {padrinos.map((padrino) => {
        const porConvenio = cargaPorConvenio(padrino.id, focalizacion.datos, asignaciones.datos, metaPorId)
        const convenioIds = Object.keys(porConvenio)
        const totalAsignadas = convenioIds.reduce((sum, id) => sum + porConvenio[id].asignadas, 0)
        const totalRealizadas = convenioIds.reduce((sum, id) => sum + porConvenio[id].realizadas, 0)
        const color = colorPorId(padrino.id)

        return (
          <div key={padrino.id} className={estilos.card}>
            <div className={estilos.header} style={{ background: color }}>
              <h3>{padrino.nombre}</h3>
              <p>
                {padrino.correo} · Asignadas: {totalAsignadas} · Realizadas: {totalRealizadas}
              </p>
            </div>

            {convenioIds.length === 0 ? (
              <p style={{ padding: '0.75rem 1rem', margin: 0, color: '#898781' }}>Sin visitas asignadas todavía.</p>
            ) : (
              <div className={estilos.tablaWrap}>
              <table className={estilos.tabla}>
                <thead>
                  <tr>
                    <th>Convenio</th>
                    <th>Proyecto(s)</th>
                    <th className={estilos.numero}>Asignadas</th>
                    <th className={estilos.numero}>Realizadas</th>
                  </tr>
                </thead>
                <tbody>
                  {convenioIds.map((convenioId) => {
                    const convenio = convenios.datos.find((c) => String(c.id) === convenioId)
                    const nombresProyectos = String(convenio?.proyectos_ids)
                      .split(',')
                      .map((id) => proyectos.datos.find((p) => String(p.id) === id.trim())?.nombre)
                      .filter(Boolean)
                      .join(', ')
                    return (
                      <tr key={convenioId}>
                        <td>{convenio?.nombre || '—'}</td>
                        <td>{nombresProyectos || '—'}</td>
                        <td className={estilos.numero}>{porConvenio[convenioId].asignadas}</td>
                        <td className={estilos.numero}>{porConvenio[convenioId].realizadas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
