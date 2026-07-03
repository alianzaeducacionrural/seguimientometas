# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Pre-implementation.** This directory currently contains only the spec (`PROYECTO_SEGUIMIENTO_CONVENIOS.md`) and phased plan (`PLAN.md`) — no `package.json`, no source code, no git repo yet. Fase 0 in `PLAN.md` (repo init, Vite scaffold, GitHub Actions, Sheets maestro, GAS project) has not been executed. Before writing app code, check whether Fase 0 has since been completed (look for `package.json`, `src/`, `gas/`); if not, that's the first step.

Read `PROYECTO_SEGUIMIENTO_CONVENIOS.md` in full before implementing anything — it is the source of truth for the data model, roles, and panels. `PLAN.md` sequences the work into 8 phases (Fase 0–7), each ending in a manual review checkpoint described at the end of that phase's section — don't skip ahead of the current phase without checking with the user.

## Project overview

Sistema de Seguimiento a Convenios, Focalización y Carga de Padrinos, for the Área de Educación of Comité de Cafeteros de Caldas. It tracks agreements (`convenios`) with external funders (`aliados`) across the area's 7 projects (Escuela Nueva, Posprimaria, Educación Media, Escuela y Café, Seguridad Alimentaria, Escuela Virtual, La Universidad en el Campo). Each convenio has goals (`metas`); some goals require visiting specific pre-assigned schools (`focalización`), others just distribute a visit quota among volunteers (`padrinos`) without a fixed institution. The platform gives coordinators a consolidated view of progress per convenio, lets them assign/reassign focalización to padrinos and schedule visits, and gives padrinos and project leads read-only views scoped to their own data.

## Intended architecture

Same stack and pattern as the sibling project `../Seguimiento a egresados` (already built — useful as a live reference for conventions, GAS CORS workarounds, and deploy setup):

- **Frontend:** React + Vite, deployed to GitHub Pages via GitHub Actions.
- **Backend:** Google Apps Script (GAS) Web App — `doGet`/`doPost` handlers, no server of its own.
- **Database:** a new Google Sheets maestro (one tab per entity below), read/written entirely through GAS.
- **External catalog (read-only, not duplicated):** the existing Mun/IE/Sedes Sheet (`1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog`), columns Municipio | Institución Educativa | Sede, no ID column — the natural key is the `municipio + institución + sede` combination. GAS reads it directly via `SpreadsheetApp.openById()` to populate focalización selectors.
- **Auth:** magic links — a `token` per user in the `usuarios` sheet, passed as a query param (`?token=...`); GAS resolves the token to a user/role and filters what it returns. No passwords, no login form.
- **GAS ↔ frontend CORS constraint** (per the sibling project): GAS doesn't support preflight, so POSTs must use `Content-Type: text/plain` with a JSON-stringified body, not `application/json`.

## Data model (Sheets maestro)

Entities and relations — full column-level detail is in `PROYECTO_SEGUIMIENTO_CONVENIOS.md`:

- `proyectos` — the 7 fixed projects; each has one or more `lideres_ids`.
- `aliados` — funders.
- `convenios` — one aliado per convenio, N:M with `proyectos` via `convenio_proyectos`.
- `metas` — belong to one convenio; `tipo` is `visita_focalizada`, `visita_sin_focalizar`, or `otro_indicador`. Only the first two get per-padrino tracking; `otro_indicador` metas just carry a `cantidad_realizada` aggregate on the meta row itself.
- `focalizacion` — one row per pre-assigned school visit under a `visita_focalizada` meta; `padrino_id` is reassignable; `estado` moves `pendiente` → `programada` (sets `fecha_programada`) → `realizada` (sets `fecha_realizada`).
- `asignaciones_sin_focalizacion` — per-padrino visit quotas (`cantidad_asignada`/`cantidad_realizada`) under a `visita_sin_focalizar` meta, no fixed institution.
- `usuarios` — `rol` is `admin` | `lider` | `padrino`; `proyectos_ids` applies to líderes; `token` is the magic-link key.

## Roles and access

| Rol | Ve | Edita |
|---|---|---|
| Admin/Coordinador | Todo | Todo (convenios, metas, aliados, asignación/reasignación, programación, marcar realizada) |
| Líder de proyecto | Solo sus proyectos asociados | Nada (solo lectura) |
| Padrino | Solo sus propias focalizaciones/asignaciones | Nada (solo lectura) |

This means most GAS endpoints are read-heavy and role/token-filtered; write endpoints (create/assign/reassign/schedule/mark-done convenios, metas, focalización) are admin-only — enforce this filtering in GAS, not just by hiding UI in the frontend.

## Panels (frontend routes, per PLAN.md phases)

1. Panel admin — CRUD convenios/metas/aliados/usuarios, focalización assignment, scheduling.
2. Tabla de convenios — proyecto(s), aliado, vigencia, meta/realizado/% per meta.
3. Carga de padrinos — visits assigned/realized per padrino, broken down by proyecto/convenio.
4. Visitas por sede — per institución/sede: realizadas + programadas + total proyectado vs. meta, filterable by proyecto/municipio/padrino.
5. Vista líder (`/lider?token=...`) and vista padrino (`/padrino?token=...`) — read-only, scoped by token.

## Deferred (not part of initial launch)

- Automatic magic-link emails (the `correo` column exists on `usuarios` for this later).
- Excel import for focalización — data entry is manual for now.
