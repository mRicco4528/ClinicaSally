const jwt = require('jsonwebtoken');

const JWT_SECRET = 'sally_secret_key_2024';

const verificaToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ errore: 'Token mancante' });
    }

    jwt.verify(token, JWT_SECRET, (err, utente) => {
        if (err) {
            return res.status(403).json({ errore: 'Token non valido' });
        }
        req.utente = utente;
        next();
    });
};

const verificaRuolo = (...ruoli) => {
    return (req, res, next) => {
        if (!ruoli.includes(req.utente.ruolo)) {
            return res.status(403).json({ 
                errore: 'Accesso non autorizzato per questo ruolo' 
            });
        }
        next();
    };
};

module.exports = { verificaToken, verificaRuolo, JWT_SECRET };