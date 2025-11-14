const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 10000;

// Habilitar CORS y JSON
app.use(cors());
app.use(express.json());

// Carpeta donde guardaremos el último Database
const DATA_DIR = path.join(__dirname, 'data');
const DATABASE_PATH = path.join(DATA_DIR, 'Database.xlsm');

// Multer: sube a carpeta temporal uploads/
const upload = multer({ dest: path.join(__dirname, 'uploads') });

// Cache de filas en memoria
let cachedRows = null;
let lastUpdate = null;

// Función para leer el XLSM y convertir la hoja "Database" a JSON
function loadRowsFromFile(filePath) {
  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet =
    wb.Sheets['Database'] || wb.Sheets[wb.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows;
}

// ===== RUTA 1: subir Database =====
app.post('/api/upload-database', upload.single('archivoR'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: 'No se recibió archivo. Usa el campo "archivoR".'
      });
    }

    console.log('Archivo recibido:', {
      nombre: req.file.originalname,
      tamano_bytes: req.file.size,
      mimetype: req.file.mimetype
    });

    // Aseguramos la carpeta data/
    fs.mkdirSync(DATA_DIR, { recursive: true });

    // Movemos el archivo temporal a data/Database.xlsm
    fs.renameSync(req.file.path, DATABASE_PATH);

    // Leemos y convertimos a JSON
    cachedRows = loadRowsFromFile(DATABASE_PATH);
    lastUpdate = new Date().toISOString();

    console.log(
      `Database procesado. Filas: ${cachedRows.length}, actualizado: ${lastUpdate}`
    );

    return res.json({
      ok: true,
      message: 'Database subido y procesado correctamente en el servidor.',
      rows: cachedRows.length,
      lastUpdate
    });
  } catch (err) {
    console.error('Error en /api/upload-database:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error procesando el archivo en el servidor.',
      error: err.message
    });
  }
});

// ===== RUTA 2: obtener las filas procesadas =====
app.get('/api/database-rows', (req, res) => {
  try {
    // Si no hay cache, intentamos leer desde disco
    if (!cachedRows) {
      if (!fs.existsSync(DATABASE_PATH)) {
        return res.status(404).json({
          ok: false,
          message: 'Todavía no se ha subido ningún Database al servidor.'
        });
      }

      cachedRows = loadRowsFromFile(DATABASE_PATH);
      if (!lastUpdate) {
        lastUpdate = fs.statSync(DATABASE_PATH).mtime.toISOString();
      }
    }

    return res.json({
      ok: true,
      updatedAt: lastUpdate,
      rows: cachedRows
    });
  } catch (err) {
    console.error('Error en /api/database-rows:', err);
    return res.status(500).json({
      ok: false,
      message: 'Error leyendo el Database en el servidor.',
      error: err.message
    });
  }
});

// Ruta simple de prueba
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor CrediaX funcionando 🚀',
    updatedAt: lastUpdate
  });
});

app.listen(PORT, () => {
  console.log(`Servidor CrediaX escuchando en el puerto ${PORT}`);
});
