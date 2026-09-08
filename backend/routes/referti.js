const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo, soloAssegnati, parametriMedico } = require('../middleware/auth');

/**
 * @swagger
 * /api/referti:
 *   get:
 *     summary: Lista di tutti i referti
 *     tags: [Referti]
 *     security:
 *       - bearerAuth: []
 */
// Tutti i referti, con la tappa refertata e quella raggiunta dal percorso quando il
// referto fu scritto. Il medico vede solo quelli dei propri percorsi, l'admin tutti.
router.get('/', verificaToken, verificaRuolo('admin', 'medico'), (req, res) => {
    db.all(`
        SELECT r.id, r.contenuto, r.data_rilascio, r.stato,
               r.tappa_corrente_al_referto,
               pp.id AS percorso_paziente_id,
               u.nome || ' ' || u.cognome AS paziente,
               um.nome || ' ' || um.cognome AS medico,
               pt.nome AS percorso,
               t.nome AS tappa_refertata,
               ts.nome AS tappa_al_referto,
               (SELECT COUNT(*) FROM tappe WHERE percorso_id = pp.percorso_id) AS tappe_totali
        FROM referti r
        JOIN prenotazioni pr ON r.prenotazione_id = pr.id
        JOIN tappe t ON pr.tappa_id = t.id
        JOIN percorsi_paziente pp ON pr.percorso_paziente_id = pp.id
        JOIN pazienti p ON pp.paziente_id = p.id
        JOIN utenti u ON p.utente_id = u.id
        JOIN percorsi_terapeutici pt ON pp.percorso_id = pt.id
        JOIN medici m ON r.medico_id = m.id
        JOIN utenti um ON m.utente_id = um.id
        LEFT JOIN tappe ts ON ts.percorso_id = pp.percorso_id
                          AND ts.ordine = r.tappa_corrente_al_referto
        ${soloAssegnati(req) ? 'WHERE pp.medico_id = (SELECT id FROM medici WHERE utente_id = ?)' : ''}
        ORDER BY r.data_rilascio DESC
    `, parametriMedico(req), (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/referti/{prenotazioneId}:
 *   get:
 *     summary: Leggi referto di una prenotazione
 *     tags: [Referti]
 *     security:
 *       - bearerAuth: []
 */
// Referto di una prenotazione; 404 se non è ancora stato redatto.
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
// Registra il referto, marca la prenotazione come completata e fissa la tappa corrente
// del percorso, che resta poi immutata. Una prenotazione non può avere due referti.
router.post('/', verificaToken, verificaRuolo('medico'), (req, res) => {
    const { prenotazione_id, medico_id, contenuto } = req.body;

    if (!prenotazione_id || !medico_id || !contenuto) {
        return res.status(400).json({ errore: 'Campi obbligatori mancanti' });
    }

    db.get(
        `SELECT pp.tappa_corrente
         FROM prenotazioni pr
         JOIN percorsi_paziente pp ON pr.percorso_paziente_id = pp.id
         WHERE pr.id = ?`,
        [prenotazione_id],
        (err, percorso) => {
            if (err) return res.status(500).json({ errore: err.message });
            if (!percorso) return res.status(404).json({ errore: 'Prenotazione non trovata' });

            db.run(
                `INSERT INTO referti (prenotazione_id, medico_id, contenuto, tappa_corrente_al_referto)
                 VALUES (?, ?, ?, ?)`,
                [prenotazione_id, medico_id, contenuto, percorso.tappa_corrente],
                function (err) {
                    if (err) return res.status(400).json({ errore: 'Referto già esistente per questa prenotazione' });

                    db.run(
                        `UPDATE prenotazioni SET stato = 'completata' WHERE id = ?`,
                        [prenotazione_id]
                    );

                    res.status(201).json({
                        id: this.lastID,
                        messaggio: 'Referto caricato',
                        tappa_corrente_al_referto: percorso.tappa_corrente
                    });
                }
            );
        }
    );
});

module.exports = router;