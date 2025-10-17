// =========================================================================
// Permissoes.js (CÓDIGO FINAL E CORRIGIDO - REMOVE FALSO POSITIVO)
// =========================================================================
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;

let supabaseClient;
const userSessionData = localStorage.getItem('user_session_data');
let masterId = null;

// 1. Obtém o ID e a Role do usuário logado
if (userSessionData) {
    try {
        const userProfile = JSON.parse(userSessionData);
        // Só considera MASTER se a role for MASTER
        if (userProfile.role === 'MASTER') {
            masterId = userProfile.id;
        }
    } catch (e) {
        console.error("Falha ao analisar JSON de sessão.", e);
    }
}

// 2. Inicialização do Cliente
// Inicializa com a chave ANON para evitar o erro 401.
supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log("Supabase Client inicializado com chave ANON. MASTER ID (UI):", masterId);


// =========================================================================
// O RESTANTE DO CÓDIGO
// =========================================================================

// Definições de Permissões para Geração da UI
const ACTION_PERMISSIONS = [
    { key: 'can_delete_data', label: 'Excluir Dados' },
    { key: 'can_edit_data', label: 'Editar Dados' },
    { key: 'can_send_data', label: 'Enviar/Adicionar Dados' },
    { key: 'can_consult', label: 'Consultar Dados' },
    { key: 'can_change_perms', label: 'Alterar Permissões' },
    { key: 'can_add_user', label: 'Adicionar Novo Usuário' },
    { key: 'can_delete_users', label: 'Excluir Usuários' },
];

const SCREEN_ACCESS = [
    { key: 'access_clause', label: 'Contratos (Clause)' },
    { key: 'access_ciclico', label: 'Inventário Cíclico' },
    { key: 'access_rn', label: 'Reserva Normal (RN)' },
    { key: 'access_permissions', label: 'Gerenciar Permissões' },
];

// Mapeamento de Funções (Roles) para Permissões Padrão (Templates)
const ROLE_PERMISSIONS = {
    MASTER: {
        can_delete_data: true, can_edit_data: true, can_send_data: true, can_consult: true,
        can_change_perms: true, can_add_user: true, can_delete_users: true,
        access_clause: true, access_ciclico: true, access_rn: true, access_permissions: true
    },
    ADM: {
        can_delete_data: true, can_edit_data: true, can_send_data: true, can_consult: true,
        can_change_perms: false, can_add_user: false, can_delete_users: false,
        access_clause: true, access_ciclico: true, access_rn: false, access_permissions: true
    },
    OPERACAO: {
        can_delete_data: false, can_edit_data: false, can_send_data: true, can_consult: true,
        can_change_perms: false, can_add_user: false, can_delete_users: false,
        access_clause: true, access_ciclico: false, access_rn: false, access_permissions: false
    }
};


document.addEventListener('DOMContentLoaded', () => {
    // Referências do DOM
    const modalEditPerms = document.getElementById('editPermissionsModal');
    const closeBtnEditPerms = document.querySelector('.edit-close-btn');
    const editPermissionsForm = document.getElementById('editPermissionsForm');
    const actionPermissionsDiv = document.getElementById('actionPermissions');
    const screenAccessDiv = document.getElementById('screenAccess');
    const userRoleSelect = document.getElementById('userRole');
    const editingUserIdInput = document.getElementById('editingUserId');
    const modalTitle = document.getElementById('modalTitle');
    const usersListDiv = document.getElementById('usersList');

    loadUsersAndPermissions();

    function displayFormMessage(message, isSuccess, element = document.getElementById('permissionFormMessage')) {
        element.textContent = message;
        element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 3000);
    }

    function generatePermissionCheckboxes(container, permissionsArray, currentPerms = {}) {
        container.innerHTML = '';
        permissionsArray.forEach(perm => {
            const div = document.createElement('div');
            const id = `perm_${perm.key}`;
            div.innerHTML = `
                <input type="checkbox" id="${id}" name="${perm.key}" ${!!currentPerms[perm.key] ? 'checked' : ''}>
                <label for="${id}">${perm.label}</label>
            `;
            container.appendChild(div);
        });
    }

    async function loadUsersAndPermissions() {
        const usersListDiv = document.getElementById('usersList');
        usersListDiv.innerHTML = '<p id="usersLoadingMessage" class="text-muted">Carregando usuários e permissões...</p>';

        // SELECT deve funcionar livremente devido à RLS aberta no DB
        let { data: users, error } = await supabaseClient
            .from('cadastros')
            .select('*');

        if (error) {
            usersListDiv.innerHTML = `<p style="color:red;">Erro ao carregar usuários: ${error.message}.</p>`;
            return;
        }
        usersListDiv.innerHTML = '';
        if (users && users.length > 0) {
            users.forEach(user => {
                usersListDiv.appendChild(createUserCard(user));
            });
        } else {
            usersListDiv.innerHTML = '<p class="text-muted">Nenhum usuário encontrado na tabela de cadastros.</p>';
        }
    }

    function createUserCard(user) {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.setAttribute('data-user-id', user.id);

        const userName = user.usuario || 'Usuário Não Configurado';
        const userRole = user.role || 'Não Definido';
        const userStatus = user.status || 'Sem Status';

        card.innerHTML = `
            <div class="user-info">
                <div class="user-name">${userName}</div>
                <div class="user-role">Função: <strong>${userRole}</strong></div>
                <div class="user-status">Status: ${userStatus}</div>
            </div>
            <button class="user-action-btn edit-perms-btn" title="Editar Permissões">
                <i class="fas fa-cog"></i>
            </button>
        `;

        const editBtn = card.querySelector('.edit-perms-btn');
        editBtn.style.opacity = '1';
        editBtn.style.cursor = 'pointer';

        // Melhoria de UI: Bloqueia o botão se não for MASTER
        if (masterId) {
            editBtn.addEventListener('click', () => {
                openEditPermissionsModal(user);
            });
        } else {
            editBtn.style.opacity = '0.5';
            editBtn.style.cursor = 'not-allowed';
            editBtn.title = 'Apenas usuários MASTER podem editar.';
        }


        return card;
    }


    function openEditPermissionsModal(user) {
        modalTitle.textContent = `Editar Permissões para ${user.usuario || 'Usuário'}`;
        editingUserIdInput.value = user.id;

        userRoleSelect.value = user.role || 'OPERACAO';

        generatePermissionCheckboxes(actionPermissionsDiv, ACTION_PERMISSIONS, user);
        generatePermissionCheckboxes(screenAccessDiv, SCREEN_ACCESS, user);

        userRoleSelect.onchange = (e) => {
            const role = e.target.value;
            const template = ROLE_PERMISSIONS[role];
            generatePermissionCheckboxes(actionPermissionsDiv, ACTION_PERMISSIONS, template);
            generatePermissionCheckboxes(screenAccessDiv, SCREEN_ACCESS, template);
        };

        modalEditPerms.style.display = 'block';
    }

    closeBtnEditPerms.addEventListener('click', () => {
        modalEditPerms.style.display = 'none';
        editPermissionsForm.reset();
    });
    window.addEventListener('click', (event) => {
        if (event.target === modalEditPerms) {
            modalEditPerms.style.display = 'none';
        }
    });

    // =======================================================
    // FUNÇÃO DE SUBMISSÃO FINAL
    // =======================================================
    editPermissionsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = editingUserIdInput.value;
        const role = userRoleSelect.value;
        const permissionFormMessage = document.getElementById('permissionFormMessage');
        permissionFormMessage.style.display = 'none';

        if (!userId) {
            displayFormMessage('Erro interno: ID do usuário a ser editado não foi capturado.', false, permissionFormMessage);
            return;
        }

        // Bloqueio de front-end para não-MASTER
        if (!masterId) {
            displayFormMessage('Erro: Sessão MASTER não ativa. Você não pode salvar.', false, permissionFormMessage);
            return;
        }

        const updateData = { role: role };

        // Coleta todas as permissões marcadas (TRUE ou FALSE)
        [...ACTION_PERMISSIONS, ...SCREEN_ACCESS].forEach(perm => {
            const checkbox = document.getElementById(`perm_${perm.key}`);
            updateData[perm.key] = checkbox ? checkbox.checked : false;
        });

        // DEBUG
        console.log("--- DEBUG UPDATE PERMISSÕES ---");
        console.log("MASTER ID Logado:", masterId);
        console.log("ID do Usuário a Atualizar:", userId);
        console.log("Dados de Update:", updateData);
        console.log("------------------------------");


        const { error } = await supabaseClient
            .from('cadastros')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            // Se esta mensagem aparecer, o problema é algum erro de DB ou o TRIGGER rejeitou.
            console.error("ERRO CRÍTICO NO UPDATE (O Supabase Rejeitou):", error);
            displayFormMessage(`Erro ao salvar permissões: ${error.message}.`, false, permissionFormMessage);
        } else {
            // Atualiza a UI SOMENTE COM OS DADOS FINAIS DO BANCO DE DADOS
            console.log("UPDATE ENVIADO E ACEITO PELO SUPABASE.");
            displayFormMessage('Permissões atualizadas com sucesso! Recarregando dados...', true, permissionFormMessage);

            // ESTA É A LINHA CRÍTICA: RECARREGA OS DADOS DO BANCO PARA CONFIRMAR A MUDANÇA
            await loadUsersAndPermissions();

            setTimeout(() => { modalEditPerms.style.display = 'none'; }, 1000);
        }
    });

    document.getElementById('changePasswordBtn').addEventListener('click', () => {
        alert('Recurso de Troca de Senha: Em um sistema real, isso requer um endpoint de administrador.');
    });

});