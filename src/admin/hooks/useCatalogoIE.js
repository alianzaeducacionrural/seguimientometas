import { useEffect, useState } from 'react'
import { apiGet } from '../utils/api'

// El catálogo Mun/IE/Sedes es grande (~1300 filas) y prácticamente estático
// durante una sesión: se cachea en memoria del módulo para no repetir la
// consulta cada vez que un componente usa el selector.
let catalogoCache = null

export default function useCatalogoIE() {
  const [catalogo, setCatalogo] = useState(catalogoCache)
  const [cargando, setCargando] = useState(!catalogoCache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (catalogoCache) return
    apiGet('catalogoIE')
      .then((r) => {
        catalogoCache = r
        setCatalogo(r)
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  return { catalogo, cargando, error }
}
