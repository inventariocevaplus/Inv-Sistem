// =========================================================================
// RN.js (Rotina: Reserva Normal) - CÓDIGO FINAL E COMPLETO
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (Mantenha as suas credenciais)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const { createClient } = supabase;
const TARGET_TABLE_NAME = 'rn_contratos';

// --- Lógica de Token de Sessão CORRIGIDA ---
const sessionDataJSON = localStorage.getItem('user_session_data');
let jwtToken = null; // Armazenaremos o JWT aqui
let loggedInUserId = null; // 🚨 NOVO: Armazenaremos o user_id (UUID) aqui

if (sessionDataJSON) {
    try {
        const userData = JSON.parse(sessionDataJSON);
        if (userData.token) {
            jwtToken = userData.token; // Pega o JWT da sua sessão
        }
        // 🚨 CRÍTICO: Pega o ID do usuário (UUID) salvo no Login.js
        if (userData.user_id) {
            loggedInUserId = userData.user_id;
        }
    } catch (e) {
        console.error("Erro ao analisar dados da sessão para obter o token.", e);
    }
}

// 🚨 Inicializa o cliente Supabase com o JWT no cabeçalho
const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        global: {
            headers: {
                // Se o JWT estiver presente, use-o para autenticar a requisição
                ...(jwtToken && { Authorization: `Bearer ${jwtToken}` }),
            }
        }
    }
);

let userPermissions = {};
let recordToDeleteId = null;


// =======================================================
// REFERÊNCIAS DO DOM - (MANTIDAS)
// =======================================================
const rotinasDropdown = document.getElementById('rotinasDropdown');
const rnListDiv = document.getElementById('rnList');
const loadingMessage = document.getElementById('loadingMessage');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const addRNBtn = document.getElementById('addRNBtn');
const addRNModal = document.getElementById('addRNModal');
const addRNForm = document.getElementById('addRNForm');
const formMessage = document.getElementById('formMessageRN');

// Referências do Modal de Edição Rápida de Status
const editStatusModalRN = document.getElementById('editStatusModalRN');
const editStatusFormRN = document.getElementById('editStatusFormRN');
const editContractIdInputRN = document.getElementById('editContractIdInputRN');
const editContractNameInputRN = document.getElementById('editContractNameInputRN');
const currentContractNameRN = document.getElementById('currentContractNameRN');
const currentStatusDisplayRN = document.getElementById('currentStatusDisplayRN');
const newContractStatusRN = document.getElementById('newContractStatusRN');
const cancelEditBtnRN = document.getElementById('cancelEditBtnRN');
const editStatusFormMessageRN = document.getElementById('editStatusFormMessageRN');

// =======================================================
// REFERÊNCIAS DO MÓDULO DE DETALHAMENTO RN (OPERACIONAL)
// =======================================================
const RN_MONTHLY_DATA_TABLE = 'rn_details';

const rnMonthlyDataModal = document.getElementById('rnMonthlyDataModal');
const rnMonthlyDataForm = document.getElementById('rnMonthlyDataForm');
const rnMensalContractNameInput = document.getElementById('rnMonthlyContractName');
const rnMensReferenciaInput = document.getElementById('rnMesReferencia');
const rnSearchMonthlyDataBtn = document.getElementById('rnSearchMonthlyDataBtn');
const rnDataRecordIdInput = document.getElementById('rnDataRecordId');
const rnContractIdInput = document.getElementById('rnContractIdInput');
const rnMonthlyDataFieldsDiv = document.getElementById('rnMonthlyDataFields');
const rnMonthlyFormMessage = document.getElementById('rnMonthlyFormMessage');

// CAMPOS DE DADOS RN OPERACIONAL
// ENTRADA
const qtdLinhasInput = document.getElementById('qtdLinhas');
const repickingInput = document.getElementById('repicking');
const nilPickingInput = document.getElementById('nilPicking');
const metaRNInput = document.getElementById('metaRN');

// SAÍDA (CALCULADOS)
const qtdErrosInput = document.getElementById('qtdErros');
const repiPercentInput = document.getElementById('repiPercent');
const nilpiPercentInput = document.getElementById('nilpiPercent');
const errosPercentInput = document.getElementById('errosPercent');
const acuraciaMesInput = document.getElementById('acuraciaMes');


// =======================================================
// LÓGICA DE PERMISSÕES (MANTIDA)
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
    userPermissions = userPermissions || loadUserPermissions();

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
// LÓGICA DE EDIÇÃO RÁPIDA DE STATUS (MANTIDA)
// =======================================================

function openEditStatusModalRN(recordId, recordName, currentStatus) {
    if (!hasPermission('can_edit_data')) {
        alert("Erro: Você não tem permissão para editar dados.");
        return;
    }

    editContractIdInputRN.value = recordId;
    editContractNameInputRN.value = recordName;
    currentContractNameRN.textContent = recordName;
    currentStatusDisplayRN.textContent = currentStatus;

    const statusUpper = currentStatus.toUpperCase();
    if (statusUpper === 'ATIVA' || statusUpper === 'ATIVO') {
        newContractStatusRN.value = 'ATIVO';
    } else {
        newContractStatusRN.value = 'INATIVO';
    }

    editStatusFormMessageRN.style.display = 'none';
    editStatusModalRN.style.display = 'block';
}

async function saveEditStatusRN(e) {
    e.preventDefault();

    const recordId = editContractIdInputRN.value;
    const recordName = editContractNameInputRN.value;
    const newStatus = newContractStatusRN.value;

    if (!recordId || !newStatus) {
        displayMessage(editStatusFormMessageRN, "Erro: Reserva ou status inválido.", false);
        return;
    }

    // Nota: O RLS em 'rn_contratos' deve permitir UPDATE baseado no can_edit_data OU role = MASTER
    const { error } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .update({ status: newStatus })
        .eq('id', recordId);

    if (error) {
        displayMessage(editStatusFormMessageRN, `Falha ao atualizar o status: ${error.message}`, false);
        console.error('Supabase Update Error:', error);
    } else {
        displayMessage(editStatusFormMessageRN, `Status de "${recordName}" atualizado para ${newStatus}!`, true);

        loadRNRecords();
        setTimeout(() => {
            editStatusModalRN.style.display = 'none';
        }, 1000);
    }
}

// =======================================================
// FUNÇÕES AUXILIARES DE CÁLCULO E DATA (MANTIDAS)
// =======================================================

function formatMonthYearToDate(monthYear) {
    const parts = monthYear.split('/');
    if (parts.length === 2) {
        return `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
    }
    return null;
}

// Função para formatar números para duas casas decimais
function formatToTwoDecimals(num) {
    if (isNaN(num) || !isFinite(num)) {
        return '0.00';
    }
    return (Math.round(num * 100) / 100).toFixed(2);
}

// Converte um número percentual (ex: "90.00") para o formato de duas casas
function parsePercentInput(inputElement) {
    // Permite vírgula, trata como ponto, e garante que é um número.
    return parseFloat(inputElement.value.replace(',', '.')) || 0;
}

// Converte um input number (ex: qtdLinhas) para inteiro
function parseInputInt(inputElement) {
    return parseInt(inputElement.value) || 0;
}


// =======================================================
// LÓGICA DE CÁLCULO AUTOMÁTICO (RN OPERACIONAL) (MANTIDA)
// =======================================================

function calculateOperationalMetrics() {
    // Valores numéricos de entrada
    const qtdLinhas = parseInputInt(qtdLinhasInput);
    const repicking = parseInputInt(repickingInput);
    const nilPicking = parseInputInt(nilPickingInput);

    // 1. QTD Erros
    const qtdErros = repicking + nilPicking;

    let repiPercent = 0.00;
    let nilpiPercent = 0.00;
    let errosPercent = 0.00;
    let acuraciaMes = 0.00;

    if (qtdLinhas > 0) {
        // 2. Repi %
        repiPercent = (repicking / qtdLinhas) * 100;

        // 3. NilPi %
        nilpiPercent = (nilPicking / qtdLinhas) * 100;

        // 4. Erros %
        errosPercent = repiPercent + nilpiPercent;

        // 5. Acuracia Mês
        acuraciaMes = 100 - errosPercent;
    } else {
        // Se QTD Linhas for zero, todos os percentuais de erro são 0% e a acurácia é 100%
        errosPercent = 0.00;
        acuraciaMes = 100.00;
    }

    // 6. Atualiza os campos de saída
    qtdErrosInput.value = qtdErros;
    repiPercentInput.value = formatToTwoDecimals(repiPercent);
    nilpiPercentInput.value = formatToTwoDecimals(nilpiPercent);
    errosPercentInput.value = formatToTwoDecimals(errosPercent);
    acuraciaMesInput.value = formatToTwoDecimals(acuraciaMes);
}

// =======================================================
// FUNÇÕES CRUD DE DETALHAMENTO MENSAL RN (CORRIGIDAS)
// =======================================================

function openRNMonthlyDataModal(contractName, contractId) {
    // ... (Mantido o código de inicialização do modal) ...
    if (!rnMonthlyDataModal) return;

    // Reseta e configura o modal
    rnMonthlyDataForm.reset();
    rnContractIdInput.value = contractId; // 🚨 contractId é um UUID aqui
    rnDataRecordIdInput.value = '';

    if (rnMensalContractNameInput) {
        rnMensalContractNameInput.value = contractName;
    }

    // Configura o valor padrão da Meta
    metaRNInput.value = formatToTwoDecimals(0.15);

    // Oculta campos de dados e mostra a busca
    rnMonthlyDataFieldsDiv.style.display = 'none';
    rnMonthlyFormMessage.style.display = 'none';
    rnMensReferenciaInput.disabled = false;
    rnSearchMonthlyDataBtn.style.display = 'inline-block';
    document.getElementById('rnMonthlyModalTitle').textContent = `Dados Mensais: ${contractName}`;

    // Inicializa cálculo para zeros
    calculateOperationalMetrics();

    rnMonthlyDataModal.style.display = 'block';
}

// =======================================================
// FUNÇÃO searchAndLoadRNMonthlyData CORRIGIDA
// =======================================================

async function searchAndLoadRNMonthlyData() {
    // 🚨 ATENÇÃO: Verifique se o contractId é UUID ou INTEGER.
    // Mantido parseInt como no seu código, mas confirme no seu DB.
    const contractId = rnContractIdInput.value;
    const contractIdValue = parseInt(contractId, 10); // OU apenas 'contractId' se for UUID

    const mesReferencia = rnMensReferenciaInput.value.trim();
    const contractName = rnMensalContractNameInput.value;

    if (!mesReferencia || !/^\d{2}\/\d{4}$/.test(mesReferencia)) {
        displayMessage(rnMonthlyFormMessage, 'Formato do Mês/Ano inválido (MM/AAAA).', false);
        return;
    }

    if (isNaN(contractIdValue) || contractIdValue <= 0) {
        displayMessage(rnMonthlyFormMessage, 'Erro: ID de contrato inválido. Recarregue a tela.', false);
        return;
    }

    if (!loggedInUserId) {
        displayMessage(rnMonthlyFormMessage, 'Erro: Usuário não autenticado. Faça login novamente.', false);
        return;
    }

    const referenceDate = formatMonthYearToDate(mesReferencia);
    if (!referenceDate) return;

    rnMonthlyFormMessage.style.display = 'none';

    // 1. Pesquisa USANDO A FUNÇÃO RPC
    // *** CORREÇÃO CRÍTICA: REMOÇÃO DO .single() ***
    const { data: rnMonthlyDataArray, error } = await supabaseClient
        .rpc('fetch_rn_details', {
            p_user_id: loggedInUserId,
            p_contract_id: contractIdValue, // Usando o valor convertido/assumido
            p_reference_month: referenceDate
        });

    if (error) {
        // Se der erro aqui, é erro de permissão ou sintaxe na função SQL, não de "0 rows".
        displayMessage(rnMonthlyFormMessage, `Erro ao buscar dados mensais: ${error.message}`, false);
        console.error('Supabase RPC Error:', error);

        rnMonthlyDataFieldsDiv.style.display = 'none';
        rnMensReferenciaInput.disabled = false;
        rnSearchMonthlyDataBtn.style.display = 'inline-block';
        return;
    }

    // 2. Extrai o registro: Verifica se o array tem itens.
    const rnMonthlyData = (rnMonthlyDataArray && rnMonthlyDataArray.length > 0)
                          ? rnMonthlyDataArray[0] // Pega o primeiro registro encontrado
                          : null; // Se 0 linhas, define como null

    // 3. Carrega ou Inicializa os campos
    rnMonthlyDataFieldsDiv.style.display = 'block';
    rnMensReferenciaInput.disabled = true;
    rnSearchMonthlyDataBtn.style.display = 'none';

    if (rnMonthlyData) {
        // Dados encontrados: Modo EDIÇÃO
        document.getElementById('rnMonthlyModalTitle').textContent = `Editar Dados Mensais: ${contractName} (${mesReferencia})`;
        rnDataRecordIdInput.value = rnMonthlyData.id;

        // Preenche os campos de INPUT (MANTIDO)
        qtdLinhasInput.value = rnMonthlyData.qtd_linhas || 0;
        repickingInput.value = rnMonthlyData.repicking || 0;
        nilPickingInput.value = rnMonthlyData.nil_picking || 0;
        metaRNInput.value = formatToTwoDecimals(rnMonthlyData.meta || 0.15);

        calculateOperationalMetrics();
        displayMessage(rnMonthlyFormMessage, 'Dados mensais existentes carregados. Modo Edição.', true);
    } else {
        // Dados NÃO encontrados: Modo INSERÇÃO (Nova Linha)
        document.getElementById('rnMonthlyModalTitle').textContent = `Inserir Novos Dados Mensais: ${contractName} (${mesReferencia})`;
        rnDataRecordIdInput.value = '';

        // Garante que os campos de entrada estejam zerados ou com padrão (MANTIDO)
        [qtdLinhasInput, repickingInput, nilPickingInput].forEach(input => input.value = 0);
        metaRNInput.value = formatToTwoDecimals(0.15);

        calculateOperationalMetrics();
        displayMessage(rnMonthlyFormMessage, 'Nenhum dado encontrado. Modo Inserção (Nova Linha).', true);
    }
}

async function saveRNMonthlyData(e) {
    e.preventDefault();

    // ... (Mantida a checagem de permissão no front-end) ...
    if (!hasPermission('can_send_data') && !hasPermission('can_edit_data')) {
        displayMessage(rnMonthlyFormMessage, "Erro: Você não tem permissão para salvar dados.", false);
        return;
    }

    calculateOperationalMetrics();

    const recordId = rnDataRecordIdInput.value;
    const contractId = rnContractIdInput.value; // UUID
    const mesReferencia = rnMensReferenciaInput.value;

    // Mapeamento dos campos para enviar à RPC (deve ser um JSON puro, não um objeto Supabase)
    const dataToSave = {
        contract_id: contractId, // UUID
        reference_month: formatMonthYearToDate(mesReferencia), // DATE

        // Campos de Entrada (Enviados como string para a RPC fazer o cast)
        qtd_linhas: String(parseInputInt(qtdLinhasInput)),
        repicking: String(parseInputInt(repickingInput)),
        nil_picking: String(parseInputInt(nilPickingInput)),
        meta: String(parsePercentInput(metaRNInput)),

        // Campos Calculados
        qtd_erros: String(parseInputInt(qtdErrosInput)),
        repi_percent: String(parsePercentInput(repiPercentInput)),
        nilpi_percent: String(parsePercentInput(nilpiPercentInput)),
        erros_percent: String(parsePercentInput(errosPercentInput)),
        acuracia_mes: String(parsePercentInput(acuraciaMesInput)),
    };

    let error = null;

    if (recordId) {
        // UPDATE (Editar) - Chamando a RPC update_rn_details
        if (!hasPermission('can_edit_data')) {
            displayMessage(rnMonthlyFormMessage, "Erro: Você não tem permissão para editar registros existentes.", false);
            return;
        }

        // Chamada RPC para UPDATE
        const { error: updateError } = await supabaseClient
            .rpc('update_rn_details', {
                p_user_id: loggedInUserId, // 🚨 NOVO: Inclui o user_id para a checagem de permissão
                p_record_id: recordId,
                p_data: dataToSave
            });
        error = updateError;

    } else {
        // INSERT (Novo Registro) - Chamando a RPC insert_rn_details
        if (!hasPermission('can_send_data')) {
            displayMessage(rnMonthlyFormMessage, "Erro: Você não tem permissão para inserir novos registros.", false);
            return;
        }

        // Chamada RPC para INSERT
        const { error: insertError } = await supabaseClient
            .rpc('insert_rn_details', {
                p_user_id: loggedInUserId, // 🚨 NOVO: Inclui o user_id para a checagem de permissão
                p_data: dataToSave
            });
        error = insertError;
    }

    if (error) {
        displayMessage(rnMonthlyFormMessage, `Falha ao salvar dados: ${error.message}`, false);
        console.error('Supabase RN Save Error:', error);
    } else {
        displayMessage(rnMonthlyFormMessage, 'Dados mensais salvos com sucesso!', true);

        setTimeout(() => {
            rnMonthlyDataModal.style.display = 'none';
        }, 1000);
    }
}

// =======================================================
// LÓGICA DE CARREGAMENTO E CRIAÇÃO DE CARDS (MANTIDA)
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
    card.className = 'contract-card';
    card.setAttribute('data-id', record.id);

    const statusText = record.status ? record.status.toUpperCase() : 'INATIVO';
    const statusClass = (statusText === 'ATIVA' || statusText === 'ATIVO') ? 'ATIVO' : 'INATIVO';

    const editButtonHTML = hasPermission('can_edit_data') ?
        `<button class="edit-status-btn" title="Editar Status Rápido"><i class="fas fa-cog"></i></button>` : '';

    const deleteButtonHTML = hasPermission('can_delete_data')
        ? `<button class="delete-btn" title="Excluir Reserva"><i class="fas fa-times"></i></button>`
        : '';

    const actionsHTML = `<div class="card-actions">${editButtonHTML}${deleteButtonHTML}</div>`;

    const isClickable = hasPermission('can_edit_data') || hasPermission('can_consult');
    card.classList.toggle('clickable', isClickable);

    card.innerHTML = `
        <div class="status-bar ${statusClass}"></div>
        <div class="contract-name">${record.nome_contrato || 'N/A'}</div>
        <div class="contract-analyst">Analista: ${record.analista_responsavel || 'N/A'}</div>
        ${actionsHTML}
    `;

    // 1. Listener para o botão de exclusão
    if (hasPermission('can_delete_data')) {
        const deleteBtn = card.querySelector('.delete-btn');
        if(deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                recordToDeleteId = record.id;
                if (deleteConfirmModal) deleteConfirmModal.style.display = 'block';
            });
        }
    }

    // 2. Listener para o botão de Edição (Engrenagem)
    if (hasPermission('can_edit_data')) {
        const editBtn = card.querySelector('.edit-status-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditStatusModalRN(record.id, record.nome_contrato, statusText);
            });
        }
    }


    // 3. Listener para o clique no Card (Ação principal - Detalhamento Mensal)
    if (isClickable) {
        card.addEventListener('click', () => {
            const recordName = record.nome_contrato || 'Reserva Desconhecida';
            // 🚨 CRÍTICO: record.id é o UUID do contrato, usado corretamente como contractId
            openRNMonthlyDataModal(recordName, record.id);
        });
    }

    return card;
}


async function deleteRNRecord() {
    // ... (MANTIDA)
    if (!hasPermission('can_delete_data')) {
        alert("Erro: Você não tem permissão para deletar dados.");
        if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
        return;
    }

    if (!recordToDeleteId) return;

    // Nota: O RLS em 'rn_contratos' deve permitir DELETE baseado no can_delete_data OU role = MASTER
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
    // ... (MANTIDA)
    // 1. Modal de Exclusão
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteRNRecord);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        recordToDeleteId = null;
        if (deleteConfirmModal) deleteConfirmModal.style.display = 'none';
    });

    // 2. Modal de Edição Rápida
    if (cancelEditBtnRN) {
        cancelEditBtnRN.addEventListener('click', () => {
            if (editStatusModalRN) editStatusModalRN.style.display = 'none';
        });
    }
    if (editStatusFormRN) {
        editStatusFormRN.addEventListener('submit', saveEditStatusRN);
    }

    // 3. Fechamento de modais
    [deleteConfirmModal, addRNModal, editStatusModalRN, rnMonthlyDataModal].forEach(modal => {
        if (modal) {
            // Fecha com o botão X (mantido)
            modal.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));

            // O código de fechar no overlay foi removido nas correções anteriores.
        }
    });
}

function setupAddRecordListener() {
    // ... (MANTIDA)
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
    // ... (MANTIDA)
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
        };

        // Nota: O RLS em 'rn_contratos' deve permitir INSERT baseado no can_send_data OU role = MASTER
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
    // ... (MANTIDA)
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

function setupDropdown() {
    // ... (MANTIDA)
    if (!rotinasDropdown) return;

    const dropdownToggle = rotinasDropdown.querySelector('.dropdown-toggle');
    const dropdownLinks = rotinasDropdown.querySelectorAll('.dropdown-content a');

    const closeDropdown = () => {
        rotinasDropdown.classList.remove('open');
        const icon = rotinasDropdown.querySelector('.dropdown-icon');
        if (icon) {
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        }
    };

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

    dropdownLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const currentPath = window.location.pathname.split('/').pop();
            const linkPath = e.currentTarget.getAttribute('href');

            if (linkPath === currentPath || linkPath.endsWith(currentPath)) {
                e.preventDefault();
            }

            closeDropdown();
        });
    });
}

// Funções de Configuração para o Detalhamento RN (Operacional)
function setupRNMonthlyListeners() {
    // ... (MANTIDA)
    // 1. Listeners para Campos de Entrada (disparam o cálculo)
    if (qtdLinhasInput) qtdLinhasInput.addEventListener('input', calculateOperationalMetrics);
    if (repickingInput) repickingInput.addEventListener('input', calculateOperationalMetrics);
    if (nilPickingInput) nilPickingInput.addEventListener('input', calculateOperationalMetrics);

    // 2. Listeners de Busca e Salvamento
    if (rnSearchMonthlyDataBtn) rnSearchMonthlyDataBtn.addEventListener('click', searchAndLoadRNMonthlyData);
    if (rnMonthlyDataForm) rnMonthlyDataForm.addEventListener('submit', saveRNMonthlyData);
}


document.addEventListener('DOMContentLoaded', async () => {
    setupDropdown();

    userPermissions = loadUserPermissions(); // Carrega as permissões no início

    // Verifica se o usuário tem acesso a QUALQUER tela para exibir o conteúdo principal
    if (!hasPermission('access_rn') && !hasPermission('access_ciclico') && !hasPermission('access_clause') && !hasPermission('access_consulta') && !hasPermission('access_relatorio') && !hasPermission('access_permissions')) {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) mainContent.innerHTML = `<h1 style="color:red; margin-top: 50px; text-align: center;">Acesso Negado.</h1>`;
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.style.display = 'none';
        return;
    }

    checkAndDisplayNavigation();

    if (hasPermission('access_rn')) {
        loadRNRecords();
    } else {
        const container = document.getElementById('rnContainer');
        if (container) container.innerHTML = `<h1 style="color:red; text-align: center;">Permissão para RN não encontrada.</h1>`;
    }

    setupModalListeners();
    setupFormSubmit();
    setupAddRecordListener();
    setupSearchListener();
    setupRNMonthlyListeners();
});