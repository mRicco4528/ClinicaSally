const utente = getUtente();
if (!utente || utente.ruolo !== 'medico') window.location.href = '../index.html';
document.getElementById('nome-utente').textContent = `${utente.nome} ${utente.cognome}`;

let percorsiAttivi = [];
let percorsoSelezionatoId = null;

const inizializza = async () => {
    try {
        const res = await api.getMedicoByUtente(utente.id);
        medicoId = res.data.id;
    } catch (err) {
        console.error('Errore recupero id medico:', err);
    }
};

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

const logout = () => {
    localStorage.clear();
    window.location.href = '../index.html';
};

const caricaPazienti = async () => {
    try {
        const res = await api.getPercorsiPaziente();
        percorsiAttivi = res.data;
        const tbody = document.getElementById('tabella-pazienti');
        tbody.innerHTML = res.data.map(p => `
            <tr>
                <td>${p.paziente}</td>
                <td>${p.percorso}</td>
                <td>${p.tappa_corrente}</td>
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

const avanzaTappaId = async (id) => {
    if (!confirm('Vuoi avanzare alla tappa successiva?')) return;
    try {
        const res = await api.avanzaTappa(id);
        alert(res.data.messaggio);
        caricaPazienti();
    } catch (err) {
        alert('Errore avanzamento tappa.');
    }
};

const caricaSezionePrenotazioni = async () => {
    try {
        const res = await api.getPercorsiPaziente();
        percorsiAttivi = res.data;

        const selPercorso = document.getElementById('sel-percorso-pren');
        const filtro = document.getElementById('filtro-percorso-pren');
        const options = '<option value="">Seleziona percorso</option>' +
            res.data.map(p => `<option value="${p.id}">${p.paziente} — ${p.percorso}</option>`).join('');

        selPercorso.innerHTML = options;
        filtro.innerHTML = options;

        selPercorso.onchange = async () => {
            const pid = selPercorso.value;
            if (!pid) return;
            const ppRes = await api.getPercorsoPaziente(pid);
            const tappeRes = await api.getTappe(ppRes.data.percorso_id);
            const selTappa = document.getElementById('sel-tappa-pren');
            selTappa.innerHTML = '<option value="">Seleziona tappa</option>' +
                tappeRes.data.map(t => `<option value="${t.id}">${t.ordine}. ${t.nome}</option>`).join('');
        };
    } catch (err) {
        console.error('Errore sezione prenotazioni:', err);
    }
};

const caricaPrenotazioni = async () => {
    const id = document.getElementById('filtro-percorso-pren').value;
    if (!id) return;
    try {
        const res = await api.getPrenotazioni(id);
        const tbody = document.getElementById('tabella-prenotazioni');
        tbody.innerHTML = res.data.map(p => `
            <tr>
                <td>${p.tappa}</td>
                <td>${new Date(p.data_ora).toLocaleString('it-IT')}</td>
                <td>${p.medico}</td>
                <td><span class="badge bg-${p.stato === 'completata' ? 'success' : 'primary'}">${p.stato}</span></td>
                <td></td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Errore prenotazioni:', err);
    }
};

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
        caricaPrenotazioni();
    } catch (err) {
        alert('Errore creazione prenotazione.');
    }
};

const caricaSezioneReferti = async () => {
    try {
        const res = await api.getPercorsiPaziente();
        const prenotazioni = [];
        for (const p of res.data) {
            const prenRes = await api.getPrenotazioni(p.id);
            prenRes.data.forEach(pr => {
                if (pr.stato === 'programmata') {
                    prenotazioni.push({ ...pr, percorso_paziente_id: p.id });
                }
            });
        }
        const sel = document.getElementById('sel-prenotazione-ref');
        sel.innerHTML = '<option value="">Seleziona prenotazione</option>' +
            prenotazioni.map(p => `<option value="${p.id}">${p.tappa} — ${new Date(p.data_ora).toLocaleDateString('it-IT')}</option>`).join('');
    } catch (err) {
        console.error('Errore sezione referti:', err);
    }
};

const caricaReferto = async () => {
    const prenotazione_id = document.getElementById('sel-prenotazione-ref').value;
    const contenuto = document.getElementById('contenuto-referto').value;

    if (!prenotazione_id || !contenuto) {
        alert('Seleziona una prenotazione e inserisci il contenuto.');
        return;
    }

    try {
        await api.creaReferto({ prenotazione_id, medico_id: medicoId, contenuto });
        alert('Referto caricato con successo!');
        document.getElementById('contenuto-referto').value = '';
        caricaSezioneReferti();
    } catch (err) {
        alert('Errore caricamento referto.');
    }
};

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

const apriChat = async (percorsoId, nomePaziente) => {
    percorsoChatId = percorsoId;
    document.getElementById('titolo-chat').textContent = `Chat con ${nomePaziente}`;
    document.getElementById('form-messaggio').style.display = 'flex';
    await aggiornaChat();
};

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