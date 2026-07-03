import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './Home'
import AdminApp from './admin/AdminApp'
import LiderPanel from './lider/LiderPanel'
import PadrinoPanel from './padrino/PadrinoPanel'

export default function App() {
  return (
    <BrowserRouter basename="/seguimientometas/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/lider" element={<LiderPanel />} />
        <Route path="/padrino" element={<PadrinoPanel />} />
      </Routes>
    </BrowserRouter>
  )
}
