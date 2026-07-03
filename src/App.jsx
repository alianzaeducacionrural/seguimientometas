import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './Home'
import AdminApp from './admin/AdminApp'

export default function App() {
  return (
    <BrowserRouter basename="/seguimientometas/">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  )
}
