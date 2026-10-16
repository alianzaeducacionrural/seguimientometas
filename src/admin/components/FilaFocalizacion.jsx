import { useState } from 'react'
import EstadoFocalizacion from '../../components/EstadoFocalizacion'
import AccionesVisita from './AccionesVisita'
import SelectorPadrino from './SelectorPadrino'

// Una fila de focalización dentro del árbol "Por convenio": municipio,
// institución, sede, padrino (reasignable), estado y las acciones de la
// visita. Mientras cualquier acción está en curso la fila queda resaltada y
// con el selector de padrino bloqueado.
export default function FilaFocalizacion({ item, padrinos, onReasignar, onProgramar, onMarcarRealizada, onVolverPendiente, onEliminar }) {
  const [ocupado, setOcupado] = useState(false)

  return (
    <tr className={ocupado ? 'fila-en-curso' : undefined}>
      <td>{item.municipio}</td>
      <td>{item.institucion}</td>
      <td>{item.sede}</td>
      <td>
        <SelectorPadrino item={item} padrinos={padrinos} onReasignar={onReasignar} disabled={ocupado} onOcupado={setOcupado} />
      </td>
      <td><EstadoFocalizacion estado={item.estado} /></td>
      <td>
        <AccionesVisita
          item={item}
          onProgramar={onProgramar}
          onMarcarRealizada={onMarcarRealizada}
          onVolverPendiente={onVolverPendiente}
          onEliminar={onEliminar}
          onOcupado={setOcupado}
          bloqueado={ocupado}
        />
      </td>
    </tr>
  )
}
