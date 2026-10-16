import { NavLink } from 'react-router-dom'

// Pestañas internas de una sección del admin (cada una es una ruta). Rutas
// absolutas por la misma razón que el menú principal (ver AdminApp).
export default function Pestanas({ items }) {
  return (
    <nav className="adm-pestanas">
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end className={({ isActive }) => `adm-pestana${isActive ? ' activa' : ''}`}>
          {i.label}
        </NavLink>
      ))}
    </nav>
  )
}
