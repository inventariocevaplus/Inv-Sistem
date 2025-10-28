// =========================================================================
// Permissoes.js (AJUSTADO PARA TROCA DE SENHA DO PRÓPRIO USUÁRIO)
// =========================================================================
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let userProfile = null;
let masterId = null; // Usado para identificar permissão de Master (embora o foco agora seja auto-edição)

// =========================================================================
// FUNÇÕES AUXILIARES
// =========================================================================

function displayFormMessage(message, isSuccess, element = document.getElementById('profileFormMessage')) {
    element.textContent = message;
    element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000); // Aumentei o tempo
}

// =========================================================================
// FUNÇÕES DE DADOS E CARREGAMENTO
// =========================================================================

/**
 * 1. FUNÇÃO CRÍTICA: Carrega a sessão e inicializa a página
 */
async function setupPermissionsPage() {
    console.log("Iniciando a verificação de sessão...");

    // Tenta carregar os dados de perfil (role, user_id, etc) que você salvou no Login.js
    const userSessionData = localStorage.getItem('user_session_data');
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (userSessionData && session) {
        try {
            userProfile = JSON.parse(userSessionData);

            // Define o ID do Master se o usuário tiver a permissão
            if (userProfile.can_change_perms === true) {
                masterId = userProfile.user_id;
            }

            // Garante que o usuário logado esteja autenticado para a troca de senha
            await supabaseClient.auth.setSession(session);

        } catch (e) {
            console.error("Falha ao analisar JSON de perfil no localStorage. Acesso bloqueado.", e);
            return;
        }
    } else {
        console.warn("❌ Usuário não logado ou sessão expirada. Ações limitadas.");
    }

    // Carrega a lista de usuários para que o usuário logado possa clicar no seu card
    loadUsersAndPermissions();
}

/**
 * 2. FUNÇÃO: Carrega todos os usuários da tabela 'cadastros'
 */
async function loadUsersAndPermissions() {
    const usersListDiv = document.getElementById('usersList');
    usersListDiv.innerHTML = '<p id="usersLoadingMessage" class="text-muted">Carregando usuários e permissões...</p>';

    // Seleciona as colunas essenciais
    let { data: users, error } = await supabaseClient
        .from('cadastros')
        .select('id, usuario, role, status, email');
        // Nota: A coluna 'id' DEVE ser o UUID do Supabase Auth para ligar o perfil.

    if (error) {
        usersListDiv.innerHTML = `<p style="color:red;">Erro ao carregar usuários: ${error.message}. (Verifique RLS de SELECT na tabela 'cadastros')</p>`;
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


// =========================================================================
// FUNÇÕES DE UI E MODAL
// =========================================================================

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.setAttribute('data-user-id', user.id); // UUID

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
    editBtn.style.opacity = '0.5';
    editBtn.style.cursor = 'not-allowed';
    editBtn.title = 'Apenas o próprio usuário pode editar seu perfil.';


    // 🚨 LÓGICA DE ATIVAÇÃO DA ENGRENAGEM: Ativa SOMENTE para o usuário logado
    if (userProfile && user.id === userProfile.user_id) {
         editBtn.style.opacity = '1';
         editBtn.style.cursor = 'pointer';
         editBtn.title = 'Editar Meu Perfil e Senha';
         editBtn.addEventListener('click', () => {
            openEditProfileModal(user); // Abre a modal de edição de perfil
        });
    }

    return card;
}


function openEditProfileModal(user) {
    const modalTitle = document.getElementById('modalTitle');
    const editingUserIdInput = document.getElementById('editingUserId');
    const newEmailInput = document.getElementById('newEmail');
    const modalProfile = document.getElementById('userProfileModal');

    // Limpa a modal
    document.getElementById('editProfileForm').reset();
    document.getElementById('profileFormMessage').style.display = 'none';

    // Preenche os dados
    modalTitle.textContent = `Meu Perfil e Segurança (${user.usuario})`;

    // O ID de cadastro/auth
    editingUserIdInput.value = user.id;

    // Preenche o email atual
    newEmailInput.value = user.email || '';

    modalProfile.style.display = 'block';
}


document.addEventListener('DOMContentLoaded', () => {

    // Inicia o processo de autenticação e carregamento
    setupPermissionsPage();

    // Referências do DOM
    const modalProfile = document.getElementById('userProfileModal');
    const closeBtnProfile = document.querySelector('.profile-close-btn');
    const editProfileForm = document.getElementById('editProfileForm');


    // Fechar Modal
    closeBtnProfile.addEventListener('click', () => {
        modalProfile.style.display = 'none';
        editProfileForm.reset();
    });
    window.addEventListener('click', (event) => {
        if (event.target === modalProfile) {
            modalProfile.style.display = 'none';
        }
    });

    // =======================================================
    // FUNÇÃO DE SUBMISSÃO FINAL (Troca de Senha/Email)
    // =======================================================
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentEmail = userProfile ? userProfile.email : '';
        const newEmail = document.getElementById('newEmail').value.trim();
        const oldPassword = document.getElementById('oldPassword').value.trim();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const profileFormMessage = document.getElementById('profileFormMessage');
        profileFormMessage.style.display = 'none';

        const dbUserId = document.getElementById('editingUserId').value;


        // --- 1. VALIDAÇÕES DE ESTADO ---
        if (!userProfile) {
             displayFormMessage('Erro: Sessão não encontrada. Por favor, faça login novamente.', false, profileFormMessage);
             return;
        }

        // --- 2. VALIDAÇÕES DE SENHA ---
        const changingPassword = newPassword && confirmPassword;

        if (changingPassword) {
            if (!oldPassword) {
                 displayFormMessage('Você deve informar a senha antiga para poder trocá-la.', false, profileFormMessage);
                 return;
            }
            if (newPassword.length < 6) {
                 displayFormMessage('A nova senha deve ter no mínimo 6 caracteres.', false, profileFormMessage);
                 return;
            }
            if (newPassword !== confirmPassword) {
                displayFormMessage('A nova senha e a confirmação não coincidem.', false, profileFormMessage);
                return;
            }
        }

        const emailChanged = newEmail !== currentEmail;

        if (!emailChanged && !changingPassword) {
            displayFormMessage('Nenhum campo foi alterado. Nada para salvar.', false, profileFormMessage);
            return;
        }

        displayFormMessage('<i class="fas fa-spinner fa-spin"></i> Salvando alterações de perfil...', true, profileFormMessage);

        // --- 3. VERIFICAÇÃO DA SENHA ANTIGA (Simulação no Front-end para fins didáticos, mas NÃO SEGURA) ---
        // Se você não tem o campo de senha no DB (o que é correto), esta verificação FALHARÁ,
        // pois você não tem o hash da senha antiga. O correto é usar o endpoint de login para reautenticação.

        // 🚨 COMO SEU PEDIDO É INSEGURO, AQUI ESTÁ A IMPLEMENTAÇÃO SEGUINDO A REQUISIÇÃO (MAIS PRÓXIMA)
        // O Supabase NÃO PERMITE ler a senha do auth.users, então faremos uma RE-AUTENTICAÇÃO.

        if (changingPassword) {
             // Tenta autenticar o usuário com a senha antiga
             const { error: signInError } = await supabaseClient.auth.signInWithPassword({
                 email: currentEmail, // O email atual é o que está logado
                 password: oldPassword,
             });

             if (signInError) {
                 if (signInError.message.includes('Invalid login credentials')) {
                      displayFormMessage('A senha antiga informada está incorreta.', false, profileFormMessage);
                      return;
                 } else {
                      displayFormMessage(`Erro na verificação da senha antiga: ${signInError.message}.`, false, profileFormMessage);
                      return;
                 }
             }
             // Se passou, o usuário foi reautenticado, e podemos prosseguir com o update
        }


        // --- 4. PREPARAÇÃO DO PAYLOAD E CHAMADA DE AUTH (Supabase) ---
        const updateAuthData = {};
        if (emailChanged) updateAuthData.email = newEmail;
        if (changingPassword) updateAuthData.password = newPassword;

        const { data: { user }, error: authError } = await supabaseClient.auth.updateUser(updateAuthData);

        if (authError) {
            console.error("ERRO CRÍTICO NO AUTH (Supabase):", authError);
            displayFormMessage(`Erro ao atualizar credenciais: ${authError.message}.`, false, profileFormMessage);
            return;
        }

        // --- 5. ATUALIZAÇÃO DO EMAIL NO DB DE CADASTROS (Se alterado) ---
        if (emailChanged) {
            const { error: dbError } = await supabaseClient
                .from('cadastros')
                .update({ email: newEmail })
                .eq('id', dbUserId);

            if (dbError) {
                 console.error("ERRO NO UPDATE DA TABELA CADASTROS:", dbError);
                 displayFormMessage('Sucesso na troca de senha, mas houve erro ao atualizar o email na tabela "cadastros".', false, profileFormMessage);
                 setTimeout(() => { modalProfile.style.display = 'none'; }, 2000);
                 await loadUsersAndPermissions();
                 return;
            }
        }

        // --- 6. SUCESSO ---
        displayFormMessage('Perfil e credenciais atualizadas com sucesso! Recarregando lista...', true, profileFormMessage);

        // Atualiza a sessão local para refletir o novo email
        if (emailChanged) {
            const updatedProfile = { ...userProfile, email: newEmail };
            localStorage.setItem('user_session_data', JSON.stringify(updatedProfile));
            userProfile = updatedProfile;
        }

        await loadUsersAndPermissions();

        setTimeout(() => { modalProfile.style.display = 'none'; }, 1000);
    });
});