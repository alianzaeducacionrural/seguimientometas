import { useMemo, useState } from 'react'
import useCatalogoIE from '../hooks/useCatalogoIE'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'

// Explorador del catálogo externo Mun/IE/Sedes (solo lectura): permite ver
// qué instituciones y sedes existen por municipio — el mismo catálogo que
// alimenta el selector en cascada de focalización.
export default function Catalogo() {
  const { catalogo, cargando, error } = useCatalogoIE()
  const [municipio, setMunicipio] = useState('')
  const [institucion, setInstitucion] = useState('')

  const filas = useMemo(() => {
    if (!catalogo) return []
    const resultado = []
    const municipios = municipio ? [municipio] : catalogo.municipios
    municipios.forEach((m) => {
      const instituciones = institucion && municipio ? [institucion] : catalogo.instituciones[m] || []
      instituciones.forEach((i) => {
        ;(catalogo.sedes[`${m}||${i}`] || []).forEach((s) => {
          resultado.push({ municipio: m, institucion: i, sede: s })
        })
      })
    })
    return resultado
  }, [catalogo, municipio, institucion])

  if (cargando) return <Cargando />
  if (error) return <AvisoError>Error cargando catálogo: {error}</AvisoError>

  const totalInstituciones = Object.values(catalogo.instituciones).reduce((s, arr) => s + arr.length, 0)
  const totalSedes = Object.values(catalogo.sedes).reduce((s, arr) => s + arr.length, 0)
  const instituciones = municipio ? catalogo.instituciones[municipio] || [] : []

  return (
    <section className="vista">
      <h2>Catálogo de instituciones</h2>

      <div className="kpis">
        <div className="kpi"><strong>{catalogo.municipios.length}</strong><span>Municipios</span></div>
        <div className="kpi"><strong>{totalInstituciones}</strong><span>Instituciones</span></div>
        <div className="kpi"><strong>{totalSedes}</strong><span>Sedes</span></div>
        <div className="kpi"><strong>{filas.length}</strong><span>Filas visibles</span></div>
      </div>

      <div className="filtros">
        <select
          value={municipio}
          onChange={(e) => {
            setMunicipio(e.target.value)
            setInstitucion('')
          }}
        >
          <option value="">Todos los municipios</option>
          {catalogo.municipios.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={institucion} disabled={!municipio} onChange={(e) => setInstitucion(e.target.value)}>
          <option value="">Todas las instituciones</option>
          {instituciones.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        {(municipio || institucion) && (
          <button type="button" onClick={() => { setMunicipio(''); setInstitucion('') }}>
            Limpiar filtros
          </button>
        )}
      </div>

      {filas.length === 0 ? (
        <Vacio>No hay sedes que coincidan con los filtros.</Vacio>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th>Municipio</th>
                <th>Institución educativa</th>
                <th>Sede</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={`${f.municipio}||${f.institucion}||${f.sede}`}>
                  <td>{f.municipio}</td>
                  <td>{f.institucion}</td>
                  <td>{f.sede}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
