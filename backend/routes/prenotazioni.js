const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo } = require('../middleware/auth');

/**
 * @swagger
 * /api/prenotazioni/{percorsoPazienteId}:
 *   get:
 *     summary: Lista prenotazioni di un percorso paziente
 *     tags: [Prenotazioni]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:percorsoPazienteId', verificaToken, (req, res) => {
    db.all(`
        SELECT pr.id, pr.data_ora, pr.stato,
               t.nome AS tappa,
               um.nome || ' ' || um.cognome AS medico
        FROM prenotazioni pr
        JOIN tappe t ON pr.tappa_id = t.id
        JOIN medici m ON pr.medico_id = m.id
        JOIN utenti um ON m.utente_id = um.id
        WHERE pr.percorso_paziente_id = ?
        ORDER BY pr.data_ora
    `, [req.params.percorsoPazienteId], (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/prenotazioni:
 *   post:
 *     summary: Crea prenotazione per una tappa
 *     tags: [Prenotazioni]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', verificaToken, verificaRuolo('medico'), (req, res) => {
    const { percorso_paziente_id, tappa_id, medico_id, data_ora } = req.body;

    if (!percorso_paziente_id || !tappa_id || !medico_id || !data_ora) {
        return res.status(400).json({ errore: 'Campi obbligatori mancanti' });
    }

    db.run(
        `INSERT INTO prenotazioni 
         (percorso_paziente_id, tappa_id, medico_id, data_ora) 
         VALUES (?, ?, ?, ?)`,
        [percorso_paziente_id, tappa_id, medico_id, data_ora],
        function (err) {
            if (err) return res.status(500).json({ errore: err.message });
            res.status(201).json({ id: this.lastID, messaggio: 'Prenotazione creata' });
        }
    );
});

module.exports = router;