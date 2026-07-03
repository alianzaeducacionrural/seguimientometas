import { useCallback, useEffect, useState } from 'react'
import { apiGet, crear, editar, eliminar } from '../utils/api'

// CRUD genérico contra una hoja del Sheets maestro (proyectos, aliados, usuarios).
export default function useEntidad(entidad) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const recargar = useCallback(() => {
    return apiGet(entidad)
      .then((r) => {
        setDatos(r.datos)
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [entidad])

  useEffect(() => {
    recargar()
  }, [recargar])

  async function crearItem(campos) {
    await crear(entidad, campos)
    await recargar()
  }

  async function editarItem(id, campos) {
    await editar(entidad, id, campos)
    await recargar()
  }

  async function eliminarItem(id) {
    await eliminar(entidad, id)
    await recargar()
  }

  return { datos, cargando, error, crearItem, editarItem, eliminarItem, recargar }
}
