import { NavLink, Route, Routes } from 'react-router-dom'
import Proyectos from './views/Proyectos'
import Aliados from './views/Aliados'
import Usuarios from './views/Usuarios'
import Convenios from './views/Convenios'
import ConvenioDetalle from './views/ConvenioDetalle'
import FocalizacionMeta from './views/FocalizacionMeta'
import AsignacionesMeta from './views/AsignacionesMeta'
import ResumenConvenios from './views/ResumenConvenios'
import CargaPadrinos from './views/CargaPadrinos'
import VisitasSede from './views/VisitasSede'
import Catalogo from './views/Catalogo'

// Rutas absolutas a propósito: con rutas relativas, un NavLink dentro de una
// vista anidada (p.ej. /admin/convenios/3) resuelve "aliados" contra la URL
// actual en vez de contra /admin, y el menú termina apuntando a
// /admin/convenios/aliados en lugar de /admin/aliados.
const ENLACES = [
  { to: '/admin', label: 'Proyectos' },
  { to: '/admin/aliados', label: 'Aliados' },
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/convenios', label: 'Convenios' },
  { to: '/admin/resumen', label: 'Avance por convenio' },
  { to: '/admin/carga-padrinos', label: 'Carga de padrinos' },
  { to: '/admin/visitas-sede', label: 'Visitas por sede' },
  { to: '/admin/catalogo', label: 'Catálogo (prueba)' },
]

export default function AdminApp() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>Panel de Administración</h1>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {ENLACES.map((e) => (
          <NavLink key={e.to} to={e.to} end={e.to === '/admin'}>
            {e.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<Proyectos />} />
        <Route path="aliados" element={<Aliados />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="convenios" element={<Convenios />} />
        <Route path="convenios/:id" element={<ConvenioDetalle />} />
        <Route path="metas/:metaId" element={<FocalizacionMeta />} />
        <Route path="metas/:metaId/asignaciones" element={<AsignacionesMeta />} />
        <Route path="resumen" element={<ResumenConvenios />} />
        <Route path="carga-padrinos" element={<CargaPadrinos />} />
        <Route path="visitas-sede" element={<VisitasSede />} />
        <Route path="catalogo" element={<Catalogo />} />
      </Routes>
    </div>
  )
}
