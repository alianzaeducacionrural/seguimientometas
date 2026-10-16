// Descarga una tabla como CSV que Excel (configuración regional en español,
// separador ";") abre directo con tildes bien — de ahí el BOM UTF-8.
// `columnas`: [{ titulo, valor: (fila) => ... }].
export function descargarCsv(nombre, columnas, filas) {
  const celda = (v) => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [columnas.map((c) => celda(c.titulo)).join(';')]
  filas.forEach((f) => lineas.push(columnas.map((c) => celda(c.valor(f))).join(';')))
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
