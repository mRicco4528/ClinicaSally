const utente = getUtente();
if (!utente || utente.ruolo !== 'medico') window.location.href = '../index.html';
document.getElementById('nome-utente').textContent = `${utente.nome} ${utente.cognome}`;

let percorsiAttivi = [];
let percorsoSelezionatoId = null;
let prenotazioniCaricate = [];
let refertiCaricati = [];
let pazientiPrenotazione = [];
let pazienteScelto = null;

// Ricava dal backend l'identificativo del medico associato all'utente autenticato,
// valore distinto dall'id utente del token e necessario per creare prenotazioni e referti.
const inizializza = async () => {
    try {
        const res = await api.getMedicoByUtente(utente.id);
        medicoId = res.data.id;
    } catch (err) {
        console.error('Errore recupero id medico:', err);
    }
};

// Gestisce la navigazione interna del pannello: nasconde tutte le sezioni, rende
// visibile quella selezionata, aggiorna il titolo e la voce di menù attiva e
// infine ne carica i dati dal backend.
const mostraSezione = (sezione) => {
    ['pazienti', 'prenotazioni', 'referti', 'messaggi'].forEach(s => {
        document.getElementById(`sezione-${s}`).classList.add('d-none');
    });
    document.getElementById(`sezione-${sezione}`).classList.remove('d-none');

    const titoli = {
        pazienti: 'I miei pazienti',
        prenotazioni: 'Prenotazioni',
        referti: 'Referti',
        messaggi: 'Messaggi'
    };
    document.getElementById('titolo-sezione').textContent = titoli[sezione];

    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    event.target.closest('a').classList.add('active');

    if (sezione === 'pazienti') caricaPazienti();
    if (sezione === 'prenotazioni') caricaSezionePrenotazioni();
    if (sezione === 'referti') caricaSezioneReferti();
    if (sezione === 'messaggi') caricaSezioneMessaggi();
};

// Termina la sessione di lavoro svuotando la memoria locale del browser e
// riportando l'utente alla pagina di accesso.
const logout = () => {
    localStorage.clear();
    window.location.href = '../index.html';
};

// Compone la descrizione leggibile della tappa corrente, unendo la posizione nel
// protocollo alla denominazione della tappa; qualora il nome non sia disponibile,
// per esempio perché il numero d'ordine eccede le tappe previste, si ripiega sulla
// sola indicazione numerica.
const descriviTappa = (percorso) => {
    const posizione = `${percorso.tappa_corrente} di ${percorso.tappe_totali}`;
    return percorso.tappa_nome ? `${posizione} — ${percorso.tappa_nome}` : posizione;
};

// Popola la tabella dei percorsi assegnati al medico, corredando ciascuna riga del
// pulsante che consente di far avanzare il paziente alla tappa successiva.
const caricaPazienti = async () => {
    try {
        const res = await api.getPercorsiPaziente();
        percorsiAttivi = res.data;
        const tbody = document.getElementById('tabella-pazienti');

        if (!res.data.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">
                Nessun percorso assegnato. L'assegnazione si effettua dall'area amministrativa.
            </td></tr>`;
            return;
        }

        tbody.innerHTML = res.data.map(p => `
            <tr>
                <td>${p.paziente}</td>
                <td>${p.percorso}</td>
                <td>${descriviTappa(p)}</td>
                <td><span class="badge badge-${p.stato}">${p.stato}</span></td>
                <td>${new Date(p.data_avvio).toLocaleDateString('it-IT')}</td>
                <td>
                    <button onclick="avanzaTappaId(${p.id})" class="btn btn-sm btn-outline-success">
                        <i class="bi bi-arrow-right-circle"></i> Avanza
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Errore pazienti:', err);
    }
};

// Fa progredire il percorso indicato alla tappa successiva previa conferma,
// mostrando l'esito comunicato dal server e riallineando le viste che dipendono
// dallo stato di avanzamento.
const avanzaTappaId = async (id) => {
    if (!confirm('Vuoi avanzare alla tappa successiva?')) return;
    try {
        const res = await api.avanzaTappa(id);
        alert(res.data.messaggio);
        await aggiornaDopoAvanzamento();
    } catch (err) {
        alert('Errore avanzamento tappa.');
    }
};

// Riallinea le viste che dipendono dallo stato di avanzamento: la tabella dei pazienti,
// che espone la tappa corrente, e l'elenco delle prenotazioni, il quale mostra ora
// l'intero archivio e va perciò riletto per intero, conservando i criteri di ricerca
// eventualmente impostati.
const aggiornaDopoAvanzamento = async () => {
    await caricaPazienti();

    if (document.getElementById('tabella-prenotazioni')) {
        await caricaPrenotazioni();
    }
};

// Individua la prenotazione selezionata nella sezione dei referti e ne restituisce
// l'identificativo insieme a quello del percorso di appartenenza, trasportato
// dall'attributo dell'opzione; in mancanza di una scelta avverte l'operatore.
const prenotazioneSelezionata = () => {
    const sel = document.getElementById('sel-prenotazione-ref');
    const opzione = sel.selectedOptions[0];

    if (!sel.value || !opzione || !opzione.dataset.percorso) {
        alert('Seleziona prima una prenotazione: il percorso su cui operare viene ricavato da essa.');
        return null;
    }

    return {
        prenotazioneId: sel.value,
        percorsoId: Number(opzione.dataset.percorso)
    };
};

// Registra il referto e, soltanto a salvataggio riuscito, fa progredire il percorso
// alla tappa successiva. Le due operazioni costituiscono un unico atto: il referto è
// pertanto indispensabile, e un suo mancato inserimento — come pure il rifiuto da
// parte del server, per esempio quando la prestazione risulti già refertata —
// impedisce l'avanzamento, affinché non si dia il caso di un percorso progredito
// senza la relativa documentazione.
const avanzaTappa = async () => {
    const scelta = prenotazioneSelezionata();
    if (!scelta) return;

    const contenuto = document.getElementById('contenuto-referto').value.trim();
    if (!contenuto) {
        alert('Inserisci il contenuto del referto: viene registrato insieme all\'avanzamento.');
        return;
    }

    if (!confirm('Vuoi registrare il referto e avanzare alla tappa successiva?')) return;

    try {
        await api.creaReferto({
            prenotazione_id: scelta.prenotazioneId,
            medico_id: medicoId,
            contenuto
        });
    } catch (err) {
        alert(err.response?.data?.errore || 'Errore caricamento referto. Il percorso non è stato avanzato.');
        return;
    }

    try {
        const res = await api.avanzaTappa(scelta.percorsoId);
        alert(`Referto registrato. ${res.data.messaggio}.`);
    } catch (err) {
        alert('Referto registrato, ma l\'avanzamento della tappa non è riuscito.');
    }

    document.getElementById('contenuto-referto').value = '';
    await caricaSezioneReferti();
    await aggiornaDopoAvanzamento();
};

// Dichiara concluso il percorso della prenotazione selezionata senza percorrerne le
// tappe residue. A differenza dell'avanzamento non richiede alcun referto, poiché
// registra una decisione clinica di chiusura e non l'esito di una prestazione.
const completaPercorso = async () => {
    const scelta = prenotazioneSelezionata();
    if (!scelta) return;

    if (!confirm('Vuoi dichiarare concluso il percorso? La tappa corrente resterà quella raggiunta.')) return;

    try {
        const res = await api.completaPercorso(scelta.percorsoId);
        alert(res.data.messaggio);
        await caricaSezioneReferti();
        await aggiornaDopoAvanzamento();
    } catch (err) {
        alert(err.response?.data?.errore || 'Errore durante la conclusione del percorso.');
    }
};

// Raccoglie righe eterogenee — percorsi o prenotazioni — sotto il paziente cui
// appartengono, servendosi del codice fiscale quale chiave, essendo esso univoco per
// vincolo di schema. Restituisce una struttura uniforme, così che elenchi e ricerche
// delle due sezioni possano condividere il medesimo trattamento.
const raggruppaPerPaziente = (righe) => {
    const mappa = new Map();
    righe.forEach(r => {
        if (!mappa.has(r.codice_fiscale)) {
            mappa.set(r.codice_fiscale, {
                nome: r.paziente_nome,
                cognome: r.paziente_cognome,
                codice_fiscale: r.codice_fiscale,
                righe: []
            });
        }
        mappa.get(r.codice_fiscale).righe.push(r);
    });
    return Array.from(mappa.values());
};

// Verifica la conformità di un paziente ai criteri di ricerca: i campi lasciati vuoti
// non concorrono, gli altri si combinano fra loro, e il confronto avviene su porzioni
// di testo senza distinguere maiuscole e minuscole.
const pazienteCorrisponde = (paziente, nome, cognome, cf) =>
    (!nome || (paziente.nome || '').toLowerCase().includes(nome)) &&
    (!cognome || (paziente.cognome || '').toLowerCase().includes(cognome)) &&
    (!cf || (paziente.codice_fiscale || '').toLowerCase().includes(cf));

// Legge i tre campi di ricerca contrassegnati dal prefisso indicato, normalizzandoli.
const criteriRicerca = (prefisso) => ({
    nome: document.getElementById(`${prefisso}nome`).value.trim().toLowerCase(),
    cognome: document.getElementById(`${prefisso}cognome`).value.trim().toLowerCase(),
    cf: document.getElementById(`${prefisso}cf`).value.trim().toLowerCase()
});

// Prepara la sezione delle prenotazioni. L'inserimento non muove più da un menù di
// percorsi ma dalla ricerca del paziente, sicché qui ci si limita a raccogliere i
// percorsi assegnati e a raggrupparli per assistito; l'elenco delle prenotazioni già
// registrate viene caricato per intero e presentato anch'esso per paziente.
const caricaSezionePrenotazioni = async () => {
    try {
        const res = await api.getPercorsiPaziente();
        percorsiAttivi = res.data;
        pazientiPrenotazione = raggruppaPerPaziente(res.data);

        azzeraSceltaPaziente();
        await caricaPrenotazioni();
    } catch (err) {
        console.error('Errore sezione prenotazioni:', err);
    }
};

// Presenta i pazienti fra cui scegliere per il nuovo appuntamento, indicando per
// ciascuno quanti percorsi gli siano stati assegnati.
const filtraPazientiPrenotazione = () => {
    const { nome, cognome, cf } = criteriRicerca('pren-cerca-');
    const visibili = pazientiPrenotazione.filter(p => pazienteCorrisponde(p, nome, cognome, cf));
    const tbody = document.getElementById('lista-pazienti-pren');

    if (!visibili.length) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-muted text-center">
            ${pazientiPrenotazione.length ? 'Nessun paziente corrisponde alla ricerca.' : 'Nessun paziente in carico.'}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = visibili.map(p => `
        <tr class="riga-selezionabile" onclick="scegliPaziente('${p.codice_fiscale}')">
            <td class="fw-semibold">${p.nome} ${p.cognome}</td>
            <td>${p.codice_fiscale}</td>
            <td>${p.righe.length} percorsi</td>
        </tr>
    `).join('');
};

// Fissa il paziente destinatario dell'appuntamento e passa alla seconda fase, dove si
// scelgono percorso, tappa e data. Il menù dei percorsi accoglie i soli protocolli di
// quel paziente; alla scelta di uno di essi le tappe vengono caricate dal server,
// secondo il meccanismo dei menù a selezione dipendente.
const scegliPaziente = (codiceFiscale) => {
    pazienteScelto = pazientiPrenotazione.find(p => p.codice_fiscale === codiceFiscale);
    if (!pazienteScelto) return;

    document.getElementById('paziente-scelto').textContent =
        `${pazienteScelto.nome} ${pazienteScelto.cognome} — ${pazienteScelto.codice_fiscale}`;

    const selPercorso = document.getElementById('sel-percorso-pren');
    selPercorso.innerHTML = '<option value="">Seleziona percorso</option>' +
        pazienteScelto.righe.map(p =>
            `<option value="${p.id}">${p.percorso} — ${descriviTappa(p)} (${p.stato})</option>`).join('');

    selPercorso.onchange = async () => {
        const selTappa = document.getElementById('sel-tappa-pren');
        selTappa.innerHTML = '<option value="">Seleziona tappa</option>';
        if (!selPercorso.value) return;

        const percorso = pazienteScelto.righe.find(p => String(p.id) === selPercorso.value);
        const tappeRes = await api.getTappe(percorso.percorso_id);
        selTappa.innerHTML = '<option value="">Seleziona tappa</option>' +
            tappeRes.data.map(t => `<option value="${t.id}">${t.ordine}. ${t.nome}</option>`).join('');
    };

    document.getElementById('passo-scelta-paziente').classList.add('d-none');
    document.getElementById('passo-dati-prenotazione').classList.remove('d-none');
};

// Riporta l'inserimento alla fase iniziale, sgombrando quanto già impostato.
const azzeraSceltaPaziente = () => {
    pazienteScelto = null;
    document.getElementById('sel-tappa-pren').innerHTML = '<option value="">Seleziona tappa</option>';
    document.getElementById('data-pren').value = '';
    document.getElementById('passo-dati-prenotazione').classList.add('d-none');
    document.getElementById('passo-scelta-paziente').classList.remove('d-none');
    filtraPazientiPrenotazione();
};

// Sgombra i criteri di ricerca del paziente riportando l'elenco alla sua interezza.
const azzeraRicercaPaziente = () => {
    ['pren-cerca-nome', 'pren-cerca-cognome', 'pren-cerca-cf'].forEach(id => {
        document.getElementById(id).value = '';
    });
    filtraPazientiPrenotazione();
};

// Recupera dal server l'intero elenco delle prenotazioni, conservandolo in memoria
// affinché la ricerca possa operarvi senza interrogare nuovamente il backend a ogni
// carattere digitato, e ne presenta subito la vista filtrata secondo i criteri
// eventualmente già impostati.
const caricaPrenotazioni = async () => {
    try {
        const res = await api.getTuttePrenotazioni();
        prenotazioniCaricate = res.data;
        filtraPrenotazioni();
    } catch (err) {
        console.error('Errore prenotazioni:', err);
    }
};

// Presenta i pazienti conformi ai criteri immessi, uno per riga, riepilogandone il
// numero di percorsi e di appuntamenti; il dettaglio delle singole prenotazioni si
// consulta nella finestra che si apre selezionando la riga.
const filtraPrenotazioni = () => {
    const { nome, cognome, cf } = criteriRicerca('cerca-');
    const pazienti = raggruppaPerPaziente(prenotazioniCaricate);
    const visibili = pazienti.filter(p => pazienteCorrisponde(p, nome, cognome, cf));

    const tbody = document.getElementById('tabella-prenotazioni');
    const conteggio = document.getElementById('conteggio-prenotazioni');

    if (!visibili.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted text-center">
            ${pazienti.length ? 'Nessun paziente corrisponde alla ricerca.' : 'Nessuna prenotazione registrata.'}
        </td></tr>`;
        conteggio.textContent = '';
        return;
    }

    tbody.innerHTML = visibili.map(p => {
        const percorsi = new Set(p.righe.map(r => r.percorso));
        const pendenti = p.righe.filter(r => r.stato === 'programmata').length;
        return `
            <tr class="riga-selezionabile" onclick="apriPrenotazioni('${p.codice_fiscale}')">
                <td class="fw-semibold">${p.nome} ${p.cognome}</td>
                <td>${p.codice_fiscale}</td>
                <td>${percorsi.size}</td>
                <td>
                    ${p.righe.length}
                    ${pendenti ? `<span class="badge bg-primary ms-1">${pendenti} programmate</span>` : ''}
                </td>
            </tr>
        `;
    }).join('');

    conteggio.textContent = visibili.length === pazienti.length
        ? `${visibili.length} pazienti`
        : `${visibili.length} di ${pazienti.length} pazienti`;
};

// Apre la finestra con tutte le prenotazioni del paziente indicato, quelle di ogni suo
// percorso: la colonna dedicata al protocollo consente di distinguerle.
const apriPrenotazioni = (codiceFiscale) => {
    const paziente = raggruppaPerPaziente(prenotazioniCaricate)
        .find(p => p.codice_fiscale === codiceFiscale);
    if (!paziente) return;

    const righe = paziente.righe
        .slice()
        .sort((a, b) => new Date(a.data_ora) - new Date(b.data_ora));

    apriModal(
        `${paziente.nome} ${paziente.cognome}`,
        `${paziente.codice_fiscale} — ${righe.length} prenotazioni`,
        `
        <table class="table table-sm table-hover mb-0">
            <thead>
                <tr>
                    <th>Percorso</th>
                    <th>Tappa</th>
                    <th>Data e ora</th>
                    <th>Medico</th>
                    <th>Stato</th>
                </tr>
            </thead>
            <tbody>
                ${righe.map(r => `
                    <tr>
                        <td>${r.percorso}</td>
                        <td>${r.tappa}</td>
                        <td>${new Date(r.data_ora).toLocaleString('it-IT')}</td>
                        <td>${r.medico}</td>
                        <td><span class="badge bg-${r.stato === 'completata' ? 'success' : r.stato === 'annullata' ? 'secondary' : 'primary'}">${r.stato}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `
    );
};

// Sgombra i criteri di ricerca riportando l'elenco alla sua interezza.
const azzeraRicerca = () => {
    ['cerca-nome', 'cerca-cognome', 'cerca-cf'].forEach(id => {
        document.getElementById(id).value = '';
    });
    filtraPrenotazioni();
};

// Convalida i campi del modulo e invia al backend la nuova prenotazione,
// associandola all'identificativo del medico autenticato. A registrazione avvenuta
// la tappa e la data vengono sgombrate, così da predisporre l'inserimento della
// prenotazione seguente; il percorso resta invece selezionato, poiché di norma si
// fissano più appuntamenti per il medesimo paziente.
const creaPrenotazione = async () => {
    const percorso_paziente_id = document.getElementById('sel-percorso-pren').value;
    const tappa_id = document.getElementById('sel-tappa-pren').value;
    const data_ora = document.getElementById('data-pren').value;

    if (!percorso_paziente_id || !tappa_id || !data_ora) {
        alert('Compila tutti i campi.');
        return;
    }

    try {
        await api.creaPrenotazione({
            percorso_paziente_id,
            tappa_id,
            medico_id: medicoId,
            data_ora
        });
        alert('Prenotazione creata!');

        document.getElementById('sel-tappa-pren').value = '';
        document.getElementById('data-pren').value = '';

        await caricaPrenotazioni();
    } catch (err) {
        alert('Errore creazione prenotazione.');
    }
};

// Prepara la sezione dedicata ai referti: il menù raccoglie le prestazioni non ancora
// refertate, ricavate da un'unica interrogazione dell'elenco complessivo, mentre
// l'archivio è presentato per paziente. Su ciascuna opzione viene riportato anche il
// percorso di appartenenza, dal quale i comandi di avanzamento e di conclusione
// traggono il proprio oggetto senza necessità di un menù ulteriore.
const caricaSezioneReferti = async () => {
    try {
        const res = await api.getTuttePrenotazioni();
        const daRefertare = res.data.filter(p => p.stato === 'programmata');

        const sel = document.getElementById('sel-prenotazione-ref');
        sel.innerHTML = '<option value="">Seleziona prenotazione</option>' +
            daRefertare.map(p => `<option value="${p.id}" data-percorso="${p.percorso_paziente_id}">${p.paziente_nome} ${p.paziente_cognome} — ${p.tappa} — ${new Date(p.data_ora).toLocaleDateString('it-IT')}</option>`).join('');

        await caricaElencoPazientiReferti();
    } catch (err) {
        console.error('Errore sezione referti:', err);
    }
};

// Presenta i pazienti in carico con il rispettivo percorso e il numero di referti
// disponibili; la riga è selezionabile e apre la finestra di consultazione. I referti
// vengono prelevati una sola volta e raggruppati per percorso, di modo che l'apertura
// della finestra non comporti un'ulteriore interrogazione del server.
const caricaElencoPazientiReferti = async () => {
    try {
        const [percorsiRes, refertiRes] = await Promise.all([
            api.getPercorsiPaziente(),
            api.getReferti()
        ]);

        percorsiAttivi = percorsiRes.data;
        refertiCaricati = refertiRes.data;

        const tbody = document.getElementById('tabella-pazienti-referti');

        if (!percorsiAttivi.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-muted text-center">Nessun paziente in carico.</td></tr>';
            return;
        }

        tbody.innerHTML = percorsiAttivi.map(p => {
            const quanti = refertiCaricati.filter(r => r.percorso_paziente_id === p.id).length;
            return `
                <tr class="riga-selezionabile" onclick="apriReferti(${p.id})">
                    <td class="fw-semibold">${p.paziente}</td>
                    <td>${p.percorso}</td>
                    <td>${descriviTappa(p)}</td>
                    <td><span class="badge badge-${p.stato}">${p.stato}</span></td>
                    <td>${quanti ? `${quanti} referti` : '<span class="text-muted">nessuno</span>'}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Errore elenco pazienti:', err);
    }
};

// Apre la finestra con i referti del percorso indicato. Accanto alla tappa refertata
// compare quella a cui il paziente si trovava quando il documento fu prodotto: per i
// referti anteriori all'introduzione di tale registrazione il dato è assente e viene
// dichiarato tale, anziché essere sostituito dalla posizione attuale, che falserebbe
// la ricostruzione storica.
const apriReferti = (percorsoPazienteId) => {
    const percorso = percorsiAttivi.find(p => p.id === percorsoPazienteId);
    if (!percorso) return;

    const referti = refertiCaricati.filter(r => r.percorso_paziente_id === percorsoPazienteId);

    let corpo;

    if (!referti.length) {
        corpo = '<p class="text-muted mb-0">Nessun referto registrato per questo percorso.</p>';
    } else {
        corpo = `
            <table class="table table-sm table-hover mb-0">
                <thead>
                    <tr>
                        <th>Tappa refertata</th>
                        <th>Tappa al referto</th>
                        <th>Data</th>
                        <th>Contenuto</th>
                    </tr>
                </thead>
                <tbody>
                    ${referti.map(r => {
                        const tappaAlReferto = r.tappa_corrente_al_referto
                            ? `${r.tappa_corrente_al_referto} di ${r.tappe_totali}${r.tappa_al_referto ? ` — ${r.tappa_al_referto}` : ''}`
                            : '<span class="text-muted">non registrata</span>';
                        return `
                            <tr>
                                <td>${r.tappa_refertata}</td>
                                <td>${tappaAlReferto}</td>
                                <td>${new Date(r.data_rilascio).toLocaleDateString('it-IT')}</td>
                                <td>${r.contenuto}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    apriModal(
        percorso.paziente,
        `${percorso.percorso} — ${descriviTappa(percorso)}`,
        corpo
    );
};

// Mostra la finestra di consultazione, condivisa dalle sezioni Prenotazioni e Referti,
// riempiendola dell'intestazione e del contenuto forniti dal chiamante.
const apriModal = (titolo, sottotitolo, contenuto) => {
    document.getElementById('titolo-modal').textContent = titolo;
    document.getElementById('sottotitolo-modal').textContent = sottotitolo;
    document.getElementById('corpo-modal').innerHTML = contenuto;
    document.getElementById('modal-dettaglio').classList.remove('d-none');
};

// Richiude la finestra di consultazione.
const chiudiModal = () => {
    document.getElementById('modal-dettaglio').classList.add('d-none');
};

// Consente di richiudere la finestra anche mediante il tasto Esc, secondo la
// consuetudine diffusa nelle interfacce a sovrapposizione.
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chiudiModal();
});

// Costruisce l'elenco delle conversazioni disponibili, una per ciascun percorso
// assegnato, ognuna apribile con un clic tramite la funzione apriChat.
const caricaSezioneMessaggi = async () => {
    try {
        const res = await api.getPercorsiPaziente();
        percorsiAttivi = res.data;
        const lista = document.getElementById('lista-percorsi-msg');
        lista.innerHTML = res.data.map(p => `
            <div class="p-2 rounded mb-1 cursor-pointer" 
                style="cursor:pointer; background:#f0f4f8;"
                onclick="apriChat(${p.id}, '${p.paziente}')">
                <div class="fw-semibold small">${p.paziente}</div>
                <div class="text-muted" style="font-size:0.75rem">${p.percorso}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Errore messaggi:', err);
    }
};

let percorsoChatId = null;
let destinatarioId = null;

// Apre la conversazione relativa al percorso scelto: memorizza il contesto,
// aggiorna il titolo, rende visibile il modulo di invio e carica lo storico dei messaggi.
const apriChat = async (percorsoId, nomePaziente) => {
    percorsoChatId = percorsoId;
    document.getElementById('titolo-chat').textContent = `Chat con ${nomePaziente}`;
    document.getElementById('form-messaggio').style.display = 'flex';
    await aggiornaChat();
};

// Carica i messaggi della conversazione corrente e li rappresenta come fumetti
// allineati in base al mittente, facendo poi scorrere l'area fino al messaggio
// più recente.
const aggiornaChat = async () => {
    if (!percorsoChatId) return;
    try {
        const res = await api.getMessaggi(percorsoChatId);
        const area = document.getElementById('area-messaggi');
        area.innerHTML = res.data.map(m => {
            const isMio = m.ruolo_mittente === 'medico';
            return `
                <div class="d-flex ${isMio ? 'justify-content-end' : 'justify-content-start'} mb-2">
                    <div class="p-2 rounded" style="max-width:70%; background:${isMio ? '#0d6efd' : '#e9ecef'}; color:${isMio ? 'white' : 'black'}">
                        <div class="small fw-semibold">${m.mittente}</div>
                        <div>${m.contenuto}</div>
                        <div style="font-size:0.7rem; opacity:0.7">${new Date(m.inviato_at).toLocaleTimeString('it-IT')}</div>
                    </div>
                </div>
            `;
        }).join('');
        area.scrollTop = area.scrollHeight;
    } catch (err) {
        console.error('Errore chat:', err);
    }
};

// Invia il messaggio digitato al paziente della conversazione aperta e aggiorna
// la visualizzazione della chat.
const inviaMessaggio = async () => {
    const contenuto = document.getElementById('testo-messaggio').value.trim();
    if (!contenuto || !percorsoChatId) return;

    const pp = percorsiAttivi.find(p => p.id === percorsoChatId);
    if (!pp) return;

    try {
        await api.inviaMessaggio({
            destinatario_id: pp.paziente_id || utente.id,
            percorso_paziente_id: percorsoChatId,
            contenuto
        });
        document.getElementById('testo-messaggio').value = '';
        await aggiornaChat();
    } catch (err) {
        alert('Errore invio messaggio.');
    }
};

inizializza().then(() => caricaPazienti());