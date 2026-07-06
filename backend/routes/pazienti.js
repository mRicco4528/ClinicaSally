const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { verificaToken, verificaRuolo } = require('../middleware/auth');

/**
 * @swagger
 * /api/pazienti:
 *   get:
 *     summary: Lista tutti i pazienti
 *     tags: [Pazienti]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', verificaToken, verificaRuolo('admin', 'medico'), (req, res) => {
    db.all(`
        SELECT p.id, u.nome, u.cognome, u.email, 
               p.codice_fiscale, p.data_nascita, p.telefono
        FROM pazienti p
        JOIN utenti u ON p.utente_id = u.id
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/pazienti/{id}:
 *   get:
 *     summary: Dettaglio singolo paziente
 *     tags: [Pazienti]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', verificaToken, (req, res) => {
    const { id } = req.params;

    if (req.utente.ruolo === 'paziente') {
        db.get('SELECT utente_id FROM pazienti WHERE id = ?', [id], (err, row) => {
            if (!row || row.utente_id !== req.utente.id) {
                return res.status(403).json({ errore: 'Accesso non autorizzato' });
            }
        });
    }

    db.get(`
        SELECT p.id, u.nome, u.cognome, u.email,
               p.codice_fiscale, p.data_nascita, p.telefono
        FROM pazienti p
        JOIN utenti u ON p.utente_id = u.id
        WHERE p.id = ?
    `, [id], (err, row) => {
        if (err) return res.status(500).json({ errore: err.message });
        if (!row) return res.status(404).json({ errore: 'Paziente non trovato' });
        res.json(row);
    });
});

module.exports = router;