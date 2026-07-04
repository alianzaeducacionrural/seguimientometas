import { Link, NavLink, Route, Routes } from 'react-router-dom'
import Proyectos from './views/Proyectos'
import Aliados from './views/Aliados'
import Usuarios from './views/Usuarios'
import Convenios from './views/Convenios'
import FocalizacionMeta from './views/FocalizacionMeta'
import AsignacionesMeta from './views/AsignacionesMeta'
import ResumenConvenios from './views/ResumenConvenios'
import ActividadesPadrino from './views/ActividadesPadrino'
import VisitasSede from './views/VisitasSede'
import Catalogo from './views/Catalogo'
import MarcaLogo from '../components/MarcaLogo'
import {
  IconoAliados,
  IconoCarga,
  IconoCatalogo,
  IconoConvenios,
  IconoProyectos,
  IconoResumen,
  IconoUsuarios,
  IconoVisitas,
} from '../components/Iconos'

// Rutas absolutas a propósito: con rutas relativas, un NavLink dentro de una
// vista anidada (p.ej. /admin/convenios/3) resuelve "aliados" contra la URL
// actual en vez de contra /admin, y el menú termina apuntando a
// /admin/convenios/aliados en lugar de /admin/aliados.
const GESTION = [
  { to: '/admin', label: 'Proyectos', Icono: IconoProyectos },
  { to: '/admin/aliados', label: 'Aliados', Icono: IconoAliados },
  { to: '/admin/usuarios', label: 'Usuarios', Icono: IconoUsuarios },
  { to: '/admin/convenios', label: 'Convenios', Icono: IconoConvenios },
]

const REPORTES = [
  { to: '/admin/resumen', label: 'Avance por convenio', Icono: IconoResumen },
  { to: '/admin/actividades-padrino', label: 'Actividades por padrino', Icono: IconoCarga },
  { to: '/admin/visitas-sede', label: 'Visitas por sede', Icono: IconoVisitas },
  { to: '/admin/catalogo', label: 'Catálogo IE', Icono: IconoCatalogo },
]

function Enlace({ to, label, Icono }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin'}
      className={({ isActive }) => `lateral-enlace${isActive ? ' activa' : ''}`}
    >
      <Icono />
      {label}
    </NavLink>
  )
}

export default function AdminApp() {
  return (
    <div className="cascaron">
      <aside className="lateral">
        <Link to="/admin" className="lateral-marca">
          <MarcaLogo invertido tamano={38} />
          <span>
            <strong>Seguimiento a Convenios</strong>
            <small>Educación · Comité de Cafeteros de Caldas</small>
          </span>
        </Link>
        <nav>
          <p className="lateral-titulo">Gestión</p>
          <div className="lateral-nav">
            {GESTION.map((e) => <Enlace key={e.to} {...e} />)}
          </div>
          <p className="lateral-titulo">Reportes</p>
          <div className="lateral-nav">
            {REPORTES.map((e) => <Enlace key={e.to} {...e} />)}
          </div>
        </nav>
      </aside>

      <div className="principal">
        <main className="contenido">
          <Routes>
            <Route index element={<Proyectos />} />
            <Route path="aliados" element={<Aliados />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="convenios" element={<Convenios />} />
            <Route path="metas/:metaId" element={<FocalizacionMeta />} />
            <Route path="metas/:metaId/asignaciones" element={<AsignacionesMeta />} />
            <Route path="resumen" element={<ResumenConvenios />} />
            <Route path="actividades-padrino" element={<ActividadesPadrino />} />
            <Route path="visitas-sede" element={<VisitasSede />} />
            <Route path="catalogo" element={<Catalogo />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
