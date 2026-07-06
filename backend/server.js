const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger/swagger');

const app = express();
const PORT = 3000;

// Middleware globali
app.use(cors());
app.use(express.json());

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

// Avvio server
app.listen(PORT, () => {
    console.log(`Sally in ascolto su http://localhost:${PORT}`);
    console.log(`Swagger disponibile su http://localhost:${PORT}/api-docs`);
});