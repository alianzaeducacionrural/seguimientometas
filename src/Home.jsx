import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Seguimiento a Convenios y Focalización</h1>
      <p>Área de Educación — Comité de Cafeteros de Caldas</p>
      <p>
        Estado de conexión con Google Apps Script:{' '}
        {estado === 'cargando' && 'consultando…'}
        {estado === 'ok' && `✓ ${mensaje}`}
        {estado === 'error' && `✗ ${mensaje}`}
      </p>
      <p><Link to="/admin">Ir al panel de administración</Link></p>
    </div>
  )
}
