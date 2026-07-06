# Clinica Sally

# Sally — Sistema di Gestione Clinica

Applicazione full-stack API-based per la gestione dei percorsi 
terapeutici della Clinica Sally.
Sviluppata come Project Work per il corso L-31 Informatica 
per le Aziende Digitali — Università Telematica Pegaso.

---

## Stack tecnologico

| Layer         | Tecnologia              |
|---------------|-------------------------|
| Frontend      | HTML + CSS + JavaScript |
| Chiamate API  | Axios                   |
| Backend       | Node.js + Express       |
| Database      | SQLite                  |
| Autenticazione| JWT                     |
| API Docs      | Swagger                 |

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

Il server sarà attivo su: `http://localhost:3000`

### 5. Apri il frontend

Apri il file `frontend/index.html` direttamente nel browser.
Non è necessario un server aggiuntivo per il frontend.

---

## Documentazione API

Una volta avviato il server, la documentazione Swagger 
è disponibile al seguente indirizzo:
http://localhost:3000/api-docs

---

## Credenziali di test

| Ruolo   | Email                        | Password  |
|---------|------------------------------|-----------|
| Admin   | admin@meridiem.it            | admin123  |
| Medico  | dott.rossi@meridiem.it       | medico123 |
| Paziente| mario.bianchi@email.it       | paziente123|

---

## Struttura del progetto
ClinicaSally/
├── backend/
│   ├── server.js              # Punto di ingresso Express
│   ├── database/
│   │   ├── db.js              # Connessione SQLite
│   │   └── schema.sql         # Script creazione tabelle
│   ├── routes/                # Un file per ogni area API
│   ├── middleware/
│   │   └── auth.js            # Verifica JWT e ruoli
│   └── swagger/
│       └── swagger.js         # Configurazione Swagger
├── frontend/
│   ├── index.html             # Pagina di login
│   ├── css/
│   ├── js/                    # Logica e chiamate Axios
│   └── pages/                 # Pagine per ogni ruolo
└── docs/
└── Sally_API_Endpoints.xlsx

---

## Autore

Ricco — Università Telematica Pegaso  
Corso L-31 Informatica per le Aziende Digitali  
Anno accademico 2025/2026
