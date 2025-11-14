// Dash.js - Lógica para o Dashboard Cíclico (GRADE)

// 🚨 CREDENCIAIS SUPABASE (CHAVE ORIGINAL RESTAURADA E CORRIGIDA)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw'; // <-- CHAVE CORRIGIDA!
const { createClient } = supabase;

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

// 🚨 TABELAS
const CONTRATOS_TABLE = 'ciclico_contratos';
const GRADE_DATA_TABLE = 'ciclico_grade_dados';

// 🚨 Referências do DOM
const contractSelect = document.getElementById('contractSelect');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const updateDashBtn = document.getElementById('updateDashBtn');
const dashboardContent = document.getElementById('dashboardContent');
const loadingDashMessage = document.getElementById('loadingDashMessage');

// KPIs
const kpiPrazo = document.getElementById('kpiPrazo');
const kpiTotalLocacoes = document.getElementById('kpiTotalLocacoes');
const kpiRealizado = document.getElementById('kpiRealizado');
const kpiLocInc = document.getElementById('kpiLocInc');
const dataLastUpdate = document.getElementById('dataLastUpdate');

// Elementos de Configuração do Gráfico (IDs do HTML)
const chartSettingsIcon = document.getElementById('chartSettingsIcon');
const chartSettingsMenu = document.getElementById('chartSettingsMenu');

// Checkboxes de Configuração (Gráfico de Colunas/Linhas)
const chkContagem = document.getElementById('chkContagem');
const chkPlanejado = document.getElementById('chkPlanejado');
const chkStatus = document.getElementById('chkStatus');
const chkGrid = document.getElementById('chkGrid');
const chkEixoY = document.getElementById('chkEixoY');
const chkDataLabels = document.getElementById('chkDataLabels');
const chkDiaSemana = document.getElementById('chkDiaSemana');

// Novos controles de Gráfico
const chkStatusLabels = document.getElementById('chkStatusLabels');
const chkZeroLabels = document.getElementById('chkZeroLabels');
const chkLogScale = document.getElementById('chkLogScale');

// Checkboxes de Configuração (Gráfico de Pizza/Rosca)
const chkDonutPizza = document.getElementById('chkDonutPizza');
const chkDataLabelsPizza = document.getElementById('chkDataLabelsPizza');
const toggleCorLabelsPizza = document.getElementById('toggleCorLabelsPizza');
const radioCorLabelBranco = document.getElementById('radioCorLabelBranco');
const radioCorLabelPreto = document.getElementById('radioCorLabelPreto');


// ⭐️ NOVOS CONTROLES PARA KPI PRAZO ⭐️
// Referências para os inputs de rádio que controlam o modo de cálculo do KPI PRAZO
const radioPrazoModeDays = document.getElementById('radioPrazoModeDays');
const radioPrazoModeConditional = document.getElementById('radioPrazoModeConditional');
const radioPrazoModePercent = document.getElementById('radioPrazoModePercent');
const radioPrazoModeValue = document.getElementById('radioPrazoModeValue');


// Variáveis para Armazenar Dados Atuais do Gráfico
let currentDiasInventario = [];
let currentRealizadoLocacoes = [];
let currentPlanoLocacoes = [];
let currentStatusPlano = [];


// Instâncias de Gráfico
let realizadoPendenteChart;
let contagemDiariaChart;

// Mapa de Mês (Nomes completos em Português)
const MONTHS_MAP = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};
// =======================================================
// FUNÇÕES AUXILIARES
// =======================================================

/**
 * Converte o formato 'Nome_Completo_Mes' e 'YYYY' (do dropdown) para 'YYYY-MM' (da tabela mes_referencia).
 */
function formatDropdownToSupabaseMonth(mesNome, ano) {
    if (mesNome && ano) {
        // Encontra a chave (número) do mês
        const monthNumber = Object.keys(MONTHS_MAP).find(key => MONTHS_MAP[key] === mesNome);
        if (monthNumber) {
            return `${ano}-${monthNumber}`;
        }
    }
    return null;
}

/**
 * Retorna o número do mês (ex: '11' para 'Novembro').
 */
function getMonthNumberByName(mesNome) {
    return Object.keys(MONTHS_MAP).find(key => MONTHS_MAP[key] === mesNome);
}

function displayLoading(message) {
    loadingDashMessage.innerHTML = `<p>${message}</p>`;
    loadingDashMessage.style.display = 'block';
    dashboardContent.style.display = 'none';
}

/**
 * Retorna o nome abreviado do dia da semana em português.
 */
function getDiaSemanaAbreviado(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[date.getDay()];
}

// ----------------------------------------------------------------------
// ⭐️ LÓGICA DE CONTROLES E CÁLCULO DO KPI PRAZO (NOVO) ⭐️
// ----------------------------------------------------------------------

/**
 * Configura a lógica de abrir/fechar o dropdown de configurações do KPI Prazo
 * e adiciona listeners aos novos filtros de modo de cálculo.
 */
function setupPrazoSettingsDropdown() {
    const icon = document.getElementById('prazoSettingsIcon');
    const menu = document.getElementById('prazoSettingsMenu');

    if (icon && menu) {
        // Toggle menu on icon click
        icon.addEventListener('click', (event) => {
            event.stopPropagation();
            menu.classList.toggle('hidden');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!icon.contains(event.target) && !menu.contains(event.target)) {
                if (!menu.classList.contains('hidden')) {
                    menu.classList.add('hidden');
                }
            }
        });
    }

    // NOVO: Adiciona listeners aos controles de modo do KPI Prazo
    const prazoControls = [
        radioPrazoModeDays,
        radioPrazoModeConditional,
        radioPrazoModePercent,
        radioPrazoModeValue
    ];

    prazoControls.forEach(control => {
        if (control) {
            // Requisita a atualização do dashboard ao mudar o filtro de Prazo
            control.addEventListener('change', updateDashboard);
        }
    });

    // Define o modo padrão como Dias
    if (radioPrazoModeDays) {
        radioPrazoModeDays.checked = true;
    }
}

/**
 * Calcula e formata o KPI Prazo com base na regra selecionada (Modo Selecionado).
 * @param {object} gradeData - O objeto de dados do GRADE.
 * @param {string} mesSelecionado - Nome completo do mês selecionado.
 * @param {string} anoSelecionado - Ano selecionado.
 * @param {number} kpiRealizadoValue - O percentual de realizado (para checagem de "FINALIZADO").
 * @returns {string} O HTML formatado para o kpiPrazo.
 */
function calculateKpiPrazo(gradeData, mesSelecionado, anoSelecionado, kpiRealizadoValue) {
    const totalLocacoesMes = gradeData.total_locacoes;
    const currentDiasInventario = Array.isArray(gradeData.dias_inventario) ? gradeData.dias_inventario.map(String) : [];
    const currentStatusPlano = Array.isArray(gradeData.status_plano) ? gradeData.status_plano.map(Number) : [];

    // 1. Determina o modo selecionado
    // Verifica qual radio está checado, ou usa 'radioPrazoModeDays' como padrão
    const selectedMode = document.querySelector('input[name="prazo_mode"]:checked')?.id || 'radioPrazoModeDays';

    // Checagem de Finalização (100% Realizado)
    if (kpiRealizadoValue >= 100) {
        return `FINALIZADO <i class="fas fa-check-circle text-success ml-1" style="font-size: 0.8em;"></i>`;
    }

    // --- Lógica para o dia atual (necessária para os 3 novos modos) ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonthNum = getMonthNumberByName(mesSelecionado);
    const currentYear = parseInt(anoSelecionado);

    const currentMonthRef = new Date(currentYear, currentMonthNum - 1, 1);
    const todayMonthRef = new Date(today.getFullYear(), today.getMonth(), 1);

    let todayStatusValue = null;
    let todayIndex = -1;

    // Apenas busca o Status do Dia Atual se o mês selecionado for o mês corrente
    if (currentMonthRef.getTime() === todayMonthRef.getTime()) {
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        todayIndex = currentDiasInventario.indexOf(todayStr);

        if (todayIndex !== -1 && currentStatusPlano.length > todayIndex) {
            todayStatusValue = currentStatusPlano[todayIndex];
        }
    }

    // Se o modo for um dos novos e o Status do Dia Atual não puder ser determinado (mês passado/futuro ou dia sem dado), retorna N/A
    if (selectedMode !== 'radioPrazoModeDays' && todayStatusValue === null) {
        return `N/A <i class="fas fa-info-circle text-warning ml-1" style="font-size: 0.8em;"></i>`;
    }
    // -------------------------------------------------------------------


    switch (selectedMode) {
        case 'radioPrazoModeValue':
            // MODO: Valor Acumulado do Status (Realizado Acumulado)
            const signValue = todayStatusValue >= 0 ? '+' : '';
            const valueClass = todayStatusValue >= 0 ? 'text-success' : 'text-danger';

            // NOVO: Adiciona o texto "Locações atrasadas" (se for negativo) ou "Locações adiantadas" (se for positivo)
            let suffixText = '';
            if (todayStatusValue < 0) {
                suffixText = 'Locações atrasadas';
            } else if (todayStatusValue > 0) {
                suffixText = 'Locações adiantadas';
            } else {
                suffixText = 'Locações em dia';
            }

            return `<span class="${valueClass}">${signValue}${Math.abs(todayStatusValue).toLocaleString('pt-BR')}</span> <span class="text-muted" style="font-size: 0.75em; font-weight: normal;">${suffixText}</span>`;

        case 'radioPrazoModeConditional':
            // MODO: Status Condicional (ATRASADO/EM DIA/ADIANTADO)
            if (todayStatusValue < 0) {
                return 'ATRASADO <i class="fas fa-times-circle text-danger ml-1" style="font-size: 0.8em;"></i>';
            } else if (todayStatusValue >= 0 && todayStatusValue <= 50) {
                // Positivo (>=0) e até +50 locações
                return 'EM DIA <i class="fas fa-arrow-up text-success ml-1" style="font-size: 0.8em;"></i>';
            } else if (todayStatusValue > 50) {
                // Mais positiva que 50 locações
                return 'ADIANTADO <i class="fas fa-forward text-success ml-1" style="font-size: 0.8em;"></i>';
            }
            return 'N/A';

        case 'radioPrazoModePercent':
            // MODO: Percentual do Total
            if (totalLocacoesMes > 0) {
                const percent = Math.abs((todayStatusValue / totalLocacoesMes) * 100);
                const isPositive = todayStatusValue >= 0;
                const arrowClass = isPositive ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger';
                return `${percent.toFixed(1)}% <i class="fas ${arrowClass} ml-1" style="font-size: 0.8em;"></i>`;
            }
            return '0%';

        case 'radioPrazoModeDays':
        default:
            // MODO: Diferença em Dias (Padrão/Original)
            let prazoDiff = 0;
            let prazoText = 'N/A';
            let arrowIcon = '';

            // 1. Busca o último dia com Status Positivo (no mês selecionado)
            let lastStatusDate = null;
            for (let i = currentStatusPlano.length - 1; i >= 0; i--) {
                if (currentStatusPlano[i] > 0) {
                    const dateStr = currentDiasInventario[i];
                    if (dateStr) {
                        lastStatusDate = new Date(dateStr + 'T00:00:00');
                        break;
                    }
                }
            }

            if (lastStatusDate) {
                // 2. Determina a data de referência (Hoje ou Último Dia do Gráfico)
                const todayForDiff = new Date();
                todayForDiff.setHours(0, 0, 0, 0);

                let referenceDate;

                // Verifica se o mês selecionado é o mês atual
                if (currentMonthRef.getTime() === todayMonthRef.getTime()) {
                    referenceDate = todayForDiff;
                } else {
                    // Mês passado/futuro: Usa o último dia com dados do inventário/gráfico
                    const lastDataDateStr = currentDiasInventario[currentDiasInventario.length - 1];
                    referenceDate = new Date(lastDataDateStr + 'T00:00:00');
                }

                // Calcula a diferença de dias
                const MS_PER_DAY = 1000 * 60 * 60 * 24;
                const diffTime = lastStatusDate.getTime() - referenceDate.getTime();

                prazoDiff = Math.round(diffTime / MS_PER_DAY);
                const isPositive = prazoDiff >= 0;
                const sign = prazoDiff > 0 ? '+' : '';
                const arrowClass = isPositive ? 'fa-arrow-up text-success' : 'fa-arrow-down text-danger';
                arrowIcon = `<i class="fas ${arrowClass} ml-1" style="font-size: 0.8em;"></i>`;
                prazoText = `${sign}${prazoDiff} dias`;
            } else {
                arrowIcon = '';
                prazoText = 'N/A';
            }

            return `${prazoText} ${arrowIcon}`;
    }
}


// =======================================================
// LÓGICA DE CARREGAMENTO DE DATOS
// =======================================================

/**
 * Carrega a lista de contratos e popula o dropdown.
 */
async function loadContracts() {
    displayLoading("Carregando contratos...");

    const { data: contracts, error } = await supabaseClient
        .from(CONTRATOS_TABLE)
        .select('id, nome_contrato')
        .order('nome_contrato', { ascending: true });
    if (error) {
        console.error("Erro ao carregar contratos:", error);
        contractSelect.innerHTML = `<option value="">Erro ao carregar</option>`;
        displayLoading("Erro ao carregar contratos. Verifique a busca ou RLS.");
        return;
    }

    contractSelect.innerHTML = '<option value="">-- Selecione o Contrato --</option>';
    if (contracts.length > 0) {
        contracts.forEach(contract => {
            const option = document.createElement('option');
            option.value = contract.id;
            option.textContent = contract.nome_contrato;
            contractSelect.appendChild(option);
        });
    } else {
        contractSelect.innerHTML = `<option value="">Nenhum contrato encontrado</option>`;
        displayLoading("Nenhum contrato encontrado.");
    }

    displayLoading("Selecione o Contrato, Mês e Ano para carregar o Dashboard.");
}

/**
 * Carrega apenas os meses disponíveis para um contrato e ano específicos.
 */
async function loadMonthsByYear(contractId, selectedYear) {
    monthSelect.innerHTML = '<option value="">Carregando...</option>';
    if (!contractId || !selectedYear) {
        monthSelect.innerHTML = '<option value="">Selecione o Contrato/Ano</option>';
        return;
    }

    // Busca apenas os registros do ano selecionado
    const { data: records, error } = await supabaseClient
        .from(GRADE_DATA_TABLE)
        .select('mes_referencia')
        .eq('contract_id', contractId)
        .like('mes_referencia', `${selectedYear}-%`) // Filtra por 'YYYY-%'
        .order('mes_referencia', { ascending: false });
    if (error) {
        console.error("Erro ao carregar meses por ano:", error);
        monthSelect.innerHTML = `<option value="">Erro</option>`;
        return;
    }

    let uniqueMonths = new Set();
    let latestMonthYear = null;
    if (records.length > 0) {
        records
            .map(item => item.mes_referencia)
            .filter((value, index, self) => self.indexOf(value) === index)
            .forEach(monthYear => {
                const [, monthNum] = monthYear.split('-');
                if (MONTHS_MAP[monthNum]) {
                    uniqueMonths.add(MONTHS_MAP[monthNum]);
                }
                if (!latestMonthYear || monthYear > latestMonthYear) {
                    latestMonthYear = monthYear;
                }
            });
    }

    // Popula o Dropdown de Mês (Ordenado do mais recente para o mais antigo)
    monthSelect.innerHTML = '<option value="">-- Mês --</option>';
    Array.from(uniqueMonths).sort((a, b) => {
        const monthNumA = Object.keys(MONTHS_MAP).find(key => MONTHS_MAP[key] === a);
        const monthNumB = Object.keys(MONTHS_MAP).find(key => MONTHS_MAP[key] === b);
        return parseInt(monthNumB) - parseInt(monthNumA);
    }).forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    // Seleciona o mês mais recente do ano selecionado
    if (latestMonthYear) {
        const [, latestMonthNum] = latestMonthYear.split('-');
        monthSelect.value = MONTHS_MAP[latestMonthNum];
    } else {
        monthSelect.innerHTML = `<option value="">Nenhum dado mensal</option>`;
    }
}

/**
 * Carrega os anos disponíveis para o contrato selecionado e inicializa a carga dos meses.
 */
async function loadMonthsAndYearsByContract(contractId) {
    monthSelect.innerHTML = '<option value="">Carregando...</option>';
    yearSelect.innerHTML = '<option value="">Carregando...</option>';
    if (!contractId) {
        monthSelect.innerHTML = '<option value="">Selecione o Contrato</option>';
        yearSelect.innerHTML = '<option value="">Selecione o Contrato</option>';
        return;
    }

    const { data: records, error } = await supabaseClient
        .from(GRADE_DATA_TABLE)
        .select('mes_referencia')
        .eq('contract_id', contractId)
        .order('mes_referencia', { ascending: false })
        .limit(24);
    if (error) {
        console.error("Erro ao carregar meses/anos:", error);
        monthSelect.innerHTML = `<option value="">Erro</option>`;
        yearSelect.innerHTML = `<option value="">Erro</option>`;
        return;
    }

    let uniqueYears = new Set();
    let latestMonthYear = null;
    if (records.length > 0) {
        records
            .map(item => item.mes_referencia)
            .filter((value, index, self) => self.indexOf(value) === index)
            .forEach(monthYear => {
                const [year,] = monthYear.split('-');
                uniqueYears.add(year);
                if (!latestMonthYear || monthYear > latestMonthYear) {
                    latestMonthYear = monthYear;
                }
            });
    }

    // Popula o Dropdown de Ano
    yearSelect.innerHTML = '<option value="">-- Ano --</option>';
    let latestYear = null;
    Array.from(uniqueYears).sort((a, b) => parseInt(b) - parseInt(a))
        .forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
            if (!latestYear) latestYear = year; // Pega o ano mais recente para setar o valor
        });
    if (latestYear) {
        yearSelect.value = latestYear;
        // Chama a função para carregar os meses do ano mais recente
        loadMonthsByYear(contractId, latestYear);
    } else {
        monthSelect.innerHTML = `<option value="">Nenhum dado mensal</option>`;
        yearSelect.innerHTML = `<option value="">Nenhum dado anual</option>`;
    }
}

/**
 * Monta e exibe o dashboard com base na seleção de contrato, mês e ano.
 */
async function updateDashboard() {
    const contractId = contractSelect.value;
    const mesSelecionado = monthSelect.value;
    const anoSelecionado = yearSelect.value;
    if (!contractId || !mesSelecionado || !anoSelecionado ||
        mesSelecionado === 'Nenhum dado mensal' || anoSelecionado === 'Nenhum dado anual') {
        alert("Por favor, selecione o Contrato, Mês e Ano de Referência.");
        return;
    }

    displayLoading(`Carregando dados para ${mesSelecionado}/${anoSelecionado}...`);

    const mesReferenciaSupabase = formatDropdownToSupabaseMonth(mesSelecionado, anoSelecionado);
    // 1. Busca os dados agregados
    const { data: gradeData, error } = await supabaseClient
        .from(GRADE_DATA_TABLE)
        .select(`
            dias_uteis_ciclo,
            total_locacoes,
            realizado_locacoes,
            locacoes_incorretas,
            dias_inventario,
            plano_locacoes,
            status_plano,
            data_geracao
        `)
        .eq('contract_id', contractId)
        .eq('mes_referencia', mesReferenciaSupabase)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error("Erro ao buscar dados do GRADE:", error);
        displayLoading("Erro ao carregar dados. Verifique a busca ou RLS.");
        return;
    }

    if (!gradeData) {
        displayLoading(`Nenhum dado do Cíclico/GRADE encontrado para ${mesSelecionado}/${anoSelecionado}.`);
        return;
    }

    // 2. Cálculo de KPIs
    dashboardContent.style.display = 'block';
    loadingDashMessage.style.display = 'none';
    currentRealizadoLocacoes = gradeData.realizado_locacoes ? gradeData.realizado_locacoes.map(Number) : [];
    currentPlanoLocacoes = gradeData.plano_locacoes ? gradeData.plano_locacoes.map(Number) : [];
    currentStatusPlano = gradeData.status_plano ?
        gradeData.status_plano.map(Number) : [];
    currentDiasInventario = Array.isArray(gradeData.dias_inventario)
        ?
        gradeData.dias_inventario
        : (typeof gradeData.dias_inventario === 'string' ? JSON.parse(gradeData.dias_inventario) : []);
    const locacoesIncorretas = gradeData.locacoes_incorretas ? gradeData.locacoes_incorretas.map(Number) : [];

    // Variável que contém a soma das locações realizadas, ex: 4000
    const totalRealizado = currentRealizadoLocacoes.reduce((sum, current) => sum + current, 0);
    const totalIncorreto = locacoesIncorretas.reduce((sum, current) => sum + current, 0);
    const totalPendentes = gradeData.total_locacoes - totalRealizado;

    // KPI Realizado (Percentual)
    const kpiRealizadoValue = gradeData.total_locacoes > 0
        ?
        (totalRealizado / gradeData.total_locacoes) * 100
        : 0;

    const dataGeracao = gradeData.data_geracao ?
        new Date(gradeData.data_geracao).toLocaleString('pt-BR') : 'N/A';

    // ⭐️ ATUALIZAÇÃO: CALCULA E ATUALIZA KPI PRAZO COM BASE NO MODO SELECIONADO ⭐️
    const prazoHtml = calculateKpiPrazo(gradeData, mesSelecionado, anoSelecionado, kpiRealizadoValue);
    kpiPrazo.innerHTML = prazoHtml;


    // 3. Atualiza KPIs
    kpiTotalLocacoes.textContent = gradeData.total_locacoes.toLocaleString('pt-BR');
    kpiRealizado.textContent = `${kpiRealizadoValue.toFixed(1)}%`;
    // CORREÇÃO APLICADA: Mostra totalRealizado
    kpiLocInc.textContent = totalRealizado.toLocaleString('pt-BR');
    dataLastUpdate.textContent = `Última atualização: ${dataGeracao}`;

    // 4. Atualiza Gráficos
    drawRealizadoPendenteChart(totalRealizado, totalPendentes);
    applyChartSettings();
}

// =======================================================
// FUNÇÕES DE GRÁFICOS
// =======================================================

function drawRealizadoPendenteChart(realizado, pendente) {
    const ctx = document.getElementById('realizadoPendenteChart').getContext('2d');
    if (realizadoPendenteChart) {
        realizadoPendenteChart.destroy();
    }

    const showLabels = chkDataLabelsPizza ?
        chkDataLabelsPizza.checked : false;
    const isDonut = chkDonutPizza ? chkDonutPizza.checked : false;
    const labelColor = (radioCorLabelBranco && radioCorLabelBranco.checked) ?
        '#FFFFFF' : '#333333';

    const corRealizado = '#051039';
    const corPendente = '#FF0000';

    const dataValues = [realizado, pendente];
    const labels = ['Realizado', 'Pendente'];

    const chartType = isDonut ? 'doughnut' : 'pie';
    const cutoutPercentage = isDonut ?
        '50%' : '0%';

    realizadoPendenteChart = new Chart(ctx, {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: [
                    corRealizado,
                    corPendente
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive:
                true,
            maintainAspectRatio: false,
            cutout: cutoutPercentage,

            plugins: {
                datalabels: {
                    display: showLabels,
                    color: labelColor,


                    formatter: (value, context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        if (total === 0) return '0%';
                        const percentage = (value / total * 100).toFixed(1);
                        return percentage + '%';
                    },

                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    // Ajuste de contraste para rótulos brancos
                    textStrokeColor:
                        labelColor === '#FFFFFF' ?
                        '#000000' : 'transparent',
                    textStrokeWidth: labelColor === '#FFFFFF' ?
                        2 : 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 4,
                    padding: 6,
                    anchor: 'center',
                    align: 'center'
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 9 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const valorFormatado = value.toLocaleString('pt-BR');
                                    return {
                                        text: `${label}: ${valorFormatado}`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth,
                                        hidden: !chart.isDatasetVisible(0),
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.toLocaleString('pt-BR');
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = (context.parsed / total * 100).toFixed(1) + '%';
                            return ` ${context.label}: ${value} (${percentage})`;
                        }
                    }
                },
                title: {
                    display: false,
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function applyPizzaChartSettings() {
    if (realizadoPendenteChart) {
        const dataSet = realizadoPendenteChart.data.datasets[0].data;
        const totalRealizado = dataSet[0];
        const totalPendentes = dataSet[1];

        // Redesenha o gráfico de pizza com as novas configurações
        drawRealizadoPendenteChart(totalRealizado, totalPendentes);
    }
}

function applyChartSettings() {
    const showContagem = chkContagem.checked;
    const showPlanejado = chkPlanejado.checked;
    const showStatus = chkStatus.checked;
    const showGrid = chkGrid.checked;
    const showEixoY = chkEixoY.checked;
    const showDataLabels = chkDataLabels.checked;
    const formatDiaSemana = chkDiaSemana.checked;
    const selectedChartType = 'bar_line';
    const useLogScale = chkLogScale ? chkLogScale.checked : false;

    // NOVOS CONTROLES
    const showStatusLabels = chkStatusLabels ?
        chkStatusLabels.checked : false;
    const showZeroLabels = chkZeroLabels ? chkZeroLabels.checked : false;

    if (currentDiasInventario.length === 0) return;
    const labels = currentDiasInventario.map(dateStr => {
        const day = String(new Date(dateStr + 'T00:00:00').getDate()).padStart(2, '0');
        if (formatDiaSemana) {
            const dayOfWeek = getDiaSemanaAbreviado(dateStr);
            return `${day}-${dayOfWeek}`;
        }
        return day;
    });
    drawContagemDiariaChart(
        labels,
        currentRealizadoLocacoes,
        currentPlanoLocacoes,
        currentStatusPlano,
        {
            showContagem,
            showPlanejado,
            showStatus,
            showGrid,
            showEixoY,
            showDataLabels,
            chartType: selectedChartType,
            useLogScale: useLogScale,
            // PASSANDO OS NOVOS CONTROLES
            showStatusLabels: showStatusLabels,
            showZeroLabels: showZeroLabels,
        }
    );
}

function drawContagemDiariaChart(labels, contagens, planoLocacoes, statusPlano, settings) {
    const ctx = document.getElementById('contagemDiariaChart').getContext('2d');
    if (contagemDiariaChart) {
        contagemDiariaChart.destroy();
    }

    const corRealizado = '#051039';
    const corPlano = '#FF6600';
    const corStatusPlano = '#8A2BE2';

    // LÓGICA DO FORMATADOR DE RÓTULOS (Para Colunas - Trata o "0")
    const columnLabelFormatter = (value) => {
        // Se 'Mostrar Números' (chkDataLabels) estiver desligado, não mostra nada
        if (!settings.showDataLabels) return '';
        // Se 'Mostrar '0' nas Colunas Vazias' (chkZeroLabels) estiver ligado,
        // mostra '0' se o valor for 0, senão mostra o valor formatado
        if (settings.showZeroLabels) {
            return value.toLocaleString('pt-BR');
        }

        // Se 'Mostrar '0' nas Colunas Vazias' estiver desligado,
        // mostra o valor formatado APENAS se for > 0
        return value > 0 ?
            value.toLocaleString('pt-BR') : '';
    };

    const datasets = [];

    if (settings.showContagem) {
        datasets.push({
            label: 'Contagem',
            data: contagens,
            backgroundColor: corRealizado,
            borderColor: corRealizado,
            borderWidth: 1,
            type: 'bar',
            order: 3,
            datalabels: {
                // Ativa se qqr um dos dois controles de rótulos da coluna estiver ligado
                display: settings.showDataLabels || settings.showZeroLabels,
                anchor: 'end',
                align: 'end',
                offset: 2,
                font: {
                    size: 9,
                    weight: 'bold'
                },
                color: '#333333',
                // USA O NOVO FORMATTER
                formatter: columnLabelFormatter,
            }
        });
    }

    // ⭐️ NOVO DATASET PARA O RÓTULO ÚNICO DO PLANO ⭐️
    // Cria um array com o valor do 1º dia na última posição
    const labelPlanoData = new Array(planoLocacoes.length).fill(null);
    if (planoLocacoes.length > 0) {
        // Coloca o valor do 1º dia na última posição do array
        labelPlanoData[labelPlanoData.length - 1] = planoLocacoes[0];
    }

    if (settings.showPlanejado) {
        // 1. DATASET DA LINHA (Sem rótulos, apenas a linha)
        datasets.push({
            label: 'Planejado',
            data: planoLocacoes,
            type: 'line',
            borderColor: corPlano,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            order: 2,
            datalabels: {
                display: false
            }
        });
        // 2. DATASET DO RÓTULO ÚNICO (Um ponto invisível com rótulo)
        datasets.push({
            label: 'Planejado (Valor Base)',
            data: labelPlanoData, // Usa o array auxiliar com um único ponto
            type: 'line',
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0, // Ponto invisível
            pointHoverRadius: 0,
            fill: false,
            order: 2,
            datalabels: {
                // Ativa se a linha Planejado estiver marcada
                display: settings.showPlanejado,
                anchor: 'end',
                align: 'end',
                // Offset maior para ficar fora da área do gráfico (último dia)
                offset: 15,
                font: {
                    size: 9,
                    weight: 'bold'
                },
                color: corPlano,
                // Formata apenas o valor que não é null (o valor do
                // 1º dia)
                formatter: (value) => value !== null ?
                    value.toLocaleString('pt-BR') : '',
            }
        });
    }

    if (settings.showStatus) {
        datasets.push({
            label: 'Status',
            data: statusPlano,
            type: 'line',
            borderColor: corStatusPlano,
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [10, 5],
            // Pontos removidos na linha Status
            pointRadius: 0,
            pointHoverRadius: 0,
            fill: false,
            order: 1,
            datalabels: {
                // Rótulos de dados ATIVADOS E CONTROLADOS pela checkbox
                display: settings.showStatusLabels,
                // CORREÇÃO: Alinhamento para garantir que fique acima
                anchor: 'end',
                align: 'end',
                // Offset para separar da linha
                offset: 5,
                font: {
                    size: 9,
                    weight: 'bold'
                },
                color: corStatusPlano,
                // ⭐️ CORREÇÃO: Exibe o número APENAS se for maior que zero ⭐️
                formatter: (value) => value > 0 ?
                    value.toLocaleString('pt-BR') : '',
            }
        });
    }

    const visiveis = datasets.flatMap(d => d.data).filter(v => v !== null);
    // Filtra nulos/invisíveis
    const maxDataValue = visiveis.length > 0 ? Math.max(...visiveis) : 0;
    const maxYAxisValue = maxDataValue > 0 ? Math.ceil(maxDataValue * 1.3) : 10;

    const minYAxisValue = settings.useLogScale ? 1 : 0;
    contagemDiariaChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },

            plugins: {
                title: { display: false },
                legend:
                {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label:
                            function(context) {
                                const label = context.dataset.label || '';
                                // Garante que
                                // rótulos de dados invisíveis (nulls) não apareçam no tooltip
                                if (context.parsed.y === null || context.parsed.y === undefined) return
                                null;
                                const value = context.parsed.y.toLocaleString('pt-BR');
                                return ` ${label}: ${value}`;
                            }
                    }
                }
            },
            scales: {
                y: {
                    display: settings.showEixoY,
                    type: settings.useLogScale ?
                        'logarithmic' : 'linear',

                    min: minYAxisValue,
                    max: maxYAxisValue,

                    grid: {
                        display: settings.showGrid,
                        drawBorder: false
                    },
                    title: {
                        display: true,
                        text: settings.showEixoY ? 'Valores (Realizado vs Planos)' : '',
                        font: { size: 10 }
                    },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value, index, values) {
                            if (settings.useLogScale) {
                                const log10Value = Math.log10(value);
                                if (Number.isInteger(log10Value) || log10Value % 1 === 0.301 || log10Value % 1 === 0.699) {
                                    return value.toLocaleString('pt-BR');
                                }
                                return '';
                            }
                            return value.toLocaleString('pt-BR');
                        }
                    }
                },
                x: {
                    grid: { display: false, drawBorder: false },
                    title:
                    {
                        display: true,
                        text: settings.showEixoY ?
                            'Dia do Mês' : '',
                        font: { size: 10 }
                    },
                    ticks: { font: { size: 10 } }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


// =======================================================
// EVENT LISTENERS E INICIALIZAÇÃO
// =======================================================

function setupRotinasDropdown() {
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
}

function setupChartControls() {
    // 1. Toggle do Menu de Configurações
    if (chartSettingsIcon && chartSettingsMenu) {
        chartSettingsIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            chartSettingsMenu.classList.toggle('show');
        });
        document.addEventListener('click', (e) => {
            if (chartSettingsMenu.classList.contains('show') &&
                !chartSettingsIcon.contains(e.target) &&
                !chartSettingsMenu.contains(e.target)) {
                chartSettingsMenu.classList.remove('show');
            }
        });
    }

    // Toggle do Controle de Cor do Gráfico de Pizza
    if (toggleCorLabelsPizza) {
        const dropdownToggle = toggleCorLabelsPizza.querySelector('.dropdown-toggle');
        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleCorLabelsPizza.classList.toggle('open');
            });
        }
    }

    // 3. Adiciona Listener para todos os controles do GRÁFICO DE COLUNAS/LINHAS
    const controlsColuna = [
        chkContagem, chkPlanejado, chkStatus, chkGrid, chkEixoY,
        chkDataLabels, chkDiaSemana, chkLogScale,
        // NOVOS CONTROLES ADICIONADOS AQUI
        chkStatusLabels,
        chkZeroLabels
    ];
    controlsColuna.forEach(control => {
        if (control) {
            control.addEventListener('change', applyChartSettings);
        }
    });
    // 4. Adiciona Listener para os controles do GRÁFICO DE PIZZA
    const controlsPizza = [
        chkDataLabelsPizza, radioCorLabelBranco, radioCorLabelPreto,
        chkDonutPizza
    ];
    controlsPizza.forEach(control => {
        if (control) {
            control.addEventListener('change', applyPizzaChartSettings);
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega os contratos ao iniciar
    loadContracts();

    // 2. Adiciona Listener para o filtro de contrato
    contractSelect.addEventListener('change', (e) => {
        loadMonthsAndYearsByContract(e.target.value);
    });

    // NOVO: Adiciona Listener para o filtro de ano. Recarrega os meses do ano selecionado.
    yearSelect.addEventListener('change', (e) => {
        const contractId = contractSelect.value;
        const selectedYear = e.target.value;
        if (contractId && selectedYear) {
            loadMonthsByYear(contractId, selectedYear);
        } else {
            monthSelect.innerHTML = '<option value="">Selecione o Contrato/Ano</option>';
        }
    });

    // 3. Adiciona Listener para o botão de Atualizar Dashboard
    updateDashBtn.addEventListener('click', updateDashboard);

    // 4. Inicializa o dropdown de rotinas
    setupRotinasDropdown();

    // 5. Inicializa os controles
    // do gráfico
    setupChartControls();
    // 6. Inicializa o dropdown de configurações do KPI Prazo (NOVO)
    setupPrazoSettingsDropdown(); // Contém os listeners para os novos filtros de prazo

    // Define o estado inicial dos checkboxes de Colunas/Linhas
    if (chkContagem) chkContagem.checked = true;
    if (chkPlanejado) chkPlanejado.checked = true;
    if (chkStatus) chkStatus.checked = true;
    if (chkGrid) chkGrid.checked = false;
    if (chkEixoY) chkEixoY.checked = true;
    if (chkDataLabels) chkDataLabels.checked = true;
    if (chkDiaSemana) chkDiaSemana.checked = false;
    if (chkLogScale) chkLogScale.checked = false;
    // ESTADOS INICIAIS PARA OS NOVOS CONTROLES
    if (chkStatusLabels) chkStatusLabels.checked = true;
    if (chkZeroLabels) chkZeroLabels.checked = false;
    // AJUSTE PARA OS CONTROLES DO GRÁFICO DE PIZZA
    if (chkDonutPizza) chkDonutPizza.checked = true;
    if (chkDataLabelsPizza) chkDataLabelsPizza.checked = true;
    if (radioCorLabelBranco) radioCorLabelBranco.checked = true;
    if (radioCorLabelPreto) radioCorLabelPreto.checked = false;

    // ESTADO INICIAL PARA O NOVO CONTROLE KPI PRAZO
    if (radioPrazoModeDays) radioPrazoModeDays.checked = true;
});