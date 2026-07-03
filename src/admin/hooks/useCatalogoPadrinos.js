import { useEffect, useState } from 'react'
import { apiGet } from '../utils/api'

// Lista de padrinos (nombre + correo) del archivo de catálogo externo —
// misma estrategia de caché de módulo que useCatalogoIE: es estática
// durante la sesión y la usan el alta y la edición de usuarios.
let padrinosCache = null

export default function useCatalogoPadrinos() {
  const [padrinos, setPadrinos] = useState(padrinosCache || [])
  const [cargando, setCargando] = useState(!padrinosCache)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (padrinosCache) return
    apiGet('catalogoPadrinos')
      .then((r) => {
        padrinosCache = r.padrinos
        setPadrinos(r.padrinos)
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [])

  return { padrinos, cargando, error }
}
