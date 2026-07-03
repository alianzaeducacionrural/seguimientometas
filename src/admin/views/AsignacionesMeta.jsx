import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import FilaAsignacion from '../components/FilaAsignacion'

export default function AsignacionesMeta() {
  const { metaId } = useParams()
  const metas = useEntidad('metas')
  const convenios = useEntidad('convenios')
  const usuarios = useEntidad('usuarios')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')

  const [padrinoId, setPadrinoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  if (metas.cargando || convenios.cargando || usuarios.cargando || asignaciones.cargando) return <p>Cargando…</p>
  if (metas.error) return <p>Error: {metas.error}</p>
  if (asignaciones.error) return <p>Error: {asignaciones.error}</p>

  const meta = metas.datos.find((m) => String(m.id) === metaId)
  if (!meta) return <p>Meta no encontrada.</p>

  const convenio = convenios.datos.find((c) => String(c.id) === String(meta.convenio_id))
  const padrinos = usuarios.datos.filter((u) => u.rol === 'padrino')
  const items = asignaciones.datos.filter((a) => String(a.meta_id) === metaId)
  const padrinosAsignadosIds = new Set(items.map((a) => String(a.padrino_id)))
  const padrinosDisponibles = padrinos.filter((p) => !padrinosAsignadosIds.has(String(p.id)))

  const totalAsignado = items.reduce((sum, a) => sum + (Number(a.cantidad_asignada) || 0), 0)
  const totalRealizado = items.reduce((sum, a) => sum + (Number(a.cantidad_realizada) || 0), 0)
  const metaNum = Number(meta.cantidad_meta) || 0
  const cuadra = totalAsignado === metaNum

  async function agregar(e) {
    e.preventDefault()
    if (!padrinoId || !cantidad) {
      setError('Selecciona un padrino y una cantidad.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await asignaciones.crearItem({
        meta_id: metaId,
        padrino_id: padrinoId,
        cantidad_asignada: cantidad,
        cantidad_realizada: 0,
      })
      setPadrinoId('')
      setCantidad('')
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section>
      {convenio && <p><Link to={`/admin/convenios/${convenio.id}`}>← Volver a {convenio.nombre}</Link></p>}
      <h2>Asignación sin focalizar: {meta.descripcion}</h2>
      <p>
        Meta: {metaNum} · Asignado: <strong style={{ color: cuadra ? '#0ca30c' : '#fab219' }}>{totalAsignado}</strong>
        {' '}· Realizado: {totalRealizado}
        {!cuadra && <span style={{ color: '#fab219' }}> (no cuadra con la meta)</span>}
      </p>

      <h3>Asignar padrino</h3>
      <form onSubmit={agregar} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <select value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
          <option value="">Padrino…</option>
          {padrinosDisponibles.map((p) => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          placeholder="Cantidad asignada"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          style={{ width: '10em' }}
        />
        <button type="submit" disabled={guardando}>Agregar</button>
      </form>
      {padrinos.length === 0 && <p>No hay usuarios con rol "padrino" todavía — créalos en Usuarios para poder asignar.</p>}
      {padrinos.length > 0 && padrinosDisponibles.length === 0 && <p>Todos los padrinos ya tienen una asignación en esta meta.</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Padrino</th>
            <th>Cantidad asignada</th>
            <th>Cantidad realizada</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <FilaAsignacion
              key={item.id}
              item={item}
              padrinoNombre={padrinos.find((p) => String(p.id) === String(item.padrino_id))?.nombre || '—'}
              onGuardar={asignaciones.editarItem}
              onEliminar={asignaciones.eliminarItem}
            />
          ))}
        </tbody>
      </table>
    </section>
  )
}
