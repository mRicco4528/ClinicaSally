const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sally.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Apre la connessione al database SQLite, creando automaticamente il file qualora
// non esista; l'istanza viene poi condivisa da tutti i moduli dell'applicazione.
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Errore connessione database:', err.message);
    } else {
        console.log('Database SQLite connesso.');
    }
});

// All'avvio esegue in sequenza le istruzioni dello schema per creare le tabelle
// mancanti, ignorando gli errori relativi a tabelle già esistenti; i vincoli di
// chiave esterna vengono abilitati esplicitamente, poiché SQLite li disattiva
// per impostazione predefinita.
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    statements.forEach(statement => {
        db.run(statement, (err) => {
            if (err && !err.message.includes('already exists')) {
                console.error('Errore schema:', err.message);
            }
        });
    });
});

module.exports = db;