document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const message = document.getElementById('message');
    const logarBtn = document.getElementById('logarBtn');
    const buttonText = document.getElementById('buttonText');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // **A URL do seu Google Apps Script foi inserida aqui.**
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyzFq8xk-cJHmFWSjGVwJanPhtvycymycQbaJbrSvro0lyO1Lt4yZ8SLC4u9i7SmW0q/exec';

    function setLoading(isLoading) {
        logarBtn.disabled = isLoading;
        buttonText.style.display = isLoading ? 'none' : 'inline';
        loadingIndicator.style.display = isLoading ? 'inline-block' : 'none';
        message.style.display = 'none';
    }

    // Função de callback global que será chamada pelo Apps Script
    // É necessário que esta função esteja acessível globalmente (na janela)
    window.handleLoginResponse = function(result) {
        setLoading(false);

        // 1. Remove a tag <script> temporária
        const scriptTag = document.getElementById('jsonpScript');
        if (scriptTag) {
            document.body.removeChild(scriptTag);
        }

        // 2. Tratamento da Resposta
        if (result && result.success) {
            // Login Aprovado
            const usuario = document.getElementById('usuario').value;
            message.textContent = `Seja bem-vindo(a), ${usuario}! Redirecionando...`;
            message.className = 'login-message success';
            message.style.display = 'block';

            // Simula o redirecionamento
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);

        } else {
            // Login Reprovado
            const errorMessage = result.message || 'Erro de autenticação. Tente novamente.';
            message.textContent = errorMessage;
            message.className = 'login-message error';
            message.style.display = 'block';
        }
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;

        setLoading(true);

        // 3. Cria a URL da requisição JSONP
        const url = new URL(APPS_SCRIPT_URL);
        url.searchParams.append('callback', 'handleLoginResponse'); // Nome da função global
        url.searchParams.append('usuario', usuario);
        url.searchParams.append('senha', senha);

        // 4. Cria e anexa a tag <script> ao documento
        const script = document.createElement('script');
        script.id = 'jsonpScript';
        script.src = url.toString();

        // 5. Trata falhas de rede antes mesmo de receber o callback
        script.onerror = () => {
            setLoading(false);
            message.textContent = 'Erro de comunicação de rede. Verifique sua conexão.';
            message.className = 'login-message error';
            message.style.display = 'block';

            // Tenta remover a tag de script, mesmo em erro
            const scriptTag = document.getElementById('jsonpScript');
            if (scriptTag) {
                document.body.removeChild(scriptTag);
            }
        };

        document.body.appendChild(script);
    });
});