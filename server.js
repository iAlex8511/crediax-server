// server.js – Servidor CrediaX

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware básico
app.use(cors());
app.use(express.json());

// ----------------- Multer (subida de archivo en memoria) -----------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 200 * 1024 * 1024 // hasta 200 MB por si tu Database crece
  }
});

// Variables globales para guardar la base ya procesada
global.databaseRows = [];
global.lastUpdate = null;

// ----------------- Endpoint simple de prueba -----------------
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor CrediaX funcionando 🚀',
    clientesEndpoint: '/api/clientes',
    uploadEndpoint: '/api/upload-database'
  });
});

// ----------------- SUBIR Database.xlsm -----------------
app.post('/api/upload-database', upload.single('archivoR'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: 'No se recibió ningún archivo. El campo debe llamarse "archivoR".'
      });
    }

    console.log('Archivo recibido:', {
      nombre: req.file.originalname,
      'tamaño_bytes': req.file.size,
      mimetype: req.file.mimetype
    });

    // Leer el buffer del archivo con XLSX
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });

    // Buscar una hoja llamada "Database" o tomar la primera
    const sheetName =
      workbook.SheetNames.includes('Database')
        ? 'Database'
        : workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return res.status(400).json({
        ok: false,
        message: `No se encontró la hoja "Database" en el archivo.`
      });
    }

    // Convertir a JSON (cada fila un objeto)
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    global.databaseRows = rows;
    global.lastUpdate = new Date().toISOString();

    console.log(`Base procesada. Filas: ${rows.length}`);

    return res.json({
      ok: true,
      message: 'Database subido y procesado correctamente en el servidor.',
      rows: rows.length,
      lastUpdate: global.lastUpdate
    });
  } catch (err) {
    console.error('Error procesando el Excel:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error interno al procesar el archivo en el servidor.',
      error: err.message || String(err)
    });
  }
});

// ----------------- CONSULTAR CLIENTES -----------------
app.get('/api/clientes', (req, res) => {
  if (!global.databaseRows || global.databaseRows.length === 0) {
    return res.status(404).json({
      ok: false,
      message: 'No hay datos cargados en el servidor.'
    });
  }

  res.json({
    ok: true,
    total: global.databaseRows.length,
    data: global.databaseRows,
    lastUpdate: global.lastUpdate
  });
});

// ----------------- Arrancar servidor -----------------
app.listen(PORT, () => {
  console.log(`Servidor CrediaX escuchando en el puerto ${PORT}`);
});
