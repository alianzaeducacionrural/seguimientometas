// Set único de iconos de la app (trazo, 18px, heredan currentColor).
// Solo los usa la navegación lateral — un icono por sección.
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

export function IconoProyectos() {
  return (
    <Svg>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </Svg>
  )
}

export function IconoAliados() {
  return (
    <Svg>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </Svg>
  )
}

export function IconoUsuarios() {
  return (
    <Svg>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c1.3-3.6 4.4-5 7-5s5.7 1.4 7 5" />
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

export function IconoResumen() {
  return (
    <Svg>
      <path d="M4 20h16" />
      <path d="M7 20v-6M12 20V5M17 20v-9" />
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

export function IconoVisitas() {
  return (
    <Svg>
      <path d="M12 21c-4.6-4.1-7-7.4-7-10.7A7 7 0 0 1 19 10.3c0 3.3-2.4 6.6-7 10.7Z" />
      <circle cx="12" cy="10" r="2.6" />
    </Svg>
  )
}

export function IconoCatalogo() {
  return (
    <Svg>
      <path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4Z" />
      <path d="M20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6Z" />
    </Svg>
  )
}
