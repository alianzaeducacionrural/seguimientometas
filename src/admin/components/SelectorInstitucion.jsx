import useCatalogoIE from '../hooks/useCatalogoIE'

// Selector en cascada Municipio → Institución → Sede, alimentado en vivo
// desde el catálogo externo Mun/IE/Sedes. Controlado: el padre guarda
// { municipio, institucion, sede } y recibe los cambios por onChange.
export default function SelectorInstitucion({ municipio, institucion, sede, onChange }) {
  const { catalogo, cargando, error } = useCatalogoIE()

  if (cargando) return <p>Cargando catálogo de instituciones…</p>
  if (error) return <p>Error cargando catálogo: {error}</p>

  const instituciones = municipio ? catalogo.instituciones[municipio] || [] : []
  const sedes = municipio && institucion ? catalogo.sedes[`${municipio}||${institucion}`] || [] : []

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      <select
        value={municipio}
        onChange={(e) => onChange({ municipio: e.target.value, institucion: '', sede: '' })}
      >
        <option value="">Municipio…</option>
        {catalogo.municipios.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <select
        value={institucion}
        disabled={!municipio}
        onChange={(e) => onChange({ municipio, institucion: e.target.value, sede: '' })}
      >
        <option value="">Institución…</option>
        {instituciones.map((i) => (
          <option key={i} value={i}>{i}</option>
        ))}
      </select>

      <select
        value={sede}
        disabled={!institucion}
        onChange={(e) => onChange({ municipio, institucion, sede: e.target.value })}
      >
        <option value="">Sede…</option>
        {sedes.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  )
}
