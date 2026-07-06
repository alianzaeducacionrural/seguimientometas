import EstadoFocalizacion from './EstadoFocalizacion'
import { formatearFecha } from '../utils/formato'

// Tarjeta de una visita focalizada: proyecto (si se conoce), municipio,
// institución, sede y estado — sin convenio/meta, para no competir con lo
// que importa de un vistazo. Compartida entre el admin (con acciones vía
// `children`), el panel de líder y el de padrino (ambos de solo lectura,
// sin children).
export default function TarjetaVisitaFocalizacion({ item, children }) {
  return (
    <div className="tarjeta-visita">
      {item.proyecto_nombre && <p className="tarjeta-visita-proyecto">{item.proyecto_nombre}</p>}
      <h5>{item.municipio} - {item.institucion} - {item.sede}</h5>
      <p>
        <EstadoFocalizacion estado={item.estado} />
        {item.estado === 'programada' && ` · Programada: ${formatearFecha(item.fecha_programada)}`}
        {item.estado === 'realizada' && ` · Realizada: ${formatearFecha(item.fecha_realizada)}`}
      </p>
      {children}
    </div>
  )
}
