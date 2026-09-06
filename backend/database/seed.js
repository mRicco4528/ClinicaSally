const bcrypt = require('bcryptjs');
const db = require('./db');

// Popola la base di dati con tre utenti dimostrativi, uno per ciascun ruolo previsto
// dal sistema, memorizzando le password esclusivamente in forma cifrata tramite bcrypt.
// La clausola INSERT OR IGNORE rende lo script rieseguibile senza generare duplicati.
// Le righe collegate (medico e paziente) risalgono all'utente appena creato tramite
// l'email, che è UNIQUE, e non tramite lastID: quando l'INSERT viene ignorato perché
// la riga esiste già, lastID conserva infatti il valore dell'inserimento precedente
// sulla connessione e produrrebbe un collegamento errato.
const seed = async () => {
    console.log('Avvio seed dati iniziali...');

    const adminHash = await bcrypt.hash('admin123', 10);
    const medicoHash = await bcrypt.hash('medico123', 10);
    const pazienteHash = await bcrypt.hash('paziente123', 10);

    const INSERISCI_UTENTE = `INSERT OR IGNORE INTO utenti (nome, cognome, email, password_hash, ruolo)
                              VALUES (?, ?, ?, ?, ?)`;

    let errori = 0;
    const logErrore = (err) => {
        if (err) {
            errori++;
            console.error('Errore durante il seed:', err.message);
        }
    };

    db.serialize(() => {
        db.run(INSERISCI_UTENTE,
            ['Admin', 'Meridiem', 'admin@meridiem.it', adminHash, 'admin'], logErrore);

        db.run(INSERISCI_UTENTE,
            ['Marco', 'Rossi', 'dott.rossi@meridiem.it', medicoHash, 'medico'], logErrore);
        db.run(`INSERT OR IGNORE INTO medici (utente_id, specializzazione, numero_albo)
                SELECT id, ?, ? FROM utenti WHERE email = ?`,
            ['Ortopedia', 'RM12345', 'dott.rossi@meridiem.it'], logErrore);

        db.run(INSERISCI_UTENTE,
            ['Mario', 'Bianchi', 'mario.bianchi@email.it', pazienteHash, 'paziente'], logErrore);
        db.run(`INSERT OR IGNORE INTO pazienti (utente_id, codice_fiscale, data_nascita, telefono)
                SELECT id, ?, ?, ? FROM utenti WHERE email = ?`,
            ['BNCMRA85M01H501Z', '1985-08-01', '3331234567', 'mario.bianchi@email.it'],
            function (err) {
                logErrore(err);
                // Ultima istruzione della sequenza: solo qui il seed è realmente concluso.
                console.log(errori === 0
                    ? 'Seed completato!'
                    : `Seed terminato con ${errori} errori.`);
            });
    });
};

seed();
