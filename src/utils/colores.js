// Paleta categórica del sistema (references/palette.md) — orden fijo. Se
// asigna por id de la entidad (no por posición en la lista) para que el
// color de un convenio/padrino no cambie si la lista se reordena o filtra.
export const COLORES_CATEGORICOS = [
  '#2a78d6', '#1baf7a', '#eda100', '#008300',
  '#4a3aa7', '#e34948', '#e87ba4', '#eb6834',
]

export function colorPorId(id) {
  const n = Number(id)
  return COLORES_CATEGORICOS[(Number.isFinite(n) ? n : 0) % COLORES_CATEGORICOS.length]
}

// Paleta de estado (fija, nunca se reusa para identidad) para % de avance.
// Alineada con los tokens --logrado / --maduracion / --cereza de index.css.
export function colorAvance(pct) {
  if (pct >= 75) return '#178a3f'
  if (pct >= 40) return '#d9930d'
  return '#c0392f'
}
