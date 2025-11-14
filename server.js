// ========================================
//  Servidor CrediaX - Node + Express
// ========================================

const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 10000;

// Habilitar CORS para que tu app web pueda llamar al servidor
app.use(cors());
app.use(express.json());

// ========================================
//  Configuración de Multer (subida en memoria)
// ========================================

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  // opcional: limitar tamaño, por ejemplo 100MB
  // limits: { fileSize: 100 * 1024 * 1024 }
});

// ========================================
//  Variables globales para guardar el Database procesado
// ========================================

global.databaseRows = [];
global.lastUpdate = null;

// ========================================
//  Endpoint de prueba (root)
// ========================================

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor CrediaX funcionando 🚀',
    lastUpdate: global.lastUpdate,
    totalRows: global.databaseRows ? global.databaseRows.length : 0
  });
});

// ========================================
//  POST /api/upload-database
//  Sube el Database.xlsm, lo procesa y lo guarda en memoria
// ========================================

app.post('/api/upload-database', upload.single('archivoR'), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, message: 'No se envió archivo.' });
    }

    console.log('>>> Archivo recibido:');
    console.log('    nombre:', req.file.originalname);
    console.log('    tamaño_bytes:', req.file.size);
    console.log('    mimetype:', req.file.mimetype);

    // Leer el libro de Excel desde el buffer
    const buffer = req.file.buffer;
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // Intentar encontrar la hoja "Database"
    let sheet = workbook.Sheets['Database'];
    if (!sheet) {
      // Si no existe, tomar la primera hoja
      const firstName = workbook.SheetNames[0];
      sheet = workbook.Sheets[firstName];
      console.warn(
        `No se encontró hoja "Database", usando la primera hoja: ${firstName}`
      );
    }

    if (!sheet) {
      return res.status(400).json({
        ok: false,
        message: 'No se pudo encontrar ninguna hoja en el archivo.'
      });
    }

    // Convertir a JSON
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    console.log(`>>> Filas procesadas: ${rows.length}`);

    // Guardar en memoria global
    global.databaseRows = rows;
    global.lastUpdate = new Date().toISOString();

    return res.json({
      ok: true,
      message: 'Database subido y procesado correctamente en el servidor.',
      rows: rows.length,
      lastUpdate: global.lastUpdate
    });
  } catch (err) {
    console.error('Error procesando archivo:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error procesando el archivo en el servidor.',
      error: err.message
    });
  }
});

// ========================================
//  GET /api/clientes
//  Devuelve la base procesada que está en memoria
// ========================================

app.get('/api/clientes', (req, res) => {
  if (!global.databaseRows || global.databaseRows.length === 0) {
    return res
      .status(404)
      .json({ ok: false, message: 'No hay datos cargados en el servidor.' });
  }

  res.json({
    ok: true,
    total: global.databaseRows.length,
    data: global.databaseRows,
    lastUpdate: global.lastUpdate
  });
});

// ========================================
//  Arrancar servidor
// ========================================

app.listen(port, () => {
  console.log(`Servidor CrediaX escuchando en el puerto ${port}`);
});
