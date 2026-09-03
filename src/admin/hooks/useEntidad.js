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

  // Todas las mutaciones aplican el cambio a la lista local en cuanto el
  // servidor confirma (respuesta {ok:true}), y solo DESPUÉS relanzan un GET
  // para reconciliar. Antes se dependía de ese GET para ver el cambio: si
  // GAS respondía lento o con un error transitorio al recargar, la fila
  // borrada "reaparecía" aunque el borrado sí se hubiera hecho. Con la
  // actualización optimista el GET de reconciliación es best-effort.
  async function crearItem(campos) {
    const r = await crear(entidad, campos)
    if (r && r.datos) setDatos((d) => [...d, r.datos])
    recargar().catch(() => {})
  }

  async function editarItem(id, campos) {
    await editar(entidad, id, campos)
    setDatos((d) => d.map((x) => (String(x.id) === String(id) ? { ...x, ...campos } : x)))
    recargar().catch(() => {})
  }

  async function eliminarItem(id) {
    await eliminar(entidad, id)
    setDatos((d) => d.filter((x) => String(x.id) !== String(id)))
    recargar().catch(() => {})
  }

  return { datos, cargando, error, crearItem, editarItem, eliminarItem, recargar }
}
