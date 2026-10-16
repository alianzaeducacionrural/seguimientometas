import { useEffect, useState } from 'react'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import AccionesVisita from './AccionesVisita'
import SelectorPadrino from './SelectorPadrino'
import { colorPorId } from '../../utils/colores'

// Panel lateral con todo lo que se puede hacer sobre UNA visita (cambiar el
// responsable, programar/reprogramar, marcar realizada, corregir, eliminar).
// Reemplaza a la celda de acciones inline de la tabla, que no cabía sin
// desbordar. Se cierra con Escape, clic afuera o la ×; si la visita se
// elimina, quien lo usa lo desmonta (la visita ya no existe).
export default function PanelVisita({ visita, padrinos, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente, onEliminar, onCerrar }) {
  const { foc, meta, proyecto, convenio, aliado } = visita
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const alTeclear = (e) => {
      // Si hay un diálogo de confirmación encima, Escape es para él.
      if (e.key === 'Escape' && !document.querySelector('.modal-fondo')) onCerrar()
    }
    document.addEventListener('keydown', alTeclear)
    return () => document.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <>
      <div className="panel-lateral-fondo" onMouseDown={onCerrar} />
      <aside className="panel-lateral" role="dialog" aria-label="Detalle de la visita">
        <header className="panel-lateral__cab">
          <div>
            <h3>{foc.municipio}</h3>
            <small>{[foc.institucion, foc.sede].filter(Boolean).join(' · ')}</small>
          </div>
          <button type="button" className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">×</button>
        </header>

        <div className="panel-lateral__cuerpo">
          <div className="panel-lateral__bloque">
            <span className="etiqueta">Estado</span>
            <EstadoFocalizacion estado={foc.estado} />
          </div>

          <div className="panel-lateral__bloque">
            <span className="etiqueta">Convenio</span>
            <div>{convenio?.nombre || '—'}</div>
            <small className="celda-ubicacion-sub">{aliado?.nombre || ''}</small>
          </div>

          <div className="panel-lateral__bloque">
            <span className="etiqueta">Proyecto y actividad</span>
            <span className="etiqueta-proyecto" style={{ '--acento': colorPorId(proyecto?.id) }}>{proyecto?.nombre || '—'}</span>
            <div className="celda-ubicacion-sub">{meta?.descripcion || ''}</div>
          </div>

          <div className="panel-lateral__bloque">
            <span className="etiqueta">Responsable</span>
            <SelectorPadrino item={foc} padrinos={padrinos} onReasignar={onReasignar} disabled={ocupado} onOcupado={setOcupado} />
          </div>

          <div className="panel-lateral__bloque">
            <span className="etiqueta">Acciones</span>
            <AccionesVisita
              item={foc}
              onProgramar={onProgramar}
              onMarcarRealizada={onMarcarRealizada}
              onVolverPendiente={onVolverPendiente}
              onEliminar={onEliminar}
              onOcupado={setOcupado}
              bloqueado={ocupado}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
