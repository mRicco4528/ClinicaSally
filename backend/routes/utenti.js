const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/db');
const { verificaToken, verificaRuolo } = require('../middleware/auth');

/**
 * @swagger
 * /api/utenti:
 *   get:
 *     summary: Lista tutti gli utenti
 *     tags: [Utenti]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista utenti
 */
router.get('/', verificaToken, verificaRuolo('admin'), (req, res) => {
    db.all('SELECT id, nome, cognome, email, ruolo, created_at FROM utenti', [], (err, rows) => {
        if (err) return res.status(500).json({ errore: err.message });
        res.json(rows);
    });
});

/**
 * @swagger
 * /api/utenti:
 *   post:
 *     summary: Crea nuovo utente
 *     tags: [Utenti]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', verificaToken, verificaRuolo('admin'), async (req, res) => {
    const { nome, cognome, email, password, ruolo, codice_fiscale, data_nascita, telefono, specializzazione, numero_albo } = req.body;

    if (!nome || !cognome || !email || !password || !ruolo) {
        return res.status(400).json({ errore: 'Campi obbligatori mancanti' });
    }

    try {
        const password_hash = await bcrypt.hash(password, 10);

        db.run(
            'INSERT INTO utenti (nome, cognome, email, password_hash, ruolo) VALUES (?, ?, ?, ?, ?)',
            [nome, cognome, email, password_hash, ruolo],
            function (err) {
                if (err) return res.status(400).json({ errore: 'Email già esistente' });

                const utente_id = this.lastID;

                if (ruolo === 'paziente') {
                    db.run(
                        'INSERT INTO pazienti (utente_id, codice_fiscale, data_nascita, telefono) VALUES (?, ?, ?, ?)',
                        [utente_id, codice_fiscale, data_nascita, telefono],
                        (err) => {
                            if (err) return res.status(400).json({ errore: err.message });
                            res.status(201).json({ id: utente_id, messaggio: 'Paziente creato' });
                        }
                    );
                } else if (ruolo === 'medico') {
                    db.run(
                        'INSERT INTO medici (utente_id, specializzazione, numero_albo) VALUES (?, ?, ?)',
                        [utente_id, specializzazione, numero_albo],
                        (err) => {
                            if (err) return res.status(400).json({ errore: err.message });
                            res.status(201).json({ id: utente_id, messaggio: 'Medico creato' });
                        }
                    );
                } else {
                    res.status(201).json({ id: utente_id, messaggio: 'Admin creato' });
                }
            }
        );
    } catch (err) {
        res.status(500).json({ errore: 'Errore del server' });
    }
});

/**
 * @swagger
 * /api/utenti/{id}:
 *   delete:
 *     summary: Elimina utente
 *     tags: [Utenti]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', verificaToken, verificaRuolo('admin'), (req, res) => {
    db.run('DELETE FROM utenti WHERE id = ?', [req.params.id], function (err) {
        if (err) return res.status(500).json({ errore: err.message });
        if (this.changes === 0) return res.status(404).json({ errore: 'Utente non trovato' });
        res.json({ messaggio: 'Utente eliminato' });
    });
});

module.exports = router;