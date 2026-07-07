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

### `actividades`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| proyecto_id | texto | Proyecto dueño de la actividad |
| nombre | texto | Ej: "Visitas de asesoría y acompañamiento", "Microcentros rurales" |

> Catálogo de actividades de cada proyecto. Al crear una meta se elige primero el proyecto y la actividad se escoge de este catálogo (en cascada); el nombre elegido queda guardado en `metas.descripcion`.

### `metas`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| convenio_id | texto | Convenio al que pertenece |
| proyecto_id | texto | Proyecto del área al que corresponde la actividad (uno de los proyectos asociados al convenio) |
| descripcion | texto | Ej: "Visitas de asesoría y acompañamiento", "Microcentros rurales", "Docentes capacitados" |
| cantidad_meta | número | Meta numérica a cumplir |
| tipo | texto | `visita_focalizada` / `visita_sin_focalizar` / `otro_indicador` (mostrado como "Manual" en la interfaz) |

> Ninguno de los 3 tipos guarda una cifra de ejecutado editada a mano sobre la meta: `visita_focalizada` y `visita_sin_focalizar` se calculan contando filas de `focalizacion` en estado `realizada`; `otro_indicador`/Manual se calcula sumando los registros de `avances_manuales` (ver esa tabla más abajo).

### `focalizacion`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| meta_id | texto | Meta a la que pertenece — de tipo `visita_focalizada` (sede preasignada) o `visita_sin_focalizar` (visita registrada después de ocurrida, ver "Registrar visita") |
| municipio | texto | Referenciado del catálogo Mun/IE/Sedes |
| institucion | texto | Referenciado del catálogo |
| sede | texto | Referenciado del catálogo |
| padrino_id | texto | Usuario asignado (reasignable) — un padrino o un líder |
| estado | texto | `pendiente` / `programada` / `realizada` |
| fecha_programada | fecha | Se llena cuando pasa a `programada` |
| fecha_realizada | fecha | Se llena cuando pasa a `realizada` |

> Una visita bajo una meta `visita_sin_focalizar` se registra directo en estado `realizada` (con "Registrar visita": se elige municipio/institución/sede/padrino/fecha) — no pasa por `pendiente`/`programada` porque se carga después de haber ocurrido. Al vivir en la misma hoja que las focalizadas, cuenta sola en el ejecutado de su meta y aparece en Visitas por sede sin pasos extra.

### `asignaciones_sin_focalizacion`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| meta_id | texto | Meta de tipo `visita_sin_focalizar` a la que pertenece |
| padrino_id | texto | Usuario asignado — un padrino o un líder |
| cantidad_asignada | número | Cuota de visitas asignada a ese padrino dentro de esta meta |
| cantidad_realizada | número | Columna heredada, ya no se lee ni se escribe — el realizado real se cuenta desde `focalizacion` (ver arriba) |

### `avances_manuales`
| Columna | Tipo | Descripción |
|---|---|---|
| id | texto | Identificador único |
| meta_id | texto | Meta de tipo `otro_indicador`/Manual a la que pertenece |
| cantidad | número | Incremento registrado (ej. +5) |
| fecha | fecha | Fecha del registro |

> Cada "Registrar avance" agrega una fila acá en vez de sobrescribir una cifra única sobre la meta; el ejecutado de la meta es la suma de estos registros.

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
- `meta` (focalizada o sin focalizar) 1:N `focalizacion`
- `meta` (sin focalizar) 1:N `asignaciones_sin_focalizacion` (la cuota, aparte del registro de visitas)
- `meta` (Manual/otro_indicador) 1:N `avances_manuales`
- `usuarios` (padrino o líder) 1:N `focalizacion` / `asignaciones_sin_focalizacion`

---

## Roles y accesos

| Rol | Puede ver | Puede editar |
|---|---|---|
| Admin / Coordinador | Todo | Todo: crear/editar convenios, metas, aliados; asignar/reasignar; programar y marcar visitas |
| Líder de proyecto | Solo su(s) proyecto(s): convenios, metas, avance, focalización, carga de padrinos | Focalización de sus proyectos: reasignar padrino, programar/marcar realizada/volver a pendiente. El resto (convenios, metas, aliados) solo lectura |
| Padrino | Solo su propia información: sus focalizaciones y asignaciones, con su estado | Nada (solo lectura) |

---

## Paneles / Vistas

1. **Tabla de convenios** — proyecto(s), aliado, vigencia, y cada meta con cantidad meta / realizado / % de cumplimiento.
2. **Carga de padrinos** — por padrino: visitas asignadas y realizadas, desglosadas por proyecto/convenio. Sirve para nivelar el trabajo del equipo.
3. **Focalización** — gestiona toda la focalización y las visitas sin focalizar sin entrar a la tabla de convenios: filtro por proyecto, acordeón por convenio con el alta/reasignación/cambio de estado de cada una de sus metas.
4. **Visitas por sede** — agrupada por sede: cuántas visitas tiene por proyecto, y al elegir un proyecto el detalle (fecha, padrino, estado) de esas visitas puntuales. Filtros: proyecto, municipio, padrino.
5. **Panel admin** — CRUD de convenios/metas/aliados, asignación y reasignación de focalización y visitas sin focalizar, programación de fechas, marcar visitas como realizadas.
6. **Vista líder** — sus proyectos asociados (uno o varios) en 3 pestañas: seguimiento a metas, focalización (acá gestiona: reasignar padrino y cambiar estado de la visita) y tus visitas focalizadas (sus propias visitas asignadas como visitante, de solo lectura, igual que el panel de un padrino — puede tener visitas en proyectos que no lidera).
7. **Vista padrino** — solo sus propias asignaciones y su estado.

---

## Próximos pasos sugeridos

1. Diseñar el contrato de API del GAS (endpoints, formato JSON de entrada/salida) — equivalente al `GAS.md` que hicimos en Seguimiento a Egresados.
2. Definir wireframes/estructura de cada panel.
3. Armar el plan de fases de implementación (equivalente al `PLAN.md`).
4. Pasar a Claude Code en VS Code.
