document.addEventListener('DOMContentLoaded', () => {
    const btnInventario = document.getElementById('btnInventario');
    const btnSair = document.getElementById('btnSair');
    const btnPermissoes = document.getElementById('btnPermissoes');

    // 1. Ação para o botão INVENTÁRIO
    btnInventario.addEventListener('click', () => {
        // Redireciona para a página de Inventário
        window.location.href = 'Inventario/Inventario.html';
    });

    // 2. Ação para o botão PERMISSÕES (Novo código de redirecionamento)
    if (btnPermissoes) {
        btnPermissoes.addEventListener('click', () => {
            // Caminho corrigido para a pasta 'Permissoes'
            window.location.href = 'Permissoes/Permissoes.html';
        });
    }

    // 3. Ação para o botão SAIR (Logout)
    btnSair.addEventListener('click', () => {
        // Confirmação simples antes de sair
        if (confirm('Tem certeza que deseja sair do sistema?')) {

            // Redireciona de volta para a tela de login (Sobe uma pasta: ../index.html)
            window.location.href = '../index.html';
        }
    });

    // O botão CADASTRO está desabilitado no HTML, não precisa de lógica aqui por enquanto.
});