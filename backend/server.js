const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');

// Popola la base di dati con gli utenti dimostrativi a ogni avvio. Lo script si
// appoggia alla stessa connessione condivisa da db.js e usa INSERT OR IGNORE,
// perciò rieseguirlo non genera duplicati.
require('./database/seed');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globali
app.use(cors());
app.use(express.json());

// Frontend statico: la cartella viene esposta a partire dalla radice, così che
// http://localhost:3000 restituisca direttamente index.html e le pagine possano
// essere raggiunte senza ricorrere a un server esterno.
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/utenti', require('./routes/utenti'));
app.use('/api/pazienti', require('./routes/pazienti'));
app.use('/api/percorsi', require('./routes/percorsi'));
app.use('/api/percorsi-paziente', require('./routes/percorsiPaziente'));
app.use('/api/prenotazioni', require('./routes/prenotazioni'));
app.use('/api/referti', require('./routes/referti'));
app.use('/api/messaggi', require('./routes/messaggi'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Apre la pagina di accesso nel browser predefinito del sistema, replicando la
// comodità dell'estensione Live Server; il comando varia a seconda del sistema
// operativo ospite.
const apriBrowser = (url) => {
    const comando = process.platform === 'win32' ? 'start ""'
        : process.platform === 'darwin' ? 'open'
        : 'xdg-open';
    exec(`${comando} "${url}"`);
};

// Avvio server
app.listen(PORT, () => {
    console.log(`Sally in ascolto su http://localhost:${PORT}`);
    console.log(`Swagger disponibile su http://localhost:${PORT}/api-docs`);
    apriBrowser(`http://localhost:${PORT}`);
});
