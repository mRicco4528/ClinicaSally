const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo, soloAssegnati, parametriMedico } = require('../middleware/auth');

/**
 * @swagger
 * /api/percorsi-paziente:
 *   get:
 *     summary: Lista percorsi pazienti attivi
 *     tags: [Percorsi Paziente]
 *     security:
 *       - bearerAuth: []
 */
// Percorsi assegnati, con paziente, medico e tappa corrente in forma leggibile.
// Il medico vede solo i propri, l'admin tutti.
router.get('/', verificaToken, verificaRuolo('admin', 'medico'), (req, res) => {
    db.all(`
        SELECT pp.id, pp.stato, pp.tappa_corrente, pp.data_avvio, pp.percorso_id,
               u.nome || ' ' || u.cognome AS paziente,
               u.nome AS paziente_nome,
               u.cognome AS paziente_cognome,
               p.codice_fiscale,
               pt.nome AS percorso,
               um.nome || ' ' || um.cognome AS medico,
               t.nome AS tappa_nome,
               (SELECT COUNT(*) FROM tappe WHERE percorso_id = pp.percorso_id) AS tappe_totali
        FROM percorsi_paziente pp
        JOIN pazienti p ON pp.paziente_id = p.id
        JOIN utenti u ON p.utente_id = u.id
        JOIN percorsi_terapeutici pt ON pp.percorso_id = pt.id
        JOIN medici m ON pp.medico_id = m.id
        JOIN utenti um ON m.utente_id = um.id
        LEFT JOIN tappe t ON t.percorso_id = pp.percorso_id AND t.ordine = pp.tappa_corrente
        ${soloAssegnati(req) ? 'WHERE pp.medico_id = (SELECT id FROM medici WHERE utente_id = ?)' : ''}
    `, parametriMedico(req), (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/percorsi-paziente/{id}:
 *   get:
 *     summary: Dettaglio percorso paziente
 *     tags: [Percorsi Paziente]
 *     security:
 *       - bearerAuth: []
 */
// Dettaglio di un singolo percorso assegnato.
router.get('/:id', verificaToken, (req, res) => {
    db.get(`
        SELECT pp.*, pt.nome AS percorso, pt.specializzazione,
               u.nome || ' ' || u.cognome AS paziente,
               um.nome || ' ' || um.cognome AS medico
        FROM percorsi_paziente pp
        JOIN pazienti p ON pp.paziente_id = p.id
        JOIN utenti u ON p.utente_id = u.id
        JOIN percorsi_terapeutici pt ON pp.percorso_id = pt.id
        JOIN medici m ON pp.medico_id = m.id
        JOIN utenti um ON m.utente_id = um.id
        WHERE pp.id = ?
    `, [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ errore: err.message });
        if (!row) return res.status(404).json({ errore: 'Percorso non trovato' });
        res.json(row);
    });
});

/**
 * @swagger
 * /api/percorsi-paziente:
 *   post:
 *     summary: Assegna percorso a paziente
 *     tags: [Percorsi Paziente]
 *     security:
 *       - bearerAuth: []
 */
// Assegna un percorso a un paziente indicando il medico referente. Solo admin.
router.post('/', verificaToken, verificaRuolo('admin'), (req, res) => {
    const { paziente_id, percorso_id, medico_id } = req.body;

    if (!paziente_id || !percorso_id || !medico_id) {
        return res.status(400).json({ errore: 'Campi obbligatori mancanti' });
    }

    db.run(
        'INSERT INTO percorsi_paziente (paziente_id, percorso_id, medico_id) VALUES (?, ?, ?)',
        [paziente_id, percorso_id, medico_id],
        function (err) {
            if (err) return res.status(500).json({ errore: err.message });
            res.status(201).json({ id: this.lastID, messaggio: 'Percorso assegnato' });
        }
    );
});

/**
 * @swagger
 * /api/percorsi-paziente/{id}/avanza:
 *   patch:
 *     summary: Avanza alla tappa successiva
 *     tags: [Percorsi Paziente]
 *     security:
 *       - bearerAuth: []
 */
// Passa alla tappa successiva; superata l'ultima, il percorso risulta completato.
router.patch('/:id/avanza', verificaToken, verificaRuolo('medico'), (req, res) => {
    db.get('SELECT * FROM percorsi_paziente WHERE id = ?', [req.params.id], (err, pp) => {
        if (err) return res.status(500).json({ errore: err.message });
        if (!pp) return res.status(404).json({ errore: 'Percorso non trovato' });

        db.get(
            'SELECT COUNT(*) as totale FROM tappe WHERE percorso_id = ?',
            [pp.percorso_id],
            (err, result) => {
                if (err) return res.status(500).json({ errore: err.message });

                const nuovaTappa = pp.tappa_corrente + 1;
                const completato = nuovaTappa > result.totale;

                db.run(
                    `UPDATE percorsi_paziente 
                     SET tappa_corrente = ?, stato = ?, data_fine = ?
                     WHERE id = ?`,
                    [
                        completato ? pp.tappa_corrente : nuovaTappa,
                        completato ? 'completato' : 'attivo',
                        completato ? new Date().toISOString() : null,
                        req.params.id
                    ],
                    (err) => {
                        if (err) return res.status(500).json({ errore: err.message });
                        res.json({
                            messaggio: completato ? 'Percorso completato' : 'Tappa avanzata',
                            tappa_corrente: completato ? pp.tappa_corrente : nuovaTappa,
                            stato: completato ? 'completato' : 'attivo'
                        });
                    }
                );
            }
        );
    });
});

/**
 * @swagger
 * /api/percorsi-paziente/{id}/completa:
 *   patch:
 *     summary: Conclude anticipatamente il percorso
 *     tags: [Percorsi Paziente]
 *     security:
 *       - bearerAuth: []
 */
// Conclude il percorso lasciando la tappa corrente dov'è e chiude le prenotazioni
// ancora programmate.
router.patch('/:id/completa', verificaToken, verificaRuolo('medico'), (req, res) => {
    db.get('SELECT * FROM percorsi_paziente WHERE id = ?', [req.params.id], (err, pp) => {
        if (err) return res.status(500).json({ errore: err.message });
        if (!pp) return res.status(404).json({ errore: 'Percorso non trovato' });

        if (pp.stato === 'completato') {
            return res.status(400).json({ errore: 'Il percorso risulta già completato' });
        }

        db.run(
            `UPDATE percorsi_paziente
             SET stato = 'completato', data_fine = ?
             WHERE id = ?`,
            [new Date().toISOString(), req.params.id],
            (err) => {
                if (err) return res.status(500).json({ errore: err.message });

                db.run(
                    `UPDATE prenotazioni
                     SET stato = 'completata'
                     WHERE percorso_paziente_id = ? AND stato = 'programmata'`,
                    [req.params.id],
                    function (err) {
                        if (err) return res.status(500).json({ errore: err.message });
                        res.json({
                            messaggio: 'Percorso completato',
                            tappa_corrente: pp.tappa_corrente,
                            stato: 'completato',
                            prenotazioni_completate: this.changes
                        });
                    }
                );
            }
        );
    });
});

module.exports = router;