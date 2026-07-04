import { useState } from 'react'
import useEntidad from '../hooks/useEntidad'
import useCatalogoPadrinos from '../hooks/useCatalogoPadrinos'
import TablaCrud from '../components/TablaCrud'
import EnlaceMagico from '../components/EnlaceMagico'
import { importarPadrinos } from '../utils/api'
import { AvisoError, Cargando } from '../../components/Estado'
import Avatar from '../../components/Avatar'

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
      opcionesSi: (form) =>
        form.rol === 'padrino' && catalogo.padrinos.length > 0
          ? catalogo.padrinos.map((p) => ({ value: p.nombre, label: p.nombre }))
          : null,
      alCambiar: (nombre) => {
        const padrino = catalogo.padrinos.find((p) => p.nombre === nombre)
        return padrino ? { correo: padrino.correo } : {}
      },
      columna: (fila) => (
        <span className="celda-persona">
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
      columna: (fila) => String(fila.proyectos_ids)
        .split(',')
        .map((id) => proyectos.datos.find((p) => String(p.id) === id.trim())?.nombre)
        .filter(Boolean)
        .join(', '),
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
        ]}
        filas={usuarios.datos}
        onCrear={usuarios.crearItem}
        onEditar={usuarios.editarItem}
        onEliminar={usuarios.eliminarItem}
      />
    </>
  )
}
