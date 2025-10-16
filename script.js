// =========================================================================
// 🚨 CREDENCIAIS FINAIS DO SUPABASE (URL + ANON KEY) 🚨
// =========================================================================
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw'; 
// =========================================================================

// Inicializa o cliente Supabase
// Nota: O objeto 'supabase' é injetado pelo <script> no index.html.
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
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

        // Remove espaços em branco do usuário e senha
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value.trim();

        if (!usuario || !senha) {
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
                .select('usuario') 
                .eq('usuario', usuario) 
                .eq('senha', senha);    

            if (loginError) throw loginError;

            if (userData && userData.length > 0) {
                // 2. Login Aprovado: Atualiza o campo 'status' para 'User Ativo'
                const { error: updateError } = await supabaseClient
                    .from('cadastros')
                    .update({ status: 'User Ativo' })
                    .eq('usuario', usuario);
                
                if (updateError) throw updateError;

                // 3. Redirecionamento
                message.textContent = `Seja bem-vindo(a), ${usuario}! Redirecionando...`;
                message.className = 'login-message success';
                message.style.display = 'block';

                setTimeout(() => {
                    window.location.href = 'Menu/dashboard.html'; 
                }, 1500);

            } else {
                // 4. Login Reprovado
                message.textContent = 'Usuário ou senha inválidos. Verifique suas credenciais.';
                message.className = 'login-message error';
                message.style.display = 'block';
            }

        } catch (error) {
            // Trata falhas de rede, Supabase Key, ou erros do banco de dados
            console.error('Erro no Supabase:', error.message || error);
            message.textContent = `Erro: Não foi possível conectar ao banco de dados. ${error.message || ''}`;
            message.className = 'login-message error';
            message.style.display = 'block';
        } finally {
            setLoading(false);
        }
    });
});