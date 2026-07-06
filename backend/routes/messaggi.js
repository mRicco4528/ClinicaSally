const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/messaggi/{percorsoPazienteId}:
 *   get:
 *     summary: Lista messaggi di un percorso paziente
 *     tags: [Messaggi]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:percorsoPazienteId', verificaToken, (req, res) => {
    db.all(`
        SELECT msg.id, msg.contenuto, msg.inviato_at, msg.letto,
               um.nome || ' ' || um.cognome AS mittente,
               um.ruolo AS ruolo_mittente
        FROM messaggi msg
        JOIN utenti um ON msg.mittente_id = um.id
        WHERE msg.percorso_paziente_id = ?
        ORDER BY msg.inviato_at ASC
    `, [req.params.percorsoPazienteId], (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        
        db.run(
            `UPDATE messaggi SET letto = 1 
             WHERE percorso_paziente_id = ? AND destinatario_id = ?`,
            [req.params.percorsoPazienteId, req.utente.id]
        );

        res.json(rows);
    });
});

/**
 * @swagger
 * /api/messaggi:
 *   post:
 *     summary: Invia messaggio
 *     tags: [Messaggi]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', verificaToken, (req, res) => {
    const { destinatario_id, percorso_paziente_id, contenuto } = req.body;

    if (!destinatario_id || !percorso_paziente_id || !contenuto) {
        return res.status(400).json({ errore: 'Campi obbligatori mancanti' });
    }

    db.run(
        `INSERT INTO messaggi 
         (mittente_id, destinatario_id, percorso_paziente_id, contenuto) 
         VALUES (?, ?, ?, ?)`,
        [req.utente.id, destinatario_id, percorso_paziente_id, contenuto],
        function (err) {
            if (err) return res.status(500).json({ errore: err.message });
            res.status(201).json({ id: this.lastID, messaggio: 'Messaggio inviato' });
        }
    );
});

module.exports = router;