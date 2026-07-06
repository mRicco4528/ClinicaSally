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