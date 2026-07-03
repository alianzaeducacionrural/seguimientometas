# Sistema de Seguimiento a Convenios, Focalización y Carga de Padrinos
## Área de Educación — Comité de Cafeteros de Caldas

---

## Contexto

El área de educación responde a múltiples convenios con distintos aliados, que financian actividades dentro de los proyectos del área (Escuela Nueva, Posprimaria, Educación Media, Escuela y Café, Seguridad Alimentaria, Escuela Virtual, La Universidad en el Campo). Cada convenio trae sus propias metas: visitas de asesoría y acompañamiento, microcentros rurales, docentes capacitados, dotaciones, entre otras.

Algunos convenios traen **focalización**: un listado específico de instituciones y sedes que deben visitarse. Otros solo entregan una cantidad de visitas a repartir sin institución específica. Hoy no hay una vista consolidada de avance por convenio, ni de la carga de trabajo de cada padrino, ni de qué sedes han sido visitadas y cuáles están programadas.

## Objetivos

1. Ver de un vistazo el avance de cada convenio (meta vs. realizado vs. %).
2. Gestionar la focalización: asignarla y reasignarla entre padrinos, programar fechas de visita.
3. Ver la carga de cada padrino (visitas asignadas y realizadas, por proyecto/convenio) para poder nivelar el trabajo del equipo.
4. Ver, por institución/sede, cuántas visitas ha recibido y cuántas tiene programadas, por proyecto.

## Arquitectura

- **Frontend:** React + Vite
- **API:** Google Apps Script (Web App)
- **Base de datos:** Google Sheets maestro (nuevo)
- **Catálogo de instituciones:** referenciado en vivo desde el Sheets existente de Mun/IE/Sedes (sin duplicar información)
- **Despliegue:** GitHub Pages vía GitHub Actions (mismo patrón usado en otros proyectos del equipo — confirmar si prefieres otra cosa)
- **Autenticación:** magic links por token, sin contraseñas. El GAS filtra qué datos devuelve según el token y el rol asociado.

---

## Modelo de datos (Sheets maestro)

### `proyectos`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| nombre | texto | Escuela Nueva, Posprimaria, Educación Media, Escuela y Café, Seguridad Alimentaria, Escuela Virtual, La Universidad en el Campo |
| lideres_ids | texto | IDs de usuarios líderes de este proyecto (uno o más) |

### `aliados`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| nombre | texto | Nombre del aliado que financia |

### `convenios`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| nombre | texto | Nombre del convenio |
| aliado_id | texto | Aliado que lo financia (1 por convenio) |
| anio_vigencia | número | Año fiscal del convenio |
| fecha_inicio | fecha | |
| fecha_fin | fecha | |
| estado | texto | Activo / Cerrado |

### `convenio_proyectos` (relación muchos-a-muchos)
| Columna | Tipo | Descripción |
|---|---|---|
| convenio_id | texto | |
| proyecto_id | texto | |

### `metas`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| convenio_id | texto | Convenio al que pertenece |
| descripcion | texto | Ej: "Visitas de asesoría y acompañamiento", "Microcentros rurales", "Docentes capacitados" |
| cantidad_meta | número | Meta numérica a cumplir |
| tipo | texto | `visita_focalizada` / `visita_sin_focalizar` / `otro_indicador` |

> Solo las metas de tipo `visita_focalizada` y `visita_sin_focalizar` tienen seguimiento por padrino. Las de tipo `otro_indicador` (microcentros, docentes capacitados, dotaciones, etc.) se registran en agregado directamente sobre la meta (campo `cantidad_realizada` a nivel de meta).

### `focalizacion`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| meta_id | texto | Meta de tipo `visita_focalizada` a la que pertenece |
| municipio | texto | Referenciado del catálogo Mun/IE/Sedes |
| institucion | texto | Referenciado del catálogo |
| sede | texto | Referenciado del catálogo |
| padrino_id | texto | Padrino asignado (reasignable) |
| estado | texto | `pendiente` / `programada` / `realizada` |
| fecha_programada | fecha | Se llena cuando pasa a `programada` |
| fecha_realizada | fecha | Se llena cuando pasa a `realizada` |

### `asignaciones_sin_focalizacion`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| meta_id | texto | Meta de tipo `visita_sin_focalizar` a la que pertenece |
| padrino_id | texto | Padrino asignado |
| cantidad_asignada | número | Visitas asignadas a ese padrino dentro de esta meta |
| cantidad_realizada | número | Visitas ya marcadas como realizadas |

### `usuarios`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| nombre | texto | |
| correo | texto | Para envío futuro de magic links |
| rol | texto | `admin` / `lider` / `padrino` |
| proyectos_ids | texto | Proyectos asociados (aplica a líderes) |
| token | texto | Token único para el magic link |

### Catálogo externo (no se duplica)
**Sheets:** Mun/IE/Sedes — `1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog`
**Columnas:** Municipio | Institución Educativa | Sede (sin ID propio)

El GAS lo lee directamente vía `SpreadsheetApp.openById()` para poblar los selectores de focalización. Como no tiene ID, la llave de referencia es la combinación `municipio + institución + sede`.

---

## Relaciones

- `proyecto` 1:N `usuarios` (líderes)
- `convenio` N:M `proyecto` (vía `convenio_proyectos`)
- `convenio` 1:N `metas`
- `meta` (focalizada) 1:N `focalizacion`
- `meta` (sin focalizar) 1:N `asignaciones_sin_focalizacion`
- `usuarios` (padrino) 1:N `focalizacion` / `asignaciones_sin_focalizacion`

---

## Roles y accesos

| Rol | Puede ver | Puede editar |
|---|---|---|
| Admin / Coordinador | Todo | Todo: crear/editar convenios, metas, aliados; asignar/reasignar; programar y marcar visitas |
| Líder de proyecto | Solo su(s) proyecto(s): convenios, metas, avance, focalización, carga de padrinos | Nada (solo lectura) |
| Padrino | Solo su propia información: sus focalizaciones y asignaciones, con su estado | Nada (solo lectura) |

---

## Paneles / Vistas

1. **Tabla de convenios** — proyecto(s), aliado, vigencia, y cada meta con cantidad meta / realizado / % de cumplimiento.
2. **Carga de padrinos** — por padrino: visitas asignadas y realizadas, desglosadas por proyecto/convenio. Sirve para nivelar el trabajo del equipo.
3. **Visitas por sede** — por institución/sede: realizadas, programadas, total proyectado (realizadas + programadas) vs. meta, con fecha y padrino asignado. Filtros: proyecto, municipio, padrino.
4. **Panel admin** — CRUD de convenios/metas/aliados, asignación y reasignación de focalización y visitas sin focalizar, programación de fechas, marcar visitas como realizadas.
5. **Vista líder** — solo lectura de sus proyectos asociados.
6. **Vista padrino** — solo sus propias asignaciones y su estado.

---

## Próximos pasos sugeridos

1. Diseñar el contrato de API del GAS (endpoints, formato JSON de entrada/salida) — equivalente al `GAS.md` que hicimos en Seguimiento a Egresados.
2. Definir wireframes/estructura de cada panel.
3. Armar el plan de fases de implementación (equivalente al `PLAN.md`).
4. Pasar a Claude Code en VS Code.
