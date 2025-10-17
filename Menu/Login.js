// =========================================================================
// Menu/Login.js (CÓDIGO COMPLETO E AJUSTADO PARA USAR APENAS 'cadastros')
// =========================================================================

// 🚨 CREDENCIAIS FINAIS DO SUPABASE
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
// Inicializa o cliente Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


document.addEventListener('DOMContentLoaded', () => {

    // 🚨 Assumindo que o seu HTML tem estes IDs:
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

        const nomeUsuario = userInput.value.trim();
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
            // O uso de .select('*') garante que todas as colunas de permissão sejam retornadas.
            let { data: userData, error: loginError } = await supabaseClient
                .from('cadastros')
                .select('*')
                .eq('usuario', nomeUsuario)
                .eq('senha', senha); // 🚨 Lembrete: Use hashing de senha em produção!

            if (loginError) throw loginError;

            if (userData && userData.length === 1) {
                const userProfile = userData[0];

                // 2. CRIAÇÃO DA SESSÃO ATIVA (LOCALSTORAGE)
                // Armazena o perfil completo, incluindo o ID e todas as permissões.
                localStorage.setItem('user_session_data', JSON.stringify(userProfile));

                // Salva o ID separadamente para compatibilidade com outros códigos antigos
                localStorage.setItem('user_session_id', userProfile.id);


                // 3. Login Aprovado: Atualiza o campo 'status' para 'User Ativo'
                const { error: updateError } = await supabaseClient
                    .from('cadastros')
                    .update({ status: 'User Ativo' })
                    .eq('id', userProfile.id); // Filtra pelo ID, que é mais seguro e rápido

                if (updateError) throw updateError;

                // 4. Redirecionamento
                message.textContent = `Seja bem-vindo(a), ${nomeUsuario}! Redirecionando...`;
                message.className = 'login-message success';
                message.style.display = 'block';

                setTimeout(() => {
                    // Redireciona para o painel principal
                    window.location.href = './Menu/dashboard.html';
                }, 1500);

            } else {
                // 5. Login Reprovado (Não encontrado o par usuário/senha)
                message.textContent = 'Usuário ou senha inválidos. Verifique suas credenciais.';
                message.className = 'login-message error';
                message.style.display = 'block';
            }

        } catch (error) {
            console.error('Erro de Login/DB:', error.message || error);
            message.textContent = `Erro: Não foi possível realizar o login. ${error.message || ''}`;
            message.className = 'login-message error';
            message.style.display = 'block';
        } finally {
            setLoading(false);
        }
    });
});