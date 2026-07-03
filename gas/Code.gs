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

// ─────────────────────────────────────────────────────────────
// ENTRADA PRINCIPAL — Router HTTP
// ─────────────────────────────────────────────────────────────

function doGet(e) {
  const action = e.parameter.action || '';
  try {
    if (action === 'ping') return responder({ ok: true, mensaje: 'hola mundo' });
    return responder({ ok: false, error: 'Acción no reconocida' });
  } catch (err) {
    return responder({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
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
