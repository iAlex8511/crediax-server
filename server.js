// server.js
// Servidor CrediaX con procesamiento en segundo plano del Database.xlsm

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs').promises;
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 10000;

// ===== Middlewares base =====
app.use(cors());
app.use(express.json());

// ===== Configuración de subida de archivos (multer) =====
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Carpeta temporal del contenedor en Render
      cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      cb(null, `Database-${timestamp}.xlsm`);
    }
  }),
  limits: {
    // Límite máx. del archivo – puedes subirlo si ves que el Excel crece
    fileSize: 100 * 1024 * 1024 // 100 MB
  }
});

// ===== Variables globales en memoria =====
global.databaseRows = [];
global.lastUpdate = null;

// ===== Función que procesa el Database en segundo plano =====
async function processDatabase(filePath) {
  try {
    console.log('➡️  Iniciando procesamiento del archivo:', filePath);

    // Leer buffer del archivo
    const buffer = await fs.readFile(filePath);

    console.log('   Archivo leído, tamaño (bytes):', buffer.length);

    // Leer libro de Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Tomar la hoja "Database" o la primera hoja
    const sheet =
      workbook.Sheets['Database'] ||
      workbook.Sheets[workbook.SheetNames[0]];

    if (!sheet) {
      throw new Error('No se encontró la hoja "Database" en el archivo.');
    }

    // Convertir hoja a JSON
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    console.log('   Filas encontradas:', rows.length);

    // Guardar en memoria global
    global.databaseRows = rows;
    global.lastUpdate = new Date().toISOString();

    console.log('✅ Procesamiento completado. Filas cargadas en memoria.');

    // Borrar archivo temporal para liberar espacio
    try {
      await fs.unlink(filePath);
      console.log('   Archivo temporal eliminado:', filePath);
    } catch (errDel) {
      console.warn('   No se pudo eliminar el archivo temporal:', errDel.message);
    }
  } catch (err) {
    console.error('🔥 Error procesando Database:', err);
  }
}

// ===== Endpoint: subir Database.xlsm (se procesa en segundo plano) =====
app.post('/api/upload-database', upload.single('archivoR'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: 'No se recibió ningún archivo con el campo "archivoR".'
    });
  }

  console.log('📁 Archivo recibido:', {
    path: req.file.path,
    originalName: req.file.originalname,
    size: req.file.size
  });

  // Responder RÁPIDO al cliente (Postman / panel privado)
  res.json({
    ok: true,
    message: 'Archivo recibido. Se está procesando en el servidor en segundo plano.',
    filename: req.file.originalname,
    size: req.file.size
  });

  // Procesar en segundo plano (sin esperar para responder)
  processDatabase(req.file.path).catch((err) => {
    console.error('🔥 Error en el procesamiento en background:', err);
  });
});

// ===== Endpoint: obtener datos ya procesados =====
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

// ===== Endpoint simple para probar que el server está vivo =====
app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor CrediaX en línea 🚀',
    hasData: !!(global.databaseRows && global.databaseRows.length),
    lastUpdate: global.lastUpdate
  });
});

// ===== Arrancar servidor =====
app.listen(PORT, () => {
  console.log(`🚀 Servidor CrediaX escuchando en el puerto ${PORT}`);
});
