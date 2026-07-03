import { useState } from 'react'

const VACIO_POR_TIPO = { text: '', select: '', multiselect: [] }

function valorInicial(campos, fila) {
  const form = {}
  campos.forEach((campo) => {
    if (!fila) {
      form[campo.clave] = VACIO_POR_TIPO[campo.tipo]
      return
    }
    const crudo = fila[campo.clave] ?? ''
    form[campo.clave] = campo.tipo === 'multiselect'
      ? String(crudo).split(',').map((v) => v.trim()).filter(Boolean)
      : crudo
  })
  return form
}

function serializar(campos, form) {
  const datos = {}
  campos.forEach((campo) => {
    datos[campo.clave] = campo.tipo === 'multiselect' ? form[campo.clave].join(',') : form[campo.clave]
  })
  return datos
}

// Tabla + formulario de alta/edición genéricos para las entidades de
// catálogo (proyectos, aliados, usuarios): mismo patrón de listar/crear/
// editar/eliminar, solo cambian los campos y columnas por entidad.
export default function TablaCrud({ titulo, campos, columnasExtra = [], filas, onCrear, onEditar, onEliminar }) {
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(() => valorInicial(campos, null))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  function editarFila(fila) {
    setEditandoId(fila.id)
    setForm(valorInicial(campos, fila))
    setError(null)
  }

  function cancelar() {
    setEditandoId(null)
    setForm(valorInicial(campos, null))
    setError(null)
  }

  async function enviar(e) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      const datos = serializar(campos, form)
      if (editandoId) {
        await onEditar(editandoId, datos)
      } else {
        await onCrear(datos)
      }
      cancelar()
    } catch (err) {
      setError(err.message)
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarFila(id) {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await onEliminar(id)
    } catch (err) {
      setError(err.message)
    }
  }

  function actualizarCampo(clave, valor) {
    setForm((f) => ({ ...f, [clave]: valor }))
  }

  return (
    <section>
      <h2>{titulo}</h2>

      <form onSubmit={enviar} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
        {campos.map((campo) => {
          if (campo.mostrarSi && !campo.mostrarSi(form)) return null

          if (campo.tipo === 'select') {
            return (
              <select
                key={campo.clave}
                value={form[campo.clave]}
                required={campo.requerido}
                onChange={(e) => actualizarCampo(campo.clave, e.target.value)}
              >
                <option value="">{campo.label}…</option>
                {campo.opciones.map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            )
          }

          if (campo.tipo === 'multiselect') {
            return (
              <fieldset key={campo.clave}>
                <legend>{campo.label}</legend>
                {campo.opciones.length === 0 && <span>(sin opciones aún)</span>}
                {campo.opciones.map((op) => (
                  <label key={op.value} style={{ display: 'block' }}>
                    <input
                      type="checkbox"
                      checked={form[campo.clave].includes(op.value)}
                      onChange={(e) => {
                        const actual = form[campo.clave]
                        actualizarCampo(
                          campo.clave,
                          e.target.checked ? [...actual, op.value] : actual.filter((v) => v !== op.value)
                        )
                      }}
                    />
                    {op.label}
                  </label>
                ))}
              </fieldset>
            )
          }

          return (
            <input
              key={campo.clave}
              type="text"
              placeholder={campo.label}
              required={campo.requerido}
              value={form[campo.clave]}
              onChange={(e) => actualizarCampo(campo.clave, e.target.value)}
            />
          )
        })}

        <button type="submit" disabled={guardando}>{editandoId ? 'Guardar cambios' : 'Crear'}</button>
        {editandoId && <button type="button" onClick={cancelar}>Cancelar</button>}
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>id</th>
            {campos.map((c) => <th key={c.clave}>{c.label}</th>)}
            {columnasExtra.map((c) => <th key={c.label}>{c.label}</th>)}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.id}>
              <td>{fila.id}</td>
              {campos.map((c) => (
                <td key={c.clave}>{c.columna ? c.columna(fila) : String(fila[c.clave] ?? '')}</td>
              ))}
              {columnasExtra.map((c) => <td key={c.label}>{c.render(fila)}</td>)}
              <td>
                <button type="button" onClick={() => editarFila(fila)}>Editar</button>{' '}
                <button type="button" onClick={() => eliminarFila(fila.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
