# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

All 8 phases in `PLAN.md` (Fase 0–7) are implemented and have been verified end-to-end against the real backend (real Sheets maestro, real GAS deployment) with Playwright — including role-scoped access (líder/padrino magic links) and a 3-convenio, mixed-meta-type smoke test. Test data was created and cleaned up after each verification pass.

**The live Sheet now holds the team's real data** (convenios, dozens of metas/focalización rows across many municipios, real usuarios) — the team is actively using the app. There is no separate dev/staging Sheet, so any manual testing against the real backend (`npm run dev` or the deployed site, both hit the same `VITE_GAS_URL`) must create clearly-marked throwaway records and delete them immediately after verifying, never touch or assume the state of existing real rows, and always re-`GET` before/after to confirm nothing else was disturbed.

**The working tree may have uncommitted changes.** Per explicit instruction, commits are made only when the user asks — don't `git commit`/`push` proactively, even after finishing a phase. Check `git status` before assuming what's live: GitHub Pages only rebuilds on push to `main`, so the deployed site may lag behind the working tree.

Read `PROYECTO_SEGUIMIENTO_CONVENIOS.md` for the full data model/roles/panels spec and `PLAN.md` for the phase breakdown — both are still accurate to what's built.

## Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server (localhost:5173)
npm run build      # Build for production to dist/
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

GAS backend lives in `gas/` and is managed with `clasp` (already authenticated on this machine):

```bash
cd gas
clasp push -f                              # Push Code.gs/appsscript.json to the bound Apps Script project
clasp deploy -i <deploymentId> -d "desc"   # Redeploy so the LIVE /exec URL picks up the pushed code
clasp deployments                          # List deployment IDs (the one used by VITE_GAS_URL is the non-@HEAD one with a description)
```

`clasp push` alone does **not** update the live Web App — deployments are versioned snapshots. After pushing, you must redeploy the specific deployment ID that the frontend's `VITE_GAS_URL` / the GitHub Actions secret points to, via `clasp deploy -i <id>`, or the `/exec` endpoint keeps serving the old code. `gas/.clasp.json` (holds the scriptId) is gitignored, matching the sibling project's convention — only `Code.gs` and `appsscript.json` are committed.

GitHub Pages redeploys only on push to `main` (no `workflow_dispatch`) — to re-trigger after just changing a repo secret, push an empty commit.

**Testing against the real backend:** there's no separate dev/staging Sheet — `npm run dev` and the deployed site hit the same production Sheets maestro via `VITE_GAS_URL`. When testing CRUD flows manually or with a script, clean up any records you create afterward (`?action=<entidad>` to list, `{accion:'eliminar',...}` POSTs to remove) so the sheet stays real-data-only between sessions.

## Project overview

Sistema de Seguimiento a Convenios, Focalización y Carga de Padrinos, for the Área de Educación of Comité de Cafeteros de Caldas. It tracks agreements (`convenios`) with external funders (`aliados`) across the area's 7 projects (Escuela Nueva, Posprimaria, Educación Media, Escuela y Café, Seguridad Alimentaria, Escuela Virtual, La Universidad en el Campo). Each convenio has goals (`metas`); some goals require visiting specific pre-assigned schools (`focalización`), others just distribute a visit quota among volunteers (`padrinos`) without a fixed institution. Visits can be assigned to either a padrino or a project lead (`usuarios.rol` `padrino` or `lider`) — anywhere the UI says "padrino" (Actividades por padrino, reasignar selects, etc.) a líder is just as valid a choice, not restricted to the projects they lead. The platform gives coordinators a consolidated view of progress per convenio, lets them assign/reassign focalización to padrinos and schedule visits, and gives padrinos and project leads views scoped to their own data via magic links — padrinos are fully read-only, líderes are read-only except for their own focalización, which they can also reassign/reschedule.

## Architecture

Same stack and pattern as the sibling project `../Seguimiento a egresados`:

- **Frontend:** React + Vite, deployed to GitHub Pages via GitHub Actions (`vite.config.js` `base` and `App.jsx`'s `BrowserRouter basename` are both `/seguimientometas/`, matching the repo name).
- **Backend:** Google Apps Script (GAS) Web App (`gas/Code.gs`) — `doGet`/`doPost` handlers, no server of its own. Container-bound to the Sheets maestro.
- **Database:** the Sheets maestro (one tab per entity, see below), read/written entirely through GAS. Tab names and header order are the `HOJAS`/`ENCABEZADOS` constants at the top of `Code.gs` — treat that as the schema source of truth in code (mirrors `PROYECTO_SEGUIMIENTO_CONVENIOS.md`).
- **External catalog (read-only, not duplicated):** the Mun/IE/Sedes Sheet (`1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog`). Two tabs are read via `SpreadsheetApp.openById()` in `Code.gs`: tab `Mun/IE/Sedes` (columns Municipio | Instituciones Educativas | Sede, ~1300 rows, no ID column) through `getCatalogoIE()` → `{ municipios, instituciones: {municipio: [...]}, sedes: {"municipio||institucion": [...]} }` for cascading selects; and the padrinos tab (located by gid `1978199793`, not by name — columns A:B are Padrinos | Email) through `getCatalogoPadrinos()` → `{ padrinos: [{nombre, correo}] }`. Padrinos are **picked from this catalog** in the Usuarios view (correo auto-filled), never typed by hand; the same tab also has a wider staff list with phones/passwords in columns H:K, which the app deliberately ignores.
- **Auth:** magic links — a `token` per user in `usuarios`, passed as `?token=...` to `/lider` or `/padrino`. GAS resolves the token to a user, checks the role matches the endpoint, and returns **only** the data that user is allowed to see — filtering happens server-side in `getLiderConvenios`/`getPadrinoResumen`, not just by hiding UI. No passwords, no login form; `/admin` itself has no auth gate (matches the spec, which only defines magic-link auth for líder/padrino). Padrino stays fully read-only; líder can additionally write to `focalizacion`/`asignaciones_sin_focalizacion` (reasignar padrino, cambiar estado) via `src/utils/api.js`'s `editar()` — this isn't token-enforced server-side (see below), the scoping is that the líder UI only ever passes ids it already fetched pre-filtered to their own proyectos.
- **GAS ↔ frontend CORS:** GAS doesn't support preflight. POSTs from the frontend use `Content-Type: text/plain` with a JSON-stringified body; GET requests work as plain cross-origin fetches. GAS redirects `/exec` through `script.googleusercontent.com` — `fetch()` follows this transparently, but `curl` needs `-L` (and POST redirects need `--post302 --post303`, or just don't chase them and trust the write happened — the sheet is the ground truth).
- **Gotcha — `*_ids` columns must stay text:** any comma-joined id list (`proyectos_ids`, `lideres_ids`) risks Sheets silently reinterpreting e.g. `"1,2"` as the decimal number `1.2` (comma as decimal separator) unless the cell is forced to text format first. `escribirValor()` in `Code.gs` handles this automatically for every field ending in `_ids` — if you add a new comma-list field, name it `..._ids` to get this for free, or replicate the `setNumberFormat('@')` call.

### GAS API contract

- `GET ?action=ping` → `{ ok, mensaje }` — health check.
- `GET ?action=catalogoIE` → the Mun/IE/Sedes structure above.
- `GET ?action=catalogoPadrinos` → `{ ok, padrinos: [{nombre, correo}] }` from the external catalog's padrinos tab, sorted by nombre.
- `POST {accion:'importarPadrinos'}` → bulk-creates a rol-padrino usuario (with token) for every catalog padrino not yet present; dedupes by correo (case-insensitive), so it's idempotent → `{ ok, creados, omitidos }`. Triggered by the "Importar padrinos del catálogo" button in Usuarios.
- `GET ?action=<entidad>` where `<entidad>` is `proyectos` | `actividades` | `aliados` | `usuarios` | `convenios` | `metas` | `focalizacion` | `asignaciones_sin_focalizacion` | `avances_manuales` → `{ ok, datos: [...] }`, full rows as objects keyed by header name. **Unfiltered** — this is the admin panel's data source; there's no token check on these.
- `GET ?action=liderConvenios&token=...` → `{ ok, usuario, proyectos, aliados, convenios, metas, focalizacion, asignaciones, padrinos }`, all pre-filtered server-side to the líder's own proyectos (via `usuario.proyectos_ids` ∩ `convenio.proyectos_ids`). `padrinos` is **all** rol-padrino **and** rol-lider usuarios (id+nombre only, no correo/token leaked) — not just the ones already involved, so the líder can reassign a visit to anyone (padrino or líder, including themselves or another líder not tied to this convenio's proyectos), including someone with zero current carga.
- `GET ?action=padrinoResumen&token=...` → `{ ok, usuario, focalizacion, asignaciones }`, pre-filtered to that padrino's own rows, each enriched with `meta_descripcion`/`convenio_nombre`/`meta_tipo`/`proyecto_nombre` for display since the padrino doesn't get the full metas/convenios/proyectos lists — `meta_tipo` lets `PadrinoPanel.jsx` exclude registered (not pre-assigned) sin-focalizar visits from its "asignadas" total, same distinction `totalesDe()` makes.
- `POST` body (JSON, as `text/plain`): `{ accion: 'crear'|'editar'|'eliminar', entidad, id?, datos? }`, routed generically in `Code.gs` through `ENTIDADES_CRUD` (covers all 7 CRUD entities above). `crear` server-generates `id` (next integer per sheet) and, for `usuarios`, a random 6-char `token`; `editar` ignores attempts to change `id`/`token`. No POST path is token-scoped — all writes go through the open admin API.
- Adding a new CRUD-managed sheet later: add it to `HOJAS`/`ENCABEZADOS`/`ENTIDADES_CRUD` in `Code.gs` — `listarFilas`/`crearRegistro`/`editarRegistro`/`eliminarRegistro` are already generic over any entry in that map, and `hojaDe()` auto-creates the physical tab (with headers) on first access.
- Adding a new column to an existing sheet: just add it to `ENCABEZADOS` — `asegurarEsquema()` (called from listar/crear/editar) auto-expands the physical sheet and rewrites the header row on first touch. With existing data rows this is only safe for columns appended at the END (or if the sheet is empty); reordering with data requires manual migration.

### Frontend structure

The visual system ("papel y aguamarina": warm light theme, aquamarine-blue brand, no dark mode) is documented in `.interface-design/system.md`; all tokens live in `src/index.css` — new UI should use those classes/tokens, not ad-hoc colors.

```
src/
├── App.jsx             — BrowserRouter: "/" (Home), "/admin/*", "/lider", "/padrino"
├── Home.jsx             — hola-mundo / ping healthcheck page
├── utils/               — shared across admin/lider/padrino
│   ├── api.js            — apiGet() (líder/padrino reads) + editar() (líder-only write, used by LiderPanel's Focalización tab; padrino never calls it)
│   ├── colores.js         — colorPorId() (fixed categorical palette by entity id) + colorAvance() (status palette by %)
│   ├── formato.js          — soloFecha() (for <input type=date>) / formatearFecha() (dd/mm/aaaa display) / hoy() (today as YYYY-MM-DD, to default date inputs)
│   ├── proyectos.js         — idsDeLista(valor) (parses a comma-list field into trimmed ids) + nombresProyectosDe(idsTexto, proyectos) — resolves to project names **in the fixed catalog order** (Escuela Nueva…La Universidad en el Campo, i.e. `proyectos.datos`' own order), never in whatever order the ids happen to be stored in a `..._ids` field. Every view that lists/joins project names (Convenios, Usuarios, ResumenConvenios, VisitasSede, Focalizacion, LiderPanel) goes through this so the 7 projects always appear in the same order everywhere. Also `ordenDeProyecto(proyectoId, proyectos)` and `ordenarPorProyecto(items, proyectos)` — sort a list of items that each carry their own `proyecto_id` (e.g. focalización cards) by that same fixed order, stable on ties; used by ActividadesPadrino, LiderPanel and PadrinoPanel to sort the Pendientes/Realizadas card columns.
│   ├── texto.js              — coincideBusqueda(busqueda, ...campos): case-insensitive substring match against any number of fields, empty query always matches. Backs the live (no-button) search boxes in `PanelFocalizacionMeta`/`PanelAsignacionesMeta`.
│   ├── avance.js            — ejecutadoDe(meta, focalizacion, avancesManuales): shared "ejecutado" calc by tipo — visita_focalizada and visita_sin_focalizar both just count `focalizacion` rows for that meta with estado "realizada" (a registered sin-focalizar visit is a focalizacion row like any other, see below); otro_indicador ("Manual") sums `cantidad` from `avances_manuales` rows for that meta instead of reading a raw field
│   ├── cargaPadrino.js       — totalesDe(padrinoId, focalizacion, asignaciones, metaPorId) and conContexto(item, metaPorId, convenioPorId, proyectoPorId), shared by ActividadesPadrino and LiderPanel. `metaPorId` is required so totalesDe can tell apart focalizacion rows that were pre-assigned (visita_focalizada, always counted in "asignadas") from ones created by "Registrar visita" (visita_sin_focalizar, born already "realizada" — counted in "realizadas", and in "asignadas" too via `Math.max(cuotaAsignada, visitasRegistradas)`, so a padrino who's already logged more sin-focalizar visits than their quota never shows a negative/mismatched "pendientes" relative to the Pendientes/Realizadas card counts — same fix mirrored inline in PadrinoPanel.jsx, which doesn't go through this shared function)
│   └── estadoFocalizacion.js — accionesEstadoFocalizacion(editarItem): the 3 valid estado transitions (see focalizacion below), shared by FocalizacionMeta and ActividadesPadrino
├── components/           — shared components
│   ├── EstadoFocalizacion.jsx  — pendiente/programada/realizada badge (.insignia-* classes from index.css)
│   ├── Estado.jsx               — Cargando / AvisoError / Vacio shared view states
│   ├── Modal.jsx                 — shared modal (overlay + Escape/click-outside close); ALL create/edit forms open in modals, not inline
│   ├── Avatar.jsx                — initials circle colored by colorPorId, used in Usuarios table and ActividadesPadrino/LiderPanel
│   ├── Flecha.jsx                 — shared accordion chevron (rotates + turns aguamarina when open), used by TablaCrud, ActividadesPadrino and LiderPanel
│   ├── TarjetaVisitaFocalizacion.jsx — read-only focalización card: optional small proyecto label + actividad (meta_descripcion) right below it (both from `conContexto`'s `proyecto_nombre`/`meta_descripcion`, the 4th `proyectoPorId` arg is what resolves the proyecto) + municipio - institución - sede + estado badge (still no convenio); takes optional `children` for action buttons. The cards feeding it (ActividadesPadrino, LiderPanel, PadrinoPanel) sort their Pendientes/Realizadas lists via `ordenarPorProyecto` first
│   ├── TarjetaVisitaEditable.jsx    — wraps TarjetaVisitaFocalizacion with Reasignar/Cambiar-estado buttons + their modals; shared by admin's ActividadesPadrino and LiderPanel's Focalización tab (both places the líder or admin actually gets to act)
│   ├── FilaAsignacionCompacta.jsx    — one asignación-sin-focalizar row (convenio/meta/asignada/realizada/pendiente + reasignar select) for inside a padrino's accordion panel; `realizadas` is computed by the caller (counting `focalizacion` rows for that meta+padrino), not read off the row — shared by the same two views
│   ├── ColumnasVisitas.jsx        — the shared two-column Pendientes | Realizadas layout (`.columnas-visitas`, auto-stacks on narrow screens), driven by a `renderTarjeta` callback; used by ActividadesPadrino, LiderPanel and PadrinoPanel
│   ├── Iconos.jsx                — the app's single stroke-icon set (one per nav section)
│   ├── MarcaLogo.jsx             — inline-SVG brand mark (coffee leaf; `invertido` for green backgrounds), also mirrored in public/favicon.svg
│   └── TarjetaResumen.module.css — card+table styles used by ResumenConvenios, LiderPanel; entity color enters via the `--acento` CSS var (left accent stripe), set from JSX with colorPorId()
├── admin/                — open, full-access panel (no token)
│   ├── AdminApp.jsx        — green sidebar shell (brand + iconed nav in Gestión/Reportes sections; collapses to a top bar under 900px) + nested routes; NavLink `to` values are absolute (`/admin/...`), not relative — see comment in the file for why
│   ├── utils/api.js        — apiGet + crear/editar/eliminar (mutations) against VITE_GAS_URL
│   ├── hooks/
│   │   ├── useEntidad.js     — generic list+CRUD hook for one sheet-backed entity
│   │   ├── useCatalogoIE.js  — fetches/caches the Mun/IE/Sedes catalog (module-level cache, ~1300 rows)
│   │   └── useCatalogoPadrinos.js — fetches/caches the padrinos (nombre+correo) catalog list
│   ├── components/
│   │   ├── TablaCrud.jsx          — generic table + modal form (text/date/number/select/multiselect) driving useEntidad; no id column shown. "+ etiquetaNueva" opens the create modal, Editar opens it prefilled, `accionesExtra` slot for extra toolbar buttons; `opcionesSi(form)` turns a text campo into a select, `alCambiar(valor)` auto-fills sibling fields. `panelFila(fila)` makes rows accordion-expandable (click anywhere on the row except controls; rotating chevron) and `compacta` renders a nested variant for inside those panels
│   │   ├── ActividadesDeProyecto.jsx — accordion panel under a proyecto row: nested TablaCrud of its actividades
│   │   ├── MetasDeConvenio.jsx        — accordion panel under a convenio row: nested TablaCrud of its metas (proyecto→actividad cascade), `tipo` hidden from the table (`ocultarColumna`, still in the create/edit form) and "Cantidad realizada" always shows the computed `ejecutadoDe`, never a raw field. The extra column links out per tipo: visita_focalizada → "Focalización →", visita_sin_focalizar → "Asignaciones →", otro_indicador ("Manual") → a "Registrar avance →" button (local modal, cantidad+fecha) that creates an `avances_manuales` row instead of overwriting a single number
│   │   ├── SelectorInstitucion.jsx — controlled Municipio→Institución→Sede cascading <select>s
│   │   ├── FilaFocalizacion.jsx     — one focalización row: reasignar padrino; programar, marcar realizada (direct from pendiente too), or volver a pendiente (from programada) via `estadoFocalizacion.js`
│   │   ├── FilaAsignacion.jsx        — one asignación-sin-focalizar row: editable cantidad_asignada (the quota); cantidad realizada is read-only, passed in as `realizada` computed from `focalizacion` — never edited by hand
│   │   ├── PanelFocalizacionMeta.jsx  — presentational: KPIs + "+ Agregar sede" + live municipio/institución dropdown filters (options built from this meta's own sedes, not the ~1300-row catalog) plus a free-text search box (municipio/institución/sede/padrino, via `coincideBusqueda` in `utils/texto.js`) — all filter as you type/pick, no search button — + the FilaFocalizacion table for one meta. Takes meta/items/padrinos and mutation callbacks as props (no useEntidad of its own), so it can be reused both by the standalone route (`FocalizacionMeta.jsx`) and embedded in `Focalizacion.jsx` without duplicating fetches; `compacta` drops its title from h2 to h3 for the embedded case
│   │   ├── PanelAsignacionesMeta.jsx  — presentational sibling of the above for one visita_sin_focalizar meta, with two sections always visible (not tabbed — the point is tracking from both angles at once) for tracking from both angles: KPIs are just Meta + Realizado; "Visitas realizadas" is a flat table of every realized visit (municipio/institución/sede/padrino/fecha — "+ Registrar visita": SelectorInstitucion + padrino + fecha → creates a `focalizacion` row directly in estado "realizada", since it's logged after happening) with the same live municipio/institución filters + free-text search as PanelFocalizacionMeta; "Asignación por padrino" below it is the per-padrino quota ("+ Asignar padrino" + the FilaAsignacion table, "Realizada" computed from `focalizacion`) — picking a padrino in that modal who already has realized visits without a quota preloads that count into "Cantidad asignada" as a starting point (editable). Same reuse pattern (`AsignacionesMeta.jsx` route + embedded in `Focalizacion.jsx`)
│   │   └── EnlaceMagico.jsx           — "Copiar enlace" button, builds the /lider or /padrino URL from a token
│   └── views/
│       ├── Proyectos.jsx, Aliados.jsx, Usuarios.jsx  — thin TablaCrud configs; Proyectos expands per-row into ActividadesDeProyecto
│       ├── Convenios.jsx — convenio CRUD; each row expands into MetasDeConvenio (there are no /admin/proyectos/:id or /admin/convenios/:id routes — actividades/metas live in the accordions)
│       ├── Focalizacion.jsx (/admin/focalizacion) — manage focalización and visitas sin focalizar without drilling into Convenios: a proyecto filter, then a 3-level accordion — Convenio (Aliado + Convenio columns, plain table) → Proyecto (a convenio can span several, listed in the fixed catalog order, only the ones with qualifying metas; rendered as `.lista-proyectos`/`.fila-proyecto` cards with a `colorPorId` left-accent, not a table — a single-column table header read as clutter) → Actividad (the meta, only visita_focalizada/visita_sin_focalizar — "Manual" stays in the Convenios accordion; table with Meta/Avance (`ejecutadoDe` + the same progress-bar cell as ResumenConvenios, via `TarjetaResumen.module.css`)/Faltante columns, wrapped in its own `.tabla-envoltura` card so it doesn't blend into the panel's tinted background) — opening an actividad embeds the full `PanelFocalizacionMeta`/`PanelAsignacionesMeta`. Independent open-state per level (opening a convenio/proyecto resets whichever is nested under it). One shared fetch (useEntidad per entity) for the whole tree, no matter how many convenios/proyectos/metas render
│       ├── FocalizacionMeta.jsx (/admin/metas/:metaId) — thin wrapper: fetch + find the meta, render `PanelFocalizacionMeta`
│       ├── AsignacionesMeta.jsx (/admin/metas/:metaId/asignaciones) — thin wrapper: fetch + find the meta, render `PanelAsignacionesMeta`
│       ├── ResumenConvenios.jsx (/admin/resumen)  — Proyecto/Actividad/Meta/Ejecutado/%Avance cards per convenio, rows sorted by the fixed proyecto catalog order (grouping same-proyecto metas together) rather than sheet/creation order
│       ├── ActividadesPadrino.jsx (/admin/actividades-padrino) — per-padrino asignadas/realizadas/pendientes quick table, sortable by clicking any header (`EncabezadoOrdenable`, toggles asc/desc, arrow indicator); each row expands into a two-column accordion (Pendientes | Realizadas) of that padrino's focalización visits, rendered with the shared `TarjetaVisitaEditable` ("Reasignar" + "Cambiar estado" buttons, each opening their own modal; the estado modal offers Programar/Marcar realizada/Volver a pendiente per the transitions in `estadoFocalizacion.js`, hidden once realizada); a compact table below (shared `FilaAsignacionCompacta`) covers asignaciones_sin_focalizacion quotas if any — same two components LiderPanel's Focalización tab reuses
│       ├── VisitasSede.jsx (/admin/visitas-sede)  — grouped by sede, not a flat row per visit: each sede shows a visit count per proyecto ("Escuela Nueva: 3 visitas"), click a proyecto to see the detail table (fecha/padrino/estado) for that sede+proyecto — two-level accordion (sede → proyecto), only sedes with ≥1 visit are listed. Proyecto/municipio/padrino filters narrow the rows before grouping
│       └── Catalogo.jsx        — read-only browser of the Mun/IE/Sedes catalog (KPIs + municipio/institución filters), linked in the nav as "Catálogo IE"
├── lider/LiderPanel.jsx  — /lider?token=..., convenios+metas+focalización scoped to the líder's proyectos (one or several — a `proyecto` filter select appears only if the líder leads more than one, applied to all 3 tabs by filtering convenios by `proyectos_ids` and metas by `proyecto_id`, same fallback-to-convenio logic as VisitasSede). Three `.pestanas` tabs (plain useState, no router):
│   ├── "Seguimiento a metas" — the convenio/meta avance table (unchanged from before tabs existed); fetches `avances_manuales` (unfiltered GET, read-only) too, for Manual metas' ejecutado.
│   ├── "Vista de padrinos" — read-only, a flat (non-accordion) Padrino/Asignadas/Realizadas/Pendientes table, for at-a-glance team load leveling; no action buttons.
│   └── "Focalización" — accionable: the same accordion-table pattern as admin's ActividadesPadrino (quick row per padrino expands into ColumnasVisitas), but here the cards ARE `TarjetaVisitaEditable`/`FilaAsignacionCompacta` — the líder can reasignar padrino and cambiar estado on their own proyectos' focalización. Writes go through `utils/api.js`'s `editar()` followed by a full re-fetch of `liderConvenios` (there's no per-entity useEntidad hook here, just one combined GET refreshed after every mutation)
└── padrino/
    ├── PadrinoPanel.jsx    — /padrino?token=..., read-only own focalización+asignaciones. "Tus visitas focalizadas" uses ColumnasVisitas (Pendientes | Realizadas) with a municipio filter (shown only if the padrino has visits in more than one); "Tus visitas sin focalizar" stays a flat list (no fixed sede, so no columnas split applies)
    └── PadrinoPanel.module.css — mobile-first single-column cards (this is the one view built for phone use in the field); `.columnas-visitas` naturally collapses to one column here since its 480px-max container can't fit two 240px-min columns side by side
```

`proyectos.lideres_ids` and the `convenio_proyectos` sheet tab exist per the original spec's schema but are **not written by the app**: proyecto↔líder is single-sourced from `usuarios.proyectos_ids` (rol `lider`), and convenio↔proyecto is single-sourced from `convenios.proyectos_ids` (comma list, same pattern) rather than the separate join sheet — both to avoid keeping two denormalized copies of the same relation in sync. Computed/derived values (e.g. the "Líderes" column in the Proyectos view) are filtered client-side from `usuarios`, not stored.

## Data model (Sheets maestro)

Entities and relations — full column-level detail is in `PROYECTO_SEGUIMIENTO_CONVENIOS.md`:

- `proyectos` — the 7 fixed projects.
- `actividades` — per-proyecto activity catalog (`id`, `proyecto_id`, `nombre`), managed in the accordion under each proyecto row. In the meta modal, picking a proyecto loads its actividades as the options for `descripcion` (cascading select; free text if the proyecto has no actividades yet). The chosen nombre is stored as text in `metas.descripcion` — same pattern as focalización storing catalog values as text.
- `aliados` — funders.
- `convenios` — one aliado per convenio; `proyectos_ids` (comma list) instead of the `convenio_proyectos` join sheet (see above).
- `metas` — belong to one convenio and to one `proyecto_id` (picked from the convenio's proyectos in the UI; falls back to all proyectos if the convenio has none marked). `tipo` is `visita_focalizada`, `visita_sin_focalizar`, or `otro_indicador` (labeled "Manual" in the UI, stored value unchanged). None of the three carry a manually-edited "ejecutado" number anymore — `ejecutadoDe()` always computes it (from `focalizacion` for the two visit tipos, from `avances_manuales` for Manual). The VisitasSede/Focalizacion proyecto filter prefers `meta.proyecto_id` and falls back to `convenio.proyectos_ids` for old rows without it.
- `focalizacion` — one row per school visit, either pre-assigned under a `visita_focalizada` meta (created "pendiente" via "+ Agregar sede", goes through the full estado lifecycle) or logged after the fact under a `visita_sin_focalizar` meta via "+ Registrar visita" (created directly in estado `realizada`, since there's nothing to schedule — it already happened). `padrino_id` is reassignable to any usuario with rol `padrino` **or** `lider`; `estado` moves `pendiente` → `programada` (sets `fecha_programada`) → `realizada` (sets `fecha_realizada`), but `pendiente` can also jump straight to `realizada` (skipping `programada`), and `programada` can revert back to `pendiente` (clears `fecha_programada`) — `realizada` is terminal. These three transitions are centralized in `src/utils/estadoFocalizacion.js` (`accionesEstadoFocalizacion`), shared by FocalizacionMeta and ActividadesPadrino. Because both meta tipos write to this same sheet, a sin-focalizar visit registered anywhere automatically counts toward its meta's ejecutado, shows up in Visitas por sede, and appears in the padrino's Pendientes/Realizadas cards — no extra plumbing.
- `asignaciones_sin_focalizacion` — per-padrino-or-líder visit **quota** (`cantidad_asignada`) under a `visita_sin_focalizar` meta, no fixed institution. `cantidad_realizada` is a legacy column no longer written or read — the real realizada count is always computed by counting `focalizacion` rows for that meta+padrino with estado "realizada" (see `FilaAsignacion.jsx`/`PanelAsignacionesMeta.jsx`/`totalesDe()`).
- `avances_manuales` (`id`, `meta_id`, `cantidad`, `fecha`) — one row per manual increment logged against an `otro_indicador` ("Manual") meta, e.g. "+5 microcentros el 03/06". The meta's ejecutado is the sum of these, never a field edited directly on the meta.
- `usuarios` — `rol` is `admin` | `lider` | `padrino`; `proyectos_ids` applies to líderes; `token` is the magic-link key. Despite the field/UI naming ("padrino", "Actividades por padrino"), every `padrino_id` and every "padrino" select throughout the app (`FocalizacionMeta`, `AsignacionesMeta`, `ActividadesPadrino`, `VisitasSede`, `LiderPanel`) is populated from `usuarios.filter(u => u.rol === 'padrino' || u.rol === 'lider')` — a líder is just as assignable as a padrino, system-wide (not limited to the proyectos they lead). This was a deliberate choice to avoid renaming "padrino" everywhere; don't "fix" the filter to padrino-only.

## Roles and access

| Rol | Ve | Edita | Entry point |
|---|---|---|---|
| Admin/Coordinador | Todo | Todo | `/admin` — open, no token |
| Líder de proyecto | Solo sus proyectos asociados (convenios, metas, focalización, carga) | Focalización de sus proyectos: reasignar padrino, cambiar estado. El resto (convenios, metas) solo lectura | `/lider?token=...` |
| Padrino | Solo sus propias focalizaciones/asignaciones | Nada (solo lectura) | `/padrino?token=...` |

Enforcement is server-side for what data each token can *see* (see GAS API contract above). The líder's write actions are NOT server-enforced beyond that — same as the open admin POST API — the UI just never offers ids outside the líder's own pre-filtered data.

## Panels (frontend routes)

1. Panel admin (`/admin/*`) — CRUD proyectos/aliados/usuarios/convenios/metas, focalización assignment/scheduling, asignaciones sin focalizar.
2. Focalización (`/admin/focalizacion`) — manage focalización and visitas sin focalizar for any convenio without opening Convenios, filterable by proyecto. See Focalizacion.jsx above.
3. Avance por convenio (`/admin/resumen`) — Actividad/Meta/Ejecutado/%Avance cards, one per convenio.
4. Actividades por padrino (`/admin/actividades-padrino`) — visits assigned/realized/pending per padrino, sortable by header, expandable per row into pending vs. realized visits with inline reassignment.
5. Visitas por sede (`/admin/visitas-sede`) — grouped by sede with a visit count per proyecto, drilling down into per-visit detail (fecha/padrino/estado).
6. Vista líder (`/lider?token=...`) — 3 tabs (seguimiento a metas, vista de padrinos, focalización); only the focalización tab allows action, the rest is read-only. See LiderPanel above.
7. Vista padrino (`/padrino?token=...`) — fully read-only; splits focalización into Pendientes/Realizadas columns (see PadrinoPanel above).

## Deferred (not part of initial launch)

- Automatic magic-link emails (the `correo` column exists on `usuarios` for this later) — for now, the admin copies the link manually from Usuarios (`EnlaceMagico` button) and sends it however.
- Excel import for focalización — data entry is manual for now.
