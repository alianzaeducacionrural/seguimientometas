// Set único de iconos de la app (trazo, 18px, heredan currentColor).
// Solo los usa la barra de navegación del admin — un icono por sección.
function Svg({ children, tamano = 18 }) {
  return (
    <svg
      width={tamano}
      height={tamano}
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

export function IconoCheck({ tamano }) {
  return (
    <Svg tamano={tamano}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.8 2.8L16 9.6" />
    </Svg>
  )
}

export function IconoCalendario({ tamano }) {
  return (
    <Svg tamano={tamano}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </Svg>
  )
}

export function IconoReloj({ tamano }) {
  return (
    <Svg tamano={tamano}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function IconoAlerta({ tamano }) {
  return (
    <Svg tamano={tamano}>
      <path d="M12 3.5 2.8 19.5h18.4Z" />
      <path d="M12 10v4.5M12 17.2v.1" />
    </Svg>
  )
}

export function IconoDescarga({ tamano }) {
  return (
    <Svg tamano={tamano}>
      <path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 19h14" />
    </Svg>
  )
}
