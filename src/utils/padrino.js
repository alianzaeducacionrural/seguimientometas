// Valor centinela para el filtro "Sin asignar" (visitas sin padrino) — un
// valor que nunca choca con un id real y que se distingue de '' ("Todos").
export const PADRINO_SIN_ASIGNAR = '__sin_asignar__'

// ¿La visita coincide con el filtro de padrino? '' → cualquiera;
// PADRINO_SIN_ASIGNAR → solo las que no tienen padrino; un id → ese padrino.
export function coincidePadrinoFiltro(padrinoIdVisita, filtro) {
  if (!filtro) return true
  if (filtro === PADRINO_SIN_ASIGNAR) return !String(padrinoIdVisita ?? '').trim()
  return String(padrinoIdVisita) === String(filtro)
}
