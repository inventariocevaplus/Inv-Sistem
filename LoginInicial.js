// =========================================================================
// Menu/Login.js (CÓDIGO FINAL DE LOGIN - USUÁRIO/SENHA NA TABELA 'cadastros')
// =========================================================================

// 🚨 CREDENCIAIS FINAIS DO SUPABASE
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
// Inicializa o cliente Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// =========================================================================
// FUNÇÃO CRÍTICA: Cria o registro de sessão na tabela 'active_sessions'
// (Versão que ignora a data de login para evitar erro de nome de coluna)
// =========================================================================
async function createActiveSession(userProfile) {
    // userProfile é o registro completo encontrado na tabela 'cadastros'
    const sessionData = {
        user_id: userProfile.id, // O ID (UUID) da tabela cadastros
        role: userProfile.role, // MASTER
        access_clause: userProfile.access_clause,
        can_delete_data: userProfile.can_delete_data,
        can_edit_data: userProfile.can_edit_data,
        can_consult: userProfile.can_consult,
        // 🚨 REMOÇÃO TEMPORÁRIA DE 'last_login' PARA EVITAR ERRO 400 DE NOME DE COLUNA
    };

    // Salva/Atualiza o registro na tabela 'active_sessions'
    const { error: upsertError } = await supabaseClient
        .from('active_sessions')
        .upsert(sessionData, { onConflict: 'user_id' }); // Conflito no user_id (UUID)

    if (upsertError) {
        console.error("Erro ao salvar sessão ativa:", upsertError); // Mostra o erro 400 se persistir
        return false;
    }
    return true;
}


document.addEventListener('DOMContentLoaded', () => {
    // Verifica se existe um arquivo duplicado sendo carregado (como LoginInicial.js)
    // Se existir um LoginInicial.js, exclua-o para evitar conflito.

    const form = document.getElementById('loginForm');
    const userInput = document.getElementById('usuario');
    const passwordInput = document.getElementById('senha');
    const message = document.getElementById('message');
    const logarBtn = document.getElementById('logarBtn');
    const buttonText = document.getElementById('buttonText');
    const loadingIndicator = document.getElementById('loadingIndicator');

    function setLoading(isLoading) {
        logarBtn.disabled = isLoading;
        buttonText.style.display = isLoading ? 'none' : 'inline';
        loadingIndicator.style.display = isLoading ? 'inline-block' : 'none';
        message.style.display = 'none';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Nome do usuário (Ex: GABRIEL)
        const nomeUsuario = userInput.value.trim();
        // Senha (Ex: @Cevaplus12@)
        const senha = passwordInput.value.trim();

        if (!nomeUsuario || !senha) {
            message.textContent = 'Preencha todos os campos.';
            message.className = 'login-message error';
            message.style.display = 'block';
            return;
        }

        setLoading(true);

        try {
            // 1. Tenta encontrar o usuário e senha na tabela 'cadastros'
            let { data: userData, error: loginError } = await supabaseClient
                .from('cadastros')
                .select('*') // Seleciona tudo para obter o ID (UUID) e permissões
                .eq('usuario', nomeUsuario)
                .eq('senha', senha);

            if (loginError) throw loginError;

            if (userData && userData.length === 1) {
                const userProfile = userData[0];

                // 2. CRIAÇÃO DA SESSÃO ATIVA (Se a tabela 'active_sessions' estiver correta, isso será o sucesso)
                const sessionCreated = await createActiveSession(userProfile);

                if (sessionCreated) {

                    // 3. Login Aprovado: Atualiza o campo 'status' para 'User Ativo'
                    const { error: updateError } = await supabaseClient
                        .from('cadastros')
                        .update({ status: 'User Ativo' })
                        .eq('usuario', nomeUsuario);

                    if (updateError) throw updateError;

                    // 4. Redirecionamento para o Dashboard
                    message.textContent = `Seja bem-vindo(a), ${nomeUsuario}! Redirecionando...`;
                    message.className = 'login-message success';
                    message.style.display = 'block';

                    setTimeout(() => {
                        window.location.href = './dashboard.html';
                    }, 1500);
                } else {
                     // Falha ao criar a sessão ativa
                    message.textContent = 'Login falhou: Não foi possível iniciar a sessão de segurança.';
                    message.className = 'login-message error';
                    message.style.display = 'block';
                }

            } else {
                // 5. Login Reprovado (Não encontrado o par usuário/senha)
                message.textContent = 'Usuário ou senha inválidos. Verifique suas credenciais.';
                message.className = 'login-message error';
                message.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro de Login/DB:', error.message || error);
            message.textContent = `Erro: Não foi possível conectar ao banco de dados. ${error.message || ''}`;
            message.className = 'login-message error';
            message.style.display = 'block';
        } finally {
            setLoading(false);
        }
    });
});