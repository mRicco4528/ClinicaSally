const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo } = require('../middleware/auth');

/**
 * @swagger
 * /api/percorsi-paziente:
 *   get:
 *     summary: Lista percorsi pazienti attivi
 *     tags: [Percorsi Paziente]
 *     security:
 *       - bearerAuth: []
 */
// Restituisce l'elenco dei percorsi assegnati ai pazienti; la giunzione fra più
// tabelle consente di esporre in un'unica risposta i nominativi di paziente e
// medico e la denominazione del percorso terapeutico.
router.get('/', verificaToken, verificaRuolo('admin', 'medico'), (req, res) => {
    db.all(`
        SELECT pp.id, pp.stato, pp.tappa_corrente, pp.data_avvio,
               u.nome || ' ' || u.cognome AS paziente,
               pt.nome AS percorso,
               um.nome || ' ' || um.cognome AS medico
        FROM percorsi_paziente pp
        JOIN pazienti p ON pp.paziente_id = p.id
        JOIN utenti u ON p.utente_id = u.id
        JOIN percorsi_terapeutici pt ON pp.percorso_id = pt.id
        JOIN medici m ON pp.medico_id = m.id
        JOIN utenti um ON m.utente_id = um.id
    `, [], (err, rows) => {
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
// Restituisce il dettaglio del singolo percorso assegnato, comprensivo dello stato
// di avanzamento e dei nominativi di paziente e medico referente.
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
// Assegna un percorso terapeutico a un paziente designando il medico referente;
// l'operazione è riservata al ruolo amministrativo e gli attributi di stato assumono
// i valori predefiniti stabiliti dallo schema della base di dati.
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
// Fa progredire il percorso alla tappa successiva confrontando la tappa corrente con
// il numero totale di tappe previste; qualora l'ultima risulti già raggiunta, lo stato
// passa a "completato" e viene registrata la data di conclusione.
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

module.exports = router;