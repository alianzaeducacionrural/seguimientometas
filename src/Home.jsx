import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import MarcaLogo from './components/MarcaLogo'

const GAS_URL = import.meta.env.VITE_GAS_URL

export default function Home() {
  const [estado, setEstado] = useState(GAS_URL ? 'cargando' : 'error')
  const [mensaje, setMensaje] = useState(GAS_URL ? '' : 'Falta VITE_GAS_URL en el .env')

  useEffect(() => {
    if (!GAS_URL) return
    fetch(`${GAS_URL}?action=ping`)
      .then((res) => res.json())
      .then((datos) => {
        if (datos.ok) {
          setEstado('ok')
          setMensaje(datos.mensaje)
        } else {
          setEstado('error')
          setMensaje(datos.error || 'Respuesta no válida')
        }
      })
      .catch((err) => {
        setEstado('error')
        setMensaje(err.message)
      })
  }, [])

  return (
    <div className="portada">
      <div className="portada-tarjeta">
        <MarcaLogo tamano={52} />
        <h1>Seguimiento a Convenios y Focalización</h1>
        <p>Área de Educación · Comité de Cafeteros de Caldas</p>

        {estado === 'cargando' && (
          <span className="insignia insignia-neutra">Verificando conexión…</span>
        )}
        {estado === 'ok' && (
          <span className="insignia insignia-realizada" title={mensaje}>Conectado al sistema</span>
        )}
        {estado === 'error' && (
          <span className="insignia insignia-error">Sin conexión: {mensaje}</span>
        )}

        <div className="portada-acciones">
          <Link to="/admin">Ir al panel de administración</Link>
        </div>
      </div>
    </div>
  )
}
