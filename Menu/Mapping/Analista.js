// =========================================================================
// ANALISTA.JS: MÓDULO COMPLETO E INDEPENDENTE
// (Correção do Bug de Clique na Grade)
// =========================================================================

// Variável para armazenar o perfil do usuário
let globalUserProfile = {};
// Variável global para armazenar TODOS os contratos do analista (para navegação)
let analystContractsData = [];


// CONFIGURAÇÃO SUPABASE LOCAL (Use suas chaves reais)
// ⚠️ SUBSTITUA OS VALORES ABAIXO PELOS SEUS REAIS DO SUPABASE ⚠️
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';
const CONTRATOS_TABLE = 'mapping_contratos';

// Inicialização do cliente Supabase local
const { createClient } = typeof supabase !== 'undefined' ? supabase : {};
const client = createClient
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : {
        from: () => ({
            select: () => ({ data: [], error: { message: 'Supabase Client não inicializado.' } }),
            auth: { signOut: () => ({}) }
        })
    };


// =========================================================================
// FUNÇÕES AUXILIARES DE FORMATAÇÃO
// =========================================================================
function formatTargetContratual(value) {
    if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            // Multiplica por 100 pois o Supabase salva como decimal (e.g., 0.95)
            return (numValue * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
        }
    }
    return 'N/A';
}

function formatNumber(value) {
    if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
            return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        }
    }
    return 'N/A';
}

function formatValue(value) {
    if (value === null || value === undefined || String(value).trim() === '' || String(value).trim() === '-') {
        return 'N/A';
    }
    let str = String(value).trim();
    // Verifica se é uma sigla ou código em maiúsculas
    if (str.length <= 4 && str.toUpperCase() === str) {
        return str;
    }
    // Converte para Primeira Letra Maiúscula
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}


// =========================================================================
// FUNÇÕES DE TOAST, PERFIL DO USUÁRIO E LOGOUT
// =========================================================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast ? toast.querySelector('i') : null;

    if (!toast || !toastMessage || !toastIcon) {
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
         toast.style.backgroundColor = '#051039'; /* Azul Marinho para Info */
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

function loadUserProfile() {
    const sessionData = localStorage.getItem('user_session_data');
    const userNameSpan = document.getElementById('userName');

    if (sessionData && userNameSpan) {
        try {
            const profile = JSON.parse(sessionData);
            globalUserProfile = profile;

            if (profile.usuario) {
                let username = profile.usuario.toLowerCase().trim();

                if (username.length > 0) {
                    username = username.charAt(0).toUpperCase() + username.slice(1);
                    userNameSpan.textContent = username;
                } else {
                    userNameSpan.textContent = "Usuário";
                }
            } else {
                 userNameSpan.textContent = "Desconectado";
            }
        } catch (e) {
            console.error("Erro ao parsear dados de sessão no Analista:", e);
            if (userNameSpan) userNameSpan.textContent = "Erro Sessão";
        }
    } else if (userNameSpan) {
        userNameSpan.textContent = "Fazer Login";
    }
}

function showUserProfile() {
    const modal = document.getElementById('userProfileModal');
    const profile = globalUserProfile;

    if (modal) {
        document.getElementById('profileUserName').textContent = profile.usuario ? profile.usuario.toUpperCase() : 'NÃO LOGADO';
        document.getElementById('profileUserRole').textContent = profile.role || 'GUEST';
        document.getElementById('profileUserUUID').textContent = profile.user?.id || profile.uuid || 'N/A';
        document.getElementById('profileUserEmail').textContent = profile.user?.email || 'N/A';

        modal.style.display = 'block';
    }
}

function closeUserProfileModal() {
    const modal = document.getElementById('userProfileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function logoutUser() {
    localStorage.removeItem('user_session_data');

    if (client.auth) {
        client.auth.signOut().catch(e => console.error("Erro ao fazer signOut Supabase:", e));
    }

    window.location.href = '../Menu.html';
}

window.onclick = function(event) {
    const userModal = document.getElementById('userProfileModal');
    const analystModal = document.getElementById('analystDetailsModal');
    // Handler para fechar a modal ao clicar no backdrop (fundo)
    if (event.target === userModal) {
        closeUserProfileModal();
    }
    if (event.target === analystModal) {
        closeAnalystDetailsModal();
    }
}


// =========================================================================
// FUNÇÕES DE GESTÃO DE DETALHES DO ANALISTA (Modal 2 - Customizada)
// =========================================================================

function closeAnalystDetailsModal() {
    const modal = document.getElementById('analystDetailsModal');
    if (modal) {
        modal.style.display = 'none';
    }
    analystContractsData = []; // Limpa os dados ao fechar a modal
}

/**
 * Renderiza os detalhes do contrato único (card)
 * @param {Object} contract - O objeto de dados do contrato
 */
function renderContractDetails(contract) {
    const detailContainer = document.getElementById('analystContractsDetail');
    const currentContractName = document.getElementById('currentContractName');

    if (!detailContainer || !contract) {
        currentContractName.textContent = 'N/A';
        detailContainer.innerHTML = '<p>Erro ao renderizar detalhes do contrato.</p>';
        return;
    }

    // Atualiza o nome do contrato selecionado
    currentContractName.textContent = formatValue(contract.contratos);

    // Formatação dos dados
    const targetContratual = formatTargetContratual(contract["Target Contratual"]);
    const posicoesWHFisico = formatNumber(contract["Posições WH físico"]);
    const modalidadeContagem = formatValue(contract["Modalidade de contagem"]);

    // HTML do card de contrato
    const contractListHTML = `
        <div class="contract-card">
            <div class="contract-header" style="border-bottom: none; margin-bottom: 0;">Contrato: ${formatValue(contract.contratos)}</div>
            <div class="contract-details-grid">
                <div class="detail-item">
                    <label>BU:</label>
                    <span>${formatValue(contract.bu)}</span>
                </div>
                <div class="detail-item">
                    <label>Sistema:</label>
                    <span>${formatValue(contract.sistema)}</span>
                </div>
                <div class="detail-item">
                    <label>Target Contratual:</label>
                    <span>${targetContratual}</span>
                </div>
                <div class="detail-item">
                    <label>Ciclo de Inventário:</label>
                    <span>${formatValue(contract["Ciclo de Inventário"])}</span>
                </div>
                <div class="detail-item">
                    <label>Modalidade de Contagem:</label>
                    <span>${modalidadeContagem}</span>
                </div>
                <div class="detail-item">
                    <label>Batimento Estoque:</label>
                    <span>${formatValue(contract["Batimento Estoque"])}</span>
                </div>
                <div class="detail-item">
                    <label>Posições WH Físico:</label>
                    <span>${posicoesWHFisico}</span>
                </div>
            </div>
        </div>
    `;

    detailContainer.innerHTML = contractListHTML;

    // Atualiza o estado da barra de navegação (pills)
    document.querySelectorAll('.contract-pill').forEach(pill => {
        pill.classList.remove('active-pill');
        // Usa o data-contract para matching
        if (pill.getAttribute('data-contract') === contract.contratos) {
            pill.classList.add('active-pill');
        }
    });
}

/**
 * Função para buscar todos os contratos do analista e configurar a navegação
 */
async function showAnalystDetails(nomeAnalista) {
    const modal = document.getElementById('analystDetailsModal');
    const nameDisplay = document.getElementById('analystNameDisplay');
    const discreetInfo = document.getElementById('analystDiscreetInfo');
    const skillsDisplay = document.getElementById('analystSkills');
    const navBar = document.getElementById('analystContractNavBar');
    const detailContainer = document.getElementById('analystContractsDetail');
    const currentContractName = document.getElementById('currentContractName');

    if (!modal) return;

    const nomeUpper = nomeAnalista.toUpperCase();
    nameDisplay.textContent = nomeUpper;
    navBar.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Carregando contratos...</p>';
    detailContainer.innerHTML = '<p style="text-align: center; margin: 20px 0; color: #051039;"><i class="fas fa-spinner fa-spin"></i> Aguardando dados...</p>';
    currentContractName.textContent = 'Carregando...';
    discreetInfo.textContent = 'Buscando...';
    skillsDisplay.textContent = 'Buscando...';
    analystContractsData = [];
    modal.style.display = 'block';

    try {
        // Busca TODOS os contratos para o analista
        const { data: contracts, error } = await client
            .from(CONTRATOS_TABLE)
            .select('contratos, bu, sistema, "Target Contratual", "Ciclo de Inventário", "Modalidade de contagem", "Batimento Estoque", "Posições WH físico", cargo, habilidades')
            .eq('analista', nomeUpper)
            .order('contratos', { ascending: true });

        if (error) throw error;

        analystContractsData = contracts;

        // 1. Renderiza a barra de navegação (Pills)
        if (analystContractsData.length > 0) {
            let navHTML = '';

            analystContractsData.forEach(contract => {
                // Usa o 'contratos' como ID e o nome formatado para exibição
                const contractPillName = formatValue(contract.contratos);
                navHTML += `<span class="contract-pill" data-contract="${contract.contratos}">${contractPillName}</span>`;
            });

            navBar.innerHTML = navHTML;

            // Adiciona listeners para navegação
            navBar.querySelectorAll('.contract-pill').forEach(pill => {
                pill.addEventListener('click', (e) => {
                    // Pega o nome do contrato original para buscar no array
                    const selectedContractName = e.currentTarget.getAttribute('data-contract');
                    const selectedContract = analystContractsData.find(c => c.contratos === selectedContractName);
                    if (selectedContract) {
                         renderContractDetails(selectedContract);
                    }
                });
            });

            // 2. Renderiza o primeiro contrato por padrão
            renderContractDetails(analystContractsData[0]);

            // 3. Atualiza informações estáticas do analista
            const firstContract = analystContractsData[0];
            skillsDisplay.textContent = formatValue(firstContract.habilidades || 'N/A');
            discreetInfo.textContent = formatValue(firstContract.cargo || 'N/A');

        } else {
            navBar.innerHTML = '<p style="font-style: italic; color: var(--text-muted);">Nenhum contrato ativo encontrado para este analista.</p>';
            detailContainer.innerHTML = '<p style="text-align: center; margin: 20px 0;">Este analista não está alocado a nenhum contrato.</p>';
            currentContractName.textContent = 'N/A';
            skillsDisplay.textContent = 'N/A';
            discreetInfo.textContent = 'N/A';
        }

    } catch (error) {
        console.error("Erro ao carregar detalhes do analista:", error.message);
        navBar.innerHTML = '<p style="color: #dc3545;">Erro ao carregar contratos.</p>';
        detailContainer.innerHTML = `<p style="color: #dc3545; text-align: center;">Erro ao carregar. Verifique a RLS (SELECT) na tabela mapping_contratos.</p>`;
        currentContractName.textContent = 'ERRO';
        skillsDisplay.textContent = 'Erro';
        discreetInfo.textContent = 'Erro';
    }
}


// =========================================================================
// FUNÇÃO PRINCIPAL: CARREGA E RENDERIZA ANALISTAS
// =========================================================================
async function fetchAndRenderAnalistas(containerElement) {

    if (!containerElement) {
        console.error("Container para analistas não encontrado.");
        return;
    }

    containerElement.innerHTML = `
        <div class="loading-analistas" style="text-align: center; padding: 20px;">
            <i class="fas fa-spinner fa-spin"></i> Carregando lista de analistas...
        </div>`;

    try {
        // 1. Busca todos os nomes de analistas da coluna 'analista'
        const { data, error } = await client
            .from(CONTRATOS_TABLE)
            .select('analista')
            .order('analista', { ascending: true });

        if (error) throw error;

        // 2. Processa os dados para obter nomes únicos e limpos
        const analistasSet = new Set();
        data.forEach(item => {
            let nome = item.analista ? item.analista.trim() : null;
            if (nome && nome.toUpperCase() !== '-' && nome.toUpperCase() !== 'ANALISTA' && nome.toUpperCase() !== 'NULO' && nome.toUpperCase() !== 'N/A') {
                analistasSet.add(nome.toUpperCase());
            }
        });

        const analistasUnicos = Array.from(analistasSet);

        // 3. Renderiza os botões
        if (analistasUnicos.length === 0) {
            containerElement.innerHTML = '<p style="text-align: center; padding: 20px;">Nenhum analista alocado encontrado na base.</p>';
            return;
        }

        let buttonsHTML = '<div class="analistas-grid">';

        analistasUnicos.forEach(nome => {
            buttonsHTML += `
                <button class="analista-btn" data-nome="${nome.toLowerCase()}">
                    <i class="fas fa-user-check"></i>
                    <span>${nome}</span>
                </button>
            `;
        });
        buttonsHTML += '</div>';

        containerElement.innerHTML = buttonsHTML;

        // 4. Adiciona listeners de clique SOMENTE nos BOTÕES
        // e garante que a propagação do clique pare no botão.
        containerElement.querySelectorAll('.analista-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                // IMPORTANT: Stop propagation to prevent accidental clicks on containers
                e.stopPropagation();

                const nomeAnalista = e.currentTarget.getAttribute('data-nome');
                showAnalystDetails(nomeAnalista);
            });
        });

    } catch (error) {
        console.error("Erro ao carregar analistas:", error.message || error);
        containerElement.innerHTML = `
            <p style="color: #dc3545; text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-triangle"></i> Erro ao carregar analistas. Verifique a conexão com o Supabase ou permissões (RLS).
            </p>`;
    }
}

window.fetchAndRenderAnalistas = fetchAndRenderAnalistas;


// =========================================================================
// BLOCO DE INICIALIZAÇÃO AUTOMÁTICA
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {

    loadUserProfile();

    const staticLoadingText = document.querySelector('#analistaContent > p.loading-analistas');
    if (staticLoadingText) {
        staticLoadingText.remove();
    }

    const container = document.getElementById('analistasContainer');

    if (container) {
        fetchAndRenderAnalistas(container);
    } else {
        console.error("Elemento 'analistasContainer' não encontrado para iniciar o carregamento.");
    }
});