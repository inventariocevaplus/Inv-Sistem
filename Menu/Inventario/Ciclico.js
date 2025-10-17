// =========================================================================
// Ciclico.js (Rotina: Inventário Cíclico) - VERSÃO FINAL CORRIGIDA
// Tabela alvo: 'ciclico_contratos'
// COLUNAS USADAS: 'nome_contrato', 'status', 'analista_responsavel' (PADRÃO)
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (MANTIDAS)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;

// Alvo: 'ciclico_contratos'
const TARGET_TABLE_NAME = 'ciclico_contratos';

// Inicialização do cliente com token de sessão (para Auth/RLS)
const sessionDataJSON = localStorage.getItem('user_session_data');
let accessToken = SUPABASE_ANON_KEY;

if (sessionDataJSON) {
    try {
        const userData = JSON.parse(sessionDataJSON);
        if (userData.token) {
            accessToken = userData.token;
        }
    } catch (e) {
        console.error("Erro ao analisar dados da sessão para obter o token.", e);
    }
}
const supabaseClient = createClient(SUPABASE_URL, accessToken);

let userPermissions = {};

// REFERÊNCIAS DO DOM - AJUSTADAS PARA O HTML FORNECIDO
const ciclicoListDiv = document.getElementById('ciclicoList'); // contracts-grid ID
const loadingMessageCiclico = document.getElementById('loadingMessage'); // ID da mensagem de loading
const deleteConfirmModalCiclico = document.getElementById('deleteConfirmModal'); // ID do modal de exclusão
const confirmDeleteBtnCiclico = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtnCiclico = document.getElementById('cancelDeleteBtn');

// 🚨 CORREÇÃO PRINCIPAL: Usando os IDs exatos do HTML (addCiclicoBtn e addCiclicoModal)
const addCiclicoBtn = document.getElementById('addCiclicoBtn');
const addCiclicoModal = document.getElementById('addCiclicoModal');

const addCiclicoForm = document.getElementById('addCiclicoForm');
const formMessageCiclico = document.getElementById('formMessageCiclico');
let recordToDeleteIdCiclico = null;


document.addEventListener('DOMContentLoaded', async () => {
    userPermissions = loadUserPermissions();

    if (!hasPermission('access_ciclico')) {
        if (ciclicoListDiv) ciclicoListDiv.innerHTML = `<p style="color:red;">Acesso negado à Rotina Cíclico.</p>`;
        if (addCiclicoBtn) addCiclicoBtn.style.display = 'none';
        return;
    }

    checkAndDisplayNavigation();
    loadCiclicoRecords();

    setupModalListeners();
    setupFormSubmit();
    setupAddRecordListener();
    setupSearchListener();
});


// =======================================================
// LÓGICA DE PERMISSÕES
// =======================================================

function loadUserPermissions() {
    const userDataJSON = localStorage.getItem('user_session_data');
    let permissions = { role: 'GUEST', can_consult: false, access_rn: false, access_ciclico: false, access_clause: false, can_send_data: false, can_delete_data: false, can_edit_data: false };
    if (userDataJSON) {
        try { permissions = JSON.parse(userDataJSON); } catch (e) { console.error("Erro ao analisar dados da sessão JSON.", e); }
    }
    return permissions;
}

function hasPermission(key) {
    if (userPermissions.role && userPermissions.role.toUpperCase() === 'MASTER') {
        return true;
    }
    const permValue = userPermissions[key];
    return permValue === true || permValue === 't';
}

function checkAndDisplayNavigation() {
    if (!hasPermission('access_clause')) {
        const btn = document.getElementById('btnClause');
        if (btn) btn.style.display = 'none';
    }
    if (!hasPermission('access_ciclico')) {
        const btn = document.getElementById('btnCiclico');
        if (btn) btn.style.display = 'none';
    }
    if (!hasPermission('access_rn')) {
        const btn = document.getElementById('btnRN');
        if (btn) btn.style.display = 'none';
    }
}


// =======================================================
// LÓGICA ESPECÍFICA DA ROTINA (CÍCLICO)
// =======================================================

function displayMessage(element, message, isSuccess) {
    element.textContent = message;
    element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 3000);
}

async function loadCiclicoRecords(searchTerm = '') {
    if (!hasPermission('can_consult')) {
        if (ciclicoListDiv) ciclicoListDiv.innerHTML = `<p style="color:red;">Você não tem permissão para consultar dados.</p>`;
        return;
    }

    if (loadingMessageCiclico) loadingMessageCiclico.textContent = 'Carregando itens do inventário cíclico...';

    // SELECT nas colunas padrão (para evitar o erro de coluna inexistente)
    let query = supabaseClient.from(TARGET_TABLE_NAME).select('id, nome_contrato, status, analista_responsavel');

    if (searchTerm) {
        // Busca APENAS nas colunas padrão
        query = query.or(`nome_contrato.ilike.%${searchTerm}%,analista_responsavel.ilike.%${searchTerm}%`);
    }

    let { data: records, error } = await query;

    if (loadingMessageCiclico) loadingMessageCiclico.textContent = '';

    if (error) {
        if (ciclicoListDiv) ciclicoListDiv.innerHTML = `<p style="color:red;">Erro ao carregar itens: ${error.message}</p>`;
        console.error("Supabase Error (SELECT):", error);
        return;
    }

    if (ciclicoListDiv) {
        ciclicoListDiv.innerHTML = '';
        if (records && records.length > 0) {
            records.forEach(record => {
                ciclicoListDiv.appendChild(createCiclicoCard(record));
            });
        } else {
            ciclicoListDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum item cíclico encontrado.</p>';
        }
    }

    if (addCiclicoBtn) {
        addCiclicoBtn.style.display = hasPermission('can_send_data') ? 'block' : 'none';
    }
}

function createCiclicoCard(record) {
    const card = document.createElement('div');
    card.className = 'contract-card';
    card.setAttribute('data-id', record.id);

    const statusText = record.status ? record.status.toUpperCase() : 'PENDENTE';
    const statusClass = (statusText === 'ATIVA' || statusText === 'ATIVO') ? 'ATIVO' : 'INATIVO';

    const deleteButtonHTML = hasPermission('can_delete_data')
        ? `<button class="delete-btn" title="Excluir Item Cíclico"><i class="fas fa-times"></i></button>`
        : '';

    const isClickable = hasPermission('can_edit_data') || hasPermission('can_consult');
    card.classList.toggle('clickable', isClickable);

    // Estrutura HTML idêntica ao Clause/RN
    card.innerHTML = `
        <div class="status-bar ${statusClass}"></div>
        <div class="contract-name">${record.nome_contrato || 'N/A'}</div>
        <div class="contract-analyst">Analista: ${record.analista_responsavel || 'N/A'}</div>
        ${deleteButtonHTML}
    `;

    if (hasPermission('can_delete_data')) {
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            recordToDeleteIdCiclico = record.id;
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'block';
        });
    }

    if (isClickable) {
        card.addEventListener('click', () => {
            const recordName = record.nome_contrato || 'Item Desconhecido';
            if (hasPermission('can_edit_data')) {
                alert(`Abrir edição para o item cíclico: ${recordName}`);
            } else {
                alert(`Visualizar detalhes do item cíclico: ${recordName}`);
            }
        });
    }

    return card;
}

async function deleteCiclicoRecord() {
    if (!hasPermission('can_delete_data')) {
        alert("Erro: Você não tem permissão para deletar dados.");
        if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
        return;
    }

    if (!recordToDeleteIdCiclico) return;

    const { error } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .delete()
        .eq('id', recordToDeleteIdCiclico);

    if (error) {
        alert(`Falha ao excluir item cíclico: ${error.message}`);
    } else {
        loadCiclicoRecords();
        console.log(`Item Cíclico ${recordToDeleteIdCiclico} excluído com sucesso.`);
    }

    recordToDeleteIdCiclico = null;
    if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
}

function setupModalListeners() {
    if (confirmDeleteBtnCiclico) confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);

    if (cancelDeleteBtnCiclico) cancelDeleteBtnCiclico.addEventListener('click', () => {
        recordToDeleteIdCiclico = null;
        if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
    });

    if (deleteConfirmModalCiclico) {
        const closeBtnsDelete = deleteConfirmModalCiclico.querySelectorAll('.close-btn');
        closeBtnsDelete.forEach(btn => btn.addEventListener('click', () => deleteConfirmModalCiclico.style.display = 'none'));
    }

    if (addCiclicoModal) {
        const closeBtnsAdd = addCiclicoModal.querySelectorAll('.close-btn');
        closeBtnsAdd.forEach(btn => btn.addEventListener('click', () => addCiclicoModal.style.display = 'none'));
    }

    window.addEventListener('click', (event) => {
        if (deleteConfirmModalCiclico && event.target === deleteConfirmModalCiclico) {
            deleteConfirmModalCiclico.style.display = 'none';
        }
        if (addCiclicoModal && event.target === addCiclicoModal) {
            addCiclicoModal.style.display = 'none';
        }
    });
}

// 🚨 FUNÇÃO CORRIGIDA USANDO OS IDs DO HTML FORNECIDO
function setupAddRecordListener() {
    if (addCiclicoBtn && addCiclicoModal) {
        addCiclicoBtn.addEventListener('click', () => {
             if (hasPermission('can_send_data')) {
                if (addCiclicoForm) addCiclicoForm.reset();
                // Esta linha agora usa o ID correto: addCiclicoModal
                addCiclicoModal.style.display = 'block';
            } else {
                alert("Você não tem permissão para adicionar novos itens.");
            }
        });
    } else {
         console.warn("ADICIONAR: Botão ou Modal não encontrado. Verifique os IDs 'addCiclicoBtn' e 'addCiclicoModal' no seu Ciclico.html.");
    }
}

function setupFormSubmit() {
    if (!addCiclicoForm) return;

    addCiclicoForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasPermission('can_send_data')) {
            displayMessage(formMessageCiclico, "Erro: Você não tem permissão para adicionar novos dados.", false);
            return;
        }

        const newRecord = {
            // Apenas as colunas padrão no INSERT
            nome_contrato: document.getElementById('contractNameCiclico').value,
            status: document.getElementById('contractStatusCiclico').value,
            analista_responsavel: document.getElementById('analystNameCiclico').value
        };

        const { error } = await supabaseClient
            .from(TARGET_TABLE_NAME)
            .insert([newRecord]);

        if (error) {
            displayMessage(formMessageCiclico, `Erro ao salvar: ${error.message}`, false);
            console.error("Supabase Error (INSERT):", error);
        } else {
            displayMessage(formMessageCiclico, 'Item Cíclico salvo com sucesso!', true);
            if (addCiclicoForm) addCiclicoForm.reset();
            if (addCiclicoModal) addCiclicoModal.style.display = 'none';
            loadCiclicoRecords();
        }
    });
}

function setupSearchListener() {
    const searchInput = document.getElementById('searchInput'); // Usando ID 'searchInput' do seu HTML
    const searchBtn = document.getElementById('searchBtn');

    const executeSearch = () => {
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        loadCiclicoRecords(searchTerm);
    };

    if (searchBtn) searchBtn.addEventListener('click', executeSearch);

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                executeSearch();
            }
        });
    }
}