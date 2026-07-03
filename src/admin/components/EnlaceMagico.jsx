import { useState } from 'react'

const RUTA_POR_ROL = { lider: 'lider', padrino: 'padrino' }

// Arma la URL del magic-link (mismo basename que usa BrowserRouter) y
// ofrece un botón para copiarla, para que el admin se la pueda mandar al
// líder/padrino sin transcribirla a mano.
export default function EnlaceMagico({ rol, token }) {
  const [copiado, setCopiado] = useState(false)
  const ruta = RUTA_POR_ROL[rol]
  if (!ruta || !token) return null

  const url = `${window.location.origin}${import.meta.env.BASE_URL}${ruta}?token=${token}`

  async function copiar() {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <button type="button" onClick={copiar} title={url}>
      {copiado ? 'Copiado ✓' : 'Copiar enlace'}
    </button>
  )
}
