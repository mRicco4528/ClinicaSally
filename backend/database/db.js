const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sally.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Errore connessione database:', err.message);
    } else {
        console.log('Database SQLite connesso.');
    }
});

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