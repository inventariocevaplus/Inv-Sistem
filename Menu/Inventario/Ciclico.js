// =========================================================================
// Ciclico.js (Rotina: Inventário Cíclico)
// 🚀 CORRIGIDO: ReferenceError para 'confirmDeleteBtnCiclico'.
// 🚀 LÓGICA: Envia 'id' e 'mes' para Grade.html após criação/seleção.
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

// Variável para armazenar os dias selecionados no calendário (YYYY-MM-DD)
let selectedManualDays = [];

// Variável de estado do calendário (guarda o mês atualmente exibido)
let currentCalendarDate = new Date();


// =======================================================
// REFERÊNCIAS DO DOM (CORRIGIDO)
// =======================================================
const rotinasDropdown = document.getElementById('rotinasDropdown');
const ciclicoListDiv = document.getElementById('ciclicoList');
const loadingMessageCiclico = document.getElementById('loadingMessage');
const deleteConfirmModalCiclico = document.getElementById('deleteConfirmModal');
const confirmDeleteBtnCiclico = document.getElementById('confirmDeleteBtn'); // <-- REFERÊNCIA INCLUÍDA
const addCiclicoBtn = document.getElementById('addCiclicoBtn');
const addCiclicoModal = document.getElementById('addCiclicoModal');
const addCiclicoForm = document.getElementById('addCiclicoForm');
const formMessageCiclico = document.getElementById('formMessageCiclico');

// Referências do Modal de Edição Rápida de Status
const editStatusModalCiclico = document.getElementById('editStatusModalCiclico');
const editStatusFormCiclico = document.getElementById('editStatusFormCiclico');
const editContractIdInputCiclico = document.getElementById('editContractIdInputCiclico');
const editContractNameInputCiclico = document.getElementById('editContractNameInputCiclico');
const currentContractNameCiclico = document.getElementById('currentContractNameCiclico');
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
const manualDaysBtn = document.getElementById('manualDaysBtn');
const manualVoltarBtn = document.getElementById('manualVoltarBtn');
const ciclicoConfigForm = document.getElementById('ciclicoConfigForm');
const configVoltarBtn = document.getElementById('configVoltarBtn');
const configFormMessage = document.getElementById('configFormMessage');

// Referências do Calendário Mensal
const calendarGrid = document.getElementById('calendarGrid');
const manualSaveBtn = document.getElementById('manualSaveBtn');


// =======================================================
// LÓGICA DE CALENDÁRIO MENSAL (PARA O MODAL)
// =======================================================

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

/**
 * Cria dinamicamente o grid do calendário para o mês e ano em currentCalendarDate.
 */
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
        // Garante que o formato é YYYY-MM-DD
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

/**
 * Navega para o mês anterior ou seguinte e regenera o calendário.
 */
function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    createCalendarGrid();
}

/**
 * Lida com o clique em um dia do calendário, adicionando/removendo-o da seleção.
 */
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

/**
 * Salva os dias selecionados e retorna para o modal de configuração.
 */
function saveManualDays() {
    // CRÍTICO: Ordena os dias para garantir que a grade seja construída em ordem cronológica
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

    // 1. Popular Meses
    monthSelector.innerHTML = '';
    MESES.forEach((monthName, index) => {
        const option = document.createElement('option');
        // O valor é o índice + 1 (1 a 12)
        option.value = String(index + 1).padStart(2, '0');
        option.textContent = monthName;
        monthSelector.appendChild(option);
    });

    // 2. Popular Anos (Ano Atual + Próximo Ano)
    yearSelector.innerHTML = '';
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 2; i++) { // Anos: [Atual, Atual + 1]
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

/**
 * Consulta o Supabase por grades existentes para o contrato e preenche o seletor.
 * @param {string} contractId ID do contrato.
 */
async function populateExistingGradesSelector(contractId) {
    if (!existingGradeSelector) return;

    // Limpa o seletor
    existingGradeSelector.innerHTML = '<option value="">-- Selecione uma Grade Existente --</option>';

    if (!contractId) return;

    const { data: grades, error } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .select('mes_referencia')
        .eq('contract_id', contractId)
        .order('mes_referencia', { ascending: false }); // Meses mais recentes primeiro

    if (error) {
        console.error("Erro ao carregar grades existentes:", error);
        return;
    }

    if (grades && grades.length > 0) {
        grades.forEach(grade => {
            const option = document.createElement('option');
            // grade.mes_referencia é no formato YYYY-MM
            const [year, month] = grade.mes_referencia.split('-');
            const monthIndex = parseInt(month) - 1;

            // Formata o texto para exibição (Ex: Outubro/2025)
            const displayMonth = MESES[monthIndex];

            option.value = grade.mes_referencia; // Valor salvo no formato YYYY-MM
            option.textContent = `${displayMonth}/${year}`;
            existingGradeSelector.appendChild(option);
        });
    }
}


// =======================================================
// LÓGICA DE CÁLCULO DE DIAS ÚTEIS
// =======================================================

/**
 * Retorna um array de strings de datas (YYYY-MM-DD) para os dias de trabalho.
 * @param {string} regime 'DIAS_UTEIS', 'TODOS_OS_DIAS' ou 'MANUAL'.
 * @param {number} cicloDias Número de dias a calcular.
 * @param {string[]} selectedDays Array de dias manuais (se regime for Manual).
 * @param {string} startMonth 'YYYY-MM' para definir o início do cálculo.
 * @returns {string[]} Lista de dias de trabalho no formato YYYY-MM-DD.
 */
function getWorkDays(regime, cicloDias, selectedDays, startMonth) {
    if (regime === 'MANUAL') {
        // No modo manual, o array já está ordenado (ver saveManualDays)
        return selectedDays;
    }

    // Cria um objeto Date para o PRIMEIRO dia do mês selecionado (YYYY-MM-01)
    let currentDate = new Date(startMonth + '-01');
    // Adiciona o fuso horário UTC para evitar problemas de fuso horário local
    currentDate.setUTCHours(0, 0, 0, 0);

    const workDays = [];

    // Calcula apenas os 'cicloDias' necessários, começando pelo primeiro dia do mês/ano
    while (workDays.length < cicloDias) {
        const dayOfWeek = currentDate.getUTCDay(); // 0 (Dom) a 6 (Sáb)

        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

        if (regime === 'TODOS_OS_DIAS' || (regime === 'DIAS_UTEIS' && !isWeekend)) {
            // Usa toISOString e slice para obter YYYY-MM-DD
            const dateStr = currentDate.toISOString().slice(0, 10);
            workDays.push(dateStr);
        }

        // Avança para o próximo dia
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Retorna a lista de dias cronologicamente ordenada
    return workDays;
}


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
// LÓGICA DE MODAIS E FORMULÁRIOS
// =======================================================

function displayMessage(element, message, isSuccess) {
    if (!element) return;
    element.textContent = message;
    element.className = `form-message ${isSuccess ? 'success' : 'error'}`;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 3000);
}

function setupRotinasDropdown() {
    // A referência 'rotinasDropdown' já existe no topo do arquivo.
    const rotinasDropdown = document.getElementById('rotinasDropdown');

    // Verifica se o elemento existe (a div principal do menu)
    if (rotinasDropdown) {
        // Seleciona o elemento clicável (o link <a> com a classe .dropdown-toggle)
        const dropdownToggle = rotinasDropdown.querySelector('.dropdown-toggle');

        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                // CRÍTICO: Alterna a classe 'open' para abrir/fechar o conteúdo
                rotinasDropdown.classList.toggle('open');
            });
        }
    }
}

function openConfigModal(recordId, recordName, analystName) {
    if (!hasPermission('can_edit_data')) {
        alert("Erro: Você não tem permissão para configurar dados.");
        return;
    }

    if (configContractName) configContractName.textContent = `Contrato: ${recordName}`;
    if (configAnalystName) configAnalystName.textContent = analystName;
    if (configContractId) configContractId.value = recordId;

    // --- Define Mês e Ano atuais como padrão ---
    const today = new Date();
    const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
    const currentYear = today.getFullYear();

    if (monthSelector) monthSelector.value = currentMonth;
    if (yearSelector) yearSelector.value = currentYear;
    // --------------------------------------------------

    selectedManualDays = [];
    currentCalendarDate = new Date();

    // Reseta o seletor de grade existente
    if (existingGradeSelector) existingGradeSelector.value = '';

    // Reseta a visibilidade para o padrão
    if (regimeTrabalhoSelector) regimeTrabalhoSelector.value = 'DIAS_UTEIS';
    if (monthYearSelectionGroup) monthYearSelectionGroup.style.display = 'flex';
    if (manualDaysBtn) manualDaysBtn.style.display = 'none';

    // Chama a função para popular o seletor de grades existentes
    populateExistingGradesSelector(recordId);


    if (ciclicoConfigModal) ciclicoConfigModal.style.display = 'block';
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

    // 2. Edição Rápida de Status
    if (editStatusFormCiclico) {
        editStatusFormCiclico.addEventListener('submit', saveEditStatusCiclico);
    }

    // 3. Configuração e Geração da Grade (REDIRECIONAMENTO)
    if (ciclicoConfigForm) {
        ciclicoConfigForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const recordId = configContractId.value;
            const contractNameText = configContractName.textContent.replace('Contrato: ', '').trim();
            const existingGradeMonth = existingGradeSelector ? existingGradeSelector.value : '';

            // Variável que determina o MÊS DE TRABALHO (Grade existente ou nova geração)
            let selectedMonth;

            // --- VALIDAÇÃO BÁSICA ---
            if (!recordId) {
                displayMessage(configFormMessage, "Erro: Contrato não identificado (ID ausente).", false);
                return;
            }

            // ===========================================================
            // 1. LÓGICA DE FLUXO (EDIÇÃO VS. CRIAÇÃO)
            // ===========================================================

            if (existingGradeMonth) {
                // FLUXO DE EDIÇÃO: USUÁRIO SELECIONOU UMA GRADE EXISTENTE
                selectedMonth = existingGradeMonth;

            } else {
                // FLUXO DE CRIAÇÃO: USUÁRIO QUER GERAR UMA NOVA GRADE

                const selectedMonthValue = monthSelector.value;
                const selectedYearValue = yearSelector.value;
                selectedMonth = `${selectedYearValue}-${selectedMonthValue}`;

                // Validação de Mês/Ano para nova criação
                if (!selectedMonthValue || !selectedYearValue) {
                    displayMessage(configFormMessage, "Erro: Selecione o Mês/Ano de Referência para gerar uma nova grade.", false);
                    return;
                }
            }
            // -----------------------------------------------------------


            // ===========================================================
            // 2. PRÉ-VALIDAÇÃO CRÍTICA (REDIRECIONAMENTO)
            // ===========================================================

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
                // SE A GRADE EXISTE (Edição via seletor OU Tentativa de duplicar uma nova)
                displayMessage(configFormMessage, "Grade existente carregada. Redirecionando...", true);

                // Salvar ID e Nome do Contrato no localStorage para Grade.js buscar
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


            // ===========================================================
            // 3. CONTINUAÇÃO DO FLUXO DE CRIAÇÃO (Se não existe e não foi selecionada)
            // ===========================================================

            // Se chegou aqui, é uma tentativa de CRIAR uma nova grade (existingGradeMonth é vazio E existingGrade é falso)
            const totalLocacoes = totalLocacoesInput.value;
            const cicloValue = cicloValueInput.value;
            const regime = regimeTrabalhoSelector.value;

            const locacoes = parseInt(totalLocacoes) || 0;
            const cicloDias = parseInt(cicloValue) || 0;

            if (locacoes <= 0 || cicloDias <= 0) {
                 displayMessage(configFormMessage, "Erro: Total de Locações e Ciclo devem ser maiores que zero para gerar o plano inicial.", false);
                 return;
            }

            // Lógica para determinar dias
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

            // ----------------------------------------------------
            // 3. LÓGICA DE CALCULO E PREPARAÇÃO DOS ARRAYS
            // ----------------------------------------------------

            const DIAS_DE_TRABALHO = daysToUse;
            const CICLO_DIAS_UTEIS = DIAS_DE_TRABALHO.length;
            const TOTAL_LOCALIDADES = locacoes;

            // Calcular o Plano Diário
            let planoDiarioCalculado = 0;
            if (TOTAL_LOCALIDADES > 0 && CICLO_DIAS_UTEIS > 0) {
                // Usamos Math.ceil para garantir que o total de localidades seja coberto
                planoDiarioCalculado = Math.ceil(TOTAL_LOCALIDADES / CICLO_DIAS_UTEIS);
            }
            let restantes = TOTAL_LOCALIDADES;

            // Criar os ARRAYS de dados
            const planoLocacoesArray = [];
            const realizadoLocacoesArray = [];
            const locacoesIncorretasArray = [];
            const pecasContadasArray = [];
            const pecasIncorretasArray = [];

            // Inicializa os arrays com o Plano Calculado e zero para as métricas editáveis
            DIAS_DE_TRABALHO.forEach(() => {
                // Cálculo do Plano (Plano é calculado e distribuído)
                let plano = Math.min(planoDiarioCalculado, restantes);
                restantes -= plano;

                planoLocacoesArray.push(plano);
                realizadoLocacoesArray.push(0);
                locacoesIncorretasArray.push(0);
                pecasContadasArray.push(0);
                pecas_incorretasArray.push(0);
            });
            // ----------------------------------------------------

            // 4. SALVAR O NOVO REGISTRO (UPSERT)
            const dbPayload = {
                contract_id: recordId,
                mes_referencia: selectedMonth, // CHAVE CRÍTICA
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

            // 5. REDIRECIONAR PARA A GRADE RECÉM-CRIADA
            displayMessage(configFormMessage, "Grade criada com sucesso. Redirecionando...", true);

            // Salvar ID e Nome do Contrato no localStorage para Grade.js buscar
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

function setupModalListeners() {
    // Confirmação de Exclusão
    if (confirmDeleteBtnCiclico) {
        confirmDeleteBtnCiclico.addEventListener('click', deleteCiclicoRecord);
    }
    const cancelDeleteBtnCiclico = document.getElementById('cancelDeleteBtn');
    if (cancelDeleteBtnCiclico) {
        cancelDeleteBtnCiclico.addEventListener('click', () => {
            if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
        });
    }
    const cancelEditBtnCiclico = document.getElementById('cancelEditBtnCiclico');
    if (cancelEditBtnCiclico) {
        cancelEditBtnCiclico.addEventListener('click', () => {
            if (editStatusModalCiclico) editStatusModalCiclico.style.display = 'none';
        });
    }

    // --- Listener para Regime de Trabalho (Controla visibilidade do Mês/Manual) ---
    if (regimeTrabalhoSelector) {
        regimeTrabalhoSelector.addEventListener('change', function() {
            if (monthYearSelectionGroup) {
                // Oculta a seleção de Mês/Ano se o regime for MANUAL
                monthYearSelectionGroup.style.display = (this.value === 'MANUAL' ? 'none' : 'flex');
            }
            if (manualDaysBtn) {
                // Mostra o botão manual se o regime for MANUAL
                manualDaysBtn.style.display = (this.value === 'MANUAL' ? 'block' : 'none');
            }
            // Reseta a seleção de grade existente quando o regime muda para automático
            if (existingGradeSelector && this.value !== 'MANUAL') {
                 existingGradeSelector.value = '';
            }
        });
    }
    // -----------------------------------------------------------------------------------

    // Navegação entre Modais de Configuração e Calendário
    if (manualDaysBtn) {
        manualDaysBtn.addEventListener('click', (e) => {
            e.preventDefault();
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

    // Listener para o botão Salvar da seleção manual
    if (manualSaveBtn) {
        manualSaveBtn.addEventListener('click', saveManualDays);
    }

    // Listeners para as setas de navegação do calendário
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');

    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    }
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => changeMonth(1));
    }


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
                if (event.target === modal) modal.style.display = 'none';
            });
        }
    });
}

async function loadCiclicoRecords(searchTerm = '') {
    if (!hasPermission('can_consult')) {
        if (ciclicoListDiv) ciclicoListDiv.innerHTML = `<p style="color:red;">Você não tem permissão para consultar dados.</p>`;
        return;
    }

    if (loadingMessageCiclico) loadingMessageCiclico.textContent = 'Carregando itens do inventário cíclico...';

    let query = supabaseClient.from(TARGET_TABLE_NAME).select('id, nome_contrato, status, analista_responsavel');

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
                ciclicoListDiv.appendChild(createCiclicoCard(record));
            });
        } else {
            ciclicoListDiv.innerHTML = '<p style="color:var(--text-muted);">Nenhum item cíclico encontrado.</p>';
        }
    }

    if (addCiclicoBtn) {
        addCiclicoBtn.style.display = hasPermission('can_send_data') ? 'flex' : 'none';
    }
}

function createCiclicoCard(record) {
    const card = document.createElement('div');
    card.className = 'contract-card';
    card.setAttribute('data-id', record.id);

    const statusText = (record.status ? record.status.toUpperCase() : 'INATIVO');
    const statusClass = (statusText === 'ATIVO' || statusText === 'ATIVA') ? 'ATIVO' : 'INATIVO';

    const editButtonHTML = hasPermission('can_edit_data') ?
        `<button class="edit-status-btn" title="Editar Status Rápido"><i class="fas fa-cog"></i></button>` : '';

    const deleteButtonHTML = hasPermission('can_delete_data')
        ? `<button class="delete-btn" title="Excluir Item Cíclico"><i class="fas fa-times"></i></button>`
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

    if (hasPermission('can_delete_data')) {
        const deleteBtn = card.querySelector('.delete-btn');
        if(deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                recordToDeleteIdCiclico = record.id;
                if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'block';
            });
        }
    }

    if (hasPermission('can_edit_data')) {
        const editBtn = card.querySelector('.edit-status-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditStatusModalCiclico(record.id, record.nome_contrato, record.status || 'Inativo');
            });
        }
    }


    if (isClickable) {
        card.addEventListener('click', () => {
            // Ao clicar, abre o modal de configuração para a Geração da Grade
            openConfigModal(record.id, record.nome_contrato, record.analista_responsavel);
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

    // 1. Exclui o contrato principal
    const { error: contractError } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .delete()
        .eq('id', recordToDeleteIdCiclico);

    // 2. Opcional: Exclui a(s) grade(s) relacionada(s) (todas as versões mensais)
    const { error: gradeError } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .delete()
        .eq('contract_id', recordToDeleteIdCiclico);


    if (contractError) {
        alert(`Falha ao excluir item cíclico: ${contractError.message}`);
        console.error('Supabase Delete Error:', contractError);
    } else {
        loadCiclicoRecords();
        console.log(`Item Cíclico ${recordToDeleteIdCiclico} excluído com sucesso. (E grades relacionadas limpas: ${gradeError ? gradeError.message : 'OK'})`);
    }

    recordToDeleteIdCiclico = null;
    if (deleteConfirmModalCiclico) deleteConfirmModalCiclico.style.display = 'none';
}

function openEditStatusModalCiclico(recordId, recordName, currentStatus) {
    if (!hasPermission('can_edit_data')) {
        alert("Erro: Você não tem permissão para editar dados.");
        return;
    }

    if (editContractIdInputCiclico) editContractIdInputCiclico.value = recordId;
    if (editContractNameInputCiclico) editContractNameInputCiclico.value = recordName;
    if (currentContractNameCiclico) currentContractNameCiclico.textContent = recordName;
    if (currentStatusDisplayCiclico) currentStatusDisplayCiclico.textContent = currentStatus;

    if (newContractStatusCiclico) newContractStatusCiclico.value = currentStatus;

    if (editStatusFormMessageCiclico) editStatusFormMessageCiclico.style.display = 'none';
    if (editStatusModalCiclico) editStatusModalCiclico.style.display = 'block';
}

async function saveEditStatusCiclico(e) {
    e.preventDefault();

    const recordId = editContractIdInputCiclico.value;
    const recordName = editContractNameInputCiclico.value;
    const newStatus = newContractStatusCiclico.value;

    if (!recordId || !newStatus) {
        displayMessage(editStatusFormMessageCiclico, "Erro: Contrato ou status inválido.", false);
        return;
    }

    const { error } = await supabaseClient
        .from(TARGET_TABLE_NAME)
        .update({ status: newStatus })
        .eq('id', recordId);

    if (error) {
        displayMessage(editStatusFormMessageCiclico, `Falha ao atualizar o status: ${error.message}`, false);
        console.error('Supabase Update Error:', error);
    } else {
        displayMessage(editStatusFormMessageCiclico, `Status de "${recordName}" atualizado para ${newStatus}!`, true);
        loadCiclicoRecords();
        setTimeout(() => {
            if (editStatusModalCiclico) editStatusModalCiclico.style.display = 'none';
        }, 1000);
    }
}

function setupAddRecordListener() {
    if (addCiclicoBtn && addCiclicoModal) {
        addCiclicoBtn.addEventListener('click', () => {
             if (hasPermission('can_send_data')) {
                if (addCiclicoForm) addCiclicoForm.reset();
                if (addCiclicoModal) addCiclicoModal.style.display = 'block';
            } else {
                alert("Você não tem permissão para adicionar novos dados.");
            }
        });
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    userPermissions = loadUserPermissions();
    checkAndDisplayNavigation(); // Garante que a navegação e botões corretos sejam exibidos
    populateMonthYearSelectors();
    setupFormSubmit();
    setupModalListeners();
    setupAddRecordListener(); // <--- Esta é a última função que você mencionou
    loadCiclicoRecords();

    // ------------------------------------------------------------------
    // ⭐ NOVO CÓDIGO A INSERIR AQUI: CHAMADA PARA O DROPDOWN
    // ------------------------------------------------------------------
    setupRotinasDropdown(); // Inicializa a funcionalidade de abrir/fechar o menu
    // ------------------------------------------------------------------
});