import { useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import useCatalogoPadrinos from '../hooks/useCatalogoPadrinos'
import TablaCrud from '../components/TablaCrud'
import EnlaceMagico from '../components/EnlaceMagico'
import { importarPadrinos, inhabilitarUsuario } from '../utils/api'
import { AvisoError, Cargando } from '../../components/Estado'
import Avatar from '../../components/Avatar'
import { nombresProyectosDe } from '../../utils/proyectos'

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'lider', label: 'Líder' },
  { value: 'padrino', label: 'Padrino' },
]

export default function Usuarios() {
  const usuarios = useEntidad('usuarios')
  const proyectos = useEntidad('proyectos')
  // Los padrinos no se digitan: se eligen del catálogo externo (pestaña de
  // padrinos del archivo Mun/IE/Sedes) y el correo se llena solo. Si el
  // catálogo falla o viene vacío, el campo vuelve a ser texto libre.
  const catalogo = useCatalogoPadrinos()

  const [importando, setImportando] = useState(false)
  const [resultadoImport, setResultadoImport] = useState(null)

  const estaInactivo = (u) => String(u.activo).trim().toLowerCase() === 'no'

  async function inhabilitar(u) {
    if (!confirm(`¿Inhabilitar a ${u.nombre}? Sus visitas asignadas quedarán "sin asignar".`)) return
    setResultadoImport(null)
    try {
      const r = await inhabilitarUsuario(u.id)
      await usuarios.recargar()
      const partes = []
      if (r.reasignadas) partes.push(`${r.reasignadas} visita(s) quedaron sin asignar`)
      if (r.conservadas) partes.push(`${r.conservadas} realizada(s) se conservaron`)
      setResultadoImport(`${u.nombre} quedó inhabilitado${partes.length ? ` — ${partes.join('; ')}` : ''}.`)
    } catch (err) {
      setResultadoImport(`Error: ${err.message}`)
    }
  }

  async function habilitar(u) {
    setResultadoImport(null)
    try {
      await usuarios.editarItem(u.id, { activo: 'si' })
      setResultadoImport(`${u.nombre} quedó habilitado de nuevo.`)
    } catch (err) {
      setResultadoImport(`Error: ${err.message}`)
    }
  }

  if (usuarios.cargando || proyectos.cargando || catalogo.cargando) return <Cargando />
  if (usuarios.error) return <AvisoError>Error: {usuarios.error}</AvisoError>
  if (proyectos.error) return <AvisoError>Error: {proyectos.error}</AvisoError>

  async function importarDelCatalogo() {
    setImportando(true)
    setResultadoImport(null)
    try {
      const r = await importarPadrinos()
      await usuarios.recargar()
      setResultadoImport(
        r.creados > 0
          ? `Se crearon ${r.creados} padrino(s) del catálogo${r.omitidos > 0 ? ` (${r.omitidos} ya existían)` : ''}.`
          : 'Todos los padrinos del catálogo ya estaban creados.'
      )
    } catch (err) {
      setResultadoImport(`Error importando: ${err.message}`)
    } finally {
      setImportando(false)
    }
  }

  const campos = [
    { clave: 'rol', label: 'Rol', tipo: 'select', opciones: ROLES, requerido: true },
    {
      clave: 'nombre',
      label: 'Nombre',
      tipo: 'text',
      requerido: true,
      // Texto libre (permite crear a mano) con sugerencias del catálogo de
      // padrinos: se puede elegir uno o escribir uno nuevo.
      sugerencias: (form) =>
        form.rol === 'padrino' && catalogo.padrinos.length > 0
          ? catalogo.padrinos.map((p) => ({ value: p.nombre }))
          : null,
      alCambiar: (nombre) => {
        const padrino = catalogo.padrinos.find((p) => p.nombre === nombre)
        return padrino ? { correo: padrino.correo } : {}
      },
      columna: (fila) => (
        <span className="celda-persona" style={estaInactivo(fila) ? { opacity: 0.5 } : undefined}>
          <Avatar id={fila.id} nombre={fila.nombre} tamano={28} />
          {fila.nombre}
        </span>
      ),
    },
    { clave: 'correo', label: 'Correo', tipo: 'text', requerido: true },
    {
      clave: 'proyectos_ids',
      label: 'Proyectos asociados',
      tipo: 'multiselect',
      opciones: proyectos.datos.map((p) => ({ value: String(p.id), label: p.nombre })),
      mostrarSi: (form) => form.rol === 'lider',
      columna: (fila) => nombresProyectosDe(fila.proyectos_ids, proyectos.datos).join(', '),
    },
  ]

  return (
    <>
      {catalogo.error && (
        <AvisoError>
          No se pudo cargar el catálogo de padrinos ({catalogo.error}) — el nombre y el correo se pueden digitar manualmente.
        </AvisoError>
      )}
      {resultadoImport && (
        <p className={resultadoImport.startsWith('Error') ? 'aviso-error' : 'insignia insignia-realizada'} style={{ marginBottom: '1rem' }}>
          {resultadoImport}
        </p>
      )}
      <TablaCrud
        titulo="Usuarios"
        etiquetaNueva="Nuevo usuario"
        accionesExtra={
          <button type="button" onClick={importarDelCatalogo} disabled={importando || catalogo.padrinos.length === 0}>
            {importando ? 'Importando…' : 'Importar padrinos del catálogo'}
          </button>
        }
        campos={campos}
        columnasExtra={[
          { label: 'Enlace', render: (fila) => <EnlaceMagico rol={fila.rol} token={fila.token} /> },
          {
            label: 'Estado',
            render: (fila) => (estaInactivo(fila) ? (
              <span className="celda-acciones">
                <span className="insignia insignia-neutra">Inhabilitado</span>{' '}
                <button type="button" onClick={() => habilitar(fila)}>Habilitar</button>
              </span>
            ) : (
              <button type="button" className="btn-peligro" onClick={() => inhabilitar(fila)}>Inhabilitar</button>
            )),
          },
        ]}
        filas={usuarios.datos}
        onCrear={usuarios.crearItem}
        onEditar={usuarios.editarItem}
        onEliminar={usuarios.eliminarItem}
      />
    </>
  )
}
