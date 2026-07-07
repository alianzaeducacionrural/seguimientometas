// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

const HOJAS = {
  PROYECTOS:                     'proyectos',
  ACTIVIDADES:                   'actividades',
  ALIADOS:                       'aliados',
  CONVENIOS:                     'convenios',
  CONVENIO_PROYECTOS:            'convenio_proyectos',
  METAS:                         'metas',
  FOCALIZACION:                  'focalizacion',
  ASIGNACIONES_SIN_FOCALIZACION: 'asignaciones_sin_focalizacion',
  AVANCES_MANUALES:              'avances_manuales',
  USUARIOS:                      'usuarios',
};

// Encabezados por hoja, en el orden exacto en que se escriben las columnas.
// Fuente de verdad: PROYECTO_SEGUIMIENTO_CONVENIOS.md → "Modelo de datos".
const ENCABEZADOS = {
  [HOJAS.PROYECTOS]: ['id', 'nombre', 'lideres_ids'],
  // Catálogo de actividades de cada proyecto: en el alta de metas primero
  // se elige proyecto y las actividades ofrecidas dependen de él.
  [HOJAS.ACTIVIDADES]: ['id', 'proyecto_id', 'nombre'],
  [HOJAS.ALIADOS]: ['id', 'nombre'],
  [HOJAS.CONVENIOS]: [
    'id', 'nombre', 'aliado_id', 'anio_vigencia',
    'fecha_inicio', 'fecha_fin', 'estado', 'proyectos_ids',
  ],
  // convenio_proyectos queda sin usar: la relación convenio↔proyecto se
  // guarda como proyectos_ids directo en convenios (mismo criterio que
  // usuarios.proyectos_ids en Fase 1) para no mantener dos hojas en sync.
  [HOJAS.CONVENIO_PROYECTOS]: ['convenio_id', 'proyecto_id'],
  [HOJAS.METAS]: [
    'id', 'convenio_id', 'proyecto_id', 'descripcion', 'cantidad_meta', 'tipo',
    'cantidad_realizada',
  ],
  [HOJAS.FOCALIZACION]: [
    'id', 'meta_id', 'municipio', 'institucion', 'sede', 'padrino_id',
    'estado', 'fecha_programada', 'fecha_realizada',
  ],
  [HOJAS.ASIGNACIONES_SIN_FOCALIZACION]: [
    'id', 'meta_id', 'padrino_id', 'cantidad_asignada', 'cantidad_realizada',
  ],
  // Registros de avance para metas "otro_indicador" (Manual en la interfaz):
  // cada fila es un incremento con fecha, en vez de sobrescribir una cifra
  // única — el ejecutado de la meta se calcula sumando estos registros
  // (ver ejecutadoDe en src/utils/avance.js).
  [HOJAS.AVANCES_MANUALES]: [
    'id', 'meta_id', 'cantidad', 'fecha',
  ],
  [HOJAS.USUARIOS]: [
    'id', 'nombre', 'correo', 'rol', 'proyectos_ids', 'token',
  ],
};

// Entidades de catálogo editables desde el panel admin en Fase 1.
// Mapea el nombre usado por la API (?action=, {entidad:}) a su hoja.
const ENTIDADES_CRUD = {
  proyectos: HOJAS.PROYECTOS,
  actividades: HOJAS.ACTIVIDADES,
  aliados: HOJAS.ALIADOS,
  usuarios: HOJAS.USUARIOS,
  convenios: HOJAS.CONVENIOS,
  metas: HOJAS.METAS,
  focalizacion: HOJAS.FOCALIZACION,
  asignaciones_sin_focalizacion: HOJAS.ASIGNACIONES_SIN_FOCALIZACION,
  avances_manuales: HOJAS.AVANCES_MANUALES,
};

// Catálogo externo (solo lectura, no se duplica): el mismo archivo tiene la
// pestaña Mun/IE/Sedes y la pestaña de padrinos (nombre + correo en las
// columnas A:B). La de padrinos se ubica por gid y no por nombre, para que
// un cambio de nombre de la pestaña no rompa la integración.
const CATALOGO_EXTERNO = {
  SHEET_ID: '1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog',
  HOJA: 'Mun/IE/Sedes',
  GID_PADRINOS: 1978199793,
};

// ─────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL — Router HTTP
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || '';
  try {
    if (action === 'ping') return responder({ ok: true, mensaje: 'hola mundo' });
    if (action === 'catalogoIE') return responder(getCatalogoIE());
    if (action === 'catalogoPadrinos') return responder(getCatalogoPadrinos());
    if (action === 'liderConvenios') return responder(getLiderConvenios(e.parameter.token));
    if (action === 'padrinoResumen') return responder(getPadrinoResumen(e.parameter.token));
    if (ENTIDADES_CRUD[action]) {
      return responder({ ok: true, datos: listarFilas(ENTIDADES_CRUD[action]) });
    }
    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.accion === 'importarPadrinos') return responder(importarPadrinosCatalogo());
    if (body.accion === 'crear') return responder(crearRegistro(body.entidad, body.datos || {}));
    if (body.accion === 'editar') return responder(editarRegistro(body.entidad, body.id, body.datos || {}));
    if (body.accion === 'eliminar') return responder(eliminarRegistro(body.entidad, body.id));
    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function responder(datos) {
  return ContentService
    .createTextOutput(JSON.stringify(datos))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────────────────────
// CRUD genérico — proyectos, aliados, usuarios (Fase 1)
// ─────────────────────────────────────────────────────────────

// Alinea la hoja física con ENCABEZADOS cuando el esquema crece: expande el
// ancho si faltan columnas y reescribe la fila de encabezados. Con datos ya
// cargados esto solo es seguro si las columnas nuevas van AL FINAL o si la
// hoja está vacía — una reordenación con datos requiere migración manual.
function asegurarEsquema(hoja, encabezados) {
  if (hoja.getMaxColumns() < encabezados.length) {
    hoja.insertColumnsAfter(hoja.getMaxColumns(), encabezados.length - hoja.getMaxColumns());
  }
  const actuales = hoja.getRange(1, 1, 1, encabezados.length).getValues()[0];
  if (encabezados.some((campo, i) => String(actuales[i]).trim() !== campo)) {
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
  }
}

// Devuelve la pestaña de una entidad, creándola con sus encabezados si no
// existe todavía (permite agregar hojas nuevas a HOJAS/ENCABEZADOS sin
// pasos manuales en el Sheets).
function hojaDe(nombreHoja) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(nombreHoja);
  if (!hoja) {
    hoja = ss.insertSheet(nombreHoja);
    hoja.setFrozenRows(1);
  }
  asegurarEsquema(hoja, ENCABEZADOS[nombreHoja]);
  return hoja;
}

function listarFilas(nombreHoja) {
  const hoja = hojaDe(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return [];

  const filas = hoja.getRange(2, 1, lastRow - 1, encabezados.length).getValues();
  return filas
    .filter(fila => String(fila[0]).trim() !== '')
    .map(fila => {
      const obj = {};
      encabezados.forEach((campo, i) => { obj[campo] = fila[i]; });
      return obj;
    });
}

function crearRegistro(entidad, datos) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no válida' };

  const hoja = hojaDe(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const registro = Object.assign({}, datos, { id: String(siguienteId(hoja)) });

  // El token de usuarios es una credencial de magic-link: lo genera el
  // servidor, nunca se acepta el que mande el cliente.
  if (entidad === 'usuarios') {
    registro.token = generarToken(tokensExistentes(hoja));
  }

  const filaIndex = hoja.getLastRow() + 1;
  encabezados.forEach((campo, i) => {
    escribirValor(hoja, filaIndex, i + 1, campo, registro[campo] !== undefined ? registro[campo] : '');
  });

  return { ok: true, datos: registro };
}

function editarRegistro(entidad, id, cambios) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no válida' };

  const hoja = hojaDe(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const fila = encontrarFilaPorId(hoja, id);
  if (!fila) return { ok: false, error: 'No encontrado' };

  encabezados.forEach((campo, i) => {
    if (campo === 'id' || campo === 'token') return;
    if (cambios[campo] !== undefined) {
      escribirValor(hoja, fila, i + 1, campo, cambios[campo]);
    }
  });

  return { ok: true };
}

// Campos "*_ids" (proyectos_ids, lideres_ids) guardan listas separadas por
// coma como "1,2". Sin forzar formato de texto, Sheets interpreta esa coma
// como separador decimal (locale es-*) y silenciosamente convierte "1,2" en
// el número 1.2, corrompiendo la relación. setNumberFormat('@') antes de
// escribir evita que eso vuelva a pasar.
function escribirValor(hoja, filaIndex, colIndex, campo, valor) {
  const rango = hoja.getRange(filaIndex, colIndex);
  if (campo.endsWith('_ids')) rango.setNumberFormat('@');
  rango.setValue(valor);
}

function eliminarRegistro(entidad, id) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no válida' };

  const hoja = hojaDe(nombreHoja);
  const fila = encontrarFilaPorId(hoja, id);
  if (!fila) return { ok: false, error: 'No encontrado' };

  hoja.deleteRow(fila);
  return { ok: true };
}

function encontrarFilaPorId(hoja, id) {
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return null;
  const ids = hoja.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === String(id).trim()) return i + 2;
  }
  return null;
}

function siguienteId(hoja) {
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return 1;
  const ids = hoja.getRange(2, 1, lastRow - 1, 1).getValues()
    .map(fila => parseInt(fila[0], 10))
    .filter(n => !isNaN(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function tokensExistentes(hojaUsuarios) {
  const colToken = ENCABEZADOS[HOJAS.USUARIOS].indexOf('token') + 1;
  const lastRow = hojaUsuarios.getLastRow();
  if (lastRow < 2) return new Set();
  return new Set(
    hojaUsuarios.getRange(2, colToken, lastRow - 1, 1).getValues()
      .map(fila => String(fila[0]).trim())
      .filter(t => t !== '')
  );
}

function generarToken(existentes) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token;
  do {
    token = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (existentes.has(token));
  return token;
}

// ─────────────────────────────────────────────────────────────
// Catálogo externo Mun/IE/Sedes (Fase 1 — selector en cascada)
// ─────────────────────────────────────────────────────────────

function getCatalogoIE() {
  const hoja = SpreadsheetApp.openById(CATALOGO_EXTERNO.SHEET_ID).getSheetByName(CATALOGO_EXTERNO.HOJA);
  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return { ok: true, municipios: [], instituciones: {}, sedes: {} };

  const filas = hoja.getRange(2, 1, lastRow - 1, 3).getValues();
  const municipios = new Set();
  const institucionesPorMunicipio = {};
  const sedesPorInstitucion = {};

  filas.forEach(fila => {
    const municipio = String(fila[0]).trim();
    const institucion = String(fila[1]).trim();
    const sede = String(fila[2]).trim();
    if (!municipio || !institucion || !sede) return;

    municipios.add(municipio);

    if (!institucionesPorMunicipio[municipio]) institucionesPorMunicipio[municipio] = new Set();
    institucionesPorMunicipio[municipio].add(institucion);

    const clave = `${municipio}||${institucion}`;
    if (!sedesPorInstitucion[clave]) sedesPorInstitucion[clave] = new Set();
    sedesPorInstitucion[clave].add(sede);
  });

  return {
    ok: true,
    municipios: Array.from(municipios).sort(),
    instituciones: mapaDeSetsAArrays(institucionesPorMunicipio),
    sedes: mapaDeSetsAArrays(sedesPorInstitucion),
  };
}

// Lista de padrinos (nombre + correo) desde las columnas A:B de la pestaña
// de padrinos del catálogo externo. Es la fuente de verdad para el alta de
// usuarios con rol padrino: en el panel se eligen de esta lista en vez de
// digitarlos, y el correo se llena solo.
function getCatalogoPadrinos() {
  const ss = SpreadsheetApp.openById(CATALOGO_EXTERNO.SHEET_ID);
  const hoja = ss.getSheets().find(h => h.getSheetId() === CATALOGO_EXTERNO.GID_PADRINOS);
  if (!hoja) return { ok: false, error: 'No se encontró la pestaña de padrinos en el catálogo' };

  const lastRow = hoja.getLastRow();
  if (lastRow < 2) return { ok: true, padrinos: [] };

  const filas = hoja.getRange(2, 1, lastRow - 1, 2).getValues();
  const padrinos = filas
    .map(fila => ({ nombre: String(fila[0]).trim(), correo: String(fila[1]).trim() }))
    .filter(p => p.nombre && p.correo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return { ok: true, padrinos };
}

// Carga masiva: crea un usuario rol "padrino" (con su token de magic-link)
// por cada padrino del catálogo que aún no exista en la hoja usuarios.
// Deduplica por correo (case-insensitive), así que es idempotente: volver a
// ejecutarla solo agrega los padrinos nuevos que hayan sumado al catálogo.
function importarPadrinosCatalogo() {
  const catalogo = getCatalogoPadrinos();
  if (!catalogo.ok) return catalogo;

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.USUARIOS);
  const encabezados = ENCABEZADOS[HOJAS.USUARIOS];
  const correosExistentes = new Set(
    listarFilas(HOJAS.USUARIOS).map(u => String(u.correo).trim().toLowerCase())
  );
  const tokens = tokensExistentes(hoja);
  let creados = 0;

  catalogo.padrinos.forEach(p => {
    if (correosExistentes.has(p.correo.toLowerCase())) return;

    const registro = {
      id: String(siguienteId(hoja)),
      nombre: p.nombre,
      correo: p.correo,
      rol: 'padrino',
      proyectos_ids: '',
      token: generarToken(tokens),
    };
    tokens.add(registro.token);
    correosExistentes.add(p.correo.toLowerCase());

    const filaIndex = hoja.getLastRow() + 1;
    encabezados.forEach((campo, i) => {
      escribirValor(hoja, filaIndex, i + 1, campo, registro[campo] !== undefined ? registro[campo] : '');
    });
    creados++;
  });

  return { ok: true, creados, omitidos: catalogo.padrinos.length - creados };
}

function mapaDeSetsAArrays(mapaDeSets) {
  const resultado = {};
  Object.keys(mapaDeSets).forEach(clave => {
    resultado[clave] = Array.from(mapaDeSets[clave]).sort();
  });
  return resultado;
}

// ─────────────────────────────────────────────────────────────
// Accesos por rol (magic links) — Fase 6
//
// El filtrado por rol se hace acá, en el servidor: un padrino nunca recibe
// en la respuesta HTTP las focalizaciones/asignaciones de otro padrino, ni
// un líder los convenios de proyectos que no lidera — no es solo una vista
// que se oculta en el frontend.
// ─────────────────────────────────────────────────────────────

function usuarioPorToken(token) {
  if (!token) return null;
  return listarFilas(HOJAS.USUARIOS).find(u => String(u.token).trim() === String(token).trim()) || null;
}

function idsDeLista(valor) {
  return String(valor || '').split(',').map(s => s.trim()).filter(Boolean);
}

function getLiderConvenios(token) {
  const usuario = usuarioPorToken(token);
  if (!usuario) return { ok: false, error: 'Token inválido' };
  if (usuario.rol !== 'lider') return { ok: false, error: 'Este token no corresponde a un líder' };

  const misProyectosIds = idsDeLista(usuario.proyectos_ids);

  const convenios = listarFilas(HOJAS.CONVENIOS).filter(c =>
    idsDeLista(c.proyectos_ids).some(pid => misProyectosIds.includes(pid))
  );
  const convenioIds = convenios.map(c => String(c.id));

  const metas = listarFilas(HOJAS.METAS).filter(m => convenioIds.includes(String(m.convenio_id)));
  const metaIds = metas.map(m => String(m.id));

  const focalizacion = listarFilas(HOJAS.FOCALIZACION).filter(f => metaIds.includes(String(f.meta_id)));
  const asignaciones = listarFilas(HOJAS.ASIGNACIONES_SIN_FOCALIZACION).filter(a => metaIds.includes(String(a.meta_id)));

  // Todos los padrinos Y líderes (no solo los ya involucrados): una visita
  // se le puede asignar a cualquier padrino o a cualquier líder, incluyendo
  // a quien todavía no tiene carga. Solo id+nombre — no necesita ver correo
  // ni token de nadie más.
  const padrinos = listarFilas(HOJAS.USUARIOS)
    .filter(u => u.rol === 'padrino' || u.rol === 'lider')
    .map(u => ({ id: u.id, nombre: u.nombre }));

  return {
    ok: true,
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    proyectos: listarFilas(HOJAS.PROYECTOS).filter(p => misProyectosIds.includes(String(p.id))),
    aliados: listarFilas(HOJAS.ALIADOS),
    convenios,
    metas,
    focalizacion,
    asignaciones,
    padrinos,
  };
}

function getPadrinoResumen(token) {
  const usuario = usuarioPorToken(token);
  if (!usuario) return { ok: false, error: 'Token inválido' };
  if (usuario.rol !== 'padrino') return { ok: false, error: 'Este token no corresponde a un padrino' };

  const focalizacion = listarFilas(HOJAS.FOCALIZACION).filter(f => String(f.padrino_id) === String(usuario.id));
  const asignaciones = listarFilas(HOJAS.ASIGNACIONES_SIN_FOCALIZACION).filter(a => String(a.padrino_id) === String(usuario.id));

  const metaIds = new Set([...focalizacion.map(f => String(f.meta_id)), ...asignaciones.map(a => String(a.meta_id))]);
  const metas = listarFilas(HOJAS.METAS).filter(m => metaIds.has(String(m.id)));
  const metaPorId = Object.fromEntries(metas.map(m => [String(m.id), m]));

  const convenioIds = new Set(metas.map(m => String(m.convenio_id)));
  const convenios = listarFilas(HOJAS.CONVENIOS).filter(c => convenioIds.has(String(c.id)));
  const convenioPorId = Object.fromEntries(convenios.map(c => [String(c.id), c]));

  const proyectoPorId = Object.fromEntries(listarFilas(HOJAS.PROYECTOS).map(p => [String(p.id), p]));

  function conContexto(item) {
    const meta = metaPorId[String(item.meta_id)];
    const convenio = meta && convenioPorId[String(meta.convenio_id)];
    const proyecto = meta && proyectoPorId[String(meta.proyecto_id)];
    return Object.assign({}, item, {
      meta_descripcion: meta ? meta.descripcion : '',
      meta_tipo: meta ? meta.tipo : '',
      convenio_nombre: convenio ? convenio.nombre : '',
      proyecto_nombre: proyecto ? proyecto.nombre : '',
    });
  }

  return {
    ok: true,
    usuario: { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
    focalizacion: focalizacion.map(conContexto),
    asignaciones: asignaciones.map(conContexto),
  };
}

// ─────────────────────────────────────────────────────────────
// FUNCIÓN MANUAL — setupHojas()
// Ejecutar una sola vez desde el editor de GAS (Fase 0) para crear
// las pestañas del Sheets maestro con sus encabezados. Es idempotente:
// si una pestaña ya existe solo verifica/corrige la fila de encabezados.
// ─────────────────────────────────────────────────────────────

function setupHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombresHojas = Object.values(HOJAS);
  let creadas = 0;

  nombresHojas.forEach(nombre => {
    let hoja = ss.getSheetByName(nombre);
    if (!hoja) {
      hoja = ss.insertSheet(nombre);
      creadas++;
    }

    const encabezados = ENCABEZADOS[nombre];
    if (hoja.getMaxColumns() < encabezados.length) {
      hoja.insertColumnsAfter(hoja.getMaxColumns(), encabezados.length - hoja.getMaxColumns());
    }
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
    hoja.setFrozenRows(1);

    const columnasSobrantes = hoja.getMaxColumns() - encabezados.length;
    if (columnasSobrantes > 0) {
      hoja.deleteColumns(encabezados.length + 1, columnasSobrantes);
    }
  });

  // La hoja por defecto de un Sheets nuevo ("Hoja 1"/"Sheet1") no forma
  // parte del modelo de datos: se elimina si quedó vacía y sin usar.
  ['Hoja 1', 'Sheet1'].forEach(nombreDefault => {
    const hojaDefault = ss.getSheetByName(nombreDefault);
    if (hojaDefault && hojaDefault.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(hojaDefault);
    }
  });

  Logger.log(
    `✓ setupHojas() listo. ${creadas} pestaña(s) nueva(s) creada(s), ` +
    `${nombresHojas.length} en total verificadas.`
  );
}
