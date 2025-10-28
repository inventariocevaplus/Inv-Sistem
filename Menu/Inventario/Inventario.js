// =========================================================================
// Inventario.js (Rotina: Clause) - CÓDIGO FINAL E COMPLETO
// 🚀 AJUSTES:
// 1. CORREÇÃO DE REFERÊNCIAS DE DOM (Usando getElement) para resolver erros de 'null'.
// 2. CORREÇÃO DA LÓGICA DE CÁLCULO e I/O (Input/Output) para lidar corretamente
//    com VÍRGULA (,) na interface (leitura) e PONTO (.) para cálculos e Supabase (escrita).
// 3. Funções de cálculo de acurácia (Net/Gross) mantidas.
// 4. CORREÇÃO DO ERRO 406: Uso de .filter() na busca por reference_month.
// 5. CORREÇÃO PREVENTIVA DE SINTAXE: O HTML do card foi colocado em uma única linha para
//    evitar o erro 'Invalid or unexpected token' em ambientes hostis.
// 6. NOVO AJUSTE: O campo Accuracy Locação (%) agora é EDITÁVEL (INPUT). Sua fórmula foi movida para Accuracy Item (%) (OUTPUT).
// 7. CORREÇÃO DE SYNTAX ERROR: Garantia de sintaxe perfeita nas declarações de constantes.
// 8. REFORÇO: Accuracy Peças (%) e Target NET (%) também adicionados aos listeners como campos editáveis (INPUT).
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (MANTIDAS)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
// Acesso ao token de sessão (se existir) para autenticação
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

// 🚨 TABELA PRINCIPAL (LISTA DE CONTRATOS)
const TARGET_TABLE_NAME = 'contratos';
// 🚨 TABELA PARA DADOS MENSAIS (inventory_details)
const MONTHLY_DATA_TABLE = 'inventory_details';


let userPermissions = {};
let contractToDeleteId = null;
// =======================================================
// REFERÊNCIAS DO DOM (REFORÇADAS E CORRIGIDAS)
// =======================================================

// FUNÇÃO AUXILIAR PARA LIDAR COM ERROS DE REFERÊNCIA NULA NO DOM
const getElement = (id) => {
    const element = document.getElementById(id);
    if (!element) {
        // Loga um aviso, mas não para a execução (retorna null para ser tratado no código)
        console.warn(`Aviso de DOM: Elemento com ID "${id}" não encontrado. Isso pode causar problemas de cálculo/salvamento.`);
    }
    return element;
};

const contractsListDiv = getElement('contractsList');
const loadingMessage = getElement('loadingMessage');
const deleteConfirmModal = getElement('deleteConfirmModal');
const confirmDeleteBtn = getElement('confirmDeleteBtn');
const cancelDeleteBtn = getElement('cancelDeleteBtn');
const addContractBtn = getElement('addContractBtn');
const clauseContainer = getElement('clauseContainer');
const defaultMessage = getElement('defaultMessage');
const addContractForm = getElement('addContractForm');
const formMessage = getElement('formMessage');

// REFERÊNCIAS DO MODAL MENSAL
const monthlyDataModal = getElement('monthlyDataModal');
const monthlyDataForm = getElement('monthlyDataForm');
const mesReferenciaInput = getElement('mesReferencia');
const searchMonthlyDataBtn = getElement('searchMonthlyDataBtn');
const monthlyContractNameInput = getElement('monthlyContractName');
const dataRecordIdInput = getElement('dataRecordId');
const contractIdInput = getElement('contractIdInput');
const monthlyDataFieldsDiv = getElement('monthlyDataFields');
const monthlyFormMessage = getElement('monthlyFormMessage');
const cancelMonthlyBtn = getElement('cancelMonthlyBtn');

// REFERÊNCIAS DO NOVO MODAL DE EDIÇÃO RÁPIDA
const editStatusModal = getElement('editStatusModal');
const editStatusForm = getElement('editStatusForm');
const editContractIdInput = getElement('editContractIdInput');
const editContractNameInput = getElement('editContractNameInput');
const currentContractName = getElement('currentContractName');
const currentStatusDisplay = getElement('currentStatusDisplay');
const newContractStatus = getElement('newContractStatus');
const cancelEditBtn = getElement('cancelEditBtn');
const editStatusFormMessage = getElement('editStatusFormMessage');


// CAMPOS DE DADOS DE INVENTÁRIO (USANDO OS IDs DO SEU HTML)
const partNumbersInStockInput = getElement('partNumbersInStock');
const piecesInStockInput = getElement('piecesInStock');
const stockValueInput = getElement('stockValue');
const cycleCountInput = getElement('cycleCount');
const partNumbersCorrectInput = getElement('partNumbersCorrect');
const partNumbersCountedInput = getElement('partNumbersCounted');
const countedValueInput = getElement('countedValue');
const positiveValueInput = getElement('positiveValue');
const negativeValueInput = getElement('negativeValue');
const grossVariationValueInput = getElement('grossVariationValue');
const netVariationValueInput = getElement('netVariationValue');
const netPercentInput = getElement('net');
const grossPercentInput = getElement('gross');
const targetNetInput = getElement('targetNet');
const accuracyItemInput = getElement('accuracyItem');
const accuracyPecasInput = getElement('accuracyPecas');
const accuracyLocacaoInput = getElement('accuracyLocacao');


// =======================================================
// FUNÇÕES AUXILIARES DE CÁLCULO E FORMATAÇÃO
// =======================================================

function formatToTwoDecimals(value) {
    // Garante que o valor seja um número, arredonda e retorna formatado com 2 casas com PONTO decimal
    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num)) return '0.00';
    return (Math.round(num * 100) / 100).toFixed(2);
}

// Converte valores de input (ex: "10,50") para Float (ex: 10.50)
const parseInputFloat = (inputElement) => {
    if (!inputElement) return 0.00;
    // Tenta trocar a vírgula por ponto (o que é o padrão de input no Brasil)
    const value = inputElement.value ?
    inputElement.value.replace(',', '.') : '0';
    return parseFloat(value) || 0.00;
};

// Converte valores de input (ex: "100") para Int (ex: 100)
const parseInputInt = (inputElement) => {
    if (!inputElement) return 0;
    return parseInt(inputElement.value) || 0;
};


// =======================================================
// LÓGICA DE CÁLCULO AUTOMÁTICO (FUNÇÃO AJUSTADA)
// =======================================================

function calculateInventoryMetrics() {
    // Variáveis de entrada (R$)
    const positiveValue = parseInputFloat(positiveValueInput);
    const negativeValue = parseInputFloat(negativeValueInput);
    const countedValue = parseInputFloat(countedValueInput);

    // Variáveis de ENTRADA (Lidos como INPUT para salvamento, mas não usados para calcular os campos abaixo)
    const accuracyLocacao = parseInputFloat(accuracyLocacaoInput);
    const accuracyPecas = parseInputFloat(accuracyPecasInput);
    const targetNet = parseInputFloat(targetNetInput);

    // Variáveis de entrada (inteiros)
    const partNumbersCorrect = parseInputInt(partNumbersCorrectInput);
    const partNumbersCounted = parseInputInt(partNumbersCountedInput);
    const cycleCount = parseInputInt(cycleCountInput);


    let grossVariationValue = 0;
    let netVariationValue = 0;
    let netPercent = 0;
    let grossPercent = 0;
    let accuracyItem = 0; // MODIFICADO: Campo CALCULADO

    // 1. Gross Variation Value
    grossVariationValue = positiveValue + negativeValue;
    // 2. Net Variation Value
    netVariationValue = positiveValue - negativeValue;
    // 3. NET (%) (ACURÁCIA)
    if (countedValue > 0) {
        const absoluteNetVariation = Math.abs(netVariationValue);
        netPercent = (1 - (absoluteNetVariation / countedValue)) * 100;
        if (netPercent < 0) netPercent = 0;
    } else {
        netPercent = 100.00;
    }

    // 4. Gross (%) (ACURÁCIA)
    if (countedValue > 0) {
        const absoluteGrossVariation = Math.abs(grossVariationValue);
        grossPercent = (1 - (absoluteGrossVariation / countedValue)) * 100;
        if (grossPercent < 0) grossPercent = 0;
    } else {
        grossPercent = 100.00;
    }

    // 5. Accuracy Item (%) = (Part Numbers Correct / Locações Contadas) * 100
    if (partNumbersCounted > 0) {
        accuracyItem = (partNumbersCorrect / partNumbersCounted) * 100;
        if (accuracyItem > 100) accuracyItem = 100;
    } else {
        accuracyItem = 100.00;
    }


    // 6. Atualiza os campos de saída com 2 casas decimais e VÍRGULA para exibição
    const formatValue = (val) => formatToTwoDecimals(val).replace('.', ',');
    if (grossVariationValueInput) grossVariationValueInput.value = formatValue(grossVariationValue);
    if (netVariationValueInput) netVariationValueInput.value = formatValue(netVariationValue);
    if (netPercentInput) netPercentInput.value = formatValue(netPercent);
    if (grossPercentInput) grossPercentInput.value = formatValue(grossPercent);
    // Atualiza o campo CALCULADO (accuracyItemInput)
    if (accuracyItemInput) accuracyItemInput.value = formatValue(accuracyItem);
}


// =======================================================
// LÓGICA DE PERMISSÕES
// =======================================================

function loadUserPermissions() {
    const userDataJSON = localStorage.getItem('user_session_data');
    let permissions = { role: 'GUEST', can_consult: false, access_clause: false };
    if (userDataJSON) {
        try {
            permissions = JSON.parse(userDataJSON);
            // Garante que o token é lido
            if (permissions.token) {
                accessToken = permissions.token;
            }
        } catch (e) {
            console.error("Erro ao analisar dados da sessão JSON.", e);
        }
    }
    return permissions;
}

function hasPermission(key) {
    if (userPermissions.role && userPermissions.role.toUpperCase() === 'MASTER') return true;
    const permValue = userPermissions[key];
    return permValue === true || permValue === 't';
}

function checkAndDisplayNavigation() {
    // Usando getElement com verificação de null
    const btnClause = getElement('btnClause');
    const btnCiclico = getElement('btnCiclico');
    const btnRN = getElement('btnRN');

    if (btnClause && !hasPermission('access_clause')) btnClause.style.display = 'none';
    if (btnCiclico && !hasPermission('access_ciclico')) btnCiclico.style.display = 'none';
    if (btnRN && !hasPermission('access_rn')) btnRN.style.display = 'none';
}

function displayMessage(element, message, isSuccess) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${isSuccess ?
    'success' : 'error'}`;
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
        return `${parts[1]}-${parts[0]}-01`;
    }
    return null;
}


function openMonthlyDataModal(contractName, contractId) {
    if (!monthlyDataModal) return;
    // Limpa e inicializa os campos de controle
    monthlyDataForm.reset();
    if (monthlyContractNameInput) monthlyContractNameInput.value = contractName;
    if (contractIdInput) contractIdInput.value = contractId;
    if (dataRecordIdInput) dataRecordIdInput.value = '';
    // Esconde os campos de dados até que o mês seja pesquisado
    if (monthlyDataFieldsDiv) monthlyDataFieldsDiv.style.display = 'none';
    if (monthlyFormMessage) monthlyFormMessage.style.display = 'none';
    if (mesReferenciaInput) mesReferenciaInput.disabled = false;
    if (searchMonthlyDataBtn) searchMonthlyDataBtn.style.display = 'inline-block';

    const modalTitle = getElement('monthlyModalTitle');
    if (modalTitle) modalTitle.textContent = `Dados Mensais: ${contractName}`;

    // Define os valores padrão (0 ou 0,00)
    [
        partNumbersInStockInput, piecesInStockInput, cycleCountInput,
        partNumbersCorrectInput, accuracyItemInput, partNumbersCountedInput
    ].forEach(input => { if (input) input.value = 0; });
    // Campos R$ e % usam "0,00" para exibição inicial
    [
        stockValueInput, countedValueInput, positiveValueInput,
        negativeValueInput, grossVariationValueInput, netVariationValueInput,
        netPercentInput, grossPercentInput, accuracyLocacaoInput,
        accuracyPecasInput, targetNetInput
    ].forEach(input => { if (input) input.value = '0,00'; });
    calculateInventoryMetrics(); // Inicializa os campos calculados

    monthlyDataModal.style.display = 'block';
}

async function searchAndLoadMonthlyData() {
    const contractId = contractIdInput ? contractIdInput.value : null;
    const contractName = monthlyContractNameInput ?
    monthlyContractNameInput.value : '';
    const mesReferencia = mesReferenciaInput ? mesReferenciaInput.value.trim() : '';
    if (!mesReferencia || !/^\d{2}\/\d{4}$/.test(mesReferencia)) {
        displayMessage(monthlyFormMessage, 'Formato do Mês/Ano inválido (MM/AAAA).', false);
        return;
    }
    if (!contractId) return;

    const referenceDate = formatMonthYearToDate(mesReferencia);
    if (!referenceDate) return;

    if (monthlyFormMessage) monthlyFormMessage.style.display = 'none';
    // 1. Pesquisa na tabela de dados mensais
    const { data: monthlyData, error } = await supabaseClient
        .from(MONTHLY_DATA_TABLE)
        .select('*')
        .eq('contract_id', contractId)
        .filter('reference_month', 'eq', referenceDate) // 💥 CORREÇÃO PARA O ERRO 406
        .single();
    if (error && error.code !== 'PGRST116') { // PGRST116 é "No rows found"
        displayMessage(monthlyFormMessage, `Erro ao buscar dados mensais: ${error.message}. Verifique as políticas de RLS (Row Level Security) de SELECT na tabela 'inventory_details'.`, false);
        return;
    }

    // 2. Carrega ou Inicializa os campos
    if (monthlyDataFieldsDiv) monthlyDataFieldsDiv.style.display = 'block';
    if (mesReferenciaInput) mesReferenciaInput.disabled = true;
    if (searchMonthlyDataBtn) searchMonthlyDataBtn.style.display = 'none';

    const modalTitle = getElement('monthlyModalTitle');
    if (monthlyData) {
        // Dados encontrados: Modo EDIÇÃO
        if (modalTitle) modalTitle.textContent = `Editar Dados: ${contractName} (${mesReferencia})`;
        if (dataRecordIdInput) dataRecordIdInput.value = monthlyData.id;

        // Preenche os campos de INPUT (Conversão de PONTO para VÍRGULA para exibição)
        if (partNumbersInStockInput) partNumbersInStockInput.value = monthlyData.part_numbers_in_stock ||
        0;
        if (piecesInStockInput) piecesInStockInput.value = monthlyData.pieces_in_stock || 0;
        if (cycleCountInput) cycleCountInput.value = monthlyData.cycle_count || 0;
        if (partNumbersCorrectInput) partNumbersCorrectInput.value = monthlyData.part_numbers_correct || 0;
        if (partNumbersCountedInput) partNumbersCountedInput.value = monthlyData.part_numbers_counted || 0;
        // Campos R$ e % (Float)
        const formatFloatForDisplay = (val) => formatToTwoDecimals(val).replace('.', ',');
        if (stockValueInput) stockValueInput.value = formatFloatForDisplay(monthlyData.stock_value);
        if (countedValueInput) countedValueInput.value = formatFloatForDisplay(monthlyData.counted_value);
        if (positiveValueInput) positiveValueInput.value = formatFloatForDisplay(monthlyData.positive_value);
        if (negativeValueInput) negativeValueInput.value = formatFloatForDisplay(monthlyData.negative_value);
        // Campos calculados (R$ e %)
        if (grossVariationValueInput) grossVariationValueInput.value = formatFloatForDisplay(monthlyData.gross_variation_value);
        if (netVariationValueInput) netVariationValueInput.value = formatFloatForDisplay(monthlyData.net_variation_value);
        if (netPercentInput) netPercentInput.value = formatFloatForDisplay(monthlyData.net_percent);
        if (grossPercentInput) grossPercentInput.value = formatFloatForDisplay(monthlyData.gross_percent);

        // CAMPOS EDITÁVEIS (INPUTS)
        if (accuracyLocacaoInput) accuracyLocacaoInput.value = formatFloatForDisplay(monthlyData.accuracy_locacao);
        if (accuracyPecasInput) accuracyPecasInput.value = formatFloatForDisplay(monthlyData.accuracy_pecas);
        if (targetNetInput) targetNetInput.value = formatFloatForDisplay(monthlyData.target_net);

        // Campo CALCULADO (OUTPUT)
        if (accuracyItemInput) accuracyItemInput.value = formatFloatForDisplay(monthlyData.accuracy_item);


        // Dispara o cálculo para garantir a precisão dos campos derivados (e sobrescrever accuracyItemInput)
        calculateInventoryMetrics();
        displayMessage(monthlyFormMessage, 'Dados existentes carregados. Modo Edição.', true);
    } else {
        // Dados NÃO encontrados: Modo INSERÇÃO
        if (modalTitle) modalTitle.textContent = `Inserir Novos Dados: ${contractName} (${mesReferencia})`;
        if (dataRecordIdInput) dataRecordIdInput.value = '';
        displayMessage(monthlyFormMessage, 'Nenhum dado encontrado para este mês. Modo Inserção.', true);
    }
}

async function saveMonthlyData(e) {
    e.preventDefault();

    if (!hasPermission('can_send_data') && !hasPermission('can_edit_data')) {
        displayMessage(monthlyFormMessage, "Erro: Você não tem permissão para salvar dados mensais.", false);
        return;
    }

    // Antes de salvar, garantimos que o cálculo foi executado para ter os valores finais
    calculateInventoryMetrics();
    const recordId = dataRecordIdInput ? dataRecordIdInput.value : null;
    const contractId = contractIdInput ? contractIdInput.value : null;
    const mesReferencia = mesReferenciaInput ? mesReferenciaInput.value : null;

    if (!contractId || !mesReferencia) {
        displayMessage(monthlyFormMessage, "Erro: ID do Contrato ou Mês de Referência faltando.", false);
        return;
    }

    // Mapeamento dos dados para o Supabase (usando PONTO decimal e snake_case)
    const dataToSave = {
        contract_id: contractId,
        reference_month: formatMonthYearToDate(mesReferencia),

        // Campos de Contagem e Valor R$ (Int e Float com PONTO)
        part_numbers_in_stock: parseInputInt(partNumbersInStockInput),
        pieces_in_stock: parseInputInt(piecesInStockInput),
        stock_value: parseInputFloat(stockValueInput),
        cycle_count: parseInputInt(cycleCountInput),


        part_numbers_correct: parseInputInt(partNumbersCorrectInput),
        part_numbers_counted: parseInputInt(partNumbersCountedInput), // Novo campo
        counted_value: parseInputFloat(countedValueInput),
        positive_value: parseInputFloat(positiveValueInput),
        negative_value: parseInputFloat(negativeValueInput),

        // Campos Calculados (R$ e %) - Já lidos como PONTO decimal pela função parseInputFloat
        gross_variation_value: parseInputFloat(grossVariationValueInput),
        net_variation_value: parseInputFloat(netVariationValueInput),
        net_percent: parseInputFloat(netPercentInput),


        gross_percent: parseInputFloat(grossPercentInput),
        // CAMPOS EDITÁVEIS (INPUTS)
        accuracy_locacao: parseInputFloat(accuracyLocacaoInput),
        accuracy_pecas: parseInputFloat(accuracyPecasInput),
        target_net: parseInputFloat(targetNetInput),

        // Campo CALCULADO (OUTPUT)
        accuracy_item: parseInputFloat(accuracyItemInput),
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
        displayMessage(monthlyFormMessage, `Falha ao salvar dados: ${error.message}. Verifique as políticas de RLS (Row Level Security) de INSERT/UPDATE na tabela 'inventory_details'.`, false);
        console.error('Supabase Save Error:', error);
    } else {
        displayMessage(monthlyFormMessage, 'Dados mensais salvos com sucesso!', true);
        // Fecha o modal após o salvamento
        setTimeout(() => {
            if (monthlyDataModal) monthlyDataModal.style.display = 'none';
        }, 1000);
    }
}


// =======================================================
// LÓGICA DE EDIÇÃO RÁPIDA DE STATUS (AGORA COM MODAL)
// =======================================================

function openEditStatusModal(contractId, contractName, currentStatus) {
    if (!hasPermission('can_edit_data')) {
        alert("Erro: Você não tem permissão para editar dados.");
        return;
    }

    // Preenche os campos do modal
    if (editContractIdInput) editContractIdInput.value = contractId;
    if (editContractNameInput) editContractNameInput.value = contractName;
    if (currentContractName) currentContractName.textContent = contractName;
    if (currentStatusDisplay) currentStatusDisplay.textContent = currentStatus;
    if (newContractStatus) newContractStatus.value = currentStatus;
    if (editStatusFormMessage) editStatusFormMessage.style.display = 'none';
    if (editStatusModal) editStatusModal.style.display = 'block';
}

async function saveEditStatus(e) {
    e.preventDefault();
    const contractId = editContractIdInput ? editContractIdInput.value : null;
    const contractName = editContractNameInput ? editContractNameInput.value : '';
    const newStatus = newContractStatus ? newContractStatus.value : '';

    if (!contractId || !newStatus) {
        displayMessage(editStatusFormMessage, "Erro: Contrato ou status inválido.", false);
        return;
    }

    // Tenta atualizar no Supabase
    const { error } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .update({ status: newStatus })
        .eq('id', contractId);
    if (error) {
        displayMessage(editStatusFormMessage, `Falha ao atualizar o status: ${error.message}`, false);
        console.error('Supabase Update Error:', error);
    } else {
        displayMessage(editStatusFormMessage, `Status de "${contractName}" atualizado para ${newStatus}!`, true);
        // Recarrega a lista e fecha o modal
        loadClauseContracts();
        setTimeout(() => {
            if (editStatusModal) editStatusModal.style.display = 'none';
        }, 1000);
    }
}


// =======================================================
// LÓGICA DA LISTA PRINCIPAL (LOAD/CREATE/DELETE)
// =======================================================

async function loadClauseContracts(searchTerm = '') {
    if (!hasPermission('can_consult')) {
        if (contractsListDiv) contractsListDiv.innerHTML = `<p style="color:red;">Você não tem permissão para consultar dados.</p>`;
        return;
    }
    if (loadingMessage) loadingMessage.textContent = 'Carregando contratos...';
    let query = supabaseClient.from(TARGET_TABLE_NAME).select('*');
    if (searchTerm) {
        query = query.or(`nome_contrato.ilike.%${searchTerm}%,analista_responsavel.ilike.%${searchTerm}%`);
    }

    let { data: contracts, error } = await query;
    if (error) {
        if (contractsListDiv) contractsListDiv.innerHTML = `<p style="color:red;">Erro ao carregar contratos: ${error.message}</p>`;
        if (loadingMessage) loadingMessage.textContent = '';
        return;
    }

    if (contractsListDiv) contractsListDiv.innerHTML = '';
    if (contracts && contracts.length > 0) {
        contracts.forEach(contract => contractsListDiv.appendChild(createContractCard(contract)));
    } else {
        if (contractsListDiv) contractsListDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum contrato encontrado.\n Adicione um novo!</p>';
    }

    if (loadingMessage) loadingMessage.textContent = '';
    if (addContractBtn) addContractBtn.style.display = hasPermission('can_send_data') ?
    'block' : 'none';
}

function createContractCard(contract) {
    const card = document.createElement('div');
    card.className = 'contract-card';
    card.setAttribute('data-id', contract.id);
    card.setAttribute('data-name', contract.nome_contrato);
    const statusClass = contract.status || 'INATIVO';

    // Botão de Edição Rápida (Engrenagem)
    const editButtonHTML = hasPermission('can_edit_data') ?
    `<button class="edit-status-btn" title="Editar Status Rápido"><i class="fas fa-cog"></i></button>` : '';

    // Botão de Exclusão
    const deleteButtonHTML = hasPermission('can_delete_data') ?
    `<button class="delete-btn" title="Excluir Contrato"><i class="fas fa-times"></i></button>` : '';

    // Container para os botões no canto superior direito
    const actionsHTML = `<div class="card-actions">${editButtonHTML}${deleteButtonHTML}</div>`;
    const isClickable = hasPermission('can_edit_data') || hasPermission('can_consult');
    card.classList.toggle('clickable', isClickable);

    // Estrutura HTML do Card (AGORA EM UMA ÚNICA LINHA DE TEMPLATE LITERAL)
    card.innerHTML = `<div class="status-bar ${statusClass}"></div><div class="contract-name">${contract.nome_contrato ||
    'Sem Nome'}</div><div class="contract-analyst">Analista: ${contract.analista_responsavel || 'N/A'}</div>${actionsHTML}`;

    // Lógica para o botão de exclusão
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

    // Lógica de clique para o botão de Edição (Engrenagem)
    if (hasPermission('can_edit_data')) {
        const editBtn = card.querySelector('.edit-status-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impede o clique no cartão

            // Pega o status do elemento DOM criado
            const currentStatus = card.querySelector('.status-bar').classList[1] || 'INATIVO';
            openEditStatusModal(contract.id, contract.nome_contrato, currentStatus);
        });
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
    if (!hasPermission('can_delete_data')) {
        alert("Erro: Você não tem permissão para deletar dados.");
        if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
        return;
    }
    if (!contractToDeleteId) return;
    // 1. Deleta os dados mensais associados (usando o contract_id)
    const { error: monthlyError } = await supabaseClient.from(MONTHLY_DATA_TABLE).delete().eq('contract_id', contractToDeleteId);
    if (monthlyError) {
        console.warn("Aviso: Falha ao deletar dados mensais, mas prosseguindo com o contrato principal.", monthlyError);
    }


    const { error } = await supabaseClient.from(TARGET_TABLE_NAME).delete().eq('id', contractToDeleteId);
    if (error) {
        alert(`Falha ao excluir contrato: ${error.message}`);
    } else {
        loadClauseContracts();
        console.log(`Contrato ${contractToDeleteId} excluído com sucesso.`);
    }

    contractToDeleteId = null;
    if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
}

function setupFormSubmit() {
    if (!addContractForm) return;
    addContractForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!hasPermission('can_send_data')) {
            displayMessage(formMessage, "Erro: Você não tem permissão para adicionar novos dados.", false);
            return;
        }

        const contractNameInput = document.getElementById('contractName');
        const contractStatusInput = document.getElementById('contractStatus');

        const analystNameInput = document.getElementById('analystName');

        const newContract = {
            nome_contrato: contractNameInput ? contractNameInput.value : '',

            status: contractStatusInput ? contractStatusInput.value : 'INATIVO',
            analista_responsavel: analystNameInput ? analystNameInput.value : '',
        };

        const { error } = await supabaseClient.from(TARGET_TABLE_NAME).insert([newContract]);

        if (error)
        {
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
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => loadClauseContracts(searchInput.value.trim()));
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadClauseContracts(searchInput.value.trim());
            }
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
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        contractToDeleteId = null;
        if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
    });
    // Fecha Modais (EXCETO monthlyDataModal)
    [deleteConfirmModal, addContractModal, editStatusModal].forEach(modal => {
        if (modal) {
            modal.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));
            // Adiciona listener para fechar ao clicar fora, mas somente nestes modais
            window.addEventListener('click', (event) => {
                if (event.target === modal) modal.style.display
        = 'none';
            });
        }
    });
    // O monthlyDataModal só fecha com o botão interno (X ou Cancelar)
    if (monthlyDataModal) {
        monthlyDataModal.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => monthlyDataModal.style.display = 'none'));
    }


    // Listener do botão 'Voltar' no modal Mensal
    if (cancelMonthlyBtn) {
        cancelMonthlyBtn.addEventListener('click', () => {
            if (monthlyDataModal) monthlyDataModal.style.display = 'none';
        });
    }

    // NOVO: Listener do botão 'Cancelar' no modal de Edição Rápida
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (editStatusModal) editStatusModal.style.display = 'none';
        });
    }
}

function setupMonthlyFormListeners() {
    if (searchMonthlyDataBtn) searchMonthlyDataBtn.addEventListener('click', searchAndLoadMonthlyData);
    if (monthlyDataForm) {
        monthlyDataForm.addEventListener('submit', saveMonthlyData);
        if (mesReferenciaInput) {
            mesReferenciaInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    searchAndLoadMonthlyData();
                }

             });
        }
    }

    // NOVO: Listener do formulário de Edição Rápida
    if (editStatusForm) {
        editStatusForm.addEventListener('submit', saveEditStatus);
    }

    // =======================================================
    // 🚨 LÓGICA DE CÁLCULO AUTOMÁTICO (Event Listeners)
    // =======================================================

    // Campos que disparam o cálculo (Counted Value, Valor Positivo, Valor Negativo, etc.)
    const calculationFields = [
        positiveValueInput,
        negativeValueInput,
        countedValueInput,
        partNumbersCorrectInput,
        cycleCountInput,
        // Adicionando outros campos de valor que podem
        stockValueInput,
        partNumbersInStockInput,
        piecesInStockInput,
        partNumbersCountedInput,

        // CAMPOS AGORA EDITÁVEIS, ADICIONADOS AOS LISTENERS PARA GARANTIR LEITURA E RECÁLCULO
        accuracyLocacaoInput,
        accuracyPecasInput,
        targetNetInput,
    ];
    calculationFields.forEach(input => {
        if (input) {
            // Usa 'input' para capturar mudanças ao digitar, colar ou usar setas
            input.addEventListener('input', calculateInventoryMetrics);
        }
    });
}


// =======================================================
// INICIALIZAÇÃO (PONTO DE ENTRADA)
// =======================================================

document.addEventListener('DOMContentLoaded', async () => {

    // =======================================================
    // LÓGICA DO DROP-DOWN ROTINAS
    // =======================================================
    const rotinasDropdown = document.getElementById('rotinasDropdown');

    if (rotinasDropdown) {
        const dropdownToggle = rotinasDropdown.querySelector('.dropdown-toggle');
        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();


                rotinasDropdown.classList.toggle('open');
                const icon = rotinasDropdown.querySelector('.dropdown-icon');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down');
                    icon.classList.toggle('fa-chevron-up');
                }
            });
        }
    }
    // =======================================================

    userPermissions = loadUserPermissions();
    // Acesso completo ao Supabase já é feito no topo via 'accessToken'
    const hasAnyAccess = userPermissions.access_clause ||
    userPermissions.access_ciclico || userPermissions.access_rn || userPermissions.access_permissions;

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

    // Chamadas de setup
    setupModalListeners();
    setupFormSubmit();
    setupAddContractListener();
    setupSearchListener();
    setupMonthlyFormListeners();
});