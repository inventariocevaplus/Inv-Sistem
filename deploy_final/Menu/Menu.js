document.addEventListener('DOMContentLoaded', () => {
    const btnInventario = document.getElementById('btnInventario');
    const btnSair = document.getElementById('btnSair');

    // 1. Ação para o botão INVENTÁRIO
    btnInventario.addEventListener('click', () => {
        // Redireciona para a próxima página de trabalho
        window.location.href = 'Inventario/Inventario.html';
    });

    // 2. Ação para o botão SAIR (Logout)
    btnSair.addEventListener('click', () => {
        // Confirmação simples antes de sair
        if (confirm('Tem certeza que deseja sair do sistema?')) {
            // No mundo real, aqui você faria a limpeza da sessão (cookies, localStorage)

            // Redireciona de volta para a tela de login
            window.location.href = 'index.html';
        }
    });

    // Os botões CADASTRO e PERMISSÕES estão desabilitados no HTML, não precisam de lógica aqui por enquanto.
});
