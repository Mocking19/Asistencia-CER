const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const dataPath = path.join(__dirname, 'public', 'protocolos.json');

function loadProtocolos() {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/protocolos', (req, res) => {
  try {
    const protocolos = loadProtocolos();
    const query = (req.query.q || '').toString().trim().toLowerCase();

    if (!query) {
      return res.json(protocolos);
    }

    const filtered = protocolos.filter(item =>
      item.protocolo.toLowerCase().includes(query) ||
      item.pacientes.some(paciente =>
        paciente.numero_paciente.toLowerCase().includes(query) ||
        paciente.nombre.toLowerCase().includes(query)
      )
    );

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo leer protocolos.json' });
  }
});

app.get('/api/protocolos/:protocolo', (req, res) => {
  try {
    const protocolos = loadProtocolos();
    const protocolo = protocolos.find(item => item.protocolo === req.params.protocolo);
    if (!protocolo) {
      return res.status(404).json({ error: 'Protocolo no encontrado' });
    }
    res.json(protocolo);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo leer protocolos.json' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
