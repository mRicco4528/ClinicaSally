const login = async () => {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const erroreDiv = document.getElementById('errore');

    erroreDiv.classList.add('d-none');

    if (!email || !password) {
        erroreDiv.textContent = 'Inserisci email e password.';
        erroreDiv.classList.remove('d-none');
        return;
    }

    try {
        const res = await api.login(email, password);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('utente', JSON.stringify(res.data.utente));

        const ruolo = res.data.utente.ruolo;

        if (ruolo === 'admin') window.location.href = 'pages/admin.html';
        else if (ruolo === 'medico') window.location.href = 'pages/medico.html';
        else if (ruolo === 'paziente') window.location.href = 'pages/paziente.html';

    } catch (err) {
        erroreDiv.textContent = 'Credenziali non valide. Riprova.';
        erroreDiv.classList.remove('d-none');
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') login();
});