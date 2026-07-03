# PLAN.md — Plan de Implementación
## Sistema de Seguimiento a Convenios, Focalización y Carga de Padrinos

Este plan se ejecuta en Claude Code (VS Code), fase por fase. Cada fase termina en un punto probable de revisión antes de seguir con la siguiente.

---

## Fase 0 — Setup del proyecto

- Crear repositorio (React + Vite en la raíz)
- Configurar GitHub Pages + GitHub Actions para deploy
- Crear el Sheets maestro con las pestañas: `proyectos`, `aliados`, `convenios`, `convenio_proyectos`, `metas`, `focalizacion`, `asignaciones_sin_focalizacion`, `usuarios`
- Crear el proyecto de Google Apps Script vinculado al Sheets maestro
- Configurar acceso de lectura del GAS al Sheets externo Mun/IE/Sedes (por ID)
- `.env` con las URLs necesarias

**Revisar:** que el Sheets maestro y el GAS estén conectados y desplegando un "hola mundo" desde GitHub Pages.

---

## Fase 1 — Catálogos base (panel admin)

- CRUD de `proyectos` (los 7 ya conocidos, con posibilidad de agregar más)
- CRUD de `aliados`
- CRUD de `usuarios`: nombre, correo, rol, proyectos asociados (si es líder), generación automática de `token`
- Selector de institución/sede en el frontend, alimentado en vivo desde el catálogo Mun/IE/Sedes vía GAS

**Revisar:** que puedas crear proyectos, aliados y usuarios, y que el selector de instituciones cargue correctamente el catálogo real.

---

## Fase 2 — Convenios y metas

- CRUD de `convenios`: nombre, aliado, año de vigencia, fechas, estado, y sus proyectos asociados (selector múltiple)
- CRUD de `metas` por convenio: descripción, cantidad meta, tipo (`visita_focalizada` / `visita_sin_focalizar` / `otro_indicador`)
- Para metas tipo `otro_indicador`: campo simple de `cantidad_realizada` editable por el admin
- **Tabla principal de convenios**: proyecto(s), aliado, vigencia, y cada meta con meta/realizado/%

**Revisar:** que la tabla de convenios refleje correctamente el avance de un convenio de prueba con varias metas.

---

## Fase 3 — Focalización

- Alta de ítems de focalización dentro de una meta tipo `visita_focalizada`: selector de municipio → institución → sede (del catálogo externo)
- Asignación de cada ítem a un padrino
- Reasignación (cambiar el padrino de un ítem ya creado)
- Cambios de estado: `pendiente` → `programada` (con `fecha_programada`) → `realizada` (con `fecha_realizada`)
- Estas acciones (crear, asignar, reasignar, programar, marcar realizada) solo disponibles para admin/coordinador

**Revisar:** cargar la focalización de un convenio real, asignarla, programar un par de visitas y marcar otras como realizadas.

---

## Fase 4 — Visitas sin focalización

- Dentro de una meta tipo `visita_sin_focalizar`: asignar cantidad por padrino
- Registro de cantidad realizada por el admin

**Revisar:** que la suma de cantidades asignadas cuadre con la meta total, y que se pueda ir actualizando lo realizado.

---

## Fase 5 — Paneles de consulta

- **Carga de padrinos**: por padrino, total de visitas (focalizadas + sin focalizar) asignadas y realizadas, desglosado por proyecto/convenio
- **Visitas por sede**: por institución/sede, realizadas + programadas + total proyectado vs. meta, con filtros por proyecto, municipio y padrino

**Revisar:** con datos reales de al menos un convenio con focalización, que la vista de carga y la de sedes cuadren con lo esperado.

---

## Fase 6 — Accesos por rol (magic links)

- Lógica en GAS: recibir `token` en la URL, identificar usuario y rol, y filtrar la respuesta según corresponda
- Vista líder: solo lectura de sus proyectos asociados (convenios, metas, focalización, carga)
- Vista padrino: solo lectura de sus propias focalizaciones/asignaciones y su estado
- Rutas del frontend según rol (`/admin`, `/lider?token=...`, `/padrino?token=...`)

**Revisar:** generar tokens de prueba para un líder y un padrino, y confirmar que cada uno ve solo lo que le corresponde.

---

## Fase 7 — Pulido y despliegue final

- Diseño visual y responsive (uso en campo desde celular para padrinos)
- Pruebas con datos reales de 2-3 convenios completos
- Despliegue final en GitHub Pages

**Revisar:** flujo completo de punta a punta con datos reales, listo para que el equipo empiece a usarlo.

---

## Pendiente para después (no bloquea el lanzamiento)

- Envío automático de magic links por correo (ya tenemos la columna de correos en Padrinos)
- Importación de focalización desde Excel (por ahora se digita manual)
