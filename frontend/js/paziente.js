const utente = getUtente();
if (!utente || utente.ruolo !== 'paziente') window.location.href = '../index.html';
document.getElementById('nome-utente').textContent = `${utente.nome} ${utente.cognome}`;

let percorsoPazienteId = null;
let medicoId = null;

// Gestisce la navigazione interna del pannello: nasconde tutte le sezioni, rende
// visibile quella selezionata, aggiorna il titolo e la voce di menù attiva e
// infine ne carica i dati dal backend.
const mostraSezione = (sezione) => {
    ['percorso', 'referti', 'messaggi'].forEach(s => {
        document.getElementById(`sezione-${s}`).classList.add('d-none');
    });
    document.getElementById(`sezione-${sezione}`).classList.remove('d-none');

    const titoli = {
        percorso: 'Il mio percorso',
        referti: 'I miei referti',
        messaggi: 'Messaggi'
    };
    document.getElementById('titolo-sezione').textContent = titoli[sezione];

    document.querySelectorAll('.sidebar a').forEach(a => a.classList.remove('active'));
    event.target.closest('a').classList.add('active');

    if (sezione === 'referti') caricaReferti();
    if (sezione === 'messaggi') caricaMessaggi();
};

// Termina la sessione di lavoro svuotando la memoria locale del browser e
// riportando l'utente alla pagina di accesso.
const logout = () => {
    localStorage.clear();
    window.location.href = '../index.html';
};

// Carica il percorso assegnato al paziente: se presente ne mostra i dati di sintesi
// e la sequenza delle tappe, distinguendo visivamente quelle completate, quella in
// corso e quelle future; in assenza di percorso espone un avviso informativo.
const caricaPercorso = async () => {
    try {
        const res = await api.getPercorsiPaziente();

        if (!res.data || res.data.length === 0) {
            document.getElementById('nessun-percorso').classList.remove('d-none');
            return;
        }

        const pp = res.data[0];
        percorsoPazienteId = pp.id;

        document.getElementById('card-percorso').classList.remove('d-none');
        document.getElementById('nome-percorso').textContent = pp.percorso;
        document.getElementById('specializzazione-percorso').textContent = pp.specializzazione;
        document.getElementById('medico-percorso').textContent = `Medico: ${pp.medico}`;

        const statoBadge = document.getElementById('stato-percorso');
        statoBadge.textContent = pp.stato;
        statoBadge.className = `badge fs-6 badge-${pp.stato}`;

        const tappeRes = await api.getTappe(pp.percorso_id);
        const lista = document.getElementById('lista-tappe');
        lista.innerHTML = tappeRes.data.map(t => {
            const completata = t.ordine < pp.tappa_corrente;
            const corrente = t.ordine === pp.tappa_corrente;
            return `
                <div class="d-flex align-items-center gap-3 p-3 mb-2 rounded"
                    style="background: ${corrente ? '#e8f4fd' : completata ? '#f0fff4' : '#f8f9fa'}; 
                           border-left: 4px solid ${corrente ? '#0d6efd' : completata ? '#198754' : '#dee2e6'}">
                    <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                        style="width:36px; height:36px; min-width:36px;
                               background: ${corrente ? '#0d6efd' : completata ? '#198754' : '#dee2e6'};
                               color: ${corrente || completata ? 'white' : '#6c757d'}">
                        ${completata ? '<i class="bi bi-check"></i>' : t.ordine}
                    </div>
                    <div>
                        <div class="fw-semibold">${t.nome}</div>
                        <div class="text-muted small">${t.descrizione}</div>
                    </div>
                    ${corrente ? '<span class="ms-auto badge bg-primary">In corso</span>' : ''}
                    ${completata ? '<span class="ms-auto badge bg-success">Completata</span>' : ''}
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error('Errore percorso:', err);
    }
};

// Per ogni prenotazione del percorso richiede al backend il relativo referto,
// mostrandone il contenuto se disponibile oppure una scheda che ne segnala
// l'assenza, così da distinguere le prestazioni refertate da quelle in attesa.
const caricaReferti = async () => {
    if (!percorsoPazienteId) return;
    try {
        const prenRes = await api.getPrenotazioni(percorsoPazienteId);
        const lista = document.getElementById('lista-referti');

        if (prenRes.data.length === 0) {
            lista.innerHTML = '<div class="alert alert-info">Nessuna prenotazione trovata.</div>';
            return;
        }

        let html = '';
        for (const p of prenRes.data) {
            try {
                const refRes = await api.getReferto(p.id);
                const r = refRes.data;
                html += `
                    <div class="card p-4 mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <h6 class="fw-bold">${r.tappa}</h6>
                            <span class="badge bg-success">${r.stato}</span>
                        </div>
                        <p class="text-muted small mb-2">
                            <i class="bi bi-person me-1"></i>${r.medico} · 
                            <i class="bi bi-calendar me-1"></i>${new Date(r.data_rilascio).toLocaleDateString('it-IT')}
                        </p>
                        <p class="mb-0">${r.contenuto}</p>
                    </div>
                `;
            } catch {
                html += `
                    <div class="card p-4 mb-3 border-dashed">
                        <h6 class="fw-semibold text-muted">${p.tappa}</h6>
                        <p class="text-muted small mb-0">Referto non ancora disponibile</p>
                    </div>
                `;
            }
        }
        lista.innerHTML = html;
    } catch (err) {
        console.error('Errore referti:', err);
    }
};

// Carica la conversazione con il medico e la rappresenta come fumetti allineati
// in base al mittente, facendo poi scorrere l'area fino al messaggio più recente.
const caricaMessaggi = async () => {
    if (!percorsoPazienteId) return;
    try {
        const res = await api.getMessaggi(percorsoPazienteId);
        const area = document.getElementById('area-messaggi');
        area.innerHTML = res.data.map(m => {
            const isMio = m.ruolo_mittente === 'paziente';
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
        console.error('Errore messaggi:', err);
    }
};

// Invia il messaggio digitato al medico referente e aggiorna la visualizzazione
// della chat.
const inviaMessaggio = async () => {
    const contenuto = document.getElementById('testo-messaggio').value.trim();
    if (!contenuto || !percorsoPazienteId) return;

    try {
        await api.inviaMessaggio({
            destinatario_id: medicoId || 2,
            percorso_paziente_id: percorsoPazienteId,
            contenuto
        });
        document.getElementById('testo-messaggio').value = '';
        await caricaMessaggi();
    } catch (err) {
        alert('Errore invio messaggio.');
    }
};

caricaPercorso();