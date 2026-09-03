import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, crear, editar, eliminar } from '../utils/api'

// CRUD genérico contra una hoja del Sheets maestro (proyectos, aliados, usuarios).
export default function useEntidad(entidad) {
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Ids que ya borramos (el servidor respondió {ok:true}) pero que un GET
  // de reconciliación podría todavía devolver: GAS a veces sirve una lectura
  // que va un instante por detrás de la escritura recién hecha (más aún con
  // varias personas usando la app a la vez). Sin esto, la fila borrada
  // "desaparece y vuelve a aparecer". Se limpia el id en cuanto un GET ya no
  // lo trae. Mismo problema al revés para altas: un id recién creado que el
  // GET todavía no incluye.
  const borradosRef = useRef(new Set())
  const creadosRef = useRef(new Map())

  const conciliar = useCallback((filas) => {
    const presentes = new Set(filas.map((f) => String(f.id)))
    borradosRef.current.forEach((id) => { if (!presentes.has(id)) borradosRef.current.delete(id) })
    creadosRef.current.forEach((fila, id) => { if (presentes.has(id)) creadosRef.current.delete(id) })
    let resultado = filas
    if (borradosRef.current.size) resultado = resultado.filter((f) => !borradosRef.current.has(String(f.id)))
    if (creadosRef.current.size) {
      const faltantes = [...creadosRef.current.values()].filter((f) => !presentes.has(String(f.id)))
      if (faltantes.length) resultado = [...resultado, ...faltantes]
    }
    return resultado
  }, [])

  const recargar = useCallback(() => {
    return apiGet(entidad)
      .then((r) => {
        setDatos(conciliar(r.datos))
        setError(null)
      })
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [entidad, conciliar])

  useEffect(() => {
    recargar()
  }, [recargar])

  // Todas las mutaciones aplican el cambio a la lista local en cuanto el
  // servidor confirma ({ok:true}) y solo DESPUÉS relanzan un GET para
  // reconciliar (best-effort). El GET ya no es lo que hace visible el
  // cambio, así que da igual si sale lento o con un error transitorio.
  async function crearItem(campos) {
    const r = await crear(entidad, campos)
    if (r && r.datos) {
      // GAS reusa el id más alto si se acababa de borrar: sácalo de borrados.
      borradosRef.current.delete(String(r.datos.id))
      creadosRef.current.set(String(r.datos.id), r.datos)
      setDatos((d) => [...d, r.datos])
    }
    recargar().catch(() => {})
  }

  async function editarItem(id, campos) {
    await editar(entidad, id, campos)
    setDatos((d) => d.map((x) => (String(x.id) === String(id) ? { ...x, ...campos } : x)))
    recargar().catch(() => {})
  }

  async function eliminarItem(id) {
    await eliminar(entidad, id)
    borradosRef.current.add(String(id))
    creadosRef.current.delete(String(id))
    setDatos((d) => d.filter((x) => String(x.id) !== String(id)))
    recargar().catch(() => {})
  }

  return { datos, cargando, error, crearItem, editarItem, eliminarItem, recargar }
}
