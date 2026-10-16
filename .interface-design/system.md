# Sistema visual — "papel y aguamarina"

Dirección: institucional, cálido de fondo pero fresco de acento, claro y
con vida. Tema claro siempre (`color-scheme: light`); nada de tema oscuro.
Los tokens viven en `src/index.css` y todo color nuevo debe salir de ahí.

## Paleta

- Superficies: `--papel` (fondo crema) → `--superficie` (tarjetas) →
  `--superficie-2` (insets/encabezados de tabla). Misma familia cálida,
  solo cambia la luminosidad.
- Tinta en 4 niveles: `--tinta`, `--tinta-2`, `--tinta-3`, `--tinta-suave`.
- Marca: `--aguamarina` (azul aguamarina) — único acento de identidad;
  `--dorado` (miel) solo como acento SOBRE superficies aguamarina (indicador
  activo de la barra lateral, chip de rol en las bandas).
- Estado (cosecha): `--logrado` / `--maduracion` / `--cereza`, con sus
  tintes `-tinte` para insignias. La cereza roja solo significa
  destructivo/atrasado, nunca decoración.
- Identidad por entidad (convenios/padrinos): `colorPorId()` en
  `src/utils/colores.js`, aplicada como franja lateral `--acento` en
  tarjetas (TarjetaResumen.module.css), no como bloque sólido.

## Profundidad y forma

- Estrategia: solo bordes + cambios de superficie. Sombra (`--sombra-flotante`)
  únicamente en cabecera sticky, portada y hover de tarjetas.
- Bordes: `--borde-suave` (separadores de fila) → `--borde` (contornos) →
  `--borde-fuerte` (hover/énfasis).
- Radios: `--radio-sm` 7px (controles), `--radio` 10px (tarjetas/paneles),
  `--radio-lg` 14px (portada).
- Espaciado: múltiplos de 4px.

## Tipografía

Nunito Sans (Google Fonts, cargada en index.html), 400/600/700/800.
Títulos en 800 con tracking -0.015em; etiquetas de columna/campo en
mayúsculas pequeñas 700–800 con tracking +0.04em; cifras con
`tabular-nums`.

## Patrones (clases globales en index.css)

- Cascarón admin: `.cascaron` (grid) con barra lateral aguamarina degradada
  `.lateral` — marca arriba (MarcaLogo `invertido`), secciones "Gestión"/
  "Reportes" (`.lateral-titulo`) y enlaces con icono (`.lateral-enlace`,
  activo = fondo blanco translúcido + barra `--dorado`). Iconos del set
  único `src/components/Iconos.jsx`. Contenido en `.principal > .contenido`
  (max 1180px). En <900px la barra se vuelve cabecera con nav horizontal.
- Personas: `Avatar.jsx` (iniciales sobre colorPorId) en tablas
  (`.celda-persona`) y cabeceras de tarjeta (`.headerConAvatar`).
- Líder/padrino: banda aguamarina degradada `.banda-persona` (+
  `.banda-angosta` en padrino) con marca invertida, saludo y chip de rol;
  cuerpo en `.panel-persona`.
- Portada y bandas usan el mismo degradado aguamarina con un brillo radial
  dorado sutil — es la única aparición de gradientes decorativos.
- Altas y ediciones SIEMPRE en modal (`Modal.jsx` + `.modal-fondo`/`.modal`/
  `.formulario-modal`/`.modal-pie`): overlay con blur, entrada animada,
  cierra con Escape/clic afuera. El disparador es un botón `.btn-primario`
  "+ Nuevo …" en la `.barra-vista` (título a la izquierda, acciones a la
  derecha). Campos con etiqueta visible `.campo` apilados a lo ancho;
  multiselect como `.chips`/`.chip.activo`.
- Tablas: `.tabla-envoltura` (tarjeta con overflow-x) + `.tabla`; sin
  columna de id; `.celda-acciones` a la derecha (Editar neutro, Eliminar
  `.btn-peligro`); fila en edición `.fila-editando`.
- Acordeones: filas padre-hijo (proyecto→actividades, convenio→metas,
  padrino→sus visitas) se expanden con clic en cualquier parte de la fila
  salvo controles (`.fila-expandible` + chevron `.flecha-acordeon` que rota
  y se pinta aguamarina al abrir); el panel `.panel-acordeon` va sobre
  `--superficie-2` con una TablaCrud `compacta` anidada (título h3 en
  versalitas) o con `ColumnasVisitas` (ver abajo). El panel usa
  `position: sticky; left: 0; max-width: calc(100vw - 2rem)` porque su
  celda hereda el ancho total de la tabla (que desborda en móvil).
- Visitas focalizadas: tarjeta mínima — proyecto (etiqueta pequeña
  aguamarina, `.tarjeta-visita-proyecto`, solo si se conoce) + título
  "Municipio - Institución - Sede" + insignia de estado
  (`TarjetaVisitaFocalizacion.jsx`, nunca convenio/meta, eso se filtra
  aparte). Se agrupan en dos columnas Pendientes | Realizadas con
  `ColumnasVisitas.jsx` (`.columnas-visitas`, grid `auto-fit
  minmax(240px,1fr)` — se apila solo en pantallas angostas, sin media
  query). Este par se reutiliza tal cual en Actividades por padrino (admin)
  y en la pestaña Focalización del panel de líder (ambos con botones
  Reasignar/Cambiar estado vía `TarjetaVisitaEditable.jsx`), y en el panel
  de padrino (sus propias visitas, solo lectura, con filtro de municipio si
  tiene más de uno).
- Responsive: <900px la barra lateral se vuelve cabecera con nav horizontal;
  <640px además: fuente base 15px, barras de vista apiladas con botones a lo
  ancho, KPIs en grid de 2, filtros al 100%, y los modales se vuelven hoja
  inferior (`.modal-fondo` con `place-items: end center` + animación
  `modalSube`). Nunca debe haber scroll horizontal del body — las tablas
  scrollean dentro de `.tabla-envoltura`.
- Botones: neutro por defecto, `.btn-primario` (aguamarina) para la acción
  principal, `.btn-peligro` (fantasma rojo) para destruir.
- Estados: componentes `Cargando`/`AvisoError`/`Vacio` en
  `src/components/Estado.jsx`; insignias `.insignia-{pendiente|programada|realizada|neutra|error}`.
- KPIs: `.kpis` > `.kpi` (cifra 800 + etiqueta mayúscula).
- Paneles líder/padrino: `.panel-persona*` con MarcaLogo y chip de rol.
- Movimiento: aparición `aparecer` 0.25s, barras de avance con transición
  de ancho, girador de carga; todo respetando `prefers-reduced-motion`.

## Admin (rediseño oct-2026)

El admin tiene su propio tema, más moderno y denso, sobre la misma identidad
aguamarina: `src/admin/admin.css`, activado con `body.adm` (lo pone
`AdminApp`), que NO afecta al panel de líder/padrino ni a la portada. Cambia:
superficies frías (`--papel #f1f5f6`) con bordes sólidos, radios 6/8/12,
Inter 14px, barra superior sticky de 52px con navegación de 5 secciones en
lugar de la barra lateral, tablas de ~38px de alto, botones de 28px, KPIs
compactos con acento a la izquierda, pestañas internas (`.adm-pestanas`),
panel lateral por visita (`.panel-lateral`) en vez de celdas de acciones
inline, barra de selección en lote (`.barra-seleccion`) y cabecera de página
`.adm-cabecera`. Todo color nuevo sigue saliendo de los tokens.

### Segunda iteración: visual y llamativa (oct-2026)

Mismo aguamarina, pero con más personalidad en el admin: barra superior en
degradado profundo (#062f34 → #0d8f97) con navegación en pastillas (la activa
es blanca), títulos en Plus Jakarta Sans 800 (cuerpo en Inter), tarjetas de 14px
con sombra suave (`--sombra-tarjeta`) y colores de estado explícitos
(`--estado-ok/-prog/-pend/-alto/-medio`). Inicio es un tablero: hero con anillo,
KPIs grandes con icono, barras por mes, dona, agenda, anillos por convenio,
ranking de responsables y mosaico de calor por municipio — todo en SVG propio
(`src/components/Graficos.jsx`, sin librería). Visitas arranca con pestañas de
estado con conteos (`.tab-estado`), franja de color por estado en cada fila,
fecha en chip (roja si vencida) y avatar del responsable. Los degradados se
limitan al encabezado y al hero; las tarjetas usan color por estado, no decoración.
