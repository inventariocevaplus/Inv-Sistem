// =========================================================================
// CONFIGURAÇÃO SUPABASE (COPIE E COLE AQUI AS SUAS CHAVES REAIS)
// =========================================================================
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co'; // ⚠️ SUBSTITUA PELA SUA URL REAL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw'; // ⚠️ SUBSTITUA PELA SUA CHAVE REAL

// Inicialização do cliente Supabase
const { createClient } = supabase;
const supabaseClient = typeof supabase !== 'undefined'
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : {
        from: () => ({
            select: () => ({ data: [], error: { message: 'Supabase não inicializado.' } }),
        })
    };

if (typeof supabase === 'undefined') {
    console.error('Atenção: A biblioteca Supabase não foi carregada. Nenhuma função de DB funcionará.');
}

// ⚠️ NOME DA TABELA: Substitua 'mapping_perfis' pelo nome da sua tabela de usuários/perfil no Supabase
const PERFIL_TABLE = 'mapping_perfis';
// =========================================================================

// =========================================================================
// 1. DEFINIÇÃO DAS COLUNAS DA GRADE DE PERFIL (SOLICITADAS PELO USUÁRIO)
// Estes nomes devem corresponder EXATAMENTE aos nomes das colunas no Supabase.
// =========================================================================
const PERFIL_COLUMNS = [
    "NOME",
    "MATRICULA",
    "RUA",
    "ANIVERSARIO",
    "CARGO"
];

// Variável global para armazenar o perfil do usuário
let globalUserProfile = {};


// =========================================================================
// FUNÇÕES AUXILIARES PARA FORMATAÇÃO
// =========================================================================
function formatDateToBR(isoDateString) {
    if (!isoDateString || isoDateString === '-') return '-';

    const value = String(isoDateString);
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return value;
    }

    try {
        // Assume formato 'YYYY-MM-DD' do banco de dados (ISO)
        const parts = value.split('T')[0].split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
    } catch (e) {
        console.warn("Erro ao formatar data ISO:", value, e);
    }
    return value;
}

// Função de Toast (Aviso) - Simplificada, idealmente estaria em um arquivo global ou Menu.js
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast ? toast.querySelector('i') : null;

    if (!toast || !toastMessage || !toastIcon) {
        if (type === 'error') alert(`ERRO: ${message}`);
        console.error("Elemento toast não encontrado. Mensagem:", message);
        return;
    }

    toastMessage.textContent = message;
    toast.className = 'toast-hidden';
    toastIcon.className = '';
    toast.style.backgroundColor = '';

    if (type === 'success') {
        toast.style.backgroundColor = '#28a745';
        toastIcon.classList.add('fas', 'fa-check-circle');
    } else if (type === 'error') {
        toast.style.backgroundColor = '#dc3545';
        toastIcon.classList.add('fas', 'fa-exclamation-triangle');
    } else {
         toast.style.backgroundColor = '#ffc107';
         toastIcon.classList.add('fas', 'fa-info-circle');
    }

    setTimeout(() => {
        toast.classList.remove('toast-hidden');
        toast.classList.add('toast-visible');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
    }, 3000);
}


// =========================================================================
// FUNÇÕES DE SUPORTE (RENDERIZAÇÃO E BUSCA)
// =========================================================================
function renderTableHeader() {
    const headerRow = document.getElementById('tableHeaderRow');
    if (!headerRow) return;

    let headerHTML = '';
    PERFIL_COLUMNS.forEach(col => {
        // Cria o cabeçalho usando o nome do array (NOME, MATRICULA, etc.)
        headerHTML += `<th>${col.toUpperCase()}</th>`;
    });
    headerRow.innerHTML = headerHTML;
}

function renderResults(data) {
    const tableBody = document.getElementById('tableBody');
    const loadingMessage = document.getElementById('loading-message');

    if (!tableBody) return;

    // Remove a mensagem de carregamento
    if (loadingMessage) loadingMessage.parentNode.removeChild(loadingMessage);

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="${PERFIL_COLUMNS.length}">Nenhum dado de perfil encontrado para o usuário. ⚠️ A tabela 'mapping_perfis' pode não existir ou a RLS está bloqueando o acesso.</td></tr>`;
        return;
    }

    let tableRows = '';

    // Esta tela exibe apenas o perfil do usuário logado, então processamos todos os resultados
    data.forEach(row => {
        tableRows += `<tr data-id="${row.id || 'info'}">`;

        PERFIL_COLUMNS.forEach(col => {
            // Obtém o valor usando o nome da coluna definido no array
            let cellValue = row[col] !== null && row[col] !== undefined ? row[col] : '-';

            // === AJUSTE PARA FORMATAR DATA ===
            if (col === "ANIVERSARIO") {
                cellValue = formatDateToBR(String(cellValue));
            }
            // =========================================================

            tableRows += `<td data-col="${col}">${cellValue}</td>`;
        });

        tableRows += `</tr>`;
    });

    tableBody.innerHTML = tableRows;
}

async function loadPerfilData() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    // Tenta obter o UUID (ID de login) da sessão
    const userUUID = globalUserProfile.user?.id || globalUserProfile.uuid || globalUserProfile.id;

    if (!userUUID) {
        // showToast("Usuário não autenticado. Impossível carregar dados de perfil.", 'error');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="${PERFIL_COLUMNS.length}">Usuário não autenticado.</td></tr>`;
        return;
    }

    try {
        // Filtra a tabela PERFIL_TABLE pelo UUID do usuário logado
        const { data, error } = await supabaseClient.from(PERFIL_TABLE)
            .select(PERFIL_COLUMNS.join(',')) // Seleciona apenas as colunas definidas
            // ⚠️ IMPORTANTE: 'uuid' deve ser o nome da coluna que armazena o ID do usuário nesta tabela
            .eq('uuid', userUUID)
            .limit(1);

        if (error) throw error;

        renderResults(data);

    } catch (error) {
        console.error("Erro ao carregar dados do perfil:", error.message || error);
        // showToast("Erro ao carregar dados. Verifique a RLS e o nome da tabela/colunas.", 'error');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="${PERFIL_COLUMNS.length}">Erro ao carregar dados: ${error.message || 'Erro de conexão.'}</td></tr>`;
    }
}


// =========================================================================
// LÓGICA DE INICIALIZAÇÃO (DOMContentLoaded)
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {

    // Carregamento e Restauração da Sessão do Usuário
    const sessionData = localStorage.getItem('user_session_data');
    const userNameSpan = document.getElementById('userName');

    if (sessionData) {
        try {
            globalUserProfile = JSON.parse(sessionData);

            if (globalUserProfile.access_token) {
                 const { error: sessionError } = await supabaseClient.auth.setSession({
                      access_token: globalUserProfile.access_token,
                      refresh_token: globalUserProfile.refresh_token
                 });

                 if (sessionError) {
                      console.error("Erro ao restaurar a sessão Supabase:", sessionError.message);
                 }
            }

            // Lógica para carregar o nome (mais robusta)
            if (globalUserProfile.usuario && userNameSpan) {
                let username = globalUserProfile.usuario.toLowerCase().trim();

                if (username.length > 0) {
                    username = username.charAt(0).toUpperCase() + username.slice(1);
                    userNameSpan.textContent = username;
                } else {
                    userNameSpan.textContent = "Usuário";
                }
            } else if (userNameSpan) {
                 userNameSpan.textContent = "Desconectado";
            }
        } catch (e) {
            console.error("Erro ao parsear dados de sessão no Perfil:", e);
            if (userNameSpan) userNameSpan.textContent = "Erro Sessão";
        }
    } else if (userNameSpan) {
        userNameSpan.textContent = "Fazer Login";
    }

    // Inicialização da Grade de Perfil
    renderTableHeader();
    loadPerfilData();
});