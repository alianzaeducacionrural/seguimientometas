// Indicador de "operación en curso" (guardar/eliminar/cambiar estado):
// círculo girando + texto + barra indeterminada, para que quede claro que
// algo está pasando mientras se espera la respuesta de GAS (que puede
// tardar unos segundos) en vez de que el usuario no vea ningún cambio y
// piense que la acción no funcionó.
export default function Spinner({ texto = 'Procesando…' }) {
  return (
    <span className="spinner-en-curso" role="status" aria-live="polite">
      <span className="spinner-en-curso__fila">
        <span className="spinner-en-curso__circulo" />
        <span className="spinner-en-curso__texto">{texto}</span>
      </span>
      <span className="spinner-en-curso__barra"><span /></span>
    </span>
  )
}
