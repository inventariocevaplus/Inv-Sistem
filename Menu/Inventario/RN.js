// =========================================================================
// RN.js (Rotina: Reserva Normal) - VERSÃO COMPLETA, COM RLS E ESTILO CORRIGIDOS
// Tabela alvo: 'rn_contratos'
// Colunas usadas: 'nome_contrato', 'status', 'analista_responsavel'
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (MANTIDAS)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;

const TARGET_TABLE_NAME = 'rn_contratos';

// Inicialização do cliente com token de sessão (CORREÇÃO DE AUTH para RLS)
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

// REFERÊNCIAS DO DOM
const rnListDiv = document.getElementById('rnList');
const loadingMessage = document.getElementById('loadingMessage');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const addRNBtn = document.getElementById('addRNBtn');
const addRNModal = document.getElementById('addRNModal');
const addRNForm = document.getElementById('addRNForm');
const formMessage = document.getElementById('formMessageRN');
let recordToDeleteId = null;


document.addEventListener('DOMContentLoaded', async () => {
    userPermissions = loadUserPermissions();

    if (!hasPermission('access_rn')) {
        if (rnListDiv) rnListDiv.innerHTML = `<p style="color:red;">Acesso negado à Rotina RN.</p>`;
        if (addRNBtn) addRNBtn.style.display = 'none';
        return;
    }

    checkAndDisplayNavigation();
    loadRNRecords();

    setupModalListeners();
    setupFormSubmit();
    setupAddRecordListener();
    setupSearchListener();
});


// =======================================================
// LÓGICA DE PERMISSÕES (COMPLETO)
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
    // Esconder botões de navegação se o usuário não tiver a permissão de acesso
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
// LÓGICA ESPECÍFICA DA ROTINA (RN)
// =======================================================

function displayMessage(element, message, isSuccess) {
    element.textContent = message;
    element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 3000);
}

async function loadRNRecords(searchTerm = '') {
    if (!hasPermission('can_consult')) {
        if (rnListDiv) rnListDiv.innerHTML = `<p style="color:red;">Você não tem permissão para consultar dados.</p>`;
        return;
    }

    if (loadingMessage) loadingMessage.textContent = 'Carregando reservas normais...';

    // SELECT nas colunas padronizadas
    let query = supabaseClient.from(TARGET_TABLE_NAME).select('id, nome_contrato, status, analista_responsavel');

    if (searchTerm) {
        query = query.or(`nome_contrato.ilike.%${searchTerm}%,analista_responsavel.ilike.%${searchTerm}%`);
    }

    let { data: records, error } = await query;

    if (loadingMessage) loadingMessage.textContent = '';

    if (error) {
        if (rnListDiv) rnListDiv.innerHTML = `<p style="color:red;">Erro ao carregar reservas: ${error.message}</p>`;
        console.error("Supabase Error (SELECT):", error);
        return;
    }

    if (rnListDiv) {
        rnListDiv.innerHTML = '';
        if (records && records.length > 0) {
            records.forEach(record => {
                rnListDiv.appendChild(createRNCard(record));
            });
        } else {
            rnListDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhuma reserva normal encontrada.</p>';
        }
    }

    if (addRNBtn) {
        addRNBtn.style.display = hasPermission('can_send_data') ? 'block' : 'none';
    }
}

function createRNCard(record) {
    const card = document.createElement('div');
    // 🚨 CORREÇÃO DE ESTILO: Usa a classe base 'contract-card'
    card.className = 'contract-card';
    card.setAttribute('data-id', record.id);

    // Mapeamento do Status (ATIVO/INATIVO para cores no CSS)
    const statusText = record.status ? record.status.toUpperCase() : 'PENDENTE';
    const statusClass = (statusText === 'ATIVA' || statusText === 'ATIVO') ? 'ATIVO' : 'INATIVO';

    const deleteButtonHTML = hasPermission('can_delete_data')
        ? `<button class="delete-btn" title="Excluir Reserva"><i class="fas fa-times"></i></button>`
        : '';

    const isClickable = hasPermission('can_edit_data') || hasPermission('can_consult');
    card.classList.toggle('clickable', isClickable);

    // 🚨 CORREÇÃO DE ESTILO: Estrutura idêntica ao Clause
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
            recordToDeleteId = record.id;
            if (deleteConfirmModal) deleteConfirmModal.style.display = 'block';
        });
    }

    if (isClickable) {
        card.addEventListener('click', () => {
            const recordName = record.nome_contrato || 'Reserva Desconhecida';
            if (hasPermission('can_edit_data')) {
                alert(`Abrir edição para a reserva: ${recordName}`);
            } else {
                alert(`Visualizar detalhes da reserva: ${recordName}`);
            }
        });
    }

    return card;
}

async function deleteRNRecord() {
    if (!hasPermission('can_delete_data')) {
        alert("Erro: Você não tem permissão para deletar dados.");
        if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
        return;
    }

    if (!recordToDeleteId) return;

    const { error } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .delete()
        .eq('id', recordToDeleteId);

    if (error) {
        alert(`Falha ao excluir reserva: ${error.message}`);
    } else {
        loadRNRecords();
        console.log(`Reserva ${recordToDeleteId} excluída com sucesso.`);
    }

    recordToDeleteId = null;
    if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
}

function setupModalListeners() {
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteRNRecord);

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        recordToDeleteId = null;
        if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
    });

    if (deleteConfirmModal) {
        const closeBtnsDelete = deleteConfirmModal.querySelectorAll('.close-btn');
        closeBtnsDelete.forEach(btn => btn.addEventListener('click', () => deleteConfirmModal.style.display = 'none'));
    }

    if (addRNModal) {
        const closeBtnsAdd = addRNModal.querySelectorAll('.close-btn');
        closeBtnsAdd.forEach(btn => btn.addEventListener('click', () => addRNModal.style.display = 'none'));
    }

    window.addEventListener('click', (event) => {
        if (deleteConfirmModal && event.target === deleteConfirmModal) {
            deleteConfirmModal.style.display = 'none';
        }
        if (addRNModal && event.target === addRNModal) {
            addRNModal.style.display = 'none';
        }
    });
}

function setupAddRecordListener() {
    if (addRNBtn && addRNModal) {
        addRNBtn.addEventListener('click', () => {
             if (hasPermission('can_send_data')) {
                if (addRNForm) addRNForm.reset();
                addRNModal.style.display = 'block';
            } else {
                alert("Você não tem permissão para adicionar novos contratos.");
            }
        });
    }
}

function setupFormSubmit() {
    if (!addRNForm) return;

    addRNForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!hasPermission('can_send_data')) {
            displayMessage(formMessage, "Erro: Você não tem permissão para adicionar novos dados.", false);
            return;
        }

        const newRecord = {
            nome_contrato: document.getElementById('contractNameRN').value,
            status: document.getElementById('contractStatusRN').value,
            analista_responsavel: document.getElementById('analystNameRN').value,
            // Incluir aqui outros campos NOT NULL necessários na sua tabela 'rn_contratos'
        };

        const { error } = await supabaseClient
            .from(TARGET_TABLE_NAME)
            .insert([newRecord]);

        if (error) {
            displayMessage(formMessage, `Erro ao salvar: ${error.message}`, false);
            console.error("Supabase Error (INSERT):", error);
        } else {
            displayMessage(formMessage, 'Contrato RN salvo com sucesso!', true);
            if (addRNForm) addRNForm.reset();
            if (addRNModal) addRNModal.style.display = 'none';
            loadRNRecords();
        }
    });
}

function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    const executeSearch = () => {
        const searchTerm = searchInput ? searchInput.value.trim() : '';
        loadRNRecords(searchTerm);
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