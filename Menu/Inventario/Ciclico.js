// =========================================================================
// Ciclico.js (Rotina: Inventário Cíclico)
// 🟢 CORREÇÃO CRÍTICA: Removidas todas as chamadas alert() nativas.
// ⭐ ATUALIZADO: Inclui Edição do Analista Responsável e controle de listeners de exclusão.
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (Substitua se necessário)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const TARGET_TABLE_NAME = 'ciclico_contratos';
const TARGET_GRADE_TABLE = 'ciclico_grade_dados';

// --- Lógica de Token de Sessão ---
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
// ⚠️ Necessário ter <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> no HTML
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, accessToken);

let userPermissions = {};
let recordToDeleteIdCiclico = null;
let gradeToDeleteRef = null; // { contractId, mesReferencia } para exclusão de grade
let currentConfigContract = null;

// Variável para armazenar os dias selecionados no calendário (YYYY-MM-DD)
let selectedManualDays = [];
// Variável de estado do calendário (guarda o mês atualmente exibido)
let currentCalendarDate = new Date();

// =======================================================
// REFERÊNCIAS DO DOM
// =======================================================
const rotinasDropdown = document.getElementById('rotinasDropdown');
const ciclicoListDiv = document.getElementById('ciclicoList');
const loadingMessageCiclico = document.getElementById('loadingMessage');
const deleteConfirmModalCiclico = document.getElementById('deleteConfirmModal');
const confirmDeleteBtnCiclico = document.getElementById('confirmDeleteBtn');
const deleteMessageElement = document.getElementById('deleteMessage');
const addCiclicoBtn = document.getElementById('addCiclicoBtn');
const addCiclicoModal = document.getElementById('addCiclicoModal');
const addCiclicoForm = document.getElementById('addCiclicoForm');
const formMessageCiclico = document.getElementById('formMessageCiclico');
const mainPageAlert = document.getElementById('mainPageAlert');


// Referências do Modal de Edição Rápida de Status
const editStatusModalCiclico = document.getElementById('editStatusModalCiclico');
const editStatusFormCiclico = document.getElementById('editStatusFormCiclico');
const editContractIdInputCiclico = document.getElementById('editContractIdInputCiclico');
const editContractNameInputCiclico = document.getElementById('editContractNameInputCiclico');
const currentContractNameCiclico = document.getElementById('currentContractNameCiclico');

// ⭐ Referências do Analista
const currentAnalystDisplayCiclico = document.getElementById('currentAnalystDisplayCiclico');
const newAnalystNameCiclico = document.getElementById('newAnalystNameCiclico');

const currentStatusDisplayCiclico = document.getElementById('currentStatusDisplayCiclico');
const newContractStatusCiclico = document.getElementById('newContractStatusCiclico');
const editStatusFormMessageCiclico = document.getElementById('editStatusFormMessageCiclico');

// Referências do Modal de Configuração
const ciclicoConfigModal = document.getElementById('ciclicoConfigModal');
const manualDaysModal = document.getElementById('manualDaysModal');
const configContractName = document.getElementById('configContractName');
const configAnalystName = document.getElementById('configAnalystName');
const configContractId = document.getElementById('configContractId');
const totalLocacoesInput = document.getElementById('totalLocacoes');
const cicloValueInput = document.getElementById('cicloValue');
const monthSelector = document.getElementById('monthSelector');
const yearSelector = document.getElementById('yearSelector');
const monthYearSelectionGroup = document.getElementById('monthYearSelectionGroup');
const regimeTrabalhoSelector = document.getElementById('regimeTrabalho');
const existingGradeSelector = document.getElementById('existingGradeSelector');
const gradeYearSelector = document.getElementById('gradeYearSelector');
const deleteGradeBtn = document.getElementById('deleteGradeBtn');
const manualDaysBtn = document.getElementById('manualDaysBtn');
const manualVoltarBtn = document.getElementById('manualVoltarBtn');
const ciclicoConfigForm = document.getElementById('ciclicoConfigForm');
const configVoltarBtn = document.getElementById('configVoltarBtn');
const configFormMessage = document.getElementById('configFormMessage');

// Referências do Calendário Mensal
const calendarGrid = document.getElementById('calendarGrid');
const manualSaveBtn = document.getElementById('manualSaveBtn');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');


// =======================================================
// CONSTANTES E AUXILIARES
// =======================================================
const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function getMonthName(monthNumber) {
    const date = new Date(null, monthNumber - 1);
    return date.toLocaleString('pt-BR', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
}

function displayMessage(element, message, isSuccess) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 3000);
}

// =======================================================
// LÓGICA DE PERMISSÕES
// =======================================================

function loadUserPermissions() {
    const userDataJSON = localStorage.getItem('user_session_data');
    let permissions = { role: 'GUEST', can_consult: false, access_rn: false, access_ciclico: false, access_clause: false, can_send_data: false, can_delete_data: false, can_edit_data: false };
    if (userDataJSON) {
        try { permissions = { ...permissions, ...JSON.parse(userDataJSON) };
        } catch (e) { console.error("Erro ao analisar dados da sessão JSON.", e);
        }
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
    const addBtn = document.getElementById('addCiclicoBtn');
    if (addBtn) addBtn.style.display = hasPermission('can_send_data') ? 'flex' : 'none';
}

function setupRotinasDropdown() {
    const dropdownToggle = rotinasDropdown ? rotinasDropdown.querySelector('.dropdown-toggle') : null;
    if (dropdownToggle) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            if (rotinasDropdown) rotinasDropdown.classList.toggle('open');
        });
    }
}

// =======================================================
// LÓGICA DE CALENDÁRIO MENSAL (PARA O MODAL)
// =======================================================

function createCalendarGrid() {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const monthTitleElement = document.getElementById('currentMonthTitle');
    if (monthTitleElement) {
        monthTitleElement.textContent = `${MESES[month]} ${year}`;
    }

    for (let i = 0; i < startDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty-day';
        calendarGrid.appendChild(emptyDay);
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = dateObj.toISOString().slice(0, 10);
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.setAttribute('data-date', dateStr);

        if (selectedManualDays.includes(dateStr)) {
            dayElement.classList.add('selected');
        }

        dayElement.innerHTML = `<span class="day-number">${day}</span>`;
        dayElement.addEventListener('click', toggleDaySelection);
        calendarGrid.appendChild(dayElement);
    }
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    createCalendarGrid();
}

function toggleDaySelection(e) {
    const dayElement = e.currentTarget;
    const dateStr = dayElement.getAttribute('data-date');
    if (dayElement.classList.contains('selected')) {
        dayElement.classList.remove('selected');
        selectedManualDays = selectedManualDays.filter(d => d !== dateStr);
    } else {
        dayElement.classList.add('selected');
        selectedManualDays.push(dateStr);
    }
}

function saveManualDays() {
    selectedManualDays.sort();
    console.log(`Dias manuais salvos: ${selectedManualDays.length} dias selecionados.`);
    if (manualDaysModal) manualDaysModal.style.display = 'none';
    if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'block';
}


// =======================================================
// LÓGICA DE POPULAR SELETORES DE MÊS/ANO
// =======================================================

function populateMonthYearSelectors() {
    if (!monthSelector || !yearSelector) return;
    monthSelector.innerHTML = '';
    MESES.forEach((monthName, index) => {
        const option = document.createElement('option');
        option.value = String(index + 1).padStart(2, '0');
        option.textContent = monthName;
        monthSelector.appendChild(option);
    });
    yearSelector.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 2; i++) {
        const year = currentYear + i;
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelector.appendChild(option);
    }
}

// =======================================================
// LÓGICA DE CARREGAMENTO DE GRADES EXISTENTES
// =======================================================

async function loadExistingGrades(contractId) {
    if (!existingGradeSelector || !gradeYearSelector) return;

    gradeYearSelector.innerHTML = '<option value="">-- Selecione o Ano --</option>';
    existingGradeSelector.innerHTML = '<option value="">-- Selecione o Mês (Selecione o Ano Primeiro) --</option>';
    existingGradeSelector.disabled = true;

    const { data: grades, error } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .select('mes_referencia')
        .eq('contract_id', contractId)
        .order('mes_referencia', { ascending: false });

    if (error) {
        console.error('Erro ao buscar grades existentes:', error);
        if (configFormMessage) {
            displayMessage(configFormMessage, `Erro ao carregar grades: ${error.message}`, false);
        }
        return;
    }

    if (!grades || grades.length === 0) {
        return;
    }

    const uniqueYears = new Set();
    grades.forEach(grade => {
        const year = grade.mes_referencia.substring(0, 4);
        uniqueYears.add(year);
    });

    const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        gradeYearSelector.appendChild(option);
    });

    // Listener para o Filtro de Ano
    gradeYearSelector.onchange = () => {
        const selectedYear = gradeYearSelector.value;
        existingGradeSelector.innerHTML = '<option value="">-- Selecione o Mês --</option>';
        existingGradeSelector.disabled = true;

        if (selectedYear) {
            const filteredGrades = grades.filter(g => g.mes_referencia.startsWith(selectedYear));

            filteredGrades.forEach(grade => {
                const mesRef = grade.mes_referencia;
                const mesNumber = parseInt(mesRef.substring(5, 7));
                const ano = mesRef.substring(0, 4);
                const mesExtenso = getMonthName(mesNumber);

                const option = document.createElement('option');
                option.value = mesRef;
                option.textContent = `${mesExtenso}/${ano}`;
                existingGradeSelector.appendChild(option);
            });
            existingGradeSelector.disabled = false;
        }

        if (deleteGradeBtn) deleteGradeBtn.style.display = existingGradeSelector.value && hasPermission('can_delete_data') ? 'block' : 'none';
    };
}


// =======================================================
// LÓGICA DE CÁLCULO DE DIAS ÚTEIS
// =======================================================

function getWorkDays(regime, cicloDias, selectedDays, startMonth) {
    if (regime === 'MANUAL') {
        return selectedDays;
    }

    let currentDate = new Date(startMonth + '-01');
    currentDate.setUTCHours(0, 0, 0, 0);
    const workDays = [];

    while (workDays.length < cicloDias) {
        const dayOfWeek = currentDate.getUTCDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        if (regime === 'TODOS_OS_DIAS' || (regime === 'DIAS_UTEIS' && !isWeekend)) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            workDays.push(dateStr);
        }
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }
    return workDays;
}

// =======================================================
// LÓGICA DE EDIÇÃO RÁPIDA (COM ANALISTA)
// =======================================================

/**
 * Abre o modal de edição rápida de status e analista.
 * @param {number} recordId ID do contrato.
 * @param {string} recordName Nome do contrato.
 * @param {string} currentStatus Status atual.
 * @param {string} currentAnalyst Analista responsável atual.
 */
function openEditStatusModalCiclico(recordId, recordName, currentStatus, currentAnalyst) {
    if (!hasPermission('can_edit_data')) {
        displayMessage(mainPageAlert, "Erro: Você não tem permissão para editar dados.", false);
        return;
    }

    if (editContractIdInputCiclico) editContractIdInputCiclico.value = recordId;
    if (editContractNameInputCiclico) editContractNameInputCiclico.value = recordName;
    if (currentContractNameCiclico) currentContractNameCiclico.textContent = recordName;
    if (currentStatusDisplayCiclico) currentStatusDisplayCiclico.textContent = currentStatus;
    if (newContractStatusCiclico) newContractStatusCiclico.value = currentStatus;

    // ⭐ Lógica do Analista
    if (currentAnalystDisplayCiclico) currentAnalystDisplayCiclico.textContent = currentAnalyst || 'N/A';
    if (newAnalystNameCiclico) newAnalystNameCiclico.value = currentAnalyst || '';

    if (editStatusFormMessageCiclico) editStatusFormMessageCiclico.style.display = 'none';
    if (editStatusModalCiclico) editStatusModalCiclico.style.display = 'block';
}

/**
 * Salva as alterações de status e analista no Supabase.
 */
async function saveEditStatusCiclico(e) {
    e.preventDefault();

    if (!hasPermission('can_edit_data')) {
        displayMessage(editStatusFormMessageCiclico, "Erro: Você não tem permissão para editar dados.", false);
        return;
    }

    const recordId = editContractIdInputCiclico.value;
    const recordName = editContractNameInputCiclico.value;
    const newStatus = newContractStatusCiclico.value;
    const newAnalystName = newAnalystNameCiclico.value.trim(); // Pega o novo valor e remove espaços

    if (!recordId || !newStatus || !newAnalystName) {
        displayMessage(editStatusFormMessageCiclico, "Erro: Contrato, status ou analista inválido/vazio.", false);
        return;
    }

    const updateData = {
        status: newStatus,
        analista_responsavel: newAnalystName
    };

    const { error } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .update(updateData)
        .eq('id', recordId);

    if (error) {
        displayMessage(editStatusFormMessageCiclico, `Falha ao atualizar o contrato: ${error.message}`, false);
        console.error('Supabase Update Error:', error);
    } else {
        displayMessage(editStatusFormMessageCiclico, `Contrato "${recordName}" atualizado com sucesso!`, true);
        loadCiclicoRecords();
        setTimeout(() => {
            if (editStatusModalCiclico) editStatusModalCiclico.style.display = 'none';
        }, 1000);
    }
}


// =======================================================
// LÓGICA DE CONFIGURAÇÃO DE GRADE CÍCLICA
// =======================================================

function openConfigModal(recordId, recordName, analystName) {
    if (!hasPermission('can_edit_data')) {
        if (mainPageAlert) {
            displayMessage(mainPageAlert, "Erro: Você não tem permissão para configurar dados.", false);
        }
        return;
    }

    currentConfigContract = { id: recordId, nome_contrato: recordName, analista_responsavel: analystName };

    if (configContractName) configContractName.textContent = `Contrato: ${recordName}`;
    if (configAnalystName) configAnalystName.textContent = analystName;
    if (configContractId) configContractId.value = recordId;

    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear();

    if (monthSelector) monthSelector.value = currentMonth;
    if (yearSelector) yearSelector.value = currentYear;

    selectedManualDays = [];
    currentCalendarDate = new Date();
    if (existingGradeSelector) existingGradeSelector.value = '';
    if (deleteGradeBtn) deleteGradeBtn.style.display = 'none';
    if (regimeTrabalhoSelector) regimeTrabalhoSelector.value = 'DIAS_UTEIS';
    if (monthYearSelectionGroup) monthYearSelectionGroup.style.display = 'flex';
    if (manualDaysBtn) manualDaysBtn.style.display = 'none';
    if (totalLocacoesInput) totalLocacoesInput.value = '';
    if (cicloValueInput) cicloValueInput.value = '';

    // Reseta a visibilidade dos campos de criação
    if (monthYearSelectionGroup) monthYearSelectionGroup.style.display = 'flex';
    if (manualDaysBtn) manualDaysBtn.style.display = 'none';

    // Certifica-se de que o listener de exclusão de contrato é o padrão no modal
    if (confirmDeleteBtnCiclico) {
        confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoGrade);
        confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);
    }


    loadExistingGrades(recordId);

    if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'block';
}


// =======================================================
// LÓGICA DA LISTA PRINCIPAL (LOAD/CREATE/DELETE)
// =======================================================

async function loadCiclicoRecords(searchTerm = '') {
    if (!hasPermission('can_consult')) {
        if (ciclicoListDiv) ciclicoListDiv.innerHTML = `<p style="color:red;">Você não tem permissão para consultar dados.</p>`;
        if (loadingMessageCiclico) loadingMessageCiclico.textContent = '';
        return;
    }

    if (loadingMessageCiclico) loadingMessageCiclico.textContent = 'Carregando itens do inventário cíclico...';
    let query = supabaseClient.from(TARGET_TABLE_NAME).select('id, nome_contrato, status, analista_responsavel').order('nome_contrato', { ascending: true });

    if (searchTerm) {
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
                // Utiliza a função com o nome do bloco 2
                ciclicoListDiv.appendChild(createCiclicoCard(record));
            });
        } else {
            ciclicoListDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum item cíclico encontrado.</p>';
        }
    }

    if (addCiclicoBtn) {
        addCiclicoBtn.style.display = hasPermission('can_send_data') ?
            'flex' : 'none';
    }
}

function createCiclicoCard(record) {
    const card = document.createElement('div');
    card.className = 'contract-card';
    card.setAttribute('data-id', record.id);
    const statusText = (record.status ? record.status.toUpperCase() : 'INATIVO');
    const statusClass = (statusText === 'ATIVO' || statusText === 'ATIVA') ?
        'ATIVO' : 'INATIVO';
    const analystName = record.analista_responsavel || 'N/A';

    const editButtonHTML = hasPermission('can_edit_data') ?
        `<button class="edit-status-btn" title="Editar Status/Analista"><i class="fas fa-cog"></i></button>` : '';
    const deleteButtonHTML = hasPermission('can_delete_data')
        ?
        `<button class="delete-btn" title="Excluir Item Cíclico"><i class="fas fa-times"></i></button>`
        : '';
    const actionsHTML = `<div class="card-actions">${editButtonHTML}${deleteButtonHTML}</div>`;


    const isClickable = hasPermission('can_edit_data') || hasPermission('can_consult');
    card.classList.toggle('clickable', isClickable);
    card.innerHTML = `
        <div class="status-bar ${statusClass}"></div>
        <div class="contract-name">${record.nome_contrato || 'N/A'}</div>
        <div class="contract-analyst">Analista: ${analystName}</div>
        ${actionsHTML}
    `;

    if (hasPermission('can_delete_data')) {
        const deleteBtn = card.querySelector('.delete-btn');
        if(deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                recordToDeleteIdCiclico = record.id;

                // Configura o modal para exclusão de contrato (padrão)
                if (confirmDeleteBtnCiclico) {
                     confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoGrade);
                     confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);
                }

                if (deleteMessageElement) deleteMessageElement.textContent = `Você tem certeza que deseja excluir o contrato "${record.nome_contrato}" e todas as suas grades cíclicas?`;

                if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'block';
            });
        }
    }

    if (hasPermission('can_edit_data')) {
        const editBtn = card.querySelector('.edit-status-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Passa o nome do analista para a edição
                openEditStatusModalCiclico(record.id, record.nome_contrato, record.status || 'Inativo', analystName);
            });
        }
    }


    if (isClickable) {
        card.addEventListener('click', () => {
            openConfigModal(record.id, record.nome_contrato, analystName);
        });
    }

    return card;
}

/**
 * Deleta o contrato principal e suas grades relacionadas.
 */
async function deleteCiclicoRecord() {
    if (!hasPermission('can_delete_data')) {
        if (deleteMessageElement) {
            deleteMessageElement.textContent = "ERRO: Você não tem permissão para deletar dados.";
        }
        console.error("Permissão negada para deletar dados.");
        setTimeout(() => {
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
        }, 2000);
        return;
    }

    if (!recordToDeleteIdCiclico) return;

    // 1. Exclui o contrato principal
    const { error: contractError } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .delete()
        .eq('id', recordToDeleteIdCiclico);

    // 2. Exclui a(s) grade(s) relacionada(s)
    const { error: gradeError } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .delete()
        .eq('contract_id', recordToDeleteIdCiclico);

    if (contractError) {
        if (deleteMessageElement) {
            deleteMessageElement.textContent = `Falha ao excluir item cíclico: ${contractError.message}`;
            setTimeout(() => {
                if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
            }, 4000);
        }
        console.error('Supabase Delete Error:', contractError);
        return;
    } else {
        if (deleteMessageElement) {
            deleteMessageElement.textContent = `Item Cíclico excluído com sucesso!`;
            setTimeout(() => {
                if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
            }, 1000);
        }

        loadCiclicoRecords();
        console.log(`Item Cíclico ${recordToDeleteIdCiclico} excluído com sucesso. (Grades relacionadas limpas: ${gradeError ? gradeError.message : 'OK'})`);
    }

    recordToDeleteIdCiclico = null;
    // Garante que o listener para exclusão de contrato não é duplicado
    if (confirmDeleteBtnCiclico) confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoRecord);
}


/**
 * Deleta apenas uma grade cíclica específica (por ID do Contrato e Mês de Referência).
 */
async function deleteCiclicoGrade() {
    if (!hasPermission('can_delete_data')) {
        if (deleteMessageElement) {
            deleteMessageElement.textContent = "ERRO: Você não tem permissão para deletar grades.";
        }
        console.error("Permissão negada para deletar dados.");
        setTimeout(() => {
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
        }, 2000);
        return;
    }

    if (!gradeToDeleteRef || !gradeToDeleteRef.contractId || !gradeToDeleteRef.mesReferencia) {
        if (deleteMessageElement) {
            deleteMessageElement.textContent = "ERRO: Grade de referência inválida.";
        }
        setTimeout(() => {
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
        }, 3000);
        return;
    }

    const { contractId, mesReferencia } = gradeToDeleteRef;

    // Remove o listener de exclusão de grade para evitar duplicação ou conflito
    if (confirmDeleteBtnCiclico) confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoGrade);

    const { data, error } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .delete()
        .eq('contract_id', contractId)
        .eq('mes_referencia', mesReferencia)
        .select();

    if (error) {
        if (deleteMessageElement) {
            deleteMessageElement.textContent = `Falha ao excluir a grade. ERRO SUPABASE: ${error.message}`;
        }
        console.error('Supabase Delete Grade Error:', error);
        setTimeout(() => {
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
        }, 4000);
    } else {
        if (data && data.length > 0) {
            if (deleteMessageElement) {
                deleteMessageElement.textContent = `Grade ${mesReferencia} excluída com sucesso!`;
            }
            setTimeout(() => {
                if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
            }, 2000);
        } else {
            if (deleteMessageElement) {
                deleteMessageElement.textContent = `ATENÇÃO: A grade de referência ${mesReferencia} não foi encontrada no banco de dados.`;
            }
            setTimeout(() => {
                if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
            }, 4000);
        }

        gradeToDeleteRef = null;

        // Recarrega o seletor de grades
        loadExistingGrades(contractId);
        if (existingGradeSelector) existingGradeSelector.value = '';
        if (deleteGradeBtn) deleteGradeBtn.style.display = 'none';

        // Restaura o listener de exclusão de contrato como padrão (caso o usuário clique em outro botão de delete de contrato)
        if (confirmDeleteBtnCiclico) confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);
        if (deleteMessageElement) deleteMessageElement.textContent = "Você tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.";
    }
}


// =======================================================
// SETUP DE LISTENERS DE MODAL (INCLUINDO LÓGICA DE EXCLUSÃO DE GRADE)
// =======================================================

function setupModalListeners() {
    // Confirmação de Exclusão (Padrão: Exclusão de Contrato)
    if (confirmDeleteBtnCiclico) {
        // O listener padrão é adicionado no DOMContentLoaded. Aqui apenas garante que não há duplicação inicial.
        confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoRecord);
        confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);
    }

    const cancelDeleteBtnCiclico = document.getElementById('cancelDeleteBtn');
    if (cancelDeleteBtnCiclico) {
        cancelDeleteBtnCiclico.addEventListener('click', () => {
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
            // Restaura o listener padrão
            if (confirmDeleteBtnCiclico) {
                 confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoGrade);
                 confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);
            }
        });
    }
    const cancelEditBtnCiclico = document.getElementById('cancelEditBtnCiclico');
    if (cancelEditBtnCiclico) {
        cancelEditBtnCiclico.addEventListener('click', () => {
            if (editStatusModalCiclico) editStatusModalCiclico.style.display = 'none';
        });
    }

    // --- Listener para Seleção de Grade Existente (Controla visibilidade do botão Excluir) ---
    if (existingGradeSelector && deleteGradeBtn) {
        existingGradeSelector.addEventListener('change', function() {
            const gradeValue = this.value;
            deleteGradeBtn.style.display = gradeValue && hasPermission('can_delete_data') ? 'flex' : 'none';

            // CRÍTICO: Se uma grade existente for selecionada, desativa os campos de criação de nova grade
            if (gradeValue) {
                if (regimeTrabalhoSelector) regimeTrabalhoSelector.value = 'DIAS_UTEIS';
                if (totalLocacoesInput) totalLocacoesInput.value = '';
                if (cicloValueInput) cicloValueInput.value = '';

                // Oculta elementos irrelevantes para a edição/visualização de grade
                if (monthYearSelectionGroup) monthYearSelectionGroup.style.display = 'none';
                if (manualDaysBtn) manualDaysBtn.style.display = 'none';
            } else {
                // Quando deseleciona a grade, reativa a seleção de Mês/Ano (padrão 'DIAS_UTEIS')
                if (regimeTrabalhoSelector.value !== 'MANUAL' && monthYearSelectionGroup) {
                    monthYearSelectionGroup.style.display = 'flex';
                }
            }
        });
    }

    // --- Listener para Exclusão de Grade ---
    if (deleteGradeBtn && deleteConfirmModalCiclico) {
        deleteGradeBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if (!hasPermission('can_delete_data')) {
                displayMessage(configFormMessage, "Erro: Você não tem permissão para deletar grades.", false);
                return;
            }

            const gradeValue = existingGradeSelector.value;
            const contractId = configContractId.value;

            if (!gradeValue || !contractId) {
                displayMessage(configFormMessage, "Erro: Selecione uma grade para exclusão.", false);
                return;
            }

            gradeToDeleteRef = { contractId, mesReferencia: gradeValue };

            // Altera a mensagem do modal para ser específica
            const gradeText = existingGradeSelector.options[existingGradeSelector.selectedIndex].textContent;
            if (deleteMessageElement) {
                deleteMessageElement.textContent = `Você tem certeza que deseja excluir a grade de ${gradeText} deste contrato? Esta ação não pode ser desfeita.`;
            }

            // ⭐ CRÍTICO: Altera o listener do botão de confirmação para exclusão de grade
            if (confirmDeleteBtnCiclico) {
                confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoRecord);
                confirmDeleteBtnCiclico.removeEventListener('click', deleteCiclicoGrade); // Remove qualquer um que esteja ativo
                confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoGrade);
            }

            deleteConfirmModalCiclico.style.display = 'block';
        });
    }

    // --- Listener para Regime de Trabalho (Controla visibilidade do Mês/Manual) ---
    if (regimeTrabalhoSelector) {
        regimeTrabalhoSelector.addEventListener('change', function() {
            // Se uma grade existente estiver selecionada, ignora a mudança
            if (existingGradeSelector && existingGradeSelector.value) return;

            if (monthYearSelectionGroup) {
                monthYearSelectionGroup.style.display = (this.value === 'MANUAL' ? 'none' : 'flex');
            }
            if (manualDaysBtn) {
                manualDaysBtn.style.display = (this.value === 'MANUAL' ? 'block' : 'none');
            }
        });
    }

    // Navegação entre Modais de Configuração e Calendário
    if (manualDaysBtn) {
        manualDaysBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentCalendarDate = new Date(); // Resetar o calendário para o mês atual
            createCalendarGrid();
            if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'none';
            if (manualDaysModal) manualDaysModal.style.display = 'block';
        });
    }

    if (manualVoltarBtn) {
        manualVoltarBtn.addEventListener('click', () => {
            if (manualDaysModal) manualDaysModal.style.display = 'none';
            if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'block';
        });
    }

    if (manualSaveBtn) manualSaveBtn.addEventListener('click', saveManualDays);
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => changeMonth(1));


    if (configVoltarBtn) {
        configVoltarBtn.addEventListener('click', () => {
            if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'none';
        });
    }

    // Fechamento de modais com o botão X e clique fora
    [deleteConfirmModalCiclico, addCiclicoModal, editStatusModalCiclico, ciclicoConfigModal, manualDaysModal].forEach(modal => {
        if (modal) {
            modal.querySelectorAll('.close-btn').forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));

            window.addEventListener('click', (event) => {
                // Fechar ao clicar fora, mas apenas se não for o modal de confirmação (que precisa de tratamento especial)
                if (event.target === modal && modal.id !== 'deleteConfirmModal') modal.style.display = 'none';
            });
        }
    });
}


function setupFormSubmit() {
    // 1. Adição de Contrato
    if (addCiclicoForm) {
        addCiclicoForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!hasPermission('can_send_data')) {
                displayMessage(formMessageCiclico, "Erro: Você não tem permissão para adicionar novos dados.", false);
                return;
            }

            const newRecord = {
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

    // 2. Edição Rápida de Status (AGORA COM ANALISTA)
    if (editStatusFormCiclico) {
        editStatusFormCiclico.addEventListener('submit', saveEditStatusCiclico);
    }

    // 3. Configuração e Geração da Grade
    if (ciclicoConfigForm) {
        ciclicoConfigForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const recordId = configContractId.value;
            const contractNameText = configContractName.textContent.replace('Contrato: ', '').trim();
            const existingGradeMonth = existingGradeSelector ? existingGradeSelector.value : '';
            const regime = regimeTrabalhoSelector.value;

            let selectedMonth;

            if (!recordId) {
                displayMessage(configFormMessage, "Erro: Contrato não identificado (ID ausente).", false);
                return;
            }

            // LÓGICA DE FLUXO (EDIÇÃO VS. CRIAÇÃO)
            if (existingGradeMonth) {
                selectedMonth = existingGradeMonth;
            } else {
                if (regime === 'MANUAL') {
                    if (selectedManualDays.length === 0) {
                        displayMessage(configFormMessage, "Erro: Selecione os dias de trabalho no modo Manual antes de gerar.", false);
                        return;
                    }
                    const firstManualDay = selectedManualDays[0];
                    selectedMonth = firstManualDay.substring(0, 7);
                } else {
                    const selectedMonthValue = monthSelector.value;
                    const selectedYearValue = yearSelector.value;
                    selectedMonth = `${selectedYearValue}-${selectedMonthValue}`;

                    if (!selectedMonthValue || !selectedYearValue) {
                        displayMessage(configFormMessage, "Erro: Selecione o Mês/Ano de Referência para gerar uma nova grade.", false);
                        return;
                    }
                }
            }


            // PRÉ-VALIDAÇÃO CRÍTICA (VERIFICAÇÃO DE EXISTÊNCIA)
            const { data: existingGrade, error: fetchError } = await supabaseClient
                .from(TARGET_GRADE_TABLE)
                .select('contract_id')
                .eq('contract_id', recordId)
                .eq('mes_referencia', selectedMonth)
                .maybeSingle();

            if (fetchError && fetchError.code !== 'PGRST116') {
                console.error('Erro ao verificar existência da grade:', fetchError);
            }

            if (existingGrade) {
                // REDIRECIONA PARA EDIÇÃO/VISUALIZAÇÃO DA GRADE EXISTENTE
                displayMessage(configFormMessage, "Grade existente carregada. Redirecionando...", true);
                localStorage.setItem('grade_config', JSON.stringify({
                    contractId: recordId,
                    contractName: contractNameText
                }));
                setTimeout(() => {
                    if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'none';
                    window.location.href = `Grade.html?id=${recordId}&mes=${selectedMonth}`;
                }, 500);
                return;
            }


            // CONTINUAÇÃO DO FLUXO DE CRIAÇÃO (Se não existe e não foi selecionada)
            const totalLocacoes = totalLocacoesInput.value;
            const cicloValue = cicloValueInput.value;
            const locacoes = parseInt(totalLocacoes) || 0;
            const cicloDias = parseInt(cicloValue) || 0;

            if (locacoes <= 0) {
                displayMessage(configFormMessage, "Erro: Total de Locações deve ser maior que zero para gerar o plano inicial.", false);
                return;
            }
            if (regime !== 'MANUAL' && cicloDias <= 0) {
                displayMessage(configFormMessage, "Erro: O valor do Ciclo deve ser maior que zero para o regime selecionado.", false);
                return;
            }

            let daysToUse = [];
            if (regime === 'MANUAL') {
                if (selectedManualDays.length === 0) {
                    displayMessage(configFormMessage, "Erro: Selecione os dias de trabalho no modo Manual.", false);
                    return;
                }
                daysToUse = getWorkDays(regime, selectedManualDays.length, selectedManualDays, selectedMonth);
            } else {
                daysToUse = getWorkDays(regime, cicloDias, selectedManualDays, selectedMonth);
            }

            if (daysToUse.length === 0) {
                displayMessage(configFormMessage, "Erro: Não foi possível determinar os dias de trabalho. Ajuste o Ciclo/Dias/Mês.", false);
                return;
            }

            // LÓGICA DE CALCULO E PREPARAÇÃO DOS ARRAYS
            const DIAS_DE_TRABALHO = daysToUse;
            const CICLO_DIAS_UTEIS = DIAS_DE_TRABALHO.length;
            const TOTAL_LOCALIDADES = locacoes;
            let planoDiarioCalculado = 0;
            if (TOTAL_LOCALIDADES > 0 && CICLO_DIAS_UTEIS > 0) {
                planoDiarioCalculado = Math.ceil(TOTAL_LOCALIDADES / CICLO_DIAS_UTEIS);
            }
            let restantes = TOTAL_LOCALIDADES;

            const planoLocacoesArray = [];
            const realizadoLocacoesArray = [];
            const locacoesIncorretasArray = [];
            const pecasContadasArray = [];
            const pecasIncorretasArray = [];

            DIAS_DE_TRABALHO.forEach(() => {
                let plano = Math.min(planoDiarioCalculado, restantes);
                restantes -= plano;

                planoLocacoesArray.push(plano);
                realizadoLocacoesArray.push(0);
                locacoesIncorretasArray.push(0);
                pecasContadasArray.push(0);
                pecasIncorretasArray.push(0);
            });

            // SALVAR O NOVO REGISTRO (UPSERT)
            const dbPayload = {
                contract_id: recordId,
                mes_referencia: selectedMonth,
                contract_name: contractNameText,
                total_locacoes: TOTAL_LOCALIDADES,
                dias_uteis_ciclo: DIAS_DE_TRABALHO.length,
                dias_inventario: DIAS_DE_TRABALHO,
                plano_locacoes: planoLocacoesArray,
                realizado_locacoes: realizadoLocacoesArray,
                locacoes_incorretas: locacoesIncorretasArray,
                pecas_contadas: pecasContadasArray,
                pecas_incorretas: pecasIncorretasArray,
                data_geracao: new Date().toISOString()
            };
            const { error: gradeError } = await supabaseClient
                .from(TARGET_GRADE_TABLE)
                .upsert(dbPayload, { onConflict: 'contract_id, mes_referencia' });
            if (gradeError) {
                console.error('Erro ao salvar plano da grade no Supabase:', gradeError);
                displayMessage(configFormMessage, `Erro ao gerar grade: ${gradeError.message}`, false);
                return;
            }

            // REDIRECIONAR PARA A GRADE RECÉM-CRIADA
            displayMessage(configFormMessage, "Grade criada com sucesso. Redirecionando...", true);
            localStorage.setItem('grade_config', JSON.stringify({
                contractId: recordId,
                contractName: contractNameText
            }));
            setTimeout(() => {
                if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'none';
                window.location.href = `Grade.html?id=${recordId}&mes=${selectedMonth}`;
            }, 500);
        });
    }
}


function setupAddRecordListener() {
    if (addCiclicoBtn && addCiclicoModal) {
        addCiclicoBtn.addEventListener('click', () => {
             if (hasPermission('can_send_data')) {
                if (addCiclicoForm) addCiclicoForm.reset();
                if (addCiclicoModal) addCiclicoModal.style.display = 'block';
            } else {
                if (mainPageAlert) {
                    displayMessage(mainPageAlert, "Você não tem permissão para adicionar novos dados.", false);
                } else {
                    console.error("Permissão negada para adicionar dados.");
                }
            }
        });
    }
}

// =======================================================
// INICIALIZAÇÃO
// =======================================================

document.addEventListener('DOMContentLoaded', () => {
    userPermissions = loadUserPermissions();
    checkAndDisplayNavigation();
    populateMonthYearSelectors();
    setupFormSubmit();
    setupModalListeners();
    setupAddRecordListener();
    loadCiclicoRecords();
    setupRotinasDropdown();

    // Lógica para o botão de pesquisa, se houver um
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => loadCiclicoRecords(searchInput.value.trim()));
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                loadCiclicoRecords(searchInput.value.trim());
            }
        });
    }
});