import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import useEntidad from '../hooks/useEntidad'
import Flecha from '../../components/Flecha'
import PanelFocalizacionMeta from '../components/PanelFocalizacionMeta'
import PanelAsignacionesMeta from '../components/PanelAsignacionesMeta'
import { AvisoError, Cargando, Vacio } from '../../components/Estado'
import { accionesEstadoFocalizacion, fechaVisita } from '../../utils/estadoFocalizacion'
import TablaVisitas from '../components/TablaVisitas'
import PanelVisita from '../components/PanelVisita'
import Spinner from '../../components/Spinner'
import { avisar, confirmar } from '../../utils/dialogos'
import { descargarCsv } from '../../utils/csv'
import { formatearFecha, hoy } from '../../utils/formato'
import { IconoAlerta, IconoCalendario, IconoCheck, IconoReloj } from '../../components/Iconos'
import { idsDeLista, ordenDeProyecto } from '../../utils/proyectos'
import { coincideBusqueda } from '../../utils/texto'
import { PADRINO_SIN_ASIGNAR, coincidePadrinoFiltro } from '../../utils/padrino'
import { ejecutadoDe } from '../../utils/avance'
import { colorAvance, colorPorId } from '../../utils/colores'
import estilos from '../../components/TarjetaResumen.module.css'

// Gestiona toda la focalización (sedes preasignadas y visitas sin focalizar)
// sin tener que entrar a Convenios. Dos vistas conmutables:
//  - "Lista": tabla plana y densa de TODAS las visitas de todos los convenios,
//    con orden por columna, selección múltiple (asignar responsable en lote),
//    panel lateral por visita y exportar a CSV.
//  - "Por convenio": acordeón Convenio → Proyecto → Actividad (al abrir una
//    actividad se incrusta su panel completo, con "+ Agregar sede/visita").
// Los filtros (proyecto, padrino, estado, municipio, búsqueda, vencidas y
// actividad) son globales y aplican a ambas vistas; pueden llegar prellenados
// por la URL (?estado=&padrino=&vencidas=1&meta=&q=&orden=fecha), que es como
// enlaza Inicio. Las metas "Manual" no aparecen acá.
const SIN_ASIGNAR_LOTE = '__sin__'

export default function Visitas() {
  const proyectos = useEntidad('proyectos')
  const convenios = useEntidad('convenios')
  const aliados = useEntidad('aliados')
  const metas = useEntidad('metas')
  const focalizacion = useEntidad('focalizacion')
  const asignaciones = useEntidad('asignaciones_sin_focalizacion')
  const usuarios = useEntidad('usuarios')

  // Filtros globales.
  const [params] = useSearchParams()
  const [proyectoId, setProyectoId] = useState(params.get('proyecto') || '')
  const [padrinoId, setPadrinoId] = useState(params.get('padrino') || '')
  const [estado, setEstado] = useState(params.get('estado') || '')
  const [municipio, setMunicipio] = useState(params.get('municipio') || '')
  const [busqueda, setBusqueda] = useState(params.get('q') || '')
  const [metaId, setMetaId] = useState(params.get('meta') || '')
  const [soloVencidas, setSoloVencidas] = useState(params.get('vencidas') === '1')
  // Vista de página: 'todas' (lista plana global) o 'convenios' (acordeón).
  const [vista, setVista] = useState(params.get('vista') || 'todas')
  // Orden de la lista: por defecto lo abierto primero (pendientes, luego
  // programadas, luego realizadas); clic en un encabezado alterna asc/desc.
  const [orden, setOrden] = useState({ columna: params.get('orden') === 'fecha' ? 'fecha' : 'estado', asc: true })
  // Selección múltiple (ids como string), panel lateral y progreso del lote.
  const [seleccion, setSeleccion] = useState(new Set())
  const [abiertaId, setAbiertaId] = useState(null)
  const [padrinoLote, setPadrinoLote] = useState('')
  const [asignando, setAsignando] = useState(null)
  function ordenarPor(columna) {
    setOrden((o) => (o.columna === columna ? { columna, asc: !o.asc } : { columna, asc: true }))
  }
  const [convenioAbierto, setConvenioAbierto] = useState(null)
  const [proyectoAbierto, setProyectoAbierto] = useState(null)
  const [metaAbierta, setMetaAbierta] = useState(null)

  const cargando = proyectos.cargando || convenios.cargando || aliados.cargando || metas.cargando
    || focalizacion.cargando || asignaciones.cargando || usuarios.cargando
  if (cargando) return <Cargando />
  if (convenios.error) return <AvisoError>Error: {convenios.error}</AvisoError>

  // Padrinos y líderes: una visita se le puede asignar a cualquiera de los dos.
  const padrinos = usuarios.datos
    .filter((u) => (u.rol === 'padrino' || u.rol === 'lider') && String(u.activo).trim().toLowerCase() !== 'no')
    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''))
  const nombrePadrino = (id) => padrinos.find((p) => String(p.id) === String(id))?.nombre || ''
  const { programar, marcarRealizada, volverAPendiente } = accionesEstadoFocalizacion(focalizacion.editarItem)

  const metaPorId = Object.fromEntries(metas.datos.map((m) => [String(m.id), m]))
  const proyectoPorId = Object.fromEntries(proyectos.datos.map((p) => [String(p.id), p]))
  const convenioPorId = Object.fromEntries(convenios.datos.map((c) => [String(c.id), c]))
  const aliadoPorId = Object.fromEntries(aliados.datos.map((a) => [String(a.id), a]))

  const esFocalizable = (m) => m && (m.tipo === 'visita_focalizada' || m.tipo === 'visita_sin_focalizar')
  const hayFiltro = Boolean(proyectoId || padrinoId || estado || municipio || busqueda || metaId || soloVencidas)
  const hoyIso = hoy()

  // Municipios disponibles: los que aparecen en alguna visita de una meta
  // focalizable (para el filtro global).
  const municipiosDisponibles = Array.from(new Set(
    focalizacion.datos
      .filter((f) => esFocalizable(metaPorId[String(f.meta_id)]))
      .map((f) => f.municipio)
      .filter(Boolean),
  )).sort()

  // ¿Una visita pasa los filtros globales? (proyecto se evalúa por la meta).
  function visitaCoincide(f, meta, proyecto, convenio, aliado) {
    if (!coincidePadrinoFiltro(f.padrino_id, padrinoId)) return false
    if (estado && f.estado !== estado) return false
    if (municipio && f.municipio !== municipio) return false
    if (metaId && String(f.meta_id) !== metaId) return false
    if (soloVencidas && !(f.estado === 'programada' && fechaVisita(f) && fechaVisita(f) < hoyIso)) return false
    return coincideBusqueda(busqueda, proyecto?.nombre, meta?.descripcion, convenio?.nombre, aliado?.nombre,
      f.municipio, f.institucion, f.sede, nombrePadrino(f.padrino_id))
  }

  // ¿Una meta debe aparecer en el árbol? Sin filtros, todas (incluidas las
  // vacías, para poder agregarles la primera sede). Con filtros, solo si tiene
  // alguna visita que coincida — o, para sin-focalizar con cuota pero sin
  // visitas, si el padrino filtrado tiene cuota (y no se filtró por
  // estado/municipio, que no aplican a una cuota).
  function metaCoincideFiltros(meta, convenio) {
    if (!hayFiltro) return true
    const proyecto = proyectoPorId[String(meta.proyecto_id)]
    const aliado = convenio && aliadoPorId[String(convenio.aliado_id)]
    const hayVisita = focalizacion.datos.some((f) => String(f.meta_id) === String(meta.id)
      && visitaCoincide(f, meta, proyecto, convenio, aliado))
    if (hayVisita) return true
    const metaMatchBusqueda = coincideBusqueda(busqueda, proyecto?.nombre, meta.descripcion, convenio?.nombre, aliado?.nombre)
    if (padrinoId && !estado && !municipio && metaMatchBusqueda && meta.tipo === 'visita_sin_focalizar') {
      return asignaciones.datos.some((a) => String(a.meta_id) === String(meta.id)
        && String(a.padrino_id) === padrinoId)
    }
    return false
  }

  function metasFocalizablesDe(convenio, proyectoIdMeta) {
    return metas.datos.filter((m) => String(m.convenio_id) === String(convenio.id)
      && String(m.proyecto_id) === String(proyectoIdMeta)
      && esFocalizable(m)
      && metaCoincideFiltros(m, convenio))
  }

  // Proyectos de un convenio, en el orden fijo del catálogo, solo los que
  // tienen alguna actividad de focalización/sin-focalizar (tras filtros).
  function proyectosDelConvenio(convenio) {
    const idsDelConvenio = idsDeLista(convenio.proyectos_ids)
    return proyectos.datos
      .filter((p) => idsDelConvenio.includes(String(p.id)))
      .map((p) => ({ proyecto: p, metas: metasFocalizablesDe(convenio, p.id) }))
      .filter(({ metas: metasDelProyecto }) => metasDelProyecto.length > 0)
  }

  const conveniosFiltrados = proyectoId
    ? convenios.datos.filter((c) => idsDeLista(c.proyectos_ids).includes(proyectoId))
    : convenios.datos
  const conveniosConProyectos = conveniosFiltrados
    .map((c) => ({
      convenio: c,
      proyectos: proyectosDelConvenio(c).filter(({ proyecto }) => !proyectoId || String(proyecto.id) === proyectoId),
    }))
    .filter(({ proyectos: proyectosDelC }) => proyectosDelC.length > 0)

  // Todas las visitas de todos los convenios en una lista plana, tras filtros,
  // ordenadas por aliado → convenio → proyecto (orden fijo) → actividad → municipio.
  function contextoVisita(f) {
    const meta = metaPorId[String(f.meta_id)]
    if (!esFocalizable(meta)) return null
    const convenio = convenioPorId[String(meta.convenio_id)]
    const proyecto = proyectoPorId[String(meta.proyecto_id)]
    const aliado = convenio && aliadoPorId[String(convenio.aliado_id)]
    return { foc: f, meta, proyecto, convenio, aliado }
  }

  // Valor por el que ordena cada columna de la lista ('' = sin dato → al final).
  const ORDEN_ESTADO = { pendiente: 0, programada: 1, realizada: 2 }
  const claveOrden = {
    fecha: (v) => fechaVisita(v.foc),
    estado: (v) => ORDEN_ESTADO[v.foc.estado] ?? 9,
    municipio: (v) => (v.foc.municipio || '').toLowerCase(),
    padrino: (v) => nombrePadrino(v.foc.padrino_id).toLowerCase(),
  }

  function todasLasVisitas() {
    return focalizacion.datos
      .map(contextoVisita)
      .filter(Boolean)
      .filter(({ foc, meta, proyecto, convenio, aliado }) =>
        (!proyectoId || String(meta.proyecto_id) === proyectoId)
        && visitaCoincide(foc, meta, proyecto, convenio, aliado))
      .sort((a, b) => {
        if (orden.columna) {
          const ka = claveOrden[orden.columna](a)
          const kb = claveOrden[orden.columna](b)
          if (ka !== kb) {
            // Sin dato (sin fecha, sin padrino) siempre al final, sea asc o desc.
            if (ka === '' || kb === '') return ka === '' ? 1 : -1
            const c = typeof ka === 'number' ? ka - kb : String(ka).localeCompare(String(kb))
            return orden.asc ? c : -c
          }
        }
        // Desempate: por fecha (lo más próximo primero) y luego jerarquía fija.
        const fa = fechaVisita(a.foc)
        const fb = fechaVisita(b.foc)
        if (fa !== fb) return fa === '' ? 1 : fb === '' ? -1 : fa.localeCompare(fb)
        const al = (a.aliado?.nombre || '').localeCompare(b.aliado?.nombre || '')
        if (al !== 0) return al
        const cn = (a.convenio?.nombre || '').localeCompare(b.convenio?.nombre || '')
        if (cn !== 0) return cn
        const oa = ordenDeProyecto(a.meta?.proyecto_id, proyectos.datos)
        const ob = ordenDeProyecto(b.meta?.proyecto_id, proyectos.datos)
        if (oa !== ob) return oa - ob
        const md = (a.meta?.descripcion || '').localeCompare(b.meta?.descripcion || '')
        if (md !== 0) return md
        return (a.foc.municipio || '').localeCompare(b.foc.municipio || '')
      })
  }

  function abrirConvenio(id) {
    setConvenioAbierto((actual) => (actual === id ? null : id))
    setProyectoAbierto(null)
    setMetaAbierta(null)
  }

  function abrirProyecto(id) {
    setProyectoAbierto((actual) => (actual === id ? null : id))
    setMetaAbierta(null)
  }

  const visitasTodas = vista === 'todas' ? todasLasVisitas() : []
  const idsSeleccionados = visitasTodas.filter(({ foc }) => seleccion.has(String(foc.id))).map(({ foc }) => foc.id)
  const visitaAbierta = abiertaId != null ? contextoVisita(focalizacion.datos.find((f) => String(f.id) === String(abiertaId)) || {}) : null
  const reasignar = (id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })

  async function asignarLote() {
    const realizadas = focalizacion.datos.filter((f) => idsSeleccionados.includes(f.id) && f.estado === 'realizada').length
    if (realizadas && !(await confirmar(
      `${realizadas} de las visitas seleccionadas ya están realizadas: cambiar su responsable altera quién figura como autor de esas visitas. ¿Continuar?`,
      { textoConfirmar: 'Continuar' },
    ))) return
    setAsignando({ hechos: 0, total: idsSeleccionados.length })
    try {
      await focalizacion.editarItems(idsSeleccionados, { padrino_id: padrinoLote === SIN_ASIGNAR_LOTE ? '' : padrinoLote },
        (hechos, total) => setAsignando({ hechos, total }))
      setSeleccion(new Set())
      setPadrinoLote('')
    } catch (err) {
      await avisar(`No se pudieron asignar todas las visitas (${err.message}). Las que alcanzaron a guardarse ya quedaron asignadas.`)
    } finally {
      setAsignando(null)
    }
  }

  function exportarCsv() {
    descargarCsv('visitas', [
      { titulo: 'Convenio', valor: (v) => v.convenio?.nombre },
      { titulo: 'Aliado', valor: (v) => v.aliado?.nombre },
      { titulo: 'Proyecto', valor: (v) => v.proyecto?.nombre },
      { titulo: 'Actividad', valor: (v) => v.meta?.descripcion },
      { titulo: 'Municipio', valor: (v) => v.foc.municipio },
      { titulo: 'Institución', valor: (v) => v.foc.institucion },
      { titulo: 'Sede', valor: (v) => v.foc.sede },
      { titulo: 'Responsable', valor: (v) => nombrePadrino(v.foc.padrino_id) || 'Sin asignar' },
      { titulo: 'Estado', valor: (v) => v.foc.estado },
      { titulo: 'Fecha programada', valor: (v) => formatearFecha(v.foc.fecha_programada) },
      { titulo: 'Fecha realizada', valor: (v) => formatearFecha(v.foc.fecha_realizada) },
    ], todasLasVisitas())
  }


  // Pestañas de estado: conteos sobre TODAS las visitas (no sobre el filtro
  // actual) para que sirvan de atajo; al hacer clic fijan el filtro.
  const baseTabs = focalizacion.datos.filter((f) => esFocalizable(metaPorId[String(f.meta_id)]))
  const venc = (f) => f.estado === 'programada' && fechaVisita(f) && fechaVisita(f) < hoyIso
  const fijar = (est, vencidas = false, padrino = '') => { setEstado(est); setSoloVencidas(vencidas); setPadrinoId(padrino) }
  const tabs = [
    { clave: 'todas', etq: 'Todas', n: baseTabs.length, tono: 'neutro', activa: !estado && !soloVencidas && !padrinoId, ir: () => fijar('') },
    { clave: 'pend', etq: 'Pendientes', n: baseTabs.filter((f) => f.estado === 'pendiente').length, tono: 'pend', Icono: IconoReloj, activa: estado === 'pendiente' && !soloVencidas, ir: () => fijar('pendiente') },
    { clave: 'prog', etq: 'Programadas', n: baseTabs.filter((f) => f.estado === 'programada').length, tono: 'prog', Icono: IconoCalendario, activa: estado === 'programada' && !soloVencidas, ir: () => fijar('programada') },
    { clave: 'real', etq: 'Realizadas', n: baseTabs.filter((f) => f.estado === 'realizada').length, tono: 'ok', Icono: IconoCheck, activa: estado === 'realizada', ir: () => fijar('realizada') },
    { clave: 'venc', etq: 'Vencidas', n: baseTabs.filter(venc).length, tono: 'alto', Icono: IconoAlerta, activa: soloVencidas, ir: () => fijar('programada', true) },
    { clave: 'sin', etq: 'Sin responsable', n: baseTabs.filter((f) => !String(f.padrino_id ?? '').trim()).length, tono: 'medio', Icono: IconoAlerta, activa: padrinoId === PADRINO_SIN_ASIGNAR && !estado, ir: () => fijar('', false, PADRINO_SIN_ASIGNAR) },
  ]

  return (
    <section className="vista">
      <div className="adm-cabecera">
        <div>
          <h2>Visitas</h2>
          <p className="adm-sub">Todas las visitas de focalización y sin focalizar: filtra, ordena y gestiona.</p>
        </div>
        <div className="adm-acciones">
          <button type="button" onClick={exportarCsv}>Exportar CSV</button>
        </div>
      </div>

      <div className="tabs-estado" role="tablist" aria-label="Filtrar por estado">
        {tabs.map(({ clave, etq, n, tono, Icono, activa, ir }) => (
          <button key={clave} type="button" role="tab" aria-selected={activa} className={`tab-estado tab-estado--${tono}${activa ? ' activa' : ''}`} onClick={ir}>
            {Icono && <Icono tamano={16} />}
            <strong>{n}</strong>
            <span>{etq}</span>
          </button>
        ))}
      </div>

      <div className="barra-filtros">
        <span className="barra-filtros__titulo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filtros
        </span>
        <select className={proyectoId ? 'activo' : ''} value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          <option value="">Todos los proyectos</option>
          {proyectos.datos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select className={padrinoId ? 'activo' : ''} value={padrinoId} onChange={(e) => setPadrinoId(e.target.value)}>
          <option value="">Todos los padrinos</option>
          <option value={PADRINO_SIN_ASIGNAR}>Sin asignar</option>
          {padrinos.map((p) => (
            <option key={p.id} value={String(p.id)}>{p.nombre}</option>
          ))}
        </select>
        <select className={estado ? 'activo' : ''} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="programada">Programada</option>
          <option value="realizada">Realizada</option>
        </select>
        <select className={municipio ? 'activo' : ''} value={municipio} onChange={(e) => setMunicipio(e.target.value)}>
          <option value="">Todos los municipios</option>
          {municipiosDisponibles.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar convenio, actividad, sede, padrino…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <button type="button" className={`btn-toggle${soloVencidas ? ' activo' : ''}`} onClick={() => setSoloVencidas((v) => !v)} title="Programadas cuya fecha ya pasó">
          Vencidas
        </button>
        {metaId && (
          <button type="button" className="btn-toggle activo" onClick={() => setMetaId('')} title="Quitar el filtro de actividad">
            Actividad: {metaPorId[metaId]?.descripcion || metaId} ✕
          </button>
        )}
        {hayFiltro && (
          <button type="button" className="btn-limpiar" onClick={() => { setProyectoId(''); setPadrinoId(''); setEstado(''); setMunicipio(''); setBusqueda(''); setMetaId(''); setSoloVencidas(false) }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="conmutador-vista">
        <button
          type="button"
          className={vista === 'todas' ? 'btn-primario' : ''}
          onClick={() => setVista('todas')}
        >
          Lista
        </button>
        <button
          type="button"
          className={vista === 'convenios' ? 'btn-primario' : ''}
          onClick={() => setVista('convenios')}
        >
          Por convenio
        </button>
      </div>

      {vista === 'todas' ? (
        <>
          <p className="conteo-visitas">Mostrando <b>{visitasTodas.length}</b> visita{visitasTodas.length === 1 ? '' : 's'}{hayFiltro ? ' con los filtros aplicados' : ''}</p>
          {visitasTodas.length === 0 ? (
            <Vacio>No hay visitas{hayFiltro ? ' que coincidan con los filtros' : ''}.</Vacio>
          ) : (
            <>
              {idsSeleccionados.length > 0 && (
                <div className="barra-seleccion">
                  <span>{idsSeleccionados.length} seleccionada(s)</span>
                  {asignando ? (
                    <Spinner texto={`Asignando ${asignando.hechos} de ${asignando.total}…`} />
                  ) : (
                    <>
                      <select value={padrinoLote} onChange={(e) => setPadrinoLote(e.target.value)}>
                        <option value="">Asignar a…</option>
                        <option value={SIN_ASIGNAR_LOTE}>Sin asignar</option>
                        {padrinos.map((p) => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
                      </select>
                      <button type="button" className="btn-primario" disabled={!padrinoLote} onClick={asignarLote}>Aplicar</button>
                      <button type="button" className="btn-limpiar-sel" onClick={() => setSeleccion(new Set())}>Quitar selección</button>
                    </>
                  )}
                </div>
              )}
              <TablaVisitas
                filas={visitasTodas}
                orden={orden}
                onOrdenar={ordenarPor}
                seleccion={seleccion}
                onSeleccion={setSeleccion}
                onAbrir={setAbiertaId}
                nombrePadrino={nombrePadrino}
              />
            </>
          )}
        </>
      ) : conveniosConProyectos.length === 0 ? (
        <Vacio>
          No hay convenios con metas de focalización o visitas sin focalizar{hayFiltro ? ' que coincidan con los filtros' : ''}.
        </Vacio>
      ) : (
        <div className="tabla-envoltura">
          <table className="tabla">
            <thead>
              <tr>
                <th className="celda-flecha"></th>
                <th>Aliado</th>
                <th>Convenio</th>
              </tr>
            </thead>
            <tbody>
              {conveniosConProyectos.map(({ convenio, proyectos: proyectosDelConvenioActual }) => {
                const convenioEstaAbierto = convenioAbierto === convenio.id
                const aliado = aliados.datos.find((a) => String(a.id) === String(convenio.aliado_id))

                return (
                  <Fragment key={convenio.id}>
                    <tr
                      className={`fila-expandible${convenioEstaAbierto ? ' fila-abierta' : ''}`}
                      onClick={() => abrirConvenio(convenio.id)}
                    >
                      <td className="celda-flecha"><Flecha abierta={convenioEstaAbierto} /></td>
                      <td>{aliado?.nombre || '—'}</td>
                      <td>{convenio.nombre}</td>
                    </tr>
                    {convenioEstaAbierto && (
                      <tr className="fila-panel">
                        <td colSpan={3}>
                          <div className="panel-acordeon">
                            <div className="lista-proyectos">
                              {proyectosDelConvenioActual.map(({ proyecto, metas: metasDelProyecto }) => {
                                const proyectoEstaAbierto = proyectoAbierto === proyecto.id

                                return (
                                  <div key={proyecto.id}>
                                    <div
                                      className={`fila-proyecto${proyectoEstaAbierto ? ' abierta' : ''}`}
                                      style={{ '--acento': colorPorId(proyecto.id) }}
                                      onClick={() => abrirProyecto(proyecto.id)}
                                    >
                                      <Flecha abierta={proyectoEstaAbierto} />
                                      {proyecto.nombre}
                                    </div>
                                    {proyectoEstaAbierto && (
                                      <div className="panel-acordeon">
                                        <div className="tabla-envoltura">
                                          <table className="tabla">
                                            <thead>
                                              <tr>
                                                <th className="celda-flecha"></th>
                                                <th>Actividad</th>
                                                <th className="numero">Meta</th>
                                                <th>Avance</th>
                                                <th className="numero">Faltante</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {metasDelProyecto.map((meta) => {
                                                const metaEstaAbierta = metaAbierta === meta.id
                                                const metaNum = Number(meta.cantidad_meta) || 0
                                                const ejecutado = ejecutadoDe(meta, focalizacion.datos, [])
                                                const pct = metaNum > 0 ? Math.round((ejecutado / metaNum) * 100) : 0
                                                const faltante = Math.max(metaNum - ejecutado, 0)

                                                return (
                                                  <Fragment key={meta.id}>
                                                    <tr
                                                      className={`fila-expandible${metaEstaAbierta ? ' fila-abierta' : ''}`}
                                                      onClick={() => setMetaAbierta((actual) => (actual === meta.id ? null : meta.id))}
                                                    >
                                                      <td className="celda-flecha"><Flecha abierta={metaEstaAbierta} /></td>
                                                      <td>{meta.descripcion}</td>
                                                      <td className="numero">{metaNum}</td>
                                                      <td>
                                                        <div className={estilos.avanceCelda}>
                                                          <div className={estilos.track}>
                                                            <div
                                                              className={estilos.fill}
                                                              style={{ width: `${Math.min(pct, 100)}%`, background: colorAvance(pct) }}
                                                            />
                                                          </div>
                                                          <span className={estilos.pct}>{ejecutado} · {pct}%</span>
                                                        </div>
                                                      </td>
                                                      <td className="numero">{faltante}</td>
                                                    </tr>
                                                    {metaEstaAbierta && (
                                                      <tr className="fila-panel">
                                                        <td colSpan={5}>
                                                          <div className="panel-acordeon">
                                                            {meta.tipo === 'visita_focalizada' ? (
                                                              <PanelFocalizacionMeta
                                                                compacta
                                                                filtroPadrino={padrinoId}
                                                                filtroEstado={estado}
                                                                meta={meta}
                                                                items={focalizacion.datos.filter((f) => String(f.meta_id) === String(meta.id))}
                                                                padrinos={padrinos}
                                                                onCrear={focalizacion.crearItem}
                                                                onReasignar={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
                                                                onProgramar={programar}
                                                                onMarcarRealizada={marcarRealizada}
                                                                onVolverPendiente={volverAPendiente}
                                                                onEliminar={focalizacion.eliminarItem}
                                                              />
                                                            ) : (
                                                              <PanelAsignacionesMeta
                                                                compacta
                                                                filtroPadrino={padrinoId}
                                                                filtroEstado={estado}
                                                                meta={meta}
                                                                asignaciones={asignaciones.datos.filter((a) => String(a.meta_id) === String(meta.id))}
                                                                visitas={focalizacion.datos.filter((f) => String(f.meta_id) === String(meta.id))}
                                                                padrinos={padrinos}
                                                                onAsignarPadrino={asignaciones.crearItem}
                                                                onGuardarAsignacion={asignaciones.editarItem}
                                                                onEliminarAsignacion={asignaciones.eliminarItem}
                                                                onRegistrarVisita={focalizacion.crearItem}
                                                                onReasignarVisita={(id, nuevoPadrinoId) => focalizacion.editarItem(id, { padrino_id: nuevoPadrinoId })}
                                                                onProgramarVisita={programar}
                                                                onMarcarRealizadaVisita={marcarRealizada}
                                                                onVolverPendienteVisita={volverAPendiente}
                                                                onEliminarVisita={focalizacion.eliminarItem}
                                                              />
                                                            )}
                                                          </div>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </Fragment>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {visitaAbierta && (
        <PanelVisita
          visita={visitaAbierta}
          padrinos={padrinos}
          onReasignar={reasignar}
          onProgramar={programar}
          onMarcarRealizada={marcarRealizada}
          onVolverPendiente={volverAPendiente}
          onEliminar={focalizacion.eliminarItem}
          onCerrar={() => setAbiertaId(null)}
        />
      )}
    </section>
  )
}
