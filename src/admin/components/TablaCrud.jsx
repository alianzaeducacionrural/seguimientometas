import { useState } from 'react'
import { formatearFecha, soloFecha } from '../../utils/formato'
import { AvisoError } from '../../components/Estado'
import Modal from '../../components/Modal'
import Flecha from '../../components/Flecha'

const VACIO_POR_TIPO = { text: '', date: '', number: '', select: '', multiselect: [] }

function valorInicial(campos, fila) {
  const form = {}
  campos.forEach((campo) => {
    if (!fila) {
      form[campo.clave] = VACIO_POR_TIPO[campo.tipo]
      return
    }
    const crudo = fila[campo.clave] ?? ''
    if (campo.tipo === 'multiselect') {
      form[campo.clave] = String(crudo).split(',').map((v) => v.trim()).filter(Boolean)
    } else if (campo.tipo === 'date') {
      form[campo.clave] = soloFecha(crudo)
    } else {
      form[campo.clave] = crudo
    }
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

// Tabla + modal de alta/edición genéricos para las entidades de catálogo
// (proyectos, aliados, usuarios, convenios, metas): mismo patrón de
// listar/crear/editar/eliminar, solo cambian los campos y columnas.
// - `panelFila(fila)`: vuelve las filas expandibles tipo acordeón — clic en
//   cualquier parte de la fila (excepto botones/controles) despliega el
//   panel debajo (actividades de un proyecto, metas de un convenio…).
// - `compacta`: versión para anidar dentro de un acordeón (título h3, sin
//   sección de vista propia).
export default function TablaCrud({
  titulo,
  descripcion,
  etiquetaNueva = 'Nuevo registro',
  accionesExtra,
  campos,
  columnasExtra = [],
  filas,
  onCrear,
  onEditar,
  onEliminar,
  panelFila,
  compacta = false,
}) {
  // editandoId === null → modal cerrado; 'nuevo' → alta; id → edición.
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(() => valorInicial(campos, null))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [abiertaId, setAbiertaId] = useState(null)

  const modalAbierto = editandoId !== null
  const totalColumnas = campos.length + columnasExtra.length + 1 + (panelFila ? 1 : 0)

  function abrirNuevo() {
    setEditandoId('nuevo')
    setForm(valorInicial(campos, null))
    setError(null)
  }

  function editarFila(fila) {
    setEditandoId(fila.id)
    setForm(valorInicial(campos, fila))
    setError(null)
  }

  function cerrar() {
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
      if (editandoId !== 'nuevo') {
        await onEditar(editandoId, datos)
      } else {
        await onCrear(datos)
      }
      cerrar()
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

  // `extra` permite que un campo auto-llene otros al cambiar (campo.alCambiar),
  // p.ej. elegir un padrino del catálogo rellena su correo.
  function actualizarCampo(clave, valor, extra) {
    setForm((f) => ({ ...f, [clave]: valor, ...(extra || {}) }))
  }

  // El acordeón se abre al hacer clic en cualquier parte de la fila,
  // excepto sobre controles interactivos (botones, enlaces, selects…).
  function clicFila(e, fila) {
    if (!panelFila) return
    if (e.target.closest('button, a, input, select, label, textarea')) return
    setAbiertaId((actual) => (String(actual) === String(fila.id) ? null : fila.id))
  }

  const barra = (
    <div className={compacta ? 'crud-compacta-barra' : 'barra-vista'}>
      <div>
        {compacta ? <h3>{titulo}</h3> : <h2>{titulo}</h2>}
        {descripcion && <p className="vista-descripcion">{descripcion}</p>}
      </div>
      <div className="barra-vista-acciones">
        {accionesExtra}
        <button type="button" className="btn-primario" onClick={abrirNuevo}>
          + {etiquetaNueva}
        </button>
      </div>
    </div>
  )

  const contenido = (
    <>
      {barra}

      {error && !modalAbierto && <AvisoError>{error}</AvisoError>}

      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              {panelFila && <th className="celda-flecha"></th>}
              {campos.map((c) => <th key={c.clave}>{c.label}</th>)}
              {columnasExtra.map((c) => <th key={c.label}>{c.label}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr>
                <td colSpan={totalColumnas} style={{ textAlign: 'center', color: 'var(--tinta-3)', padding: '1.5rem' }}>
                  Sin registros todavía — crea el primero con el botón «+ {etiquetaNueva}».
                </td>
              </tr>
            )}
            {filas.map((fila) => {
              const abierta = panelFila && String(abiertaId) === String(fila.id)
              return (
                <FilaConPanel key={fila.id} abierta={abierta} panel={abierta ? panelFila(fila) : null} totalColumnas={totalColumnas}>
                  <tr
                    className={[
                      String(editandoId) === String(fila.id) ? 'fila-editando' : '',
                      panelFila ? 'fila-expandible' : '',
                      abierta ? 'fila-abierta' : '',
                    ].filter(Boolean).join(' ') || undefined}
                    onClick={(e) => clicFila(e, fila)}
                  >
                    {panelFila && (
                      <td className="celda-flecha"><Flecha abierta={abierta} /></td>
                    )}
                    {campos.map((c) => (
                      <td key={c.clave}>
                        {c.columna ? c.columna(fila) : c.tipo === 'date' ? formatearFecha(fila[c.clave]) : String(fila[c.clave] ?? '')}
                      </td>
                    ))}
                    {columnasExtra.map((c) => <td key={c.label}>{c.render(fila)}</td>)}
                    <td className="celda-acciones">
                      <button type="button" onClick={() => editarFila(fila)}>Editar</button>{' '}
                      <button type="button" className="btn-peligro" onClick={() => eliminarFila(fila.id)}>Eliminar</button>
                    </td>
                  </tr>
                </FilaConPanel>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={cerrar}
        titulo={editandoId !== 'nuevo' ? `Editar: ${titulo}` : etiquetaNueva}
      >
        <form onSubmit={enviar} className="formulario-modal">
          {campos.map((campo) => {
            if (campo.mostrarSi && !campo.mostrarSi(form)) return null

            // Un campo de texto puede volverse select cuando hay catálogo
            // disponible (campo.opcionesSi(form) devuelve las opciones o null).
            const opcionesDinamicas = campo.opcionesSi ? campo.opcionesSi(form) : null

            if (campo.tipo === 'select' || opcionesDinamicas) {
              let opciones = opcionesDinamicas || campo.opciones
              // Si el valor ya guardado no está en las opciones (registro
              // viejo, catálogo cambió), se muestra igual para no perderlo.
              const valorActual = form[campo.clave]
              if (valorActual && !opciones.some((op) => String(op.value) === String(valorActual))) {
                opciones = [...opciones, { value: valorActual, label: `${valorActual} (fuera del catálogo)` }]
              }
              return (
                <label key={campo.clave} className="campo">
                  <span>{campo.label}</span>
                  <select
                    value={form[campo.clave]}
                    required={campo.requerido}
                    onChange={(e) => actualizarCampo(
                      campo.clave,
                      e.target.value,
                      campo.alCambiar ? campo.alCambiar(e.target.value) : undefined
                    )}
                  >
                    <option value="">Seleccionar…</option>
                    {opciones.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </label>
              )
            }

            if (campo.tipo === 'multiselect') {
              return (
                <div key={campo.clave} className="campo">
                  <span>{campo.label}</span>
                  <div className="chips">
                    {campo.opciones.length === 0 && <span className="insignia insignia-neutra">Sin opciones aún</span>}
                    {campo.opciones.map((op) => {
                      const activo = form[campo.clave].includes(op.value)
                      return (
                        <label key={op.value} className={`chip${activo ? ' activo' : ''}`}>
                          <input
                            type="checkbox"
                            checked={activo}
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
                      )
                    })}
                  </div>
                </div>
              )
            }

            return (
              <label key={campo.clave} className="campo">
                <span>{campo.label}</span>
                <input
                  type={campo.tipo === 'date' || campo.tipo === 'number' ? campo.tipo : 'text'}
                  placeholder={campo.label}
                  required={campo.requerido}
                  value={form[campo.clave]}
                  onChange={(e) => actualizarCampo(campo.clave, e.target.value)}
                />
              </label>
            )
          })}

          {error && <AvisoError>{error}</AvisoError>}

          <div className="modal-pie">
            <button type="button" onClick={cerrar}>Cancelar</button>
            <button type="submit" className="btn-primario" disabled={guardando}>
              {guardando ? 'Guardando…' : editandoId !== 'nuevo' ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )

  if (compacta) return <div className="crud-compacta">{contenido}</div>
  return <section className="vista">{contenido}</section>
}

// Fila + su panel de acordeón (fila extra a todo lo ancho justo debajo).
function FilaConPanel({ children, abierta, panel, totalColumnas }) {
  return (
    <>
      {children}
      {abierta && (
        <tr className="fila-panel">
          <td colSpan={totalColumnas}>
            <div className="panel-acordeon">{panel}</div>
          </td>
        </tr>
      )}
    </>
  )
}
