# Sally — Sistema di Gestione Clinica

Applicazione full-stack API-based per la gestione dei percorsi 
terapeutici della Clinica Sally.
Sviluppata come Project Work per il corso L-31 Informatica 
per le Aziende Digitali — Università Telematica Pegaso.

---

## Stack tecnologico

| Layer          | Tecnologia                           |
|----------------|--------------------------------------|
| Frontend       | HTML + CSS + JavaScript, Bootstrap 5 |
| Chiamate API   | Axios                                |
| Backend        | Node.js + Express                    |
| Database       | SQLite                               |
| Autenticazione | JWT + bcrypt                         |
| API Docs       | Swagger                              |

---

## Requisiti di sistema

Prima di clonare e avviare il progetto, assicurati di avere 
installato sul tuo computer:

- [Node.js](https://nodejs.org/) versione 18 o superiore
- [Git](https://git-scm.com/)

Per verificare che siano installati, apri il terminale e digita:

```bash
node --version
git --version
```

---

## Installazione e avvio

### 1. Clona il repository

```bash
git clone https://github.com/mRicco4528/ClinicaSally.git
```

### 2. Entra nella cartella del progetto

```bash
cd ClinicaSally
```

### 3. Installa le dipendenze del backend

```bash
cd backend
npm install
```

### 4. Avvia il server

```bash
node server.js
```

Al primo avvio viene creato il database, con le tabelle, i percorsi 
terapeutici e gli utenti di prova.

### 5. Apri l'applicazione

Il browser si apre da solo su `http://localhost:3000`, dove il server 
espone sia il frontend sia le API. Se non si apre, digita l'indirizzo 
a mano.

---

## Documentazione API

Una volta avviato il server, la documentazione Swagger 
è disponibile al seguente indirizzo:
http://localhost:3000/api-docs

---

## Credenziali di test

| Ruolo                | Email                  | Password    |
|----------------------|------------------------|-------------|
| Admin                | admin@meridiem.it      | admin123    |
| Medico Ortopedico    | dott.rossi@meridiem.it | medico123   |
| Medico Cardiologico  | dott.verdi@meridiem.it | medico456   |
| Medico Dermatologico | dott.neri@meridiem.it  | medico789   |
| Paziente             | mario.bianchi@email.it | paziente123 |
| Paziente             | mario.verdi@email.it   | paziente456 |

---

## Struttura del progetto

```text
ClinicaSally/
├── backend/
│   ├── server.js                              # Avvio di Express, seed e frontend
│   ├── package.json                           # Dipendenze e script npm
│   ├── database/
│   │   ├── db.js                              # Connessione SQLite e schema
│   │   ├── schema.sql                         # Tabelle e percorsi predefiniti
│   │   ├── seed.js                            # Inserisce gli utenti di prova
│   │   └── sally.db                           # Database SQLite, creato se assente
│   ├── middleware/
│   │   └── auth.js                            # Verifica del token JWT e dei ruoli
│   ├── routes/                                # Un file per ogni area delle API
│   │   ├── auth.js · utenti.js · pazienti.js  # Accesso e anagrafiche
│   │   ├── percorsi.js · percorsiPaziente.js  # Modelli e avanzamento dei percorsi
│   │   ├── prenotazioni.js · referti.js       # Attività clinica
│   │   └── messaggi.js · dashboard.js         # Chat e indicatori
│   └── swagger/
│       └── swagger.js                         # Configurazione di Swagger
├── frontend/
│   ├── index.html                             # Pagina di login
│   ├── css/
│   │   └── style.css
│   ├── js/                                    # Logica delle pagine
│   │   ├── api.js                             # Tutte le chiamate Axios al backend
│   │   └── login.js · admin.js · medico.js · paziente.js
│   └── pages/                                 # Una pagina per ruolo
│       └── admin.html · medico.html · paziente.html
└── README.md
```

---

## Autore

Ricco — Università Telematica Pegaso  
Corso L-31 Informatica per le Aziende Digitali  
Anno accademico 2025/2026
