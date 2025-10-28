// =========================================================================
// Menu/Login.js (CÓDIGO FINAL DE LOGIN - CORREÇÃO DE NOME DE COLUNA E PERMISSÕES)
// =========================================================================

// 🚨 CREDENCIAIS FINAIS DO SUPABASE (Mantenha as suas chaves aqui)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
// Inicializa o cliente Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// =========================================================================
// FUNÇÕES DE TOAST (AVISO DISCRETO TEMPORÁRIO) - NOVIDADE
// =========================================================================

/**
 * Exibe um toast de notificação por um período determinado.
 * Requer o elemento #toastNotification no HTML.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success', 'error', 'info').
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast ? toast.querySelector('i') : null;

    if (!toast || !toastMessage || !toastIcon) {
        // Fallback para caso o elemento não exista
        const messageBox = document.getElementById('message');
        if (messageBox) {
            messageBox.textContent = message;
            messageBox.className = `login-message ${type}`;
            messageBox.style.display = 'block';
        }
        console.error("Elemento toast não encontrado. Mensagem:", message);
        return;
    }

    toastMessage.textContent = message;

    // Reinicia as classes
    toast.className = 'toast-notification toast-hidden';
    toastIcon.className = '';
    toast.style.backgroundColor = '';

    // Define estilo e ícone
    if (type === 'success') {
        toast.style.backgroundColor = '#28a745'; // Verde
        toastIcon.classList.add('fas', 'fa-check-circle');
    } else if (type === 'error') {
        toast.style.backgroundColor = '#dc3545'; // Vermelho
        toastIcon.classList.add('fas', 'fa-exclamation-triangle');
    } else { // info
         toast.style.backgroundColor = '#ffc107'; // Amarelo
         toastIcon.classList.add('fas', 'fa-info-circle');
    }

    // Exibe o toast
    setTimeout(() => {
        toast.classList.remove('toast-hidden');
        toast.classList.add('toast-visible');
    }, 10); // Pequeno atraso para garantir a transição

    // Oculta após 3 segundos (3000ms)
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
    }, 3000);
}


// =========================================================================
// FUNÇÃO CRÍTICA: Cria o registro de sessão na tabela 'active_sessions'
// =========================================================================
async function createActiveSession(userProfile) {
    // userProfile é o registro completo encontrado na tabela 'cadastros'
    const sessionData = {
        user_id: userProfile.id, // O ID (UUID) da tabela cadastros
        role: userProfile.role, // MASTER, ADM, OPERACAO

        // Inclua explicitamente TODAS as colunas de permissão
        access_ciclico: userProfile.access_ciclico,
        access_permissions: userProfile.access_permissions,
        access_clause: userProfile.access_clause,
        access_rn: userProfile.access_rn,
        // ⭐ NOVAS TELAS
        access_consulta: userProfile.access_consulta,
        access_relatorio: userProfile.access_relatorio,

        // Permissões de Ação
        can_delete_data: userProfile.can_delete_data,
        can_edit_data: userProfile.can_edit_data,
        can_send_data: userProfile.can_send_data,
        can_consult: userProfile.can_consult,
        can_change_perms: userProfile.can_change_perms,

        // 🚨 CORREÇÃO CRÍTICA: Mapeamento de nome de coluna
        // Mapeia o nome singular do 'cadastros' (userProfile.can_add_user)
        // para o PLURAL exigido pela coluna 'can_add_users' na tabela 'active_sessions'.
        can_add_users: userProfile.can_add_user,

        can_delete_users: userProfile.can_delete_users
    };

    // Salva/Atualiza o registro na tabela 'active_sessions'
    // onConflict: 'user_id' garante que o registro do usuário seja atualizado, não duplicado.
    const { error: upsertError } = await supabaseClient
        .from('active_sessions')
        .upsert(sessionData, {
            onConflict: 'user_id',
            returning: 'minimal'
        });

    if (upsertError) {
        console.error("Erro ao salvar sessão ativa:", upsertError);
        return false;
    }
    return true;
}

// 🚨 NOVO: FUNÇÃO PARA GARANTIR TIPAGEM DE BOLEANOS
// Garante que os valores de permissão lidos do banco (que podem ser strings ou null)
// sejam convertidos corretamente para booleanos no JavaScript.
function sanitizeProfilePermissions(profile) {
    const sanitizedProfile = { ...profile };

    // Lista de todas as chaves de permissão que devem ser BOOLEANAS
    const permissionKeys = [
        'access_ciclico',
        'access_permissions',
        'access_clause',
        'access_rn',
        // ⭐ NOVAS TELAS
        'access_consulta',
        'access_relatorio',

        'can_delete_data',
        'can_edit_data',
        'can_send_data',
        'can_consult',
        'can_change_perms',
        'can_add_user',      // MANTÉM O SINGULAR (Lido da tabela cadastros)
        'can_delete_users'
    ];

    permissionKeys.forEach(key => {
        const value = profile[key];
        // Converte: 'true' (string) ou true (boolean) => true. Qualquer outra coisa (null, 'false', false) => false.
        sanitizedProfile[key] = (value === 'true' || value === true);
    });

    return sanitizedProfile;
}

document.addEventListener('DOMContentLoaded', () => {

    const form = document.getElementById('loginForm');
    const userInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('senha');
    const logarBtn = document.getElementById('logarBtn');
    const buttonText = document.getElementById('buttonText');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Remove a variável 'message' do DOM, pois o Toast será usado
    const message = document.getElementById('message');
    if (message) message.style.display = 'none';


    function setLoading(isLoading) {
        logarBtn.disabled = isLoading;
        buttonText.style.display = isLoading ? 'none' : 'inline';
        loadingIndicator.style.display = isLoading ? 'inline-block' : 'none';
        // A mensagem de erro persistente não é mais usada, mas ocultamos o DOM fallback
        if (document.getElementById('message')) document.getElementById('message').style.display = 'none';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nomeUsuario = userInput.value.trim().toUpperCase();
        const senha = passwordInput.value.trim();

        if (!nomeUsuario || !senha) {
            showToast('Preencha todos os campos.', 'info');
            return;
        }

        setLoading(true);

        try {
            // 1. CHAMA A FUNÇÃO SQL SEGURA PARA VALIDAR O USUÁRIO/SENHA
            let { data: userData, error: loginError } = await supabaseClient.rpc(
                'check_credentials', {
                    p_usuario: nomeUsuario,
                    p_senha: senha
                }
            );

            if (loginError) throw loginError;

            if (userData && userData.length === 1) {
                const userProfile = userData[0];

                // 🚨 CRÍTICO: SANITIZA AS PERMISSÕES PARA GARANTIR QUE SÃO BOOLEANAS
                const finalProfile = sanitizeProfilePermissions(userProfile);


                // 2. CRIAÇÃO DA SESSÃO ATIVA (Usando o perfil sanitizado)
                const sessionCreated = await createActiveSession(finalProfile);

                if (sessionCreated) {

                    // 3. Login Aprovado: Atualiza o campo 'status' para 'User Ativo'
                    const { error: updateError } = await supabaseClient
                        .from('cadastros')
                        .update({ status: 'User Ativo' })
                        .eq('usuario', finalProfile.usuario);

                    if (updateError) console.warn("Aviso: Falha ao atualizar status do usuário (RLS na tabela 'cadastros'?).", updateError);

                    // 4. Salvar dados de sessão no localStorage (PERFIL DE DADOS)
                    localStorage.setItem('user_session_data', JSON.stringify({
                        usuario: finalProfile.usuario,
                        user_id: finalProfile.id,
                        role: finalProfile.role,

                        // ⭐ PERMISSÕES COMPLETAS
                        access_ciclico: finalProfile.access_ciclico,
                        access_permissions: finalProfile.access_permissions,
                        access_clause: finalProfile.access_clause,
                        access_rn: finalProfile.access_rn,
                        access_consulta: finalProfile.access_consulta,
                        access_relatorio: finalProfile.access_relatorio,
                        can_delete_data: finalProfile.can_delete_data,
                        can_edit_data: finalProfile.can_edit_data,
                        can_consult: finalProfile.can_consult,
                        can_change_perms: finalProfile.can_change_perms,
                        can_add_user: finalProfile.can_add_user,
                        can_delete_users: finalProfile.can_delete_users
                    }));

                    // 5. Redirecionamento
                    showToast(`Seja bem-vindo(a), ${finalProfile.usuario}! Redirecionando...`, 'success');

                    setTimeout(() => {
                        window.location.href = './Menu/Menu.html';
                    }, 1500);

                } else {
                    showToast('Login falhou: Não foi possível iniciar a sessão de segurança.', 'error');
                }

            } else {
                // Senha incorreta / Usuário não encontrado
                showToast('Usuário ou senha inválidos. Verifique suas credenciais.', 'error');
            }

        } catch (error) {
            console.error('Erro de Login/DB:', error.message || error);
            showToast('Erro interno. Tente novamente ou contate o suporte.', 'error');
        } finally {
            // O setLoading(false) é importante, mas se houver redirecionamento, não é estritamente necessário
            // Deixaremos o loading ativo durante o setTimeout de 1.5s em caso de sucesso.
            if (window.location.href.indexOf('./Menu/Menu.html') === -1) {
                setLoading(false);
            }
        }
    });
});