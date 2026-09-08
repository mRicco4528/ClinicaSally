const jwt = require('jsonwebtoken');

const JWT_SECRET = 'sally_secret_key_2024';

// Middleware di autenticazione: estrae il token JWT dall'intestazione Authorization
// e ne verifica firma e scadenza. Se il controllo ha esito positivo, i dati dell'utente
// vengono resi disponibili alle rotte successive tramite req.utente; in caso contrario
// la richiesta viene respinta con un codice di errore appropriato.
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

// Middleware di autorizzazione: riceve l'elenco dei ruoli abilitati e consente il
// proseguimento della richiesta soltanto se il ruolo dell'utente autenticato vi rientra,
// secondo il modello di controllo degli accessi basato sui ruoli (RBAC).
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

// Il medico vede i soli percorsi a lui assegnati, l'admin li vede tutti. Le due
// funzioni forniscono la condizione SQL e il parametro corrispondente: il token
// porta l'id dell'utente, da cui la sottoquery ricava quello del medico.
const soloAssegnati = (req) => req.utente.ruolo === 'medico';

const parametriMedico = (req) => (soloAssegnati(req) ? [req.utente.id] : []);

module.exports = { verificaToken, verificaRuolo, soloAssegnati, parametriMedico, JWT_SECRET };