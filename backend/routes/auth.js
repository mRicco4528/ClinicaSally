const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login utente
 *     tags: [Autenticazione]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login riuscito, restituisce JWT
 *       401:
 *         description: Credenziali non valide
 */
// Gestisce l'autenticazione dell'utente: verifica le credenziali confrontando la
// password fornita con l'hash bcrypt memorizzato e, in caso di esito positivo,
// rilascia un token JWT con validità di 24 ore insieme ai dati essenziali dell'utente.
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ errore: 'Email e password obbligatorie' });
    }

    db.get(
        'SELECT * FROM utenti WHERE email = ?',
        [email],
        async (err, utente) => {
            if (err) {
                return res.status(500).json({ errore: 'Errore del server' });
            }
            if (!utente) {
                return res.status(401).json({ errore: 'Credenziali non valide' });
            }

            const passwordCorretta = await bcrypt.compare(password, utente.password_hash);
            if (!passwordCorretta) {
                return res.status(401).json({ errore: 'Credenziali non valide' });
            }

            const token = jwt.sign(
                { id: utente.id, email: utente.email, ruolo: utente.ruolo },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                utente: {
                    id: utente.id,
                    nome: utente.nome,
                    cognome: utente.cognome,
                    email: utente.email,
                    ruolo: utente.ruolo,
                },
            });
        }
    );
});

module.exports = router;