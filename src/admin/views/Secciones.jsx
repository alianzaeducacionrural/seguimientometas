import { Route, Routes } from 'react-router-dom'
import Pestanas from '../components/Pestanas'
import Convenios from './Convenios'
import Proyectos from './Proyectos'
import Aliados from './Aliados'
import Usuarios from './Usuarios'
import ActividadesPadrino from './ActividadesPadrino'
import ResumenConvenios from './ResumenConvenios'
import VisitasSede from './VisitasSede'

// Secciones del menú que agrupan varias vistas como pestañas.

export function SeccionConvenios() {
  return (
    <>
      <Pestanas items={[
        { to: '/admin/convenios', label: 'Convenios y metas' },
        { to: '/admin/convenios/proyectos', label: 'Proyectos y actividades' },
        { to: '/admin/convenios/aliados', label: 'Aliados' },
      ]}
      />
      <Routes>
        <Route index element={<Convenios />} />
        <Route path="proyectos" element={<Proyectos />} />
        <Route path="aliados" element={<Aliados />} />
      </Routes>
    </>
  )
}

export function SeccionEquipo() {
  return (
    <>
      <Pestanas items={[
        { to: '/admin/equipo', label: 'Personas y enlaces' },
        { to: '/admin/equipo/carga', label: 'Carga por padrino' },
      ]}
      />
      <Routes>
        <Route index element={<Usuarios />} />
        <Route path="carga" element={<ActividadesPadrino />} />
      </Routes>
    </>
  )
}

export function SeccionReportes() {
  return (
    <>
      <Pestanas items={[
        { to: '/admin/reportes', label: 'Avance por convenio' },
        { to: '/admin/reportes/sedes', label: 'Visitas por sede' },
      ]}
      />
      <Routes>
        <Route index element={<ResumenConvenios />} />
        <Route path="sedes" element={<VisitasSede />} />
      </Routes>
    </>
  )
}
