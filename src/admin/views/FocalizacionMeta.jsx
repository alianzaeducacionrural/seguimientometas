import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import SelectorInstitucion from '../components/SelectorInstitucion'
import FilaFocalizacion from '../components/FilaFocalizacion'

const SELECCION_VACIA = { municipio: '', institucion: '', sede: '' }

export default function FocalizacionMeta() {
  const { metaId } = useParams()
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const usuarios = useEntidad('usuarios')
  const focalizacion = useEntidad('focalizacion')

  const [seleccion, setSeleccion] = useState(SELECCION_VACIA)
  const [padrinoId, setPadrinoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  if (metas.cargando || convenios.cargando || usuarios.cargando || focalizacion.cargando) return <p>Cargando…</p>
  if (metas.error) return <p>Error: {metas.error}</p>
  if (focalizacion.error) return <p>Error: {focalizacion.error}</p>

  const meta = metas.datos.find((m) => String(m.id) === metaId)
  if (!meta) return <p>Meta no encontrada.</p>

  const convenio = convenios.datos.find((c) => String(c.id) === String(meta.convenio_id))
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')
  const items = focalizacion.datos.filter((f) => String(f.meta_id) === metaId)
  const realizadas = items.filter((f) => f.estado === 'realizada').length

  async function agregar(e) {
    e.preventDefault()
    if (!seleccion.municipio || !seleccion.institucion || !seleccion.sede) {
      setError('Selecciona municipio, institución y sede.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await focalizacion.crearItem({
        meta_id: metaId,
        municipio: seleccion.municipio,
        institucion: seleccion.institucion,
        sede: seleccion.sede,
        padrino_id: padrinoId,
        estado: 'pendiente',
      })
      setSeleccion(SELECCION_VACIA)
      setPadrinoId('')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function reasignar(id, nuevoPadrinoId) {
    await focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })
  }

  async function programar(id, fecha) {
    await focalizacion.editarItem(id, { estado: 'programada', fecha_programada: fecha })
  }

  async function marcarRealizada(id, fecha) {
    await focalizacion.editarItem(id, { estado: 'realizada', fecha_realizada: fecha })
  }

  return (
    <section>
      {convenio && <p><Link to={`/admin/convenios/${convenio.id}`}>← Volver a {convenio.nombre}</Link></p>}
      <h2>Focalización: {meta.descripcion}</h2>
      <p>
        Meta: {meta.cantidad_meta} · Focalizadas: {items.length} · Realizadas: {realizadas}
      </p>

      <h3>Agregar sede a focalizar</h3>
      <form onSubmit={agregar} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <SelectorInstitucion {...seleccion} onChange={setSeleccion} />
        <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
          <option value="">Padrino…</option>
          {padrinos.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <button type="submit" disabled={guardando}>Agregar</button>
      </form>
      {padrinos.length === 0 && <p>No hay usuarios con rol "padrino" todavía — créalos en Usuarios para poder asignar.</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Municipio</th>
            <th>Institución</th>
            <th>Sede</th>
            <th>Padrino</th>
            <th>Estado</th>
            <th>Acción</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <FilaFocalizacion
              key={item.id}
              item={item}
              padrinos={padrinos}
              onReasignar={reasignar}
              onProgramar={programar}
              onMarcarRealizada={marcarRealizada}
              onEliminar={focalizacion.eliminarItem}
            />
          ))}
        </tbody>
      </table>
    </section>
  )
}
