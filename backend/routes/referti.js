const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo } = require('../middleware/auth');

/**
 * @swagger
 * /api/referti/{prenotazioneId}:
 *   get:
 *     summary: Leggi referto di una prenotazione
 *     tags: [Referti]
 *     security:
 *       - bearerAuth: []
 */
// Restituisce il referto associato alla prenotazione indicata; l'eventuale assenza
// del documento viene segnalata con errore 404, che il frontend interpreta come
// referto non ancora disponibile.
router.get('/:prenotazioneId', verificaToken, (req, res) => {
    db.get(`
        SELECT r.id, r.contenuto, r.data_rilascio, r.stato,
               um.nome || ' ' || um.cognome AS medico,
               t.nome AS tappa
        FROM referti r
        JOIN medici m ON r.medico_id = m.id
        JOIN utenti um ON m.utente_id = um.id
        JOIN prenotazioni pr ON r.prenotazione_id = pr.id
        JOIN tappe t ON pr.tappa_id = t.id
        WHERE r.prenotazione_id = ?
    `, [req.params.prenotazioneId], (err, row) => {
        if (err) return res.status(500).json({ errore: err.message });
        if (!row) return res.status(404).json({ errore: 'Referto non trovato' });
        res.json(row);
    });
});

/**
 * @swagger
 * /api/referti:
 *   post:
 *     summary: Carica nuovo referto
 *     tags: [Referti]
 *     security:
 *       - bearerAuth: []
 */
// Registra il referto redatto dal medico e aggiorna la prenotazione allo stato
// "completata"; il vincolo di unicità sulla prenotazione impedisce di refertare
// due volte la medesima prestazione.
router.post('/', verificaToken, verificaRuolo('medico'), (req, res) => {
    const { prenotazione_id, medico_id, contenuto } = req.body;

    if (!prenotazione_id || !medico_id || !contenuto) {
        return res.status(400).json({ errore: 'Campi obbligatori mancanti' });
    }

    db.run(
        `INSERT INTO referti (prenotazione_id, medico_id, contenuto) 
         VALUES (?, ?, ?)`,
        [prenotazione_id, medico_id, contenuto],
        function (err) {
            if (err) return res.status(400).json({ errore: 'Referto già esistente per questa prenotazione' });
            
            db.run(
                `UPDATE prenotazioni SET stato = 'completata' WHERE id = ?`,
                [prenotazione_id]
            );

            res.status(201).json({ id: this.lastID, messaggio: 'Referto caricato' });
        }
    );
});

module.exports = router;