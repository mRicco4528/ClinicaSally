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
    const medicoOrtopediaHash = await bcrypt.hash('medico123', 10);
    const medicoCardiologiaHash = await bcrypt.hash('medico456', 10);
    const medicoDermatologiaHash = await bcrypt.hash('medico789', 10);
    const pazienteBianchiHash = await bcrypt.hash('paziente123', 10);
    const pazienteVerdiHash = await bcrypt.hash('paziente456', 10);

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
/////////////////////////////////////////////////////////////////////////////////////////////////////////////
        db.run(INSERISCI_UTENTE,
            ['Marco', 'Rossi', 'dott.rossi@meridiem.it', medicoOrtopediaHash, 'medico'], logErrore);
        db.run(`INSERT OR IGNORE INTO medici (utente_id, specializzazione, numero_albo)
                SELECT id, ?, ? FROM utenti WHERE email = ?`,
            ['Ortopedia', 'RM12345', 'dott.rossi@meridiem.it'], logErrore);

        db.run(INSERISCI_UTENTE,
            ['Marco', 'Verdi', 'dott.verdi@meridiem.it', medicoCardiologiaHash, 'medico'], logErrore);
        db.run(`INSERT OR IGNORE INTO medici (utente_id, specializzazione, numero_albo)
                SELECT id, ?, ? FROM utenti WHERE email = ?`,
            ['Cardiologia', 'VM12345', 'dott.verdi@meridiem.it'], logErrore);

        db.run(INSERISCI_UTENTE,
            ['Marco', 'Neri', 'dott.neri@meridiem.it', medicoDermatologiaHash, 'medico'], logErrore);
        db.run(`INSERT OR IGNORE INTO medici (utente_id, specializzazione, numero_albo)
                SELECT id, ?, ? FROM utenti WHERE email = ?`,
            ['Dermatologia', 'NM12345', 'dott.neri@meridiem.it'], logErrore);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
        db.run(INSERISCI_UTENTE,
            ['Mario', 'Bianchi', 'mario.bianchi@email.it', pazienteBianchiHash, 'paziente'], logErrore);
        db.run(`INSERT OR IGNORE INTO pazienti (utente_id, codice_fiscale, data_nascita, telefono)
                SELECT id, ?, ?, ? FROM utenti WHERE email = ?`,
            ['BNCMRA85M01H501Z', '1985-08-01', '3331234567', 'mario.bianchi@email.it'],
            logErrore);
        db.run(INSERISCI_UTENTE,
            ['Mario', 'Verdi', 'mario.verdi@email.it', pazienteVerdiHash, 'paziente'], logErrore);
        db.run(`INSERT OR IGNORE INTO pazienti (utente_id, codice_fiscale, data_nascita, telefono)
                SELECT id, ?, ?, ? FROM utenti WHERE email = ?`,
            ['BNCMRA85M01H501O', '1985-08-01', '3331234567', 'mario.verdi@email.it'],
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
