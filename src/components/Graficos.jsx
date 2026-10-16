import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Gráficos del admin dibujados a mano en SVG/HTML (sin librería de gráficos:
// son pocos y simples, y así heredan los tokens de color del tema).

// Hace que un valor arranque en 0 y transicione al real al montarse, para que
// anillos y barras "crezcan" en vez de aparecer ya dibujados.
function useCrece() {
  const [listo, setListo] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setListo(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return listo
}

// Anillo de progreso: `valor` % sólido + `extra` % a rayas (p.ej. programadas).
export function Anillo({ valor, extra = 0, tamano = 132, grosor = 13, color = 'var(--aguamarina)', colorExtra, children }) {
  const listo = useCrece()
  const r = (tamano - grosor) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(valor, 100))
  const e = Math.max(0, Math.min(extra, 100 - v))
  const arco = (pct) => `${listo ? (pct / 100) * c : 0} ${c}`
  return (
    <div className="anillo" style={{ width: tamano, height: tamano }}>
      <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} role="img" aria-label={`${Math.round(v)}% realizado${e ? `, ${Math.round(e)}% programado` : ''}`}>
        <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="var(--anillo-pista, rgba(16,37,42,.09))" strokeWidth={grosor} />
        {e > 0 && (
          <circle
            cx={tamano / 2} cy={tamano / 2} r={r} fill="none" strokeWidth={grosor} strokeLinecap="butt"
            stroke={colorExtra || color} strokeOpacity="0.38"
            strokeDasharray={arco(e)} strokeDashoffset={-(v / 100) * c}
            transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} className="anillo__arco"
          />
        )}
        <circle
          cx={tamano / 2} cy={tamano / 2} r={r} fill="none" strokeWidth={grosor} strokeLinecap="round"
          stroke={color} strokeDasharray={arco(v)}
          transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} className="anillo__arco"
        />
      </svg>
      <div className="anillo__centro">{children}</div>
    </div>
  )
}

// Dona con leyenda. segmentos: [{ etiqueta, valor, color }]
export function Dona({ segmentos, tamano = 150, grosor = 22, centro }) {
  const listo = useCrece()
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1
  const r = (tamano - grosor) / 2
  const c = 2 * Math.PI * r
  // Inicio (acumulado) de cada arco, calculado sin mutar variables en el render.
  const inicios = segmentos.map((_, i) => segmentos.slice(0, i).reduce((suma, x) => suma + (x.valor / total) * c, 0))
  return (
    <div className="dona">
      <div className="anillo" style={{ width: tamano, height: tamano }}>
        <svg width={tamano} height={tamano} viewBox={`0 0 ${tamano} ${tamano}`} role="img" aria-label="Distribución de visitas por estado">
          <circle cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke="rgba(16,37,42,.07)" strokeWidth={grosor} />
          {segmentos.map((s, i) => (
            <circle
              key={s.etiqueta} cx={tamano / 2} cy={tamano / 2} r={r} fill="none" stroke={s.color} strokeWidth={grosor}
              strokeDasharray={`${listo ? Math.max((s.valor / total) * c - 2, 0) : 0} ${c}`} strokeDashoffset={-inicios[i]}
              transform={`rotate(-90 ${tamano / 2} ${tamano / 2})`} className="anillo__arco"
            >
              <title>{`${s.etiqueta}: ${s.valor}`}</title>
            </circle>
          ))}
        </svg>
        <div className="anillo__centro">{centro}</div>
      </div>
      <ul className="dona__leyenda">
        {segmentos.map((s) => (
          <li key={s.etiqueta}>
            <span className="dona__punto" style={{ background: s.color }} />
            <span className="dona__etq">{s.etiqueta}</span>
            <b>{s.valor}</b>
            <small>{Math.round((s.valor / total) * 100)}%</small>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Columnas apiladas por mes: datos = [{ etiqueta, realizadas, programadas }]
export function BarrasMes({ datos }) {
  const listo = useCrece()
  const W = 640
  const H = 230
  const m = { l: 30, r: 8, t: 22, b: 30 }
  const max = Math.max(...datos.map((d) => d.realizadas + d.programadas), 1)
  const tope = Math.ceil(max / 10) * 10 || 10
  const ancho = (W - m.l - m.r) / datos.length
  const bw = Math.min(ancho * 0.58, 44)
  const y = (v) => m.t + (H - m.t - m.b) * (1 - v / tope)
  return (
    <svg className="barras-mes" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Visitas realizadas y programadas por mes">
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={m.l} x2={W - m.r} y1={y(tope * f)} y2={y(tope * f)} stroke="rgba(16,37,42,.09)" strokeDasharray={f ? '3 4' : undefined} />
          <text x={m.l - 6} y={y(tope * f) + 3} textAnchor="end" className="barras-mes__eje">{Math.round(tope * f)}</text>
        </g>
      ))}
      {datos.map((d, i) => {
        const x = m.l + ancho * i + (ancho - bw) / 2
        const hR = listo ? y(0) - y(d.realizadas) : 0
        const hP = listo ? y(0) - y(d.programadas) : 0
        const total = d.realizadas + d.programadas
        return (
          <g key={d.etiqueta}>
            <rect x={x} y={y(0) - hR} width={bw} height={hR} rx="3" fill="var(--logrado)" className="barras-mes__barra"><title>{`${d.etiqueta}: ${d.realizadas} realizadas`}</title></rect>
            <rect x={x} y={y(0) - hR - hP} width={bw} height={hP} rx="3" fill="url(#rayas-prog)" className="barras-mes__barra"><title>{`${d.etiqueta}: ${d.programadas} programadas`}</title></rect>
            {total > 0 && <text x={x + bw / 2} y={y(0) - hR - hP - 6} textAnchor="middle" className="barras-mes__valor">{total}</text>}
            <text x={x + bw / 2} y={H - 10} textAnchor="middle" className="barras-mes__eje">{d.etiqueta}</text>
          </g>
        )
      })}
      <defs>
        <pattern id="rayas-prog" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="#e9a825" />
          <rect width="4" height="8" fill="#f3c25c" />
        </pattern>
      </defs>
    </svg>
  )
}

// Ranking horizontal: items = [{ etiqueta, valor, extra, color, sub }]
export function BarrasH({ items, vacio = 'Sin datos todavía.' }) {
  const listo = useCrece()
  const max = Math.max(...items.map((i) => i.valor + (i.extra || 0)), 1)
  if (items.length === 0) return <p className="adm-sub" style={{ padding: '0.9rem' }}>{vacio}</p>
  return (
    <ul className="barras-h">
      {items.map((i) => (
        <li key={i.etiqueta}>
          <span className="barras-h__etq">{i.avatar}<span>{i.etiqueta}{i.sub && <small>{i.sub}</small>}</span></span>
          <span className="barras-h__pista">
            <span className="barras-h__fill" style={{ width: listo ? `${(i.valor / max) * 100}%` : 0, background: i.color }} />
            {i.extra > 0 && <span className="barras-h__fill barras-h__fill--extra" style={{ width: listo ? `${(i.extra / max) * 100}%` : 0 }} />}
          </span>
          <b>{i.valor}{i.extra > 0 && <small> +{i.extra}</small>}</b>
        </li>
      ))}
    </ul>
  )
}

// Barra apilada realizadas / pendientes con el % de realizadas al lado.
// Con `programadas` (>0) añade un tramo a rayas y el % pasa a ser el proyectado.
export function BarraApilada({ realizadas, pendientes, programadas = 0 }) {
  const listo = useCrece()
  const total = realizadas + pendientes
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const p = pct(realizadas)
  const pp = pct(realizadas + programadas)
  return (
    <span className="barra-apilada" title={`${realizadas} realizadas · ${programadas} programadas · ${pendientes - programadas} sin programar`}>
      <span className="barra-apilada__pista">
        <span className="barra-apilada__ok" style={{ width: listo ? `${p}%` : 0 }} />
        {programadas > 0 && <span className="barra-apilada__prog" style={{ width: listo ? `${pp - p}%` : 0 }} />}
      </span>
      <b>{programadas > 0 ? pp : p}%</b>
    </span>
  )
}

// Mosaico de calor: una celda por elemento coloreada según su % (más oscuro =
// más avance). items = [{ etiqueta, pct, texto, a }]
export function Mosaico({ items }) {
  return (
    <div className="mosaico">
      {items.map((i) => (
        <Link
          key={i.etiqueta} to={i.a} className={`mosaico__celda${i.pct >= 55 ? ' oscura' : ''}`}
          style={{ background: `color-mix(in srgb, var(--aguamarina) ${Math.max(i.pct, 6)}%, #e6f0f1)` }}
          title={`${i.etiqueta}: ${i.texto}`}
        >
          <strong>{i.etiqueta}</strong>
          <span>{i.pct}%</span>
          <small>{i.texto}</small>
        </Link>
      ))}
    </div>
  )
}
