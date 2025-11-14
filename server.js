const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint de prueba
app.get('/api/hello', (req, res) => {
  res.json({
    ok: true,
    message: 'Servidor CrediaX funcionando 🚀'
  });
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`Servidor CrediaX escuchando en el puerto ${PORT}`);
});
