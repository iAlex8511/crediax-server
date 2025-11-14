const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();

// Permitir llamadas desde tu app HTML
app.use(cors());
app.use(express.json());

// Multer: archivo en memoria (no se guarda en disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 60 * 1024 * 1024 // hasta ~60 MB
  }
});

// "Base de datos" en memoria
let db = {
  uploadedAt: null,
  clientes: [],          // [{ id, nombre, agente, saldoActual, ... }]
  historiales: {}        // { [idCliente]: [ { ...movimiento } ] }
};

/**
 * Parsea el Database a partir del buffer del archivo
 * Estructura según lo que me confirmaste:
 *  - Source.Name -> agente
 *  - Column1     -> {Customer} / {Transaction}
 *  - Column3     -> customer_id
 *  - Column4     -> nombre (Customer) / fecha (Transaction)
 *  - Column6     -> concepto
 *  - Column7     -> saldo
 *  - Column8     -> importe
 *  - Column10    -> tipo movimiento (S, D, P, etc.)
 */
function parseDatabase(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const clientesMap = new Map(); // id -> cliente
  const movsById = new Map();    // id -> [movimientos]

  for (const row of rows) {
    const tipo = row['Column1'];            // {Customer} / {Transaction}
    const agente = row['Source.Name'] || '';
    const idCliente = String(row['Column3'] || '').trim();
    if (!idCliente) continue;

    if (tipo === '{Customer}') {
      // Fila de cliente
      clientesMap.set(idCliente, {
        id: idCliente,
        nombre: row['Column4'] || '',
        agente,
        saldoActual: Number(row['Column7'] || 0)
        // aquí luego podemos agregar tarifa, frecuencia, etc. si mapeamos más columnas
      });
    } else if (tipo === '{Transaction}') {
      // Fila de movimiento / historial
      const mov = {
        idCliente,
        fecha: row['Column4'] || '',
        concepto: row['Column6'] || '',
        importe: Number(row['Column8'] || 0),
        saldo: Number(row['Column7'] || 0),
        tipoMovimiento: row['Column10'] || ''
      };

      if (!movsById.has(idCliente)) movsById.set(idCliente, []);
      movsById.get(idCliente).push(mov);
    }
  }

  // Ordenar historiales por fecha (asumiendo formato YYYY-MM-DD o similar)
  for (const [id, lista] of movsById) {
    lista.sort((a, b) => (a.fecha > b.fecha ? 1 : a.fecha < b.fecha ? -1 : 0));
  }

  const clientes = Array.from(clientesMap.values());
  const historiales = {};
  for (const [id, lista] of movsById) {
    historiales[id] = lista;
  }

  return { clientes, historiales };
}

// ---- RUTAS ----

// Ping simple
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Servidor CrediaX funcionando 🚀' });
});

// Estado del servidor / base
app.get('/api/status', (req, res) => {
  res.json({
    ok: true,
    uploadedAt: db.uploadedAt,
    clientes: db.clientes.length
  });
});

// Subir y procesar el Database (campo archivo: "archivoR")
app.post('/api/upload-r', upload.single('archivoR'), (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ ok: false, message: 'No se envió ningún archivo.' });
    }

    const { clientes, historiales } = parseDatabase(req.file.buffer);

    db = {
      uploadedAt: new Date().toISOString(),
      clientes,
      historiales
    };

    console.log(
      `Database cargado: ${clientes.length} clientes, ${Object.keys(
        historiales
      ).length} historiales`
    );

    res.json({
      ok: true,
      message: 'Database procesado correctamente en el servidor.',
      clientes: clientes.length
    });
  } catch (err) {
    console.error('Error procesando Database:', err);
    res.status(500).json({
      ok: false,
      message: 'Error al procesar el archivo en el servidor.'
    });
  }
});

// Listar clientes (con búsqueda opcional ?q=)
app.get('/api/clientes', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  let lista = db.clientes;

  if (q) {
    lista = lista.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.agente.toLowerCase().includes(q)
    );
  }

  res.json({ ok: true, clientes: lista });
});

// Historial de un cliente
app.get('/api/clientes/:id/historial', (req, res) => {
  const id = String(req.params.id);
  const historial = db.historiales[id] || [];
  res.json({ ok: true, clienteId: id, historial });
});

// Puerto que usa Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor CrediaX escuchando en puerto ${PORT}`);
});
