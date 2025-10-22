// =========================================================================
// Grade.js (Grade de Inventário Cíclico) - LÓGICA DE GRADE ISOLADA
// 🚀 VERSÃO FINAL CORRIGIDA: Status Plano = Realizado Acumulado - Plano Acumulado (Com Cor de Fundo).
// =========================================================================

// Configuração de Tabela (Mantida localmente)
const TARGET_GRADE_TABLE = 'ciclico_grade_dados';

// Variáveis de Conexão (Substitua se necessário)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

// Criação do cliente Supabase no início do arquivo
let accessToken = SUPABASE_ANON_KEY;

// --- Lógica de Token de Sessão (CRÍTICA para login) --
const sessionDataJSON = localStorage.getItem('user_session_data');
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

// O cliente Supabase é criado aqui
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, accessToken);


// =======================================================
// VARIÁVEIS GLOBAIS DE ESTADO DA GRADE
// =======================================================
let DIAS_DE_TRABALHO = [];
let contractId = null;
let contractName = null;
let totalLocacoes = 0;
let mesReferencia = null;

// ARRAYS QUE ARMAZENAM OS DADOS DO DB E SÃO MANIPULADOS
let plano_locacoes = [];
let realizado_locacoes = [];
let locacoes_incorretas = [];
let pecas_contadas = [];
let pecas_incorretas = [];

// ARRAYS CALCULADOS
let plano_acumulado = [];
let realizado_acumulado = [];
let acompanhamento_plano = [];
let status_plano = []; // Array de Números (Diferença Acumulada)


// =======================================================
// ⭐ NOVO: FUNÇÃO PARA CONTROLAR O DROPDOWN DA BARRA LATERAL
// =======================================================
function setupRotinasDropdown() {
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


// =======================================================
// FUNÇÕES DE UTILIDADE E CARREGAMENTO DE DADOS
// =======================================================

/**
 * Busca um parâmetro da URL.
 */
function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/**
 * Carrega o ID e Mês de Referência da URL.
 */
function loadContractConfig() {
// ... (código loadContractConfig existente) ...
    // 1. Tenta buscar ID e Mês da URL (prioridade após redirecionamento)
    contractId = getUrlParameter('id');
    mesReferencia = getUrlParameter('mes');

    if (!contractId || !mesReferencia) {
        const gradeContainer = document.getElementById('gradeContainer');
        if (gradeContainer) {
            gradeContainer.innerHTML =
                `<h1 style="color:red; text-align:center; margin-top: 50px;">Erro: Configuração (ID e Mês) não encontrada na URL. Volte para Ciclico.html e gere a grade.</h1>`;
        }
        console.error("DEBUG: Falha ao carregar configuração. ID ou Mês ausente.");
        return false;
    }

    // Converte o contractId para o tipo correto (número)
    contractId = parseInt(contractId, 10);

    const titleElement = document.getElementById('gradeContractTitle');
    if (titleElement) {
        titleElement.textContent = `Grade Cíclica - [Contrato ID: ${contractId}] (${mesReferencia})`;
    }

    return true;
}

/**
 * Busca os dados da grade na tabela 'ciclico_grade_dados'.
 */
async function loadGradeDataFromSupabase() {
// ... (código loadGradeDataFromSupabase existente) ...
    if (!contractId || !mesReferencia) return false;

    // Colunas necessárias
    const selectColumns = [
        'contract_name', 'total_locacoes', 'dias_inventario',
        'plano_locacoes', 'realizado_locacoes', 'locacoes_incorretas',
        'pecas_contadas', 'pecas_incorretas',
        'plano_acumulado', 'realizado_acumulado', 'acompanhamento_plano', 'status_plano'
    ].join(',');

    // Busca metadados e os ARRAYS de dados
    const { data, error } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .select(selectColumns)
        .eq('contract_id', contractId)
        .eq('mes_referencia', mesReferencia)
        .single();

    if (error || !data) {
        console.error('DEBUG - ERRO SUPABASE: Nenhum dado encontrado para o filtro.', { contractId, mesReferencia, error: error?.message });
        const gradeContainer = document.getElementById('gradeContainer');
        if (gradeContainer) {
            gradeContainer.innerHTML =
                `<h1 style="color:red; text-align:center; margin-top: 50px;">Erro: Grade para o contrato ${contractId} e mês ${mesReferencia} não encontrada na base.</h1>`;
        }
        return false;
    }

    // Armazena dados globais
    contractName = data.contract_name || `Contrato ID ${contractId}`;
    totalLocacoes = data.total_locacoes || 0;

    // Atualiza o título
    const titleElement = document.getElementById('gradeContractTitle');
    if (titleElement) {
        titleElement.textContent = `Grade Cíclica - ${contractName} (${mesReferencia})`;
    }

    // 1. Constrói a lista de dias de trabalho
    DIAS_DE_TRABALHO = data.dias_inventario || [];

    // 2. Armazena os Arrays
    plano_locacoes = data.plano_locacoes || [];
    realizado_locacoes = data.realizado_locacoes || [];
    locacoes_incorretas = data.locacoes_incorretas || [];
    pecas_contadas = data.pecas_contadas || [];
    pecas_incorretas = data.pecas_incorretas || [];

    // Arrays Calculados (Carregados, mas serão recalculados)
    plano_acumulado = data.plano_acumulado || [];
    realizado_acumulado = data.realizado_acumulado || [];
    acompanhamento_plano = data.acompanhamento_plano || [];
    // CRÍTICO: status_plano deve ser carregado como array de números
    status_plano = (data.status_plano || []).map(num => Number(num) || 0);

    return true;
}


// =======================================================
// FUNÇÕES DE GERAÇÃO E ATUALIZAÇÃO DA INTERFACE (LÓGICA DA GRADE)
// =======================================================

/**
 * Cria dinamicamente os cabeçalhos da grade (Dias da Semana e Dias do Mês).
 */
function buildGradeHeader() {
// ... (código buildGradeHeader existente) ...
    const rowDayOfWeek = document.getElementById('rowDayOfWeek');
    const rowDayOfMonth = document.getElementById('rowDayOfMonth');
    const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

    if (!rowDayOfWeek || !rowDayOfMonth) {
        console.error("DEBUG: Linhas de cabeçalho não encontradas.");
        return;
    }

    // 1. Títulos das Células Fixas de Cabeçalho
    if (rowDayOfWeek.cells.length > 0) rowDayOfWeek.cells[0].innerHTML = '<div class="sticky-label">Semanas</div>';
    if (rowDayOfMonth.cells.length > 0) rowDayOfMonth.cells[0].innerHTML = '<div class="sticky-label">Dias</div>';

    // 2. Limpa células existentes, exceto a primeira sticky (índice 0)
    while (rowDayOfWeek.cells.length > 1) rowDayOfWeek.deleteCell(1);
    while (rowDayOfMonth.cells.length > 1) rowDayOfMonth.deleteCell(1);

    // 3. Adiciona as colunas dos dias
    DIAS_DE_TRABALHO.forEach(dateKey => {
        const dateObj = new Date(dateKey + 'T00:00:00Z');
        const dayOfWeekIndex = dateObj.getUTCDay();
        const dayOfWeek = dayNames[dayOfWeekIndex];
        const dayOfMonth = dateObj.getUTCDate();

        const thWeek = rowDayOfWeek.insertCell(-1);
        thWeek.textContent = dayOfWeek;
        thWeek.setAttribute('data-date', dateKey);

        const thMonth = rowDayOfMonth.insertCell(-1);
        thMonth.textContent = dayOfMonth;
        thMonth.setAttribute('data-date', dateKey);
    });
}

/**
 * Preenche as linhas da grade com Plano e Inputs (para as métricas editáveis).
 */
function fillDataCells() {
// ... (código fillDataCells existente) ...
    const DYNAMIC_GRADE_MAPPING = {
        'rowPlano': { array: plano_locacoes, field: 'plano_locacoes', editable: false, format: 'number' },
        'rowPlanoAcumulado': { array: plano_acumulado, field: 'plano_acumulado', editable: false, format: 'number' },
        'rowRealizado': { array: realizado_locacoes, field: 'realizado_locacoes', editable: true, format: 'number' },
        'rowLocIncorreta': { array: locacoes_incorretas, field: 'locacoes_incorretas', editable: true, format: 'number' },
        'rowRealizadoAcumulado': { array: realizado_acumulado, field: 'realizado_acumulado', editable: false, format: 'number' },
        'rowPcsCorretas': { array: pecas_contadas, field: 'pecas_contadas', editable: true, format: 'number' },
        'rowPcsIncorretas': { array: pecas_incorretas, field: 'pecas_incorretas', editable: true, format: 'number' },
        'rowAcompanhamento': { array: acompanhamento_plano, field: 'acompanhamento_plano', editable: false, format: 'percent' },
        'rowStatusPlano': { array: status_plano, field: 'status_plano', editable: false, format: 'status-diff' },
    };

    const dataRowDefinitions = Object.keys(DYNAMIC_GRADE_MAPPING);

    dataRowDefinitions.forEach(rowId => {
        const row = document.getElementById(rowId);
        const def = DYNAMIC_GRADE_MAPPING[rowId];
        if (!row || !def) return;

        while (row.cells.length > 1) row.deleteCell(1);

        DIAS_DE_TRABALHO.forEach((_, index) => {
            const cell = row.insertCell(-1);
            const initialValue = Number(def.array[index]) || 0;

            // Limpa classes de status (necessário se a célula for reaproveitada)
            cell.classList.remove('status-positivo', 'status-negativo');

            if (def.editable) {
                // Linhas de INPUT
                cell.classList.add('editable-cell');
                const input = document.createElement('input');
                input.type = 'number';
                input.min = 0;
                input.value = initialValue > 0 ? initialValue : '';
                input.placeholder = '0';
                input.setAttribute('data-index', index);
                input.setAttribute('data-field', def.field);
                input.addEventListener('change', handleInputChange);
                cell.appendChild(input);
            } else {
                // Linhas de TEXTO/CÁLCULO

                if (def.format === 'status-diff') {
                    // Trata status (Diferença Numérica) e aplica classe para cor de fundo
                    cell.textContent = formatCellValue(initialValue, 'number');

                    if (initialValue >= 0) {
                        cell.classList.add('status-positivo'); // Cor Verde (Para CSS)
                    } else {
                        cell.classList.add('status-negativo'); // Cor Vermelha (Para CSS)
                    }
                } else {
                     // Trata números (Plano, Acumulado)
                    cell.textContent = formatCellValue(initialValue, def.format);
                }
            }
        });
    });

    // Preenche a Linha de Totais
    const rowTotals = document.getElementById('rowTotals');
    if(rowTotals) {
        while (rowTotals.cells.length > 1) rowTotals.deleteCell(1);
        DIAS_DE_TRABALHO.forEach(() => {
            const cell = rowTotals.insertCell(-1);
            // Definido como '0' no momento, o cálculo real será feito no updateGradeCalculationsAndKpis (mas vamos removê-lo de lá)
            cell.textContent = '0';
            cell.classList.add('total-cell');
        });
    }
}

/**
 * Formata o valor para exibição na célula.
 */
function formatCellValue(value, formatType) {
// ... (código formatCellValue existente) ...
    if (formatType === 'percent') {
        return `${(Number(value) || 0).toFixed(1)}%`;
    }
    // Formato padrão (número)
    return (Number(value) || 0).toLocaleString('pt-BR');
}

/**
 * Atualiza o painel de KPIs Acumulados no topo da página.
 * 🚀 AJUSTE CRÍTICO AQUI: Incluindo o KPI de Realizado (Total).
 */
function updateKpiPanel(totalPlanoGeral, totalRealizadoGeral) {
// ... (código updateKpiPanel existente) ...
    let realizadoPercent = 0;

    if (totalPlanoGeral > 0) {
        realizadoPercent = (totalRealizadoGeral / totalPlanoGeral) * 100;
    }
    let pendentePercent = 100 - realizadoPercent;

    const realizadoElement = document.querySelector('[data-kpi="realizado-percent"]');
    const pendenteElement = document.querySelector('[data-kpi="pendente-percent"]');
    // NOVO: Seleciona o elemento do KPI Realizado (Total)
    const totalRealizadoElement = document.querySelector('[data-kpi="realizado-total"]');


    if (realizadoElement) {
        realizadoElement.textContent = `${realizadoPercent.toFixed(2)}%`;
        realizadoElement.closest('.kpi-card').classList.toggle('status-ok-kpi', realizadoPercent >= 95);
    }
    if (pendenteElement) {
        pendenteElement.textContent = `${pendentePercent.toFixed(2)}%`;
    }

    // BLOCO ADICIONADO: Atualiza o NOVO KPI TOTAL
    if (totalRealizadoElement) {
        // Formata o número com separador de milhar
        totalRealizadoElement.textContent = totalRealizadoGeral.toLocaleString('pt-BR');
    }
}

/**
 * Lógica para recalcular toda a grade: Acumulados, Acompanhamento e KPIs.
 * 🚀 CÁLCULO ATUALIZADO: Status Plano = Realizado Acumulado - Plano Acumulado.
 */
function updateGradeCalculationsAndKpis() {
// ... (código updateGradeCalculationsAndKpis existente) ...
    let planoAcumuladoTemp = 0;
    let realizadoAcumuladoTemp = 0;
    let totalPlanoGeral = 0;
    let totalRealizadoGeral = 0;

    plano_acumulado = [];
    realizado_acumulado = [];
    acompanhamento_plano = [];
    status_plano = [];

    const totalDays = DIAS_DE_TRABALHO.length;

    for (let index = 0; index < totalDays; index++) {
        const dayPlano = Number(plano_locacoes[index]) || 0;
        const dayRealizado = Number(realizado_locacoes[index]) || 0;

        // a) Acumulados
        planoAcumuladoTemp += dayPlano;
        realizadoAcumuladoTemp += dayRealizado;
        plano_acumulado.push(planoAcumuladoTemp);
        realizado_acumulado.push(realizadoAcumuladoTemp);

        // b) Acompanhamento Plano (%)
        let acompPlano = 0;
        if (planoAcumuladoTemp > 0) {
            acompPlano = (realizadoAcumuladoTemp / planoAcumuladoTemp) * 100;
        }
        acompanhamento_plano.push(parseFloat(acompPlano.toFixed(1)));

        // c) NOVO CÁLCULO DE STATUS: Diferença Realizado Acumulado - Plano Acumulado
        const diferencaAcumulada = realizadoAcumuladoTemp - planoAcumuladoTemp;
        status_plano.push(diferencaAcumulada);

        // d) Totais para KPI Geral
        totalPlanoGeral += dayPlano;
        totalRealizadoGeral += dayRealizado;
    }

    // 2. Atualizar a Tabela com os valores calculados
    const DYNAMIC_GRADE_MAPPING = {
        'rowPlanoAcumulado': { array: plano_acumulado, field: 'plano_acumulado', editable: false, format: 'number' },
        'rowRealizadoAcumulado': { array: realizado_acumulado, field: 'realizado_acumulado', editable: false, format: 'number' },
        'rowAcompanhamento': { array: acompanhamento_plano, field: 'acompanhamento_plano', editable: false, format: 'percent' },
        'rowStatusPlano': { array: status_plano, field: 'status_plano', editable: false, format: 'status-diff' },
    };

    const calculatedRows = Object.keys(DYNAMIC_GRADE_MAPPING);


    calculatedRows.forEach(rowId => {
        const row = document.getElementById(rowId);
        const def = DYNAMIC_GRADE_MAPPING[rowId];
        if (!row || !def) return;

        DIAS_DE_TRABALHO.forEach((_, index) => {
            const cell = row.cells[index + 1];
            if (!cell) return;

            const value = def.array[index];

            // ⚠️ LIMPEZA E APLICAÇÃO DE CLASSES DE STATUS:
            cell.classList.remove('status-positivo', 'status-negativo');

            // Aplica a lógica de cor SÓ para a nova linha 'status-diff'
            if (def.format === 'status-diff') {
                cell.textContent = formatCellValue(value, 'number');

                if (value >= 0) {
                    cell.classList.add('status-positivo'); // Cor Verde (Para CSS)
                } else {
                    cell.classList.add('status-negativo'); // Cor Vermelha (Para CSS)
                }
            } else {
                // Mantém o tratamento para outras linhas
                cell.textContent = formatCellValue(value, def.format);
            }
        });
    });

    // 3. O bloco de atualização do Rodapé da Grade (rowTotals) foi removido aqui.
    // O total é agora exibido no KPI Panel superior.

    // 4. Atualizar o Painel de KPIs Acumulados (Gerais)
    updateKpiPanel(totalPlanoGeral, totalRealizadoGeral);
}

/**
 * Lida com a mudança de valor em qualquer célula de input.
 */
function handleInputChange(e) {
// ... (código handleInputChange existente) ...
    const input = e.target;
    const arrayIndex = parseInt(input.getAttribute('data-index'), 10);
    const field = input.getAttribute('data-field');

    const newValue = Math.max(0, parseInt(input.value, 10) || 0);

    input.value = newValue > 0 ? newValue : '';

    if (field === 'realizado_locacoes') realizado_locacoes[arrayIndex] = newValue;
    else if (field === 'locacoes_incorretas') locacoes_incorretas[arrayIndex] = newValue;
    else if (field === 'pecas_contadas') pecas_contadas[arrayIndex] = newValue;
    else if (field === 'pecas_incorretas') pecas_incorretas[arrayIndex] = newValue;

    updateGradeCalculationsAndKpis();
}


// =======================================================
// LÓGICA DE PERSISTÊNCIA E EVENTOS
// =======================================================

/**
 * Salva a estrutura completa dos arrays no Supabase.
 */
async function saveChangesToSupabase() {
// ... (código saveChangesToSupabase existente) ...
    const saveBtn = document.getElementById('saveChangesBtn');
    if (!saveBtn || saveBtn.disabled) return;

    saveBtn.textContent = 'Salvando...';
    saveBtn.disabled = true;

    updateGradeCalculationsAndKpis();

    // Garante que o status_plano seja enviado como array de números
    const statusPlanoNumerico = status_plano.map(num => Number(num) || 0);

    const dbPayload = {
        contract_id: contractId,
        mes_referencia: mesReferencia,

        plano_locacoes: plano_locacoes,
        realizado_locacoes: realizado_locacoes,
        locacoes_incorretas: locacoes_incorretas,
        pecas_contadas: pecas_contadas,
        pecas_incorretas: pecas_incorretas,

        plano_acumulado: plano_acumulado,
        realizado_acumulado: realizado_acumulado,
        acompanhamento_plano: acompanhamento_plano,
        status_plano: statusPlanoNumerico, // ENVIA ARRAY DE NÚMEROS
        data_geracao: new Date().toISOString()
    };

    const { error: saveError } = await supabaseClient
        .from(TARGET_GRADE_TABLE)
        .upsert(dbPayload, { onConflict: 'contract_id, mes_referencia' });

    if (saveError) {
        alert(`Erro ao salvar alterações: ${saveError.message}`);
        console.error('Supabase Save Error:', saveError);
        saveBtn.textContent = 'ERRO';
    } else {
        saveBtn.textContent = 'Salvo!';
    }

    setTimeout(() => {
        saveBtn.textContent = 'Salvar Alterações';
        saveBtn.disabled = false;
    }, 1500);
}

/**
 * Ponto de entrada da página da Grade.
 */
async function initializeGrade() {
    if (!loadContractConfig()) {
        return;
    }

    if (!await loadGradeDataFromSupabase()) {
        return;
    }

    if (DIAS_DE_TRABALHO.length === 0) {
        document.getElementById('gradeContractTitle').textContent = `Grade Cíclica - ${contractName} (${mesReferencia}) (Nenhum dia de inventário encontrado).`;
        return;
    }

    buildGradeHeader();
    fillDataCells();
    updateGradeCalculationsAndKpis();

    // ------------------------------------------------------------------
    // ⭐ AJUSTE: Inicializa a funcionalidade do dropdown da barra lateral
    // ------------------------------------------------------------------
    setupRotinasDropdown();
    // ------------------------------------------------------------------

    const backBtn = document.getElementById('backToConfigBtn');
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'Ciclico.html';
        });
    }

    const saveBtn = document.getElementById('saveChangesBtn');
    if(saveBtn) {
        saveBtn.addEventListener('click', saveChangesToSupabase);
    }
}


document.addEventListener('DOMContentLoaded', initializeGrade);