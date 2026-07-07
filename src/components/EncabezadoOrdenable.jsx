// Encabezado clicable de tabla: alterna la columna de orden (o invierte la
// dirección si ya era la activa) y muestra una flecha en la que está
// activa. Compartido por cualquier tabla con orden por columnas (Actividades
// por padrino, Visitas por sede).
export default function EncabezadoOrdenable({ columna, orden, onOrdenar, numero, title, className, style, children }) {
  const activo = orden.columna === columna
  return (
    <th
      className={`th-ordenable${numero ? ' numero' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onOrdenar(columna)}
      title={title}
      style={style}
    >
      {children}
      {activo && <span className="th-ordenable-flecha"> {orden.asc ? '▲' : '▼'}</span>}
    </th>
  )
}
