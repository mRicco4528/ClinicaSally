const API_URL = 'http://localhost:3000/api';

const getToken = () => localStorage.getItem('token');
const getUtente = () => JSON.parse(localStorage.getItem('utente'));

const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

const api = {
    // Auth
    login: (email, password) =>
        axios.post(`${API_URL}/auth/login`, { email, password }),

    // Utenti
    getUtenti: () =>
        axios.get(`${API_URL}/utenti`, { headers: headers() }),
    creaUtente: (dati) =>
        axios.post(`${API_URL}/utenti`, dati, { headers: headers() }),
    eliminaUtente: (id) =>
        axios.delete(`${API_URL}/utenti/${id}`, { headers: headers() }),

    // Pazienti
    getPazienti: () =>
        axios.get(`${API_URL}/pazienti`, { headers: headers() }),
    getPaziente: (id) =>
        axios.get(`${API_URL}/pazienti/${id}`, { headers: headers() }),

    // Percorsi terapeutici
    getPercorsi: () =>
        axios.get(`${API_URL}/percorsi`, { headers: headers() }),
    getTappe: (percorsoId) =>
        axios.get(`${API_URL}/percorsi/${percorsoId}/tappe`, { headers: headers() }),

    // Percorsi paziente
    getPercorsiPaziente: () =>
        axios.get(`${API_URL}/percorsi-paziente`, { headers: headers() }),
    getPercorsoPaziente: (id) =>
        axios.get(`${API_URL}/percorsi-paziente/${id}`, { headers: headers() }),
    assegnaPercorso: (dati) =>
        axios.post(`${API_URL}/percorsi-paziente`, dati, { headers: headers() }),
    avanzaTappa: (id) =>
        axios.patch(`${API_URL}/percorsi-paziente/${id}/avanza`, {}, { headers: headers() }),

    // Prenotazioni
    getPrenotazioni: (percorsoPazienteId) =>
        axios.get(`${API_URL}/prenotazioni/${percorsoPazienteId}`, { headers: headers() }),
    creaPrenotazione: (dati) =>
        axios.post(`${API_URL}/prenotazioni`, dati, { headers: headers() }),

    // Referti
    getReferto: (prenotazioneId) =>
        axios.get(`${API_URL}/referti/${prenotazioneId}`, { headers: headers() }),
    creaReferto: (dati) =>
        axios.post(`${API_URL}/referti`, dati, { headers: headers() }),

    // Messaggi
    getMessaggi: (percorsoPazienteId) =>
        axios.get(`${API_URL}/messaggi/${percorsoPazienteId}`, { headers: headers() }),
    inviaMessaggio: (dati) =>
        axios.post(`${API_URL}/messaggi`, dati, { headers: headers() }),

    // Dashboard
    getDashboard: () =>
        axios.get(`${API_URL}/dashboard`, { headers: headers() }),
    // Medici
    getMedici: () =>
    axios.get(`${API_URL}/pazienti/medici/lista`, { headers: headers() }),
    // Medico By Utente
    getMedicoByUtente: (utenteId) =>
    axios.get(`${API_URL}/pazienti/medico-by-utente/${utenteId}`, { headers: headers() }),
};