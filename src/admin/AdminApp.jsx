import { NavLink, Route, Routes } from 'react-router-dom'
import Proyectos from './views/Proyectos'
import Aliados from './views/Aliados'
import Usuarios from './views/Usuarios'
import Catalogo from './views/Catalogo'

const ENLACES = [
  { to: '', label: 'Proyectos' },
  { to: 'aliados', label: 'Aliados' },
  { to: 'usuarios', label: 'Usuarios' },
  { to: 'catalogo', label: 'Catálogo (prueba)' },
]

export default function AdminApp() {
  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Panel de Administración</h1>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        {ENLACES.map((e) => (
          <NavLink key={e.to} to={e.to} end={e.to === ''}>
            {e.label}
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<Proyectos />} />
        <Route path="aliados" element={<Aliados />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="catalogo" element={<Catalogo />} />
      </Routes>
    </div>
  )
}
