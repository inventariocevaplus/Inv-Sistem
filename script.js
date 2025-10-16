document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('message');
    const logarBtn = document.getElementById('logarBtn');
    const buttonText = document.getElementById('buttonText');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // 🚨 COPIE O NOVO URL DO APPS SCRIPT AQUI (URL que termina em /exec)
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz7eqdwZ_GKF8UvlK_lDbT02K7uabe_SrZpmFHjLiHqVy4GblWjmnuOrLlnvdCdaihc/exec';

    function setLoading(isLoading) {
        logarBtn.disabled = isLoading;
        buttonText.style.display = isLoading ? 'none' : 'inline';
        loadingIndicator.style.display = isLoading ? 'inline-block' : 'none';
        message.style.display = 'none';
    }

    form.addEventListener('submit', async (e) => { // Tornar função assíncrona
        e.preventDefault();

        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;

        setLoading(true);

        // 1. Constrói a URL da requisição (Fetch)
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('usuario', usuario);
        url.searchParams.append('senha', senha);

        try {
            // 2. Faz a requisição usando FETCH (Método moderno)
            const response = await fetch(url.toString(), {
                method: 'GET',
                mode: 'cors', // Necessário para Apps Script
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Falha no servidor Apps Script.');
            }

            const result = await response.json(); // Analisa o JSON

            // 3. Tratamento da Resposta
            if (result && result.success) {
                // Login Aprovado
                message.textContent = `Seja bem-vindo(a), ${usuario}! Redirecionando...`;
                message.className = 'login-message success';
                message.style.display = 'block';

                setTimeout(() => {
                    // O caminho deve ser relativo à raiz do repositório
                    window.location.href = 'Menu/dashboard.html';
                }, 1500);

            } else {
                // Login Reprovado
                const errorMessage = result.message || 'Erro de autenticação. Tente novamente.';
                message.textContent = errorMessage;
                message.className = 'login-message error';
                message.style.display = 'block';
            }

        } catch (error) {
            // 4. Trata falhas de rede e CORB
            console.error('Erro de comunicação:', error);
            message.textContent = 'Erro de comunicação de rede ou bloqueio de segurança. Verifique sua conexão/firewall.';
            message.className = 'login-message error';
            message.style.display = 'block';
        } finally {
            setLoading(false);
        }
    });
});