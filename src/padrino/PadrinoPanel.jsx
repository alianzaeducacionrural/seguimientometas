import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { apiGet } from '../utils/api'
import EstadoFocalizacion from '../components/EstadoFocalizacion'
import { formatearFecha } from '../utils/formato'
import { AvisoError, Cargando, Vacio } from '../components/Estado'
import MarcaLogo from '../components/MarcaLogo'
import estilos from './PadrinoPanel.module.css'

// Vista pensada para celular (el padrino la revisa en campo): una sola
// columna, tarjetas grandes, sin tablas anchas. Solo lectura de sus propias
// focalizaciones/asignaciones — el backend ya filtra por token.
export default function PadrinoPanel() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''

  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(token ? null : 'Falta el token en el enlace.')
  const [cargando, setCargando] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    apiGet('padrinoResumen', { token })
      .then(setDatos)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false))
  }, [token])

  if (cargando) return <div className={estilos.envoltorio}><Cargando /></div>
  if (error) return <div className={estilos.envoltorio}><AvisoError>{error}</AvisoError></div>

  const { usuario, focalizacion, asignaciones } = datos
  const totalAsignadas = focalizacion.length + asignaciones.reduce((s, a) => s + (Number(a.cantidad_asignada) || 0), 0)
  const totalRealizadas = focalizacion.filter((f) => f.estado === 'realizada').length
    + asignaciones.reduce((s, a) => s + (Number(a.cantidad_realizada) || 0), 0)

  return (
    <>
    <div className="banda-persona banda-angosta">
      <div className="banda-persona-interior">
        <MarcaLogo invertido />
        <h1>Hola, {usuario.nombre}</h1>
        <span className="panel-persona-rol">Padrino</span>
      </div>
      <p className="banda-persona-sub">Tus visitas asignadas, de un vistazo.</p>
    </div>
    <div className={estilos.envoltorio}>
      <div className={estilos.resumen}>
        <div><strong>{totalAsignadas}</strong><span>Asignadas</span></div>
        <div><strong>{totalRealizadas}</strong><span>Realizadas</span></div>
      </div>

      <h2>Tus visitas focalizadas</h2>
      {focalizacion.length === 0 ? (
        <Vacio>No tienes sedes focalizadas asignadas.</Vacio>
      ) : (
        focalizacion.map((f) => (
          <div key={f.id} className={estilos.tarjeta}>
            <h3>{f.sede}</h3>
            <p>{f.institucion} · {f.municipio}</p>
            <p>{f.convenio_nombre} — {f.meta_descripcion}</p>
            <p><EstadoFocalizacion estado={f.estado} /></p>
            {f.estado === 'programada' && <p>Programada: {formatearFecha(f.fecha_programada)}</p>}
            {f.estado === 'realizada' && <p>Realizada: {formatearFecha(f.fecha_realizada)}</p>}
          </div>
        ))
      )}

      <h2>Tus visitas sin focalizar</h2>
      {asignaciones.length === 0 ? (
        <Vacio>No tienes asignaciones sin focalizar.</Vacio>
      ) : (
        asignaciones.map((a) => (
          <div key={a.id} className={estilos.tarjeta}>
            <h3>{a.convenio_nombre}</h3>
            <p>{a.meta_descripcion}</p>
            <div className={estilos.filaNumeros}>
              <div className={estilos.numero}><span>{a.cantidad_asignada}</span><span>Asignadas</span></div>
              <div className={estilos.numero}><span>{a.cantidad_realizada || 0}</span><span>Realizadas</span></div>
            </div>
          </div>
        ))
      )}
    </div>
    </>
  )
}
