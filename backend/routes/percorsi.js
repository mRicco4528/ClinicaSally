const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/percorsi:
 *   get:
 *     summary: Lista percorsi terapeutici disponibili
 *     tags: [Percorsi]
 *     security:
 *       - bearerAuth: []
 */
// Restituisce il catalogo completo dei percorsi terapeutici offerti dalla clinica,
// consultabile da qualunque utente autenticato indipendentemente dal ruolo.
router.get('/', verificaToken, (req, res) => {
    db.all('SELECT * FROM percorsi_terapeutici', [], (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/percorsi/{id}/tappe:
 *   get:
 *     summary: Tappe di un percorso
 *     tags: [Percorsi]
 *     security:
 *       - bearerAuth: []
 */
// Restituisce le tappe che compongono il percorso indicato, ordinate secondo la
// sequenza prevista dal protocollo terapeutico.
router.get('/:id/tappe', verificaToken, (req, res) => {
    db.all(
        'SELECT * FROM tappe WHERE percorso_id = ? ORDER BY ordine',
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json({ errore: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;