// *****************************************************************
// CÓDIGO DashOne.js COMPLETO (Versão 5.0 - Filtros Fixos + Correção Cíclico)
// *****************************************************************

const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const TABELA_DADOS_INVENTORY = 'inventory_details';
const TABELA_CONTRATOS = 'contratos';
// Tabela para dados de Cíclico (Corrigido)
const TABELA_CICLICO = 'ciclico_grade_dados';

// Variáveis Globais
let supabaseClient;
let userProfile = {};
// availableDatesMap NÃO É MAIS USADO para popular filtros, mas é mantido.
let availableDatesMap = {};
let GLOBAL_CONTRACT_ID_TO_NAME = {};
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth() + 1;
let grossChartInstance;
let suspenseChartInstance;
let ciclicoChartInstance;

// DEFINIÇÃO DAS CORES
let PRIMARY_BLUE = '#004b87'; // Fallback (Será lido do CSS)
const CEVA_RED = '#E1271B'; // Vermelho para performance abaixo/mal
const CEVA_GREEN = '#388E3C'; // Cor Verde (para Cíclico Atingido)
const TARGET_COLOR = '#388E3C'; // Cor Verde Discreta para o Target
const TOGGLED_COLOR = '#231F20'; // Cor Preto/Chumbo para o Target ativado

const monthNames = [
    'Selecionar o mês', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// LISTA COMPLETA DOS CONTRATOS
const GLOBAL_CONTRACT_NAMES_LIST = [
    "DEVELON", "JCB", "ESSITY", "ASP", "LOGITECH", "STANLEY BLACK & DECKER",
    "CONVATEC", "UNILEVER", "TEREX", "TRIUMPH", "OMRON", "SEPHORA RETAIL",
    "SEPHORA E-STORE", "FAREVA"
];

// DADOS DOS TARGETS DE ACURACIDADE GROSS
const GLOBAL_TARGETS_MAP = {
    "DEVELON": { "GROSS": 95.70 },
    "JCB": { "GROSS": 99.70 },
    "ESSITY": { "GROSS": null },
    "ASP": { "GROSS": 99.70 },
    "LOGITECH": { "GROSS": 99.70 },
    "STANLEY BLACK & DECKER": { "GROSS": 99.70 },
    "CONVATEC": { "GROSS": 99.70 },
    "UNILEVER": { "GROSS": 99.70 },
    "TEREX": { "GROSS": 99.70 },
    "TRIUMPH": { "GROSS": 99.70 },
    "OMRON": { "GROSS": 80.70 },
    "SEPHORA RETAIL": { "GROSS": null },
    "SEPHORA E-STORE": { "GROSS": null },
    "FAREVA": { "GROSS": 99.70 },
};


// ----------------------------------------------------
// 1. INICIALIZAÇÃO E CONFIGURAÇÃO GLOBAL
// ----------------------------------------------------

const sessionDataJSON = localStorage.getItem('user_session_data');
let accessToken = SUPABASE_ANON_KEY;
if (sessionDataJSON) {
    try {
        const userData = JSON.parse(sessionDataJSON);
        userProfile = userData;
        if (userData.token) {
            accessToken = userData.token;
        }
    } catch (e) {
        console.error("Erro ao analisar dados da sessão para obter o token.", e);
    }
}

if (typeof supabase !== 'undefined' && supabase.createClient) {
    const { createClient } = supabase;
    supabaseClient = createClient(SUPABASE_URL, accessToken);
} else {
    console.error("A biblioteca Supabase não foi carregada. Verifique a tag <script> no HTML.");
}

// AJUSTE HIGHCHARTS (Configurado no DOMContentLoaded após a leitura do CSS)
if (typeof Highcharts !== 'undefined' && Highcharts.setOptions) {
    Highcharts.setOptions({
        colors: [
            PRIMARY_BLUE,
            CEVA_RED,
            CEVA_GREEN,
            '#231F20',
        ],
        chart: {
            style: {
                fontFamily: 'Roboto, sans-serif'
            }
        },
        credits: {
            enabled: false
        }
    });
}

// FUNÇÃO PARA LER VARIÁVEIS CSS
function getCssVariable(variable) {
    if (typeof window !== 'undefined' && window.getComputedStyle) {
        return window.getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    }
    return '';
}

document.addEventListener('DOMContentLoaded', () => {
    // LER A VARIÁVEL CSS E ATUALIZAR PRIMARY_BLUE
    const cssPrimaryColor = getCssVariable('--primary-color');
    if (cssPrimaryColor) {
        PRIMARY_BLUE = cssPrimaryColor;
        // Reconfigurar Highcharts com a cor correta
        if (typeof Highcharts !== 'undefined' && Highcharts.setOptions) {
            Highcharts.setOptions({
                colors: [PRIMARY_BLUE, CEVA_RED, CEVA_GREEN, '#231F20'],
                chart: { style: { fontFamily: 'Roboto, sans-serif' } },
                credits: { enabled: false }
            });
        }
    }

    loadUserProfile();
    loadFilterMasterDataAndSetupFilters();
    setupSettingsModal();

    // LÓGICA DE FECHAMENTO AO CLICAR FORA (Global)
    document.addEventListener('click', (e) => {
        const selectContainers = document.querySelectorAll('.custom-multi-select');
        selectContainers.forEach(container => {
            if (!container.contains(e.target) && container.classList.contains('open')) {
                container.classList.remove('open');
            }
        });

        // Lógica para fechar o modal se clicar fora dele e da engrenagem
        const settingsModal = document.getElementById('settingsModal');
        const settingsGear = document.getElementById('settingsGear');
        if (settingsModal && settingsGear && settingsModal.classList.contains('open') &&
            !settingsModal.contains(e.target) && !settingsGear.contains(e.target)) {
            settingsModal.classList.remove('open');
        }
    });
});

function loadUserProfile() {
    const userNameSpan = document.getElementById('userName');
    if (userNameSpan) {
        if (userProfile && userProfile.usuario) {
            let username = userProfile.usuario.toLowerCase();
            username = username.charAt(0).toUpperCase() + username.slice(1);
            userNameSpan.textContent = username;
        } else {
            userNameSpan.textContent = 'Usuário Desconhecido';
        }
    }
}

// ----------------------------------------------------
// 2. CONFIGURAÇÃO DE FILTROS (MÊS/ANO) - CUSTOMIZADOS
// ----------------------------------------------------

// NOVO: GERA A LISTA FIXA DE ANOS
function getFixedYears() {
    const currentYear = new Date().getFullYear();
    const futureYear = 2030;
    const years = [];
    for (let y = currentYear; y <= futureYear; y++) {
        years.push(String(y));
    }
    return years.sort().reverse(); // Do mais recente para o mais antigo
}

// NOVO: PREENCHE availableDatesMap COM TODOS OS MESES FIXOS (1 a 12)
function populateFixedAvailableDatesMap(years) {
    const fixedMap = {};
    const allMonths = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    years.forEach(year => {
        fixedMap[year] = allMonths;
    });
    return fixedMap;
}

async function loadFilterMasterDataAndSetupFilters() {
    // 1. Busca Contratos (para mapeamento ID -> Nome, usado em GROSS e SUSPENSE)
    try {
        const { data: contratos, error } = await supabaseClient
            .from(TABELA_CONTRATOS)
            .select('id, nome_contrato');

        if (error) throw error;
        contratos.forEach(c => {
             if (c.id && c.nome_contrato) {
                GLOBAL_CONTRACT_ID_TO_NAME[c.id] = c.nome_contrato;
             }
        });
    } catch (e) {
        console.warn("Erro ao buscar contratos (IDs) do Supabase.");
    }

    // -------------------------------------------------------
    // ALTERAÇÃO PRINCIPAL: FIXANDO A LISTA DE ANOS E MESES
    // -------------------------------------------------------

    const fixedYears = getFixedYears();
    availableDatesMap = populateFixedAvailableDatesMap(fixedYears);

    // Garante que o ano selecionado seja um ano da lista fixa
    if (!availableDatesMap[selectedYear]) {
        selectedYear = parseInt(fixedYears[0]); // Seleciona o ano mais recente por padrão
    }

    // Garante que o mês selecionado seja um mês válido (1 a 12)
    if (selectedMonth < 1 || selectedMonth > 12) {
        selectedMonth = new Date().getMonth() + 1;
    }


    // 2. Popula filtros e inicializa
    setupYearMultiSelect(fixedYears); // Usa a lista fixa de anos
    setupMonthMultiSelect();

    updateDashboard();
}

// Esta função é mantida, mas não influencia na população dos filtros de Mês/Ano.
function extractDateParts(dateSource) {
    if (dateSource && dateSource.length >= 7) {
        const year = dateSource.substring(0, 4);
        const month = parseInt(dateSource.substring(5, 7), 10);
        if (!availableDatesMap[year]) {
            availableDatesMap[year] = new Set();
        }
        availableDatesMap[year].add(month);
    }
}

// FUNÇÃO setupYearMultiSelect (mantida, mas usa a lista fixa)
function setupYearMultiSelect(years) {
    const anoDropdown = document.getElementById('anoDropdown');
    const anoContainer = document.getElementById('anoMultiSelectContainer');
    const anoDisplay = document.getElementById('anoDisplay');

    anoDropdown.innerHTML = '';

    let isCurrentYearAvailable = false;

    years.forEach(year => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'selectAno';
        input.value = year;

        if (parseInt(year) === selectedYear) {
            input.checked = true;
            isCurrentYearAvailable = true;
        }

        input.addEventListener('change', (e) => {
            selectedYear = parseInt(e.target.value);
            anoContainer.classList.remove('open');
            // Não precisa chamar setupMonthMultiSelect novamente pois a lista é fixa
            updateDashboard();
        });

        label.appendChild(input);
        label.appendChild(document.createTextNode(year));
        anoDropdown.appendChild(label);
    });

    if (years.length > 0 && !isCurrentYearAvailable) {
        selectedYear = parseInt(years[0]);
        const defaultYearRadio = anoDropdown.querySelector(`input[value="${selectedYear}"]`);
        if (defaultYearRadio) {
            defaultYearRadio.checked = true;
        }
    } else if (years.length === 0 && anoDisplay) {
        anoDisplay.textContent = 'Sem dados';
    }

    updateYearDisplay();

    if (anoDisplay) {
        anoDisplay.onclick = null;
        anoDisplay.onclick = (e) => {
            document.getElementById('mesMultiSelectContainer').classList.remove('open');
            anoContainer.classList.toggle('open');
            e.stopPropagation();
        };
    }
}

function updateYearDisplay() {
    const anoDisplay = document.getElementById('anoDisplay');
    if (anoDisplay) {
        anoDisplay.textContent = selectedYear;
    }
}

// FUNÇÃO setupMonthMultiSelect (AJUSTADA: Lista de meses FIXA 1-12)
function setupMonthMultiSelect() {
    const mesDropdown = document.getElementById('mesDropdown');
    const mesContainer = document.getElementById('mesMultiSelectContainer');
    const mesDisplay = document.getElementById('mesDisplay');

    mesDropdown.innerHTML = '';

    // ALTERADO: Lista de meses FIXA (1 a 12)
    const availableMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    let isCurrentMonthSelected = false;

    availableMonths.forEach(monthNumber => {
        const monthName = monthNames[monthNumber];
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = monthNumber;

        label.appendChild(input);
        label.appendChild(document.createTextNode(monthName));

        // Mantém o estado de seleção
        if (monthNumber === selectedMonth) {
            input.checked = true;
            isCurrentMonthSelected = true;
        }

        input.addEventListener('change', (e) => {
            updateDashboard();
        });

        mesDropdown.appendChild(label);
    });

    // Garante que pelo menos um mês seja selecionado na inicialização
    if(availableMonths.length > 0 && !isCurrentMonthSelected) {
        // Seleciona o mês atual do calendário por padrão
        const defaultMonth = new Date().getMonth() + 1;
        selectedMonth = defaultMonth;
        const defaultMonthCheckbox = mesDropdown.querySelector(`input[value="${defaultMonth}"]`);
        if (defaultMonthCheckbox) {
            defaultMonthCheckbox.checked = true;
        }
    } else if (availableMonths.length === 0 && mesDisplay) {
        mesDisplay.textContent = 'Sem dados';
    }

    updateMonthDisplay();

    if (mesDisplay) {
        mesDisplay.onclick = null;
        mesDisplay.onclick = (e) => {
            document.getElementById('anoMultiSelectContainer').classList.remove('open');
            mesContainer.classList.toggle('open');
            e.stopPropagation();
        };
    }
}

function getSelectedMonths() {
    const checkboxes = document.querySelectorAll('#mesDropdown input[type="checkbox"]:checked');
    const months = Array.from(checkboxes).map(cb => parseInt(cb.value));
    return months;
}

function updateMonthDisplay() {
    const months = getSelectedMonths();
    const mesDisplay = document.getElementById('mesDisplay');

    if (mesDisplay) {
        if (months.length === 0) {
            mesDisplay.textContent = 'Selecionar o mês';
        } else if (months.length === 1) {
            mesDisplay.textContent = monthNames[months[0]];
        } else {
            mesDisplay.textContent = `${months.length} meses selecionados`;
        }
    }
}

function setupSettingsModal() {
    const settingsGear = document.getElementById('settingsGear');
    const settingsModal = document.getElementById('settingsModal');
    const closeButton = document.getElementById('closeSettingsModal');

    if (settingsGear && settingsModal) {
        settingsGear.addEventListener('click', (e) => {
            e.stopPropagation();
            settingsModal.classList.toggle('open');

            // Garante que nenhum dropdown de filtro esteja aberto ao abrir o modal
            document.querySelectorAll('.custom-multi-select.open').forEach(el => el.classList.remove('open'));

            // RECRIA A LEGENDA CADA VEZ QUE O MODAL É ABERTO
            if (grossChartInstance) {
                createCustomLegend(grossChartInstance);
            }
        });

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                settingsModal.classList.remove('open');
            });
        }
    }
}

// ----------------------------------------------------
// 3. LÓGICA DO DASHBOARD (Múltiplos Gráficos)
// ----------------------------------------------------

/**
 * Função utilitária para calcular o máximo do eixo Y
 * @param {number[]} dataArray - Array de valores numéricos das séries.
 * @returns {number} O valor máximo do eixo Y arredondado para cima.
 */
function calculateMaxYAxis(dataArray) {
    if (!dataArray || dataArray.length === 0) return 100;

    // Encontra o valor máximo em todas as séries de dados
    const maxVal = Math.max(...dataArray.filter(v => typeof v === 'number' && !isNaN(v)));

    if (maxVal === -Infinity || maxVal === 0) {
        return 10; // Retorna um valor base se não houver dados
    }

    // Calcula 30% a mais
    let maxY = maxVal * 1.30;

    // Arredonda para o múltiplo de 10 ou 5 mais próximo para um eixo limpo
    if (maxY > 1000) {
        return Math.ceil(maxY / 500) * 500; // Arredonda para o múltiplo de 500 (para valores altos)
    } else if (maxY > 100) {
        return Math.ceil(maxY / 100) * 100; // Arredonda para o múltiplo de 100
    } else if (maxY > 10) {
        return Math.ceil(maxY / 10) * 10; // Arredonda para o múltiplo de 10
    }
    return Math.ceil(maxY);
}


// --- Funções Comuns (Legenda e Update) ---

function createCustomLegend(chart) {
    const legendContainer = document.getElementById('customLegendContainer');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';

    // Nomes das séries que queremos na legenda (Apenas GROSS tem Target)
    const seriesData = [
        { name: 'Acuracidade GROSS', id: 'grossSeriesId', color: PRIMARY_BLUE, shape: 'circle' },
        { name: 'TARGET', id: 'targetSeriesId', color: TARGET_COLOR, shape: 'square' }
    ];

    seriesData.forEach(data => {
        const series = chart.get(data.id) || chart.series.find(s => s.name === data.name);
        if (!series) return;

        const isVisible = series.visible;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'custom-legend-item';
        itemDiv.dataset.seriesId = series.options.id || series.name;

        const markerSpan = document.createElement('span');
        markerSpan.className = `custom-legend-marker ${data.shape}`;
        markerSpan.style.backgroundColor = isVisible ? data.color : '#ccc';
        markerSpan.style.borderColor = data.color;

        const textSpan = document.createElement('span');
        textSpan.textContent = data.name;
        textSpan.style.color = isVisible ? '#333' : '#aaa';

        itemDiv.appendChild(markerSpan);
        itemDiv.appendChild(textSpan);

        itemDiv.addEventListener('click', () => {
            toggleSeriesVisibility(series, itemDiv, data);
        });

        legendContainer.appendChild(itemDiv);
    });
}

function toggleSeriesVisibility(series, legendItemDiv, data) {
    const isVisible = series.visible;
    const newVisibility = !isVisible;

    series.setVisible(newVisibility, false);

    const marker = legendItemDiv.querySelector('.custom-legend-marker');
    const text = legendItemDiv.querySelector('span:last-child');

    marker.style.backgroundColor = newVisibility ? data.color : '#ccc';
    text.style.color = newVisibility ? '#333' : '#aaa';

    series.chart.redraw();
}

/**
 * Função principal para buscar dados e renderizar TODOS os gráficos.
 */
function updateDashboard() {
    updateYearDisplay();
    updateMonthDisplay();
    const months = getSelectedMonths();

    const chartPanel2 = document.getElementById('chartPanel2'); // GROSS
    const chartPanel3 = document.getElementById('chartPanel3'); // SUSPENSE
    const chartPanel4 = document.getElementById('chartPanel4'); // CÍCLICO

    const placeholderText = 'Selecione um ou mais meses e ano para carregar o conteúdo.';

    if (months.length === 0 || GLOBAL_CONTRACT_NAMES_LIST.length === 0) {
        const message = (GLOBAL_CONTRACT_NAMES_LIST.length === 0) ? 'Carregando contratos...' : placeholderText;
        if (chartPanel2) chartPanel2.innerHTML = `<p style="text-align:center; color:#999; margin-top: 10px;">${message}</p>`;
        if (chartPanel3) chartPanel3.innerHTML = `<p style="text-align:center; color:#999; margin-top: 10px;">${message}</p>`;
        if (chartPanel4) chartPanel4.innerHTML = `<p style="text-align:center; color:#999; margin-top: 10px;">${message}</p>`;
        return;
    }

    // O formato de data para Inventory (que usa reference_month)
    const formattedDatesInventory = months.map(m =>
        `${selectedYear}-${String(m).padStart(2, '0')}-01`
    );
    // O formato de mês para Cíclico (que usa mes_referencia 'YYYY-MM')
    const formattedMonthsCiclico = months.map(m =>
        `${selectedYear}-${String(m).padStart(2, '0')}`
    );


    // 1. Renderiza GROSS (Acuracidade) - USA TABELA_DADOS_INVENTORY
    fetchAndRenderGrossChart(formattedDatesInventory, chartPanel2);

    // 2. Renderiza SUSPENSE (Acuracidade) - USA TABELA_DADOS_INVENTORY
    fetchAndRenderSuspenseChart(formattedDatesInventory, chartPanel3);

    // 3. Renderiza CÍCLICO - USA TABELA_CICLICO
    fetchAndRenderCiclicoChart(formattedMonthsCiclico, chartPanel4);
}

// --- GRÁFICO 1: GROSS (Acuracidade com Target) ---

async function fetchAndRenderGrossChart(formattedDates, targetElement) {
    if (!targetElement) return;

    targetElement.innerHTML = `<div id="grossChartContainer" class="chart-container" style="height: 100%;">Carregando Acuracidade GROSS...</div>`;

    const chartContainer = document.getElementById('grossChartContainer');

    try {
        const { data: grossData, error } = await supabaseClient
            .from(TABELA_DADOS_INVENTORY)
            .select('contract_id, gross_percent')
            .in('reference_month', formattedDates)
            .not('gross_percent', 'is', null);

        if (error) throw error;

        const { contractNames, grossSeries, targetSeries, dataWithColor } = prepareGrossChartData(grossData);

        renderGrossChart(contractNames, grossSeries, targetSeries, dataWithColor, chartContainer);

    } catch (e) {
        console.error("Erro ao buscar dados de GROSS:", e.message || e);
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar dados de GROSS.</p>';
        }
    }
}

function prepareGrossChartData(grossData) {
    const contractsSummary = {};
    const allContractNames = GLOBAL_CONTRACT_NAMES_LIST.slice().sort();

    allContractNames.forEach(name => {
        contractsSummary[name] = { sum: 0, count: 0, average: 0 };
    });

    grossData.forEach(item => {
        const contractName = GLOBAL_CONTRACT_ID_TO_NAME[item.contract_id];
        const grossPercent = parseFloat(item.gross_percent);

        if (contractName && contractsSummary[contractName]) {
            if (!isNaN(grossPercent)) {
                contractsSummary[contractName].sum += grossPercent;
                contractsSummary[contractName].count += 1;
            }
        }
    });

    const grossSeries = [];
    const contractNames = [];
    const targetSeries = [];
    const dataWithColor = [];

    for (const name of allContractNames) {
        const entry = contractsSummary[name];
        let average = 0;
        if (entry.count > 0) {
            average = entry.sum / entry.count;
        }

        const grossValue = parseFloat(average.toFixed(2));
        contractNames.push(name);
        grossSeries.push(grossValue);

        const target = GLOBAL_TARGETS_MAP[name]?.GROSS;
        const targetValue = (target !== null && target !== undefined) ? target : null;

        // --- LÓGICA DE COR CONDICIONAL ---
        let columnColor;

        if (targetValue !== null) {
            if (grossValue >= targetValue) {
                // MAIOR ou IGUAL ao TARGET: Cor Azul do Menu (PRIMARY_BLUE)
                columnColor = PRIMARY_BLUE;
            } else {
                // MENOR que o TARGET: Cor Vermelha (CEVA_RED)
                columnColor = CEVA_RED;
            }
        } else {
            // Se não houver Target, usa a cor padrão (PRIMARY_BLUE)
            columnColor = PRIMARY_BLUE;
        }

        dataWithColor.push({
            y: grossValue,
            color: columnColor
        });

        if (targetValue !== null) {
            targetSeries.push({
                y: targetValue,
                name: name,
                isToggled: false,
                marker: {
                    fillColor: TARGET_COLOR,
                    lineColor: TARGET_COLOR,
                }
            });
        } else {
            targetSeries.push(null);
        }
    }

    return { contractNames, grossSeries, targetSeries, dataWithColor };
}


function renderGrossChart(contractNames, grossSeries, targetSeries, dataWithColor, containerElement) {
    if (typeof Highcharts === 'undefined' || !containerElement) {
        console.error("Highcharts não está carregado ou container não encontrado.");
        return;
    }

    Highcharts.chart(containerElement, {
        chart: {
            type: 'column',
            style: { fontFamily: 'Roboto, sans-serif' },
            events: {
                load: function() {
                    grossChartInstance = this;
                    createCustomLegend(this);
                },
                redraw: function() {}
            }
        },
        title: { text: null },
        accessibility: { enabled: false },
        xAxis: {
            categories: contractNames,
            title: { text: null },
            labels: { enabled: true, rotation: -45, style: { fontSize: '10px' } },
            endOnTick: false,
            maxPadding: 0.1
        },
        yAxis: {
            min: 0,
            max: 100, // Eixo Fixo para Percentual
            title: { text: 'Percentual (%)' },
            labels: { format: '{value}%' }
        },
        legend: { enabled: false },
        tooltip: {
            shared: true,
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>{point.y:.2f}%</b><br/>'
        },
        plotOptions: {
            column: { pointPadding: 0.3, groupPadding: 0.1, borderWidth: 0 },
            series: { cursor: 'pointer' }
        },
        series: [{
            name: 'Acuracidade GROSS',
            id: 'grossSeriesId',
            type: 'column',
            data: dataWithColor,
            dataLabels: {
                enabled: true,
                format: '{y:.1f}%',
                style: { fontSize: '10px' }
            }
        }, {
            name: 'TARGET',
            id: 'targetSeriesId',
            type: 'scatter',
            color: TARGET_COLOR,
            data: targetSeries,
            dataLabels: { enabled: false, format: '{y:.2f}%', verticalAlign: 'top', y: 5, style: { color: TOGGLED_COLOR, fontWeight: 'bold', fontSize: '10px', textOutline: '1px solid white' } },
            marker: { symbol: 'square', lineWidth: 0, radius: 4, height: 2, width: 15, enabled: true },
            tooltip: { pointFormat: 'Target: <b>{point.y:.2f}%</b>' },
            showInLegend: false,
            point: {
                events: {
                    click: function() {
                        const isToggled = this.isToggled;
                        const newColor = isToggled ? TARGET_COLOR : TOGGLED_COLOR;
                        const newToggleState = !isToggled;
                        this.update({
                            marker: { fillColor: newColor, lineColor: newColor },
                            dataLabels: { enabled: newToggleState },
                            isToggled: newToggleState
                        }, true);
                    }
                }
            }
        }]
    });
}


// --- GRÁFICO 2: SUSPENSE (Acuracidade SEM Target) ---

async function fetchAndRenderSuspenseChart(formattedDates, targetElement) {
    if (!targetElement) return;

    targetElement.innerHTML = `<div id="suspenseChartContainer" class="chart-container" style="height: 100%;">Carregando Acuracidade SUSPENSE...</div>`;
    const chartContainer = document.getElementById('suspenseChartContainer');

    try {
        const { data: suspenseData, error } = await supabaseClient
            .from(TABELA_DADOS_INVENTORY)
            .select('contract_id, suspense_value')
            .in('reference_month', formattedDates)
            .not('suspense_value', 'is', null);

        if (error) throw error;

        const { contractNames, dataWithColor, maxSuspense } = prepareSuspenseChartData(suspenseData);

        renderSuspenseChart(contractNames, dataWithColor, maxSuspense, chartContainer);

    } catch (e) {
        console.error("Erro ao buscar dados de SUSPENSE:", e.message || e);
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar dados de SUSPENSE.</p>';
        }
    }
}

function prepareSuspenseChartData(suspenseData) {
    const contractsSummary = {};
    const allContractNames = GLOBAL_CONTRACT_NAMES_LIST.slice().sort();

    allContractNames.forEach(name => {
        contractsSummary[name] = { sum: 0, count: 0, average: 0 };
    });

    suspenseData.forEach(item => {
        const contractName = GLOBAL_CONTRACT_ID_TO_NAME[item.contract_id];
        const suspenseValue = parseFloat(item.suspense_value);

        if (contractName && contractsSummary[contractName]) {
            if (!isNaN(suspenseValue)) {
                contractsSummary[contractName].sum += suspenseValue;
                contractsSummary[contractName].count += 1;
            }
        }
    });

    const suspenseSeriesValues = [];
    const contractNames = [];
    let maxSuspense = 0;

    for (const name of allContractNames) {
        const entry = contractsSummary[name];
        let average = 0;
        if (entry.count > 0) {
            average = entry.sum / entry.count;
        }

        const suspenseValue = parseFloat(average.toFixed(2));
        contractNames.push(name);
        suspenseSeriesValues.push(suspenseValue);

        if (suspenseValue > maxSuspense) {
            maxSuspense = suspenseValue;
        }
    }

    // Todas as colunas são PRIMARY_BLUE
    const dataWithColor = suspenseSeriesValues.map(y => ({
        y: y,
        color: PRIMARY_BLUE
    }));

    return { contractNames, dataWithColor, maxSuspense };
}


function renderSuspenseChart(contractNames, dataWithColor, maxVal, containerElement) {
    if (typeof Highcharts === 'undefined' || !containerElement) return;

    // Calcula o eixo Y dinamicamente (maior valor + 30%)
    const maxYAxis = calculateMaxYAxis(dataWithColor.map(d => d.y));

    Highcharts.chart(containerElement, {
        chart: {
            type: 'column',
            style: { fontFamily: 'Roboto, sans-serif' },
            events: {
                load: function() { suspenseChartInstance = this; }
            }
        },
        title: { text: null },
        accessibility: { enabled: false },
        xAxis: {
            categories: contractNames,
            title: { text: null },
            labels: { enabled: true, rotation: -45, style: { fontSize: '10px' } },
        },
        yAxis: {
            min: 0,
            max: maxYAxis, // Eixo Y Dinâmico
            title: { text: 'Valor (R$)' },
            labels: {
                formatter: function () {
                    if (this.value >= 1000000) return (this.value / 1000000).toFixed(1) + 'M';
                    if (this.value >= 1000) return (this.value / 1000).toFixed(1) + 'K';
                    return this.value;
                }
            }
        },
        legend: { enabled: false },
        tooltip: {
            shared: false,
            pointFormat: '<span style="color:{point.color}">\u25CF</span> {series.name}: <b>R$ {point.y:,.2f}</b><br/>'
        },
        plotOptions: {
            column: { pointPadding: 0.3, groupPadding: 0.1, borderWidth: 0 },
        },
        series: [{
            name: 'Acuracidade SUSPENSE (R$)',
            id: 'suspenseSeriesId',
            type: 'column',
            data: dataWithColor, // Todas as colunas são PRIMARY_BLUE
            dataLabels: {
                enabled: true,
                format: '{y:,.0f}',
                style: { fontSize: '10px' }
            }
        }]
    });
}


// --- GRÁFICO 3: CÍCLICO (Projetado vs Realizado com Cores Condicionais) ---

async function fetchAndRenderCiclicoChart(formattedMonths, targetElement) {
    if (!targetElement) return;

    targetElement.innerHTML = `<div id="ciclicoChartContainer" class="chart-container" style="height: 100%;">Carregando Cíclico...</div>`;
    const chartContainer = document.getElementById('ciclicoChartContainer');

    try {
        const { data: ciclicoData, error } = await supabaseClient
            .from(TABELA_CICLICO) // CORRIGIDO: Nova tabela
            .select('contract_name, mes_referencia, total_locacoes, realizado_locacoes') // CORRIGIDO: Novas colunas
            .in('mes_referencia', formattedMonths); // CORRIGIDO: Novo filtro de data

        if (error) throw error;

        const { contractNames, plannedSeries, realizedSeries, combinedMax } = prepareCiclicoChartData(ciclicoData);

        renderCiclicoChart(contractNames, plannedSeries, realizedSeries, combinedMax, chartContainer);

    } catch (e) {
        // Agora mostra a mensagem exata do Supabase
        console.error("Erro ao buscar dados de CÍCLICO:", e.message || e);
        if (chartContainer) {
            chartContainer.innerHTML = '<p style="color:red; text-align:center;">Erro ao carregar dados de CÍCLICO.</p>';
        }
    }
}

function prepareCiclicoChartData(ciclicoData) {
    const contractsSummary = {};
    const allContractNames = GLOBAL_CONTRACT_NAMES_LIST.slice().sort();

    allContractNames.forEach(name => {
        contractsSummary[name] = { plannedSum: 0, realizedSum: 0, count: 0 };
    });

    ciclicoData.forEach(item => {
        const contractName = item.contract_name; // USANDO contract_name
        const planned = parseFloat(item.total_locacoes) || 0; // TOTAL PROJETADO
        const realizedArray = item.realizado_locacoes; // ARRAY DE REALIZADO

        if (contractName && contractsSummary[contractName]) {
            // 1. Soma do Projetado
            contractsSummary[contractName].plannedSum += planned;

            // 2. Soma do Realizado (Soma dos itens no Array)
            if (Array.isArray(realizedArray)) {
                const totalRealizedForMonth = realizedArray.reduce((acc, val) => {
                    const num = parseFloat(val);
                    return acc + (isNaN(num) ? 0 : num);
                }, 0);
                contractsSummary[contractName].realizedSum += totalRealizedForMonth;
                contractsSummary[contractName].count += 1;
            }
        }
    });

    const contractNames = [];
    const plannedSeries = [];
    const realizedSeries = [];
    let allValues = [];

    for (const name of allContractNames) {
        const entry = contractsSummary[name];

        // SOMA de todos os meses selecionados
        const plannedValue = parseFloat(entry.plannedSum.toFixed(0));
        const realizedValue = parseFloat(entry.realizedSum.toFixed(0));

        // Pular contratos sem dados
        if (plannedValue === 0 && realizedValue === 0) continue;

        contractNames.push(name);
        plannedSeries.push(plannedValue);
        allValues.push(plannedValue);

        // Lógica de Cor Condicional para REALIZADO
        let realizedColor = CEVA_RED;
        if (realizedValue >= plannedValue) {
            realizedColor = CEVA_GREEN; // Atingiu ou superou o projetado
        } else {
            realizedColor = CEVA_RED; // Abaixo do projetado
        }

        realizedSeries.push({
            y: realizedValue,
            color: realizedColor
        });
        allValues.push(realizedValue);
    }

    // Calcula o máximo do eixo Y
    const combinedMax = calculateMaxYAxis(allValues);

    return { contractNames, plannedSeries, realizedSeries, combinedMax };
}


function renderCiclicoChart(contractNames, plannedSeries, realizedSeries, maxYAxis, containerElement) {
    if (typeof Highcharts === 'undefined' || !containerElement) return;

    Highcharts.chart(containerElement, {
        chart: {
            type: 'column',
            style: { fontFamily: 'Roboto, sans-serif' },
            events: {
                load: function() { ciclicoChartInstance = this; }
            }
        },
        title: { text: null },
        accessibility: { enabled: false },
        xAxis: {
            categories: contractNames,
            title: { text: null },
            labels: { enabled: true, rotation: -45, style: { fontSize: '10px' } },
        },
        yAxis: {
            min: 0,
            max: maxYAxis, // Eixo Y Dinâmico
            title: { text: 'Contagem (Qtd)' },
            labels: {
                formatter: function () {
                    if (this.value >= 1000) return (this.value / 1000).toFixed(0) + 'K';
                    return this.value;
                }
            }
        },
        legend: {
            enabled: true,
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'top',
            itemStyle: {
                fontSize: '10px'
            }
        },
        tooltip: {
            shared: true,
            pointFormat: '<span style="color:{series.color}">\u25CF</span> {series.name}: <b>{point.y:,.0f}</b><br/>'
        },
        plotOptions: {
            column: {
                pointPadding: 0.1,
                groupPadding: 0.2,
                borderWidth: 0,
                dataLabels: {
                    enabled: true,
                    format: '{y:,.0f}',
                    style: { fontSize: '9px' }
                }
            },
        },
        series: [{
            name: 'Cíclico Projetado',
            id: 'plannedSeriesId',
            color: PRIMARY_BLUE, // Azul Marinho
            data: plannedSeries,
        }, {
            name: 'Cíclico Realizado',
            id: 'realizedSeriesId',
            data: realizedSeries, // Cores condicionais definidas no prepareCiclicoChartData
        }]
    });
}