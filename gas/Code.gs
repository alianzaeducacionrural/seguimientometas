// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

const HOJAS = {
  PROYECTOS:                     'proyectos',
  ALIADOS:                       'aliados',
  CONVENIOS:                     'convenios',
  CONVENIO_PROYECTOS:            'convenio_proyectos',
  METAS:                         'metas',
  FOCALIZACION:                  'focalizacion',
  ASIGNACIONES_SIN_FOCALIZACION: 'asignaciones_sin_focalizacion',
  USUARIOS:                      'usuarios',
};

// Encabezados por hoja, en el orden exacto en que se escriben las columnas.
// Fuente de verdad: PROYECTO_SEGUIMIENTO_CONVENIOS.md → "Modelo de datos".
const ENCABEZADOS = {
  [HOJAS.PROYECTOS]: ['id', 'nombre', 'lideres_ids'],
  [HOJAS.ALIADOS]: ['id', 'nombre'],
  [HOJAS.CONVENIOS]: [
    'id', 'nombre', 'aliado_id', 'anio_vigencia',
    'fecha_inicio', 'fecha_fin', 'estado',
  ],
  [HOJAS.CONVENIO_PROYECTOS]: ['convenio_id', 'proyecto_id'],
  [HOJAS.METAS]: [
    'id', 'convenio_id', 'descripcion', 'cantidad_meta', 'tipo',
    'cantidad_realizada',
  ],
  [HOJAS.FOCALIZACION]: [
    'id', 'meta_id', 'municipio', 'institucion', 'sede', 'padrino_id',
    'estado', 'fecha_programada', 'fecha_realizada',
  ],
  [HOJAS.ASIGNACIONES_SIN_FOCALIZACION]: [
    'id', 'meta_id', 'padrino_id', 'cantidad_asignada', 'cantidad_realizada',
  ],
  [HOJAS.USUARIOS]: [
    'id', 'nombre', 'correo', 'rol', 'proyectos_ids', 'token',
  ],
};

// Entidades de catálogo editables desde el panel admin en Fase 1.
// Mapea el nombre usado por la API (?action=, {entidad:}) a su hoja.
const ENTIDADES_CRUD = {
  proyectos: HOJAS.PROYECTOS,
  aliados: HOJAS.ALIADOS,
  usuarios: HOJAS.USUARIOS,
};

// Catálogo externo de Municipio/Institución/Sede (solo lectura, no se duplica).
const CATALOGO_EXTERNO = {
  SHEET_ID: '1sDwOuJk0x1mO6lxJbzzWTd088SOg7fAWEuXSZEM1Eog',
  HOJA: 'Mun/IE/Sedes',
};

// ─────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL — Router HTTP
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || '';
  try {
    if (action === 'ping') return responder({ ok: true, mensaje: 'hola mundo' });
    if (action === 'catalogoIE') return responder(getCatalogoIE());
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

function listarFilas(nombreHoja) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
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

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const registro = Object.assign({}, datos, { id: String(siguienteId(hoja)) });

  // El token de usuarios es una credencial de magic-link: lo genera el
  // servidor, nunca se acepta el que mande el cliente.
  if (entidad === 'usuarios') {
    registro.token = generarToken(tokensExistentes(hoja));
  }

  const fila = encabezados.map(campo => (registro[campo] !== undefined ? registro[campo] : ''));
  hoja.appendRow(fila);

  return { ok: true, datos: registro };
}

function editarRegistro(entidad, id, cambios) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no válida' };

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
  const encabezados = ENCABEZADOS[nombreHoja];
  const fila = encontrarFilaPorId(hoja, id);
  if (!fila) return { ok: false, error: 'No encontrado' };

  encabezados.forEach((campo, i) => {
    if (campo === 'id' || campo === 'token') return;
    if (cambios[campo] !== undefined) {
      hoja.getRange(fila, i + 1).setValue(cambios[campo]);
    }
  });

  return { ok: true };
}

function eliminarRegistro(entidad, id) {
  const nombreHoja = ENTIDADES_CRUD[entidad];
  if (!nombreHoja) return { ok: false, error: 'Entidad no válida' };

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombreHoja);
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

function mapaDeSetsAArrays(mapaDeSets) {
  const resultado = {};
  Object.keys(mapaDeSets).forEach(clave => {
    resultado[clave] = Array.from(mapaDeSets[clave]).sort();
  });
  return resultado;
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
