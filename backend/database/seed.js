const bcrypt = require('bcryptjs');
const db = require('./db');

const seed = async () => {
    console.log('Avvio seed dati iniziali...');

    const adminHash = await bcrypt.hash('admin123', 10);
    const medicoHash = await bcrypt.hash('medico123', 10);
    const pazienteHash = await bcrypt.hash('paziente123', 10);

    db.serialize(() => {
        db.run(`INSERT OR IGNORE INTO utenti (nome, cognome, email, password_hash, ruolo)
                VALUES ('Admin', 'Meridiem', 'admin@meridiem.it', '${adminHash}', 'admin')`);

        db.run(`INSERT OR IGNORE INTO utenti (nome, cognome, email, password_hash, ruolo)
                VALUES ('Marco', 'Rossi', 'dott.rossi@meridiem.it', '${medicoHash}', 'medico')`,
            function () {
                db.run(`INSERT OR IGNORE INTO medici (utente_id, specializzazione, numero_albo)
                        VALUES (${this.lastID}, 'Ortopedia', 'RM12345')`);
            }
        );

        db.run(`INSERT OR IGNORE INTO utenti (nome, cognome, email, password_hash, ruolo)
                VALUES ('Mario', 'Bianchi', 'mario.bianchi@email.it', '${pazienteHash}', 'paziente')`,
            function () {
                db.run(`INSERT OR IGNORE INTO pazienti (utente_id, codice_fiscale, data_nascita, telefono)
                        VALUES (${this.lastID}, 'BNCMRA85M01H501Z', '1985-08-01', '3331234567')`);
            }
        );

        console.log('Seed completato!');
    });
};

seed();