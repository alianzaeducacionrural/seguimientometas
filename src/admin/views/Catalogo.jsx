import { useState } from 'react'
import SelectorInstitucion from '../components/SelectorInstitucion'

// Vista de prueba del selector Municipio→Institución→Sede (Fase 1).
// Se reutilizará tal cual dentro del alta de focalización en Fase 3.
export default function Catalogo() {
  const [seleccion, setSeleccion] = useState({ municipio: '', institucion: '', sede: '' })

  return (
    <section>
      <h2>Catálogo de instituciones (prueba)</h2>
      <SelectorInstitucion {...seleccion} onChange={setSeleccion} />
      <p>
        Seleccionado: {seleccion.municipio || '—'} / {seleccion.institucion || '—'} / {seleccion.sede || '—'}
      </p>
    </section>
  )
}
