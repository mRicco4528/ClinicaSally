const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo } = require('../middleware/auth');

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Riepilogo generale per l'admin
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', verificaToken, verificaRuolo('admin'), (req, res) => {
    const risultati = {};

    db.get('SELECT COUNT(*) as totale FROM percorsi_paziente WHERE stato = "attivo"',
        [], (err, row) => {
            if (err) return res.status(500).json({ errore: err.message });
            risultati.percorsi_attivi = row.totale;

            db.get('SELECT COUNT(*) as totale FROM referti WHERE stato = "in_elaborazione"',
                [], (err, row) => {
                    if (err) return res.status(500).json({ errore: err.message });
                    risultati.referti_in_attesa = row.totale;

                    db.get('SELECT COUNT(*) as totale FROM pazienti',
                        [], (err, row) => {
                            if (err) return res.status(500).json({ errore: err.message });
                            risultati.totale_pazienti = row.totale;

                            db.all(`
                                SELECT pt.specializzazione, COUNT(*) as totale
                                FROM percorsi_paziente pp
                                JOIN percorsi_terapeutici pt ON pp.percorso_id = pt.id
                                WHERE pp.stato = 'attivo'
                                GROUP BY pt.specializzazione
                            `, [], (err, rows) => {
                                if (err) return res.status(500).json({ errore: err.message });
                                risultati.percorsi_per_specializzazione = rows;
                                res.json(risultati);
                            });
                        });
                });
        });
});

module.exports = router;