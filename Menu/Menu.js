document.addEventListener('DOMContentLoaded', () => {
    const btnInventario = document.getElementById('btnInventario');
    const btnSair = document.getElementById('btnSair');
    const btnPermissoes = document.getElementById('btnPermissoes');
    const btnCadastro = document.getElementById('btnCadastro');

    // ⭐ NOVO: Variável para o botão Mapping
    const btnMapping = document.getElementById('btnMapping');

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
    // LÓGICA DE REDIRECIONAMENTO (Módulos)
    // ===============================================

    // 1. Ação para o botão INVENTÁRIO
    if (btnInventario) {
        btnInventario.addEventListener('click', () => {
            window.location.href = 'Inventario/Inventario.html';
        });
    }

    // ⭐ NOVO: Ação para o botão MAPPING
    if (btnMapping) {
        btnMapping.addEventListener('click', () => {
            // Caminho relativo: Menu -> Mapping -> Mapping.html
            window.location.href = 'Mapping/Mapping.html';
        });
    }

    // 2. Ação para o botão PERMISSÕES
    if (btnPermissoes) {
        btnPermissoes.addEventListener('click', () => {
            window.location.href = 'Permissoes/Permissoes.html';
        });
    }

    // Ação para o botão CADASTRO
    if (btnCadastro) {
        btnCadastro.addEventListener('click', () => {
            console.log('Botão Cadastro clicado. Módulo ainda não implementado.');
        });
    }
});