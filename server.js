const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de multer (archivo en memoria)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 80 * 1024 * 1024 // hasta ~80 MB
  }
});

// Middleware global
app.use(cors());
app.use(express.json());

// Endpoint de prueba
app.get('/api/hello', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor CrediaX funcionando 🚀'
  });
});

// Endpoint para recibir el archivo R / Database
// IMPORTANTE: el campo se llamará 'archivoR'
app.post('/api/upload-database', upload.single('archivoR'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: 'No se recibió ningún archivo'
    });
  }

  console.log('Archivo recibido:', {
    nombre: req.file.originalname,
    tamaño_bytes: req.file.size,
    mimetype: req.file.mimetype
  });

  // Más adelante: aquí procesaremos el Excel/CSV con XLSX
  // const buffer = req.file.buffer;

  res.json({
    ok: true,
    message: 'Archivo recibido correctamente en el servidor',
    filename: req.file.originalname,
    size: req.file.size
  });
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor CrediaX escuchando en el puerto ${PORT}`);
});
