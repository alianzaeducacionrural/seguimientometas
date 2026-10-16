import { useLayoutEffect } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useParams } from 'react-router-dom'
import Inicio from './views/Inicio'
import Visitas from './views/Visitas'
import { SeccionConvenios, SeccionEquipo, SeccionReportes } from './views/Secciones'
import MarcaLogo from '../components/MarcaLogo'
import { IconoCarga, IconoConvenios, IconoFocalizacion, IconoInicio, IconoResumen } from '../components/Iconos'
import './admin.css'

// Rutas absolutas a propósito: con rutas relativas, un NavLink dentro de una
// vista anidada (p.ej. /admin/convenios/aliados) resuelve contra la URL
// actual en vez de contra /admin y el menú termina apuntando a un lugar roto.
const MENU = [
  { to: '/admin', label: 'Inicio', Icono: IconoInicio, end: true },
  { to: '/admin/visitas', label: 'Visitas', Icono: IconoFocalizacion },
  { to: '/admin/convenios', label: 'Convenios', Icono: IconoConvenios },
  { to: '/admin/equipo', label: 'Equipo', Icono: IconoCarga },
  { to: '/admin/reportes', label: 'Reportes', Icono: IconoResumen },
]

// Los enlaces viejos (favoritos, /admin/metas/:id desde Convenios) siguen
// funcionando redirigiendo a la vista equivalente.
function RedirigirMeta() {
  const { metaId } = useParams()
  return <Navigate to={`/admin/visitas?meta=${metaId}`} replace />
}

export default function AdminApp() {
  // El tema denso del admin (admin.css) cuelga de body.adm para no tocar el
  // aspecto del panel de líder/padrino ni de la portada.
  useLayoutEffect(() => {
    document.body.classList.add('adm')
    return () => document.body.classList.remove('adm')
  }, [])

  return (
    <>
      <header className="adm-barra">
        <Link to="/admin" className="adm-marca">
          <MarcaLogo invertido tamano={34} />
          <span>
            <strong>Seguimiento a Convenios</strong>
            <small>Educación · Comité de Cafeteros de Caldas</small>
          </span>
        </Link>
        <nav className="adm-nav">
          {MENU.map(({ to, label, Icono, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `adm-enlace${isActive ? ' activa' : ''}`}>
              <Icono />
              {label}
            </NavLink>
          ))}
        </nav>
        <span className="adm-rol">Admin</span>
      </header>

      <main className="adm-contenido">
        <Routes>
          <Route index element={<Inicio />} />
          <Route path="visitas" element={<Visitas />} />
          <Route path="convenios/*" element={<SeccionConvenios />} />
          <Route path="equipo/*" element={<SeccionEquipo />} />
          <Route path="reportes/*" element={<SeccionReportes />} />
          <Route path="focalizacion" element={<Navigate to="/admin/visitas" replace />} />
          <Route path="metas/:metaId/*" element={<RedirigirMeta />} />
          <Route path="aliados" element={<Navigate to="/admin/convenios/aliados" replace />} />
          <Route path="usuarios" element={<Navigate to="/admin/equipo" replace />} />
          <Route path="actividades-padrino" element={<Navigate to="/admin/equipo/carga" replace />} />
          <Route path="resumen" element={<Navigate to="/admin/reportes" replace />} />
          <Route path="visitas-sede" element={<Navigate to="/admin/reportes/sedes" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </>
  )
}
