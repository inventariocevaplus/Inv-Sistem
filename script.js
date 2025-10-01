// Substitua pela sua URL pública do Apps Script após o deploy
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyxP9bUDy40xQFzXnJYKIykdBI0nX_zeHi7U7-yGVkNrJXkvj-vZZ9agPi-AtvB9jwo/exec";

let emailTemp = '';
let usuarioTemp = '';
let senhaTemp = '';

// --- CONTROLE DE TELA ---

function checkLoginState() {
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    const homeScreen = document.getElementById('home-screen');
    const loginCadastroScreen = document.getElementById('login-cadastro-screen');

    if (usuarioLogado) {
        // Exibe a tela inicial
        homeScreen.classList.remove('hidden');
        loginCadastroScreen.classList.add('hidden');
        document.getElementById('user-logado').innerText = usuarioLogado;
        document.getElementById('user-welcome').innerText = usuarioLogado;
    } else {
        // Exibe a tela de login
        homeScreen.classList.add('hidden');
        loginCadastroScreen.classList.remove('hidden');
        voltarLogin(); // Garante que a tela de Login esteja visível por padrão
    }
}

function handleLogout() {
    localStorage.removeItem('usuarioLogado');
    checkLoginState();
}

// Inicializa a verificação do estado de login
document.addEventListener('DOMContentLoaded', checkLoginState);

// --- FUNÇÕES DE NAVEGAÇÃO INTERNA ---

function showCadastro() {
    document.getElementById('login-block').classList.add('hidden');
    document.getElementById('cadastro-block').classList.remove('hidden');
    document.getElementById('cadastro-error').innerText = "";
    document.getElementById('cadastro-email-info').innerText = "";
    document.getElementById('codigo-block').classList.add('hidden');
    document.getElementById('cadastro-codigo').value = "";
}

function voltarLogin() {
    document.getElementById('cadastro-block').classList.add('hidden');
    document.getElementById('login-block').classList.remove('hidden');
    document.getElementById('login-error').innerText = "";
}

// --- FUNÇÕES DE BACK-END (COMUNICAÇÃO COM APPS SCRIPT) ---

function handleLogin() {
    const usuario = document.getElementById('login-usuario').value.trim();
    const senha = document.getElementById('login-senha').value.trim();
    const errorDiv = document.getElementById('login-error');
    errorDiv.innerText = "";

    if (usuario === "" || senha === "") {
        errorDiv.innerText = "Preencha usuário e senha.";
        return;
    }

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'login', usuario: usuario, senha: senha })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            localStorage.setItem('usuarioLogado', usuario); // Salva a sessão no navegador
            checkLoginState(); // Atualiza a tela para a Home
        } else {
            errorDiv.innerText = "Usuário ou senha inválidos.";
        }
    })
    .catch(() => {
        errorDiv.innerText = "Erro ao validar login.";
    });
}

function handleEnviarCodigo() {
    const email = document.getElementById('cadastro-email').value.trim();
    const usuario = document.getElementById('cadastro-usuario').value.trim();
    const senha = document.getElementById('cadastro-senha').value.trim();
    const confirmar = document.getElementById('cadastro-confirmar').value.trim();
    const errorDiv = document.getElementById('cadastro-error');
    const infoDiv = document.getElementById('cadastro-email-info');
    errorDiv.innerText = "";
    infoDiv.innerText = "";

    if (usuario === "" || senha === "" || confirmar === "" || email === "") {
        errorDiv.innerText = "Preencha todos os campos.";
        return;
    }
    if (senha !== confirmar) {
        errorDiv.innerText = "Senhas não coincidem.";
        return;
    }
    if (!email.endsWith("@cevalogistics.com")) {
        errorDiv.innerText = "Email deve ser do domínio cevalogistics.com";
        return;
    }

    // Armazena temporariamente os dados para o cadastro final
    usuarioTemp = usuario;
    senhaTemp = senha;
    emailTemp = email;

    document.getElementById('botao-enviar').disabled = true;

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'enviar_codigo', email: email })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('botao-enviar').disabled = false;
        if (data.sucesso) {
            infoDiv.innerText = "Código enviado para seu email!";
            document.getElementById('codigo-block').classList.remove('hidden');
        } else {
            errorDiv.innerText = "Erro ao enviar email. Tente novamente.";
            console.error(data.message);
        }
    })
    .catch(() => {
        document.getElementById('botao-enviar').disabled = false;
        errorDiv.innerText = "Erro de conexão ao enviar email.";
    });
}

function handleValidarCodigo() {
    const codigoInserido = document.getElementById('cadastro-codigo').value.trim();
    const errorDiv = document.getElementById('cadastro-error');
    errorDiv.innerText = "";

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'validar_codigo', email: emailTemp, codigo: codigoInserido })
    })
    .then(response => response.json())
    .then(data => {
        if (data.sucesso) {
            // Código validado, agora envia para o cadastro final!
            fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    acao: 'cadastrar',
                    usuario: usuarioTemp,
                    senha: senhaTemp,
                    email: emailTemp
                })
            })
            .then(response => response.json())
            .then(data2 => {
                if (data2.success) {
                    alert("Cadastro realizado com sucesso! Faça login agora.");
                    voltarLogin(); // Volta para a tela de login
                } else {
                    errorDiv.innerText = "Erro ao salvar cadastro na planilha.";
                }
            })
            .catch(() => {
                errorDiv.innerText = "Erro ao finalizar cadastro.";
            });
        } else {
            errorDiv.innerText = data.message || "Código inválido ou expirado.";
        }
    })
    .catch(() => {
        errorDiv.innerText = "Erro ao validar código.";
    });
}