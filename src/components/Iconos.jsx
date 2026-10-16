// Set único de iconos de la app (trazo, 18px, heredan currentColor).
// Solo los usa la barra de navegación del admin — un icono por sección.
function Svg({ children }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconoInicio() {
  return (
    <Svg>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </Svg>
  )
}

export function IconoFocalizacion() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </Svg>
  )
}

export function IconoConvenios() {
  return (
    <Svg>
      <path d="M7 3h7l5 5v13H7Z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6M10 17h6" />
    </Svg>
  )
}

export function IconoCarga() {
  return (
    <Svg>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19c1-3 3.4-4 5.5-4s4.5 1 5.5 4" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M16.5 15.2c2 .3 3.5 1.4 4.2 3.8" />
    </Svg>
  )
}

export function IconoResumen() {
  return (
    <Svg>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V5M17 20v-9" />
    </Svg>
  )
}
