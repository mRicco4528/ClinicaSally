-- Utenti (base condivisa per tutti i ruoli)
CREATE TABLE IF NOT EXISTS utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    ruolo TEXT NOT NULL CHECK(ruolo IN ('paziente', 'medico', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pazienti (estende utenti)
CREATE TABLE IF NOT EXISTS pazienti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER NOT NULL UNIQUE,
    codice_fiscale TEXT NOT NULL UNIQUE,
    data_nascita DATE NOT NULL,
    telefono TEXT,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
);

-- Medici (estende utenti)
CREATE TABLE IF NOT EXISTS medici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    utente_id INTEGER NOT NULL UNIQUE,
    specializzazione TEXT NOT NULL,
    numero_albo TEXT NOT NULL UNIQUE,
    FOREIGN KEY (utente_id) REFERENCES utenti(id) ON DELETE CASCADE
);

-- Percorsi terapeutici (template fissi)
CREATE TABLE IF NOT EXISTS percorsi_terapeutici (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    specializzazione TEXT NOT NULL,
    descrizione TEXT
);

-- Tappe dei percorsi (template fissi)
CREATE TABLE IF NOT EXISTS tappe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    percorso_id INTEGER NOT NULL,
    ordine INTEGER NOT NULL,
    nome TEXT NOT NULL,
    descrizione TEXT,
    FOREIGN KEY (percorso_id) REFERENCES percorsi_terapeutici(id)
);

-- Percorsi paziente (istanza reale)
CREATE TABLE IF NOT EXISTS percorsi_paziente (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paziente_id INTEGER NOT NULL,
    percorso_id INTEGER NOT NULL,
    medico_id INTEGER NOT NULL,
    tappa_corrente INTEGER DEFAULT 1,
    stato TEXT NOT NULL DEFAULT 'attivo' 
        CHECK(stato IN ('attivo', 'completato', 'sospeso')),
    data_avvio DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_fine DATETIME,
    FOREIGN KEY (paziente_id) REFERENCES pazienti(id),
    FOREIGN KEY (percorso_id) REFERENCES percorsi_terapeutici(id),
    FOREIGN KEY (medico_id) REFERENCES medici(id)
);

-- Prenotazioni
CREATE TABLE IF NOT EXISTS prenotazioni (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    percorso_paziente_id INTEGER NOT NULL,
    tappa_id INTEGER NOT NULL,
    medico_id INTEGER NOT NULL,
    data_ora DATETIME NOT NULL,
    stato TEXT NOT NULL DEFAULT 'programmata'
        CHECK(stato IN ('programmata', 'completata', 'annullata')),
    FOREIGN KEY (percorso_paziente_id) REFERENCES percorsi_paziente(id),
    FOREIGN KEY (tappa_id) REFERENCES tappe(id),
    FOREIGN KEY (medico_id) REFERENCES medici(id)
);

-- Referti
CREATE TABLE IF NOT EXISTS referti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prenotazione_id INTEGER NOT NULL UNIQUE,
    medico_id INTEGER NOT NULL,
    contenuto TEXT NOT NULL,
    data_rilascio DATETIME DEFAULT CURRENT_TIMESTAMP,
    stato TEXT NOT NULL DEFAULT 'disponibile'
        CHECK(stato IN ('in_elaborazione', 'disponibile', 'archiviato')),
    FOREIGN KEY (prenotazione_id) REFERENCES prenotazioni(id),
    FOREIGN KEY (medico_id) REFERENCES medici(id)
);

-- Messaggi
CREATE TABLE IF NOT EXISTS messaggi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mittente_id INTEGER NOT NULL,
    destinatario_id INTEGER NOT NULL,
    percorso_paziente_id INTEGER NOT NULL,
    contenuto TEXT NOT NULL,
    inviato_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    letto INTEGER DEFAULT 0,
    FOREIGN KEY (mittente_id) REFERENCES utenti(id),
    FOREIGN KEY (destinatario_id) REFERENCES utenti(id),
    FOREIGN KEY (percorso_paziente_id) REFERENCES percorsi_paziente(id)
);

-- Dati iniziali: percorsi terapeutici fissi
INSERT INTO percorsi_terapeutici (nome, specializzazione, descrizione) VALUES
('Percorso Ginocchio', 'Ortopedia', 
 'Percorso per la gestione di patologie al ginocchio'),
('Controllo Cardiaco', 'Cardiologia', 
 'Percorso di monitoraggio cardiologico completo'),
('Controllo Cute', 'Dermatologia', 
 'Percorso dermatologico per controllo e diagnosi cutanea');

-- Tappe Percorso Ginocchio
INSERT INTO tappe (percorso_id, ordine, nome, descrizione) VALUES
(1, 1, 'Visita ortopedica iniziale', 'Prima valutazione ortopedica'),
(1, 2, 'Radiografia', 'Esame radiografico del ginocchio'),
(1, 3, 'Fisioterapia', 'Sessioni di fisioterapia riabilitativa'),
(1, 4, 'Visita di controllo', 'Valutazione finale del percorso');

-- Tappe Controllo Cardiaco
INSERT INTO tappe (percorso_id, ordine, nome, descrizione) VALUES
(2, 1, 'Visita cardiologica iniziale', 'Prima valutazione cardiologica'),
(2, 2, 'Elettrocardiogramma', 'Esame ECG standard'),
(2, 3, 'Holter 24h', 'Monitoraggio cardiaco delle 24 ore'),
(2, 4, 'Visita di controllo', 'Valutazione finale del percorso');

-- Tappe Controllo Cute
INSERT INTO tappe (percorso_id, ordine, nome, descrizione) VALUES
(3, 1, 'Visita dermatologica iniziale', 'Prima valutazione dermatologica'),
(3, 2, 'Dermoscopia', 'Esame dermoscopico delle lesioni'),
(3, 3, 'Biopsia cutanea', 'Prelievo tissutale per analisi'),
(3, 4, 'Visita di controllo', 'Valutazione finale del percorso');