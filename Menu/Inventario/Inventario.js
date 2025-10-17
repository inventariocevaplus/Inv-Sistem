// =========================================================================
// Inventario.js (Rotina: Clause) - CÓDIGO FINAL E COMPLETO
// Tabela Principal: 'contratos'
// Tabela Mensal: 'inventory_details'
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (MANTIDAS)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🚨 TABELA PRINCIPAL (LISTA DE CONTRATOS)
const TARGET_TABLE_NAME = 'contratos';
// 🚨 TABELA PARA DADOS MENSAIS (inventory_details)
const MONTHLY_DATA_TABLE = 'inventory_details';


let userPermissions = {};
let contractToDeleteId = null;

// =======================================================
// REFERÊNCIAS DO DOM
// =======================================================

const contractsListDiv = document.getElementById('contractsList');
const loadingMessage = document.getElementById('loadingMessage');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const addContractBtn = document.getElementById('addContractBtn');
const clauseContainer = document.getElementById('clauseContainer');
const defaultMessage = document.getElementById('defaultMessage');
const addContractForm = document.getElementById('addContractForm');
const formMessage = document.getElementById('formMessage');

// REFERÊNCIAS DO MODAL MENSAL
const monthlyDataModal = document.getElementById('monthlyDataModal');
const monthlyDataForm = document.getElementById('monthlyDataForm');
const mesReferenciaInput = document.getElementById('mesReferencia');
const searchMonthlyDataBtn = document.getElementById('searchMonthlyDataBtn');
const monthlyContractNameInput = document.getElementById('monthlyContractName');
const dataRecordIdInput = document.getElementById('dataRecordId');
const contractIdInput = document.getElementById('contractIdInput');
const monthlyDataFieldsDiv = document.getElementById('monthlyDataFields');
const monthlyFormMessage = document.getElementById('monthlyFormMessage');
const cancelMonthlyBtn = document.getElementById('cancelMonthlyBtn'); // Novo botão Voltar

// CAMPOS DE DADOS DE INVENTÁRIO (BASEADO NO SEU SQL)
const partNumbersInStockInput = document.getElementById('partNumbersInStock');
const piecesInStockInput = document.getElementById('piecesInStock');
const stockValueInput = document.getElementById('stockValue');
const partNumbersCountedInput = document.getElementById('partNumbersCounted');
const partNumbersCorrectInput = document.getElementById('partNumbersCorrect');
const countedValueInput = document.getElementById('countedValue');
const positiveValueInput = document.getElementById('positiveValue');
const negativeValueInput = document.getElementById('negativeValue');
const grossVariationValueInput = document.getElementById('grossVariationValue');
const netVariationValueInput = document.getElementById('netVariationValue');
const netPercentInput = document.getElementById('netPercent');
const grossPercentInput = document.getElementById('grossPercent');
const targetNetInput = document.getElementById('targetNet');
const accuracyItemInput = document.getElementById('accuracyItem');
const accuracyPecasInput = document.getElementById('accuracyPecas');
const accuracyLocacaoInput = document.getElementById('accuracyLocacao');


// =======================================================
// LÓGICA DE PERMISSÕES
// =======================================================

function loadUserPermissions() {
    const userDataJSON = localStorage.getItem('user_session_data');
    let permissions = { role: 'GUEST', can_consult: false, access_clause: false };
    if (userDataJSON) {
        try { permissions = JSON.parse(userDataJSON); } catch (e) { console.error("Erro ao analisar dados da sessão JSON.", e); }
    }
    return permissions;
}

function hasPermission(key) {
    if (userPermissions.role && userPermissions.role.toUpperCase() === 'MASTER') return true;
    const permValue = userPermissions[key];
    return permValue === true || permValue === 't';
}

function checkAndDisplayNavigation() {
    if (!hasPermission('access_clause')) { const btn = document.getElementById('btnClause'); if (btn) btn.style.display = 'none'; }
    if (!hasPermission('access_ciclico')) { const btn = document.getElementById('btnCiclico'); if (btn) btn.style.display = 'none'; }
    if (!hasPermission('access_rn')) { const btn = document.getElementById('btnRN'); if (btn) btn.style.display = 'none'; }
}

function displayMessage(element, message, isSuccess) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 3000);
}


// =======================================================
// LÓGICA DE DADOS MENSAIS (Abrir/Buscar/Salvar)
// =======================================================

// Função auxiliar para converter MM/AAAA para YYYY-MM-01 (formato DATE)
function formatMonthYearToDate(mesAno) {
    const parts = mesAno.split('/');
    if (parts.length === 2) {
        // Retorna YYYY-MM-01, que é o formato DATE que o Supabase aceita
        return `${parts[1]}-${parts[0]}-01`;
    }
    return null;
}


function openMonthlyDataModal(contractName, contractId) {
    if (!monthlyDataModal) return;

    // Limpa e inicializa os campos de controle
    monthlyDataForm.reset();
    monthlyContractNameInput.value = contractName;
    contractIdInput.value = contractId; // Salva o ID do contrato principal (contract_id)
    dataRecordIdInput.value = ''; // Limpa o ID da linha de dados mensais

    // Esconde os campos de dados até que o mês seja pesquisado
    monthlyDataFieldsDiv.style.display = 'none';
    monthlyFormMessage.style.display = 'none';
    mesReferenciaInput.disabled = false;
    searchMonthlyDataBtn.style.display = 'inline-block';
    document.getElementById('monthlyModalTitle').textContent = `Dados Mensais: ${contractName}`;

    // Define os valores padrão (0 ou 0.00)
    [
        partNumbersInStockInput, piecesInStockInput, partNumbersCountedInput,
        partNumbersCorrectInput, targetNetInput, accuracyItemInput,
        accuracyPecasInput, accuracyLocacaoInput
    ].forEach(input => { if (input) input.value = 0; });

    [
        stockValueInput, countedValueInput, positiveValueInput,
        negativeValueInput, grossVariationValueInput, netVariationValueInput,
        netPercentInput, grossPercentInput
    ].forEach(input => { if (input) input.value = '0.00'; });

    monthlyDataModal.style.display = 'block';
}

async function searchAndLoadMonthlyData() {
    const contractId = contractIdInput.value;
    const contractName = monthlyContractNameInput.value;
    const mesReferencia = mesReferenciaInput.value.trim();

    if (!mesReferencia || !/^\d{2}\/\d{4}$/.test(mesReferencia)) {
        displayMessage(monthlyFormMessage, 'Formato do Mês/Ano inválido (MM/AAAA).', false);
        return;
    }

    const referenceDate = formatMonthYearToDate(mesReferencia);
    if (!referenceDate) return;

    monthlyFormMessage.style.display = 'none';

    // 1. Pesquisa na tabela de dados mensais
    const { data: monthlyData, error } = await supabaseClient
        .from(MONTHLY_DATA_TABLE)
        .select('*')
        // Usa o contract_id do contrato principal e a data formatada
        .eq('contract_id', contractId)
        .eq('reference_month', referenceDate)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found"
        displayMessage(monthlyFormMessage, `Erro ao buscar dados mensais: ${error.message}`, false);
        return;
    }

    // 2. Carrega ou Inicializa os campos
    monthlyDataFieldsDiv.style.display = 'block';
    mesReferenciaInput.disabled = true;
    searchMonthlyDataBtn.style.display = 'none';

    if (monthlyData) {
        // Dados encontrados: Modo EDIÇÃO
        document.getElementById('monthlyModalTitle').textContent = `Editar Dados: ${contractName} (${mesReferencia})`;
        dataRecordIdInput.value = monthlyData.id;

        // Preenche os campos com os dados existentes
        partNumbersInStockInput.value = monthlyData.part_numbers_in_stock || 0;
        piecesInStockInput.value = monthlyData.pieces_in_stock || 0;
        stockValueInput.value = monthlyData.stock_value || '0.00';
        partNumbersCountedInput.value = monthlyData.part_numbers_counted || 0;
        partNumbersCorrectInput.value = monthlyData.part_numbers_correct || 0;
        countedValueInput.value = monthlyData.counted_value || '0.00';
        positiveValueInput.value = monthlyData.positive_value || '0.00';
        negativeValueInput.value = monthlyData.negative_value || '0.00';
        grossVariationValueInput.value = monthlyData.gross_variation_value || '0.00';
        netVariationValueInput.value = monthlyData.net_variation_value || '0.00';
        netPercentInput.value = monthlyData.net_percent || '0.00';
        grossPercentInput.value = monthlyData.gross_percent || '0.00';
        targetNetInput.value = monthlyData.target_net || '0.00';
        accuracyItemInput.value = monthlyData.accuracy_item || '0.00';
        accuracyPecasInput.value = monthlyData.accuracy_pecas || '0.00';
        accuracyLocacaoInput.value = monthlyData.accuracy_locacao || '0.00';

        displayMessage(monthlyFormMessage, 'Dados existentes carregados. Modo Edição.', true);
    } else {
        // Dados NÃO encontrados: Modo INSERÇÃO (Campos já estão em 0/0.00)
        document.getElementById('monthlyModalTitle').textContent = `Inserir Novos Dados: ${contractName} (${mesReferencia})`;
        dataRecordIdInput.value = '';
        displayMessage(monthlyFormMessage, 'Nenhum dado encontrado para este mês. Modo Inserção.', true);
    }
}

async function saveMonthlyData(e) {
    e.preventDefault();

    if (!hasPermission('can_send_data') && !hasPermission('can_edit_data')) {
        displayMessage(monthlyFormMessage, "Erro: Você não tem permissão para salvar dados mensais.", false);
        return;
    }

    const recordId = dataRecordIdInput.value;
    const contractId = contractIdInput.value;
    const mesReferencia = mesReferenciaInput.value;

    const dataToSave = {
        contract_id: contractId,
        reference_month: formatMonthYearToDate(mesReferencia),

        // Converte os valores para o tipo correto (Int ou Float)
        part_numbers_in_stock: parseInt(partNumbersInStockInput.value) || 0,
        pieces_in_stock: parseInt(piecesInStockInput.value) || 0,
        stock_value: parseFloat(stockValueInput.value) || 0.00,
        part_numbers_counted: parseInt(partNumbersCountedInput.value) || 0,
        part_numbers_correct: parseInt(partNumbersCorrectInput.value) || 0,
        counted_value: parseFloat(countedValueInput.value) || 0.00,
        positive_value: parseFloat(positiveValueInput.value) || 0.00,
        negative_value: parseFloat(negativeValueInput.value) || 0.00,
        gross_variation_value: parseFloat(grossVariationValueInput.value) || 0.00,
        net_variation_value: parseFloat(netVariationValueInput.value) || 0.00,
        net_percent: parseFloat(netPercentInput.value) || 0.00,
        gross_percent: parseFloat(grossPercentInput.value) || 0.00,
        target_net: parseFloat(targetNetInput.value) || 0.00,
        accuracy_item: parseFloat(accuracyItemInput.value) || 0.00,
        accuracy_pecas: parseFloat(accuracyPecasInput.value) || 0.00,
        accuracy_locacao: parseFloat(accuracyLocacaoInput.value) || 0.00,
    };

    let error = null;

    if (recordId) {
        // UPDATE (Editar)
        const { error: updateError } = await supabaseClient
            .from(MONTHLY_DATA_TABLE)
            .update(dataToSave)
            .eq('id', recordId);
        error = updateError;
    } else {
        // INSERT (Novo Registro)
        const { error: insertError } = await supabaseClient
            .from(MONTHLY_DATA_TABLE)
            .insert([dataToSave]);
        error = insertError;
    }

    if (error) {
        displayMessage(monthlyFormMessage, `Falha ao salvar dados: ${error.message}`, false);
        console.error('Supabase Save Error:', error);
    } else {
        displayMessage(monthlyFormMessage, 'Dados mensais salvos com sucesso!', true);

        // Fecha o modal após o salvamento
        setTimeout(() => {
            monthlyDataModal.style.display = 'none';
        }, 1000);
    }
}


// =======================================================
// LÓGICA DA LISTA PRINCIPAL (LOAD/CREATE/DELETE)
// =======================================================

async function loadClauseContracts(searchTerm = '') {
    if (!hasPermission('can_consult')) { contractsListDiv.innerHTML = `<p style="color:red;">Você não tem permissão para consultar dados.</p>`; return; }
    loadingMessage.textContent = 'Carregando contratos...';
    let query = supabaseClient.from(TARGET_TABLE_NAME).select('*');
    if (searchTerm) {
        query = query.or(`nome_contrato.ilike.%${searchTerm}%,analista_responsavel.ilike.%${searchTerm}%`);
    }

    let { data: contracts, error } = await query;
    if (error) { contractsListDiv.innerHTML = `<p style="color:red;">Erro ao carregar contratos: ${error.message}</p>`; return; }

    if (contractsListDiv) contractsListDiv.innerHTML = '';
    if (contracts && contracts.length > 0) {
        contracts.forEach(contract => contractsListDiv.appendChild(createContractCard(contract)));
    } else {
        if (contractsListDiv) contractsListDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum contrato encontrado. Adicione um novo!</p>';
    }
    if (addContractBtn) addContractBtn.style.display = hasPermission('can_send_data') ? 'block' : 'none';
}

function createContractCard(contract) {
    const card = document.createElement('div');
    card.className = 'contract-card';
    card.setAttribute('data-id', contract.id);
    card.setAttribute('data-name', contract.nome_contrato);

    const statusClass = contract.status || 'INATIVO';
    const deleteButtonHTML = hasPermission('can_delete_data') ? `<button class="delete-btn" title="Excluir Contrato"><i class="fas fa-times"></i></button>` : '';
    const isClickable = hasPermission('can_edit_data') || hasPermission('can_consult');
    card.classList.toggle('clickable', isClickable);

    card.innerHTML = `<div class="status-bar ${statusClass}"></div><div class="contract-name">${contract.nome_contrato || 'Sem Nome'}</div><div class="contract-analyst">Analista: ${contract.analista_responsavel || 'N/A'}</div>${deleteButtonHTML}`;

    if (hasPermission('can_delete_data')) {
        const deleteBtn = card.querySelector('.delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                contractToDeleteId = contract.id;
                if (deleteConfirmModal) deleteConfirmModal.style.display = 'block';
            });
        }
    }

    if (isClickable) {
        card.addEventListener('click', () => {
            if (hasPermission('can_send_data') || hasPermission('can_edit_data')) {
                // Ação principal: Abrir o modal de dados mensais
                openMonthlyDataModal(contract.nome_contrato, contract.id);
            } else {
                alert(`Visualizar detalhes do contrato: ${contract.nome_contrato || 'Desconhecido'}`);
            }
        });
    }

    return card;
}

async function deleteContract() {
    if (!hasPermission('can_delete_data')) { alert("Erro: Você não tem permissão para deletar dados."); if (deleteConfirmModal) deleteConfirmModal.style.display = 'none'; return; }
    if (!contractToDeleteId) return;

    // 1. Deleta os dados mensais associados (usando o contract_id)
    const { error: monthlyError } = await supabaseClient.from(MONTHLY_DATA_TABLE).delete().eq('contract_id', contractToDeleteId);
    if (monthlyError) { console.warn("Aviso: Falha ao deletar dados mensais, mas prosseguindo com o contrato principal.", monthlyError); }


    const { error } = await supabaseClient.from(TARGET_TABLE_NAME).delete().eq('id', contractToDeleteId);

    if (error) { alert(`Falha ao excluir contrato: ${error.message}`); } else { loadClauseContracts(); console.log(`Contrato ${contractToDeleteId} excluído com sucesso.`); }

    contractToDeleteId = null;
    if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
}

function setupFormSubmit() {
    if (!addContractForm) return;

    addContractForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!hasPermission('can_send_data')) { displayMessage(formMessage, "Erro: Você não tem permissão para adicionar novos dados.", false); return; }

        const newContract = {
            nome_contrato: document.getElementById('contractName').value,
            status: document.getElementById('contractStatus').value,
            analista_responsavel: document.getElementById('analystName').value,
        };

        const { error } = await supabaseClient.from(TARGET_TABLE_NAME).insert([newContract]);

        if (error) {
            displayMessage(formMessage, `Erro ao salvar: ${error.message}`, false);
        } else {
            displayMessage(formMessage, 'Contrato salvo com sucesso!', true);
            addContractForm.reset();
            const addContractModal = document.getElementById('addContractModal');
            if (addContractModal) addContractModal.style.display = 'none';
            loadClauseContracts();
        }
    });
}

function setupAddContractListener() {
    const addContractModal = document.getElementById('addContractModal');
    if (addContractBtn && addContractModal) {
        addContractBtn.addEventListener('click', () => {
             if (hasPermission('can_send_data')) {
                addContractModal.style.display = 'block';
            } else {
                alert("Você não tem permissão para adicionar novos contratos.");
            }
        });
    }
}

function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchBtn) { searchBtn.addEventListener('click', () => loadClauseContracts(searchInput.value.trim())); }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); loadClauseContracts(searchInput.value.trim()); }
        });
    }
}


// =======================================================
// LISTENERS (No fim, para garantir que todas as funções sejam definidas)
// =======================================================

function setupModalListeners() {
    const addContractModal = document.getElementById('addContractModal');

    // Modal de Exclusão
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteContract);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => { contractToDeleteId = null; if (deleteConfirmModal) deleteConfirmModal.style.display = 'none'; });

    // Fecha Modais
    [deleteConfirmModal, addContractModal, monthlyDataModal].forEach(modal => {
        if (modal) {
            modal.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));
            window.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });
        }
    });

    // Listener do botão 'Voltar' no modal Mensal
    if (cancelMonthlyBtn) {
        cancelMonthlyBtn.addEventListener('click', () => {
            if (monthlyDataModal) monthlyDataModal.style.display = 'none';
        });
    }
}

function setupMonthlyFormListeners() {
    if (searchMonthlyDataBtn) searchMonthlyDataBtn.addEventListener('click', searchAndLoadMonthlyData);
    if (monthlyDataForm) {
        monthlyDataForm.addEventListener('submit', saveMonthlyData);
        if (mesReferenciaInput) {
            mesReferenciaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); searchAndLoadMonthlyData(); }
            });
        }
    }
}


// =======================================================
// INICIALIZAÇÃO (PONTO DE ENTRADA)
// =======================================================

document.addEventListener('DOMContentLoaded', async () => {
    userPermissions = loadUserPermissions();
    const hasAnyAccess = userPermissions.access_clause || userPermissions.access_ciclico || userPermissions.access_rn || userPermissions.access_permissions;

    if (!hasAnyAccess) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.innerHTML = `<h1 style="color:red; margin-top: 50px; text-align: center;">Acesso Negado.</h1>`;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
        return;
    }

    checkAndDisplayNavigation();

    if (hasPermission('access_clause')) {
        if (defaultMessage) defaultMessage.style.display = 'none';
        if (clauseContainer) clauseContainer.style.display = 'block';
        loadClauseContracts();
    } else {
        if (defaultMessage) defaultMessage.style.display = 'block';
        if (clauseContainer) clauseContainer.style.display = 'none';
        if (defaultMessage) defaultMessage.innerHTML = `<h1>Menu de Inventário</h1><p style="color:red;">Você não tem permissão para acessar Contratos (Clause).</p>`;
    }

    // Chamadas de setup (agora que todas as funções estão definidas)
    setupModalListeners();
    setupFormSubmit();
    setupAddContractListener();
    setupSearchListener();
    setupMonthlyFormListeners();
});