const utente = getUtente();
if (!utente || utente.ruolo !== 'admin') window.location.href = '../index.html';
document.getElementById('nome-utente').textContent = `${utente.nome} ${utente.cognome}`;

// Gestisce la navigazione interna del pannello: nasconde tutte le sezioni, rende
// visibile quella selezionata, aggiorna il titolo e la voce di menù attiva e
// infine ne carica i dati dal backend.
const mostraSezione = (sezione) => {
    ['dashboard', 'utenti', 'percorsi'].forEach(s => {
        document.getElementById(`sezione-${s}`).classList.add('d-none');
    });
    document.getElementById(`sezione-${sezione}`).classList.remove('d-none');

    const titoli = { dashboard: 'Dashboard', utenti: 'Gestione Utenti', percorsi: 'Gestione Percorsi' };
    document.getElementById('titolo-sezione').textContent = titoli[sezione];

    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    event.target.closest('a').classList.add('active');

    if (sezione === 'dashboard') caricaDashboard();
    if (sezione === 'utenti') caricaUtenti();
    if (sezione === 'percorsi') caricaPercorsi();
};

// Termina la sessione di lavoro svuotando la memoria locale del browser e
// riportando l'utente alla pagina di accesso.
const logout = () => {
    localStorage.clear();
    window.location.href = '../index.html';
};

// Richiede al backend gli indicatori riepilogativi e li riversa nelle schede
// statistiche e nella tabella della distribuzione dei percorsi per specializzazione.
const caricaDashboard = async () => {
    try {
        const res = await api.getDashboard();
        const d = res.data;
        document.getElementById('stat-percorsi').textContent = d.percorsi_attivi;
        document.getElementById('stat-referti').textContent = d.referti_in_attesa;
        document.getElementById('stat-pazienti').textContent = d.totale_pazienti;

        const tbody = document.getElementById('tabella-specializzazioni');
        tbody.innerHTML = d.percorsi_per_specializzazione.map(r => `
            <tr>
                <td>${r.specializzazione}</td>
                <td><span class="badge bg-primary">${r.totale}</span></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Errore dashboard:', err);
    }
};

// Popola la tabella degli utenti registrati, corredando ciascuna riga del pulsante
// per l'eliminazione dell'account.
const caricaUtenti = async () => {
    try {
        const res = await api.getUtenti();
        const tbody = document.getElementById('tabella-utenti');
        tbody.innerHTML = res.data.map(u => `
            <tr>
                <td>${u.nome} ${u.cognome}</td>
                <td>${u.email}</td>
                <td><span class="badge bg-secondary">${u.ruolo}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString('it-IT')}</td>
                <td>
                    <button onclick="eliminaUtente(${u.id})" class="btn btn-sm btn-outline-danger">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Errore utenti:', err);
    }
};

// Mostra o nasconde i campi aggiuntivi del modulo di creazione in funzione del
// ruolo selezionato: dati anagrafici per il paziente, dati professionali per il medico.
const mostraCampiExtra = () => {
    const ruolo = document.getElementById('nuovo-ruolo').value;
    document.getElementById('campi-paziente').classList.toggle('d-none', ruolo !== 'paziente');
    document.getElementById('campi-medico').classList.toggle('d-none', ruolo !== 'medico');
};

// Raccoglie i valori del modulo e li invia al backend per la creazione del nuovo
// account; a esito positivo la tabella degli utenti viene ricaricata.
const creaUtente = async () => {
    const dati = {
        nome: document.getElementById('nuovo-nome').value,
        cognome: document.getElementById('nuovo-cognome').value,
        email: document.getElementById('nuovo-email').value,
        password: document.getElementById('nuovo-password').value,
        ruolo: document.getElementById('nuovo-ruolo').value,
        codice_fiscale: document.getElementById('codice-fiscale').value,
        data_nascita: document.getElementById('data-nascita').value,
        telefono: document.getElementById('telefono').value,
        specializzazione: document.getElementById('specializzazione').value,
        numero_albo: document.getElementById('numero-albo').value,
    };

    try {
        await api.creaUtente(dati);
        alert('Utente creato con successo!');
        caricaUtenti();
    } catch (err) {
        alert('Errore nella creazione utente.');
    }
};

// Elimina l'utente indicato previa conferma esplicita dell'operatore, trattandosi
// di un'operazione irreversibile, e aggiorna di conseguenza la tabella.
const eliminaUtente = async (id) => {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
    try {
        await api.eliminaUtente(id);
        caricaUtenti();
    } catch (err) {
        alert('Errore eliminazione utente.');
    }
};

// Prepara la sezione dei percorsi eseguendo in parallelo le richieste di pazienti,
// percorsi, medici e assegnazioni esistenti, per poi popolare i menù di selezione
// del modulo di assegnazione e la tabella riepilogativa.
const caricaPercorsi = async () => {
    try {
        const [pazienti, percorsi, medici, percorsiAttivi] = await Promise.all([
            api.getPazienti(),
            api.getPercorsi(),
            api.getMedici(),
            api.getPercorsiPaziente()
        ]);

        const selPaziente = document.getElementById('sel-paziente');
        selPaziente.innerHTML = '<option value="">Seleziona paziente</option>' +
            pazienti.data.map(p => `<option value="${p.id}">${p.nome} ${p.cognome}</option>`).join('');

        const selPercorso = document.getElementById('sel-percorso');
        selPercorso.innerHTML = '<option value="">Seleziona percorso</option>' +
            percorsi.data.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');

        const selMedico = document.getElementById('sel-medico');
        selMedico.innerHTML = '<option value="">Seleziona medico</option>' +
            medici.data.map(m => `<option value="${m.id}">${m.nome} ${m.cognome} — ${m.specializzazione}</option>`).join('');

        const tbody = document.getElementById('tabella-percorsi');
        tbody.innerHTML = percorsiAttivi.data.map(p => `
            <tr>
                <td>${p.paziente}</td>
                <td>${p.percorso}</td>
                <td>${p.medico}</td>
                <td>${p.tappa_corrente}</td>
                <td><span class="badge badge-${p.stato}">${p.stato}</span></td>
                <td>${new Date(p.data_avvio).toLocaleDateString('it-IT')}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Errore percorsi:', err);
    }
};

// Verifica che paziente, percorso e medico siano stati selezionati e inoltra al
// backend la richiesta di assegnazione, ricaricando poi la sezione.
const assegnaPercorso = async () => {
    const paziente_id = document.getElementById('sel-paziente').value;
    const percorso_id = document.getElementById('sel-percorso').value;
    const medico_id = document.getElementById('sel-medico').value;

    if (!paziente_id || !percorso_id || !medico_id) {
        alert('Seleziona tutti i campi.');
        return;
    }

    try {
        await api.assegnaPercorso({ paziente_id, percorso_id, medico_id });
        alert('Percorso assegnato con successo!');
        caricaPercorsi();
    } catch (err) {
        alert('Errore assegnazione percorso.');
    }
};

caricaDashboard();