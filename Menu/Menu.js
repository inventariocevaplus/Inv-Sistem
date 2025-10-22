document.addEventListener('DOMContentLoaded', () => {
    const btnInventario = document.getElementById('btnInventario');
    const btnSair = document.getElementById('btnSair');
    const btnPermissoes = document.getElementById('btnPermissoes');

    // Elemento para mostrar o nome do usuário (do HTML)
    const userNameElement = document.getElementById('userName');

    // ===============================================
    // LÓGICA DE RECUPERAÇÃO DO USUÁRIO LOGADO
    // ===============================================

    if (userNameElement) {
        let username = "Usuário Desconhecido";

        // 1. Tenta recuperar os dados da sessão salva pelo Login.js
        const sessionDataString = localStorage.getItem('user_session_data');

        if (sessionDataString) {
            try {
                // 2. Converte a string JSON para um objeto JavaScript
                const userProfile = JSON.parse(sessionDataString);

                // 3. Verifica se a coluna 'usuario' existe (O nome que o usuário digitou)
                if (userProfile && userProfile.usuario) {
                    // Formata para a primeira letra maiúscula e o resto minúscula para melhor visualização
                    let formattedUser = userProfile.usuario.toLowerCase();
                    username = formattedUser.charAt(0).toUpperCase() + formattedUser.slice(1);
                }
            } catch (e) {
                console.error("Erro ao parsear dados de sessão:", e);
            }
        }

        // 4. Exibe o nome de usuário na tela
        userNameElement.textContent = username;
    }

    // ===============================================
    // LÓGICA DE REDIRECIONAMENTO E SAÍDA
    // ===============================================

    // 1. Ação para o botão INVENTÁRIO
    if (btnInventario) {
        btnInventario.addEventListener('click', () => {
            window.location.href = 'Inventario/Inventario.html';
        });
    }

    // 2. Ação para o botão PERMISSÕES
    if (btnPermissoes) {
        btnPermissoes.addEventListener('click', () => {
            window.location.href = 'Permissoes/Permissoes.html';
        });
    }

    // 3. Ação para o botão SAIR (Logout)
    if (btnSair) {
        btnSair.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja sair do sistema?')) {
                // Limpa os dados da sessão ao sair
                localStorage.removeItem('user_session_data');
                localStorage.removeItem('user_session_id');

                window.location.href = '../index.html';
            }
        });
    }
});