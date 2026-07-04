import { Vacio } from './Estado'

// Dos columnas lado a lado (se apilan solas en pantallas angostas vía
// grid-auto-fit): pendientes de un lado, realizadas del otro. Comparte esta
// vista el admin (Actividades por padrino), el líder (carga de su equipo) y
// el propio padrino (sus visitas) — `renderTarjeta` decide qué se pinta en
// cada tarjeta (con o sin botones de acción).
export default function ColumnasVisitas({ pendientes, realizadas, renderTarjeta }) {
  if (pendientes.length === 0 && realizadas.length === 0) {
    return <Vacio>Todavía no hay visitas focalizadas aquí.</Vacio>
  }

  return (
    <div className="columnas-visitas">
      <div className="columna-visitas">
        <h4>Pendientes ({pendientes.length})</h4>
        {pendientes.length === 0 ? (
          <p className="vista-descripcion">Sin visitas pendientes.</p>
        ) : (
          pendientes.map(renderTarjeta)
        )}
      </div>
      <div className="columna-visitas">
        <h4>Realizadas ({realizadas.length})</h4>
        {realizadas.length === 0 ? (
          <p className="vista-descripcion">Sin visitas realizadas todavía.</p>
        ) : (
          realizadas.map(renderTarjeta)
        )}
      </div>
    </div>
  )
}
