// *****************************************************************
// CÓDIGO Menu.js COMPLETO (FINAL: Com % Realizado e Total Planejado DENTRO do Donut - Fonte da % reduzida para 14px)
// *****************************************************************

// Configurações do Supabase
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const TABELA_CICLICO = 'ciclico_grade_dados';

let supabaseClient;
const PRIMARY_BLUE = '#051039';
const CEVA_RED = '#E1271B'; // Usando CEVA_RED para o que não está completo/realizado
const COMPLETE_GREEN = '#28a745'; // Para o que está 100% ou quase

// Variáveis Globais para o Filtro
let currentSelectedYear = null;
let currentSelectedMonth = null;
let allAvailableDates = [];

const monthNames = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
};


/**
 * ------------------------------------------------------------------
 * 1. INICIALIZAÇÃO E FUNÇÕES DE SUPORTE
 * ------------------------------------------------------------------
 */

function initializeDashboard() {
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        const { createClient } = supabase;
        const sessionDataJSON = localStorage.getItem('user_session_data');
        let accessToken = SUPABASE_ANON_KEY;
        if (sessionDataJSON) {
            try {
                const userData = JSON.parse(sessionDataJSON);
                if (userData.token) {
                    accessToken = userData.token || SUPABASE_ANON_KEY;
                }
            } catch (e) { /* silent */ }
        }
        supabaseClient = createClient(SUPABASE_URL, accessToken);
        window.supabaseClient = supabaseClient;
    }

    if (typeof Highcharts !== 'undefined' && Highcharts.setOptions) {
        Highcharts.setOptions({
            chart: { style: { fontFamily: 'Montserrat, Open Sans, sans-serif' } },
            credits: { enabled: false }
        });
    }
}


/**
 * Função global showToast (função de aviso, necessária se usada em outras partes)
 */
function showToast(message, type = 'success') {
    // Implemente a função de toast aqui
    console.log(`[Toast ${type.toUpperCase()}]: ${message}`);
}


/**
 * ------------------------------------------------------------------
 * 2. LÓGICA DE BUSCA E AGREGAÇÃO DE DADOS
 * ------------------------------------------------------------------
 */

async function loadAndRenderCiclicoDonutCharts(year, month) {
    const chartsGrid = document.getElementById('chartsGrid');
    if (!chartsGrid) return;
    chartsGrid.innerHTML = 'Carregando dados...';

    if (!year || !month) {
        if (!currentSelectedYear || !currentSelectedMonth) {
            return;
        }
        year = currentSelectedYear;
        month = currentSelectedMonth;
    }

    const filterDate = `${year}-${month}`;

    let query = supabaseClient
        .from(TABELA_CICLICO)
        .select('contract_name, total_locacoes, realizado_locacoes, mes_referencia')
        .eq('mes_referencia', filterDate);

    try {
        const { data: ciclicoData, error } = await query;

        if (error) throw error;

        if (ciclicoData.length === 0) {
            chartsGrid.innerHTML = `<p style="text-align:center; width: 100%; color: ${PRIMARY_BLUE}; margin-top: 20px;">Não há dados disponíveis para ${monthNames[month]}/${year}.</p>`;
            return;
        }

        const groupedData = aggregateCiclicoData(ciclicoData);
        const seriesData = prepareDonutSeries(groupedData);

        renderAllDonutCharts(chartsGrid, seriesData);

    } catch (e) {
        console.error("Erro ao carregar dados de Cíclico:", e.message || e);
        if (chartsGrid) {
            chartsGrid.innerHTML = `<p style="color:red; text-align:center; width: 100%; margin-top: 20px;">Erro ao carregar dados: ${e.message || e}.</p>`;
        }
    }
}

function aggregateCiclicoData(data) {
    const contractsSummary = {};
    data.forEach(item => {
        const name = item.contract_name;
        const planned = parseFloat(item.total_locacoes) || 0;
        const realizedArray = item.realizado_locacoes;

        if (!name) return;

        if (!contractsSummary[name]) {
            contractsSummary[name] = { plannedSum: 0, realizedSum: 0 };
        }

        contractsSummary[name].plannedSum += planned;

        if (Array.isArray(realizedArray)) {
            const totalRealizedForMonth = realizedArray.reduce((acc, val) => {
                const num = parseFloat(val);
                return acc + (isNaN(num) ? 0 : num);
            }, 0);
            contractsSummary[name].realizedSum += totalRealizedForMonth;
        }
    });
    return contractsSummary;
}


/**
 * ------------------------------------------------------------------
 * 3. LÓGICA DE GRÁFICOS (AJUSTADA PARA TEXTO INTERNO)
 * ------------------------------------------------------------------
 */

function prepareDonutSeries(groupedData) {
    const seriesList = [];
    for (const [name, totals] of Object.entries(groupedData)) {
        const realized = totals.realizedSum;
        const planned = totals.plannedSum;

        if (planned === 0 && realized === 0) continue;

        const remaining = Math.max(0, planned - realized);
        const percent = planned > 0 ? (realized / planned) * 100 : 0;

        let dataSeries;
        if (percent >= 99.9) {
            dataSeries = [
                { name: 'Realizado', y: realized + remaining, color: COMPLETE_GREEN }
            ];
        } else {
            dataSeries = [
                { name: 'Realizado', y: realized, color: CEVA_RED },
                { name: 'Restante', y: remaining, color: PRIMARY_BLUE }
            ];
        }

        seriesList.push({
            name: name,
            percent: percent,
            plannedTotal: planned,
            dataSeries: dataSeries
        });
    }
    return seriesList.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Renderiza todos os gráficos em cards individuais no grid.
 */
function renderAllDonutCharts(chartsGridElement, seriesData) {
    chartsGridElement.innerHTML = '';
    chartsGridElement.style.display = 'flex';
    chartsGridElement.style.flexWrap = 'wrap';
    chartsGridElement.style.gap = '20px';

    seriesData.forEach((item, index) => {
        const wrapperId = `chartWrapper-${index}`;
        const chartId = `donutChart-${index}`;

        // Cria o wrapper do gráfico (o card completo)
        const wrapperDiv = document.createElement('div');
        wrapperDiv.id = wrapperId;
        wrapperDiv.classList.add('chart-container-wrapper');
        // Define o estilo de cada card (5 por linha)
        wrapperDiv.style.cssText = `
            flex-basis: calc(100% / 5 - 16px);
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 5px;
            padding: 5px;
            background-color: #f9f9f9;
        `;

        // Adiciona a div do Highcharts
        const chartDiv = document.createElement('div');
        chartDiv.id = chartId;
        chartDiv.style.cssText = `width: 100%; height: 160px;`;

        wrapperDiv.appendChild(chartDiv);

        chartsGridElement.appendChild(wrapperDiv);

        // Renderiza o gráfico com o texto interno
        renderSingleDonutChart(chartId, item);
    });
}

/**
 * Renderiza um único gráfico de donut usando Highcharts, com % e Total Planejado internos.
 */
function renderSingleDonutChart(containerId, dataItem) {
    const percentToDisplay = dataItem.percent >= 99.9 ? dataItem.percent.toFixed(0) : dataItem.percent.toFixed(1);
    const percentLabel = `${percentToDisplay}%`;

    // Formata o Total Planejado
    const plannedTotalFormatted = dataItem.plannedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const plannedLabel = `${plannedTotalFormatted} loc.`;

    Highcharts.chart(containerId, {
        chart: {
            type: 'pie',
            marginTop: 0,
            events: {
                render: function () {
                    const chart = this;

                    // Destrói os labels anteriores (para atualizar)
                    if (chart.progressLabel) { chart.progressLabel.destroy(); }
                    if (chart.plannedLabel) { chart.plannedLabel.destroy(); }

                    const centerX = chart.plotWidth / 2 + chart.plotLeft;
                    const centerY = chart.plotHeight / 2 + chart.plotTop + 7;

                    // CRIA O LABEL DA PORCENTAGEM (Realizado)
                    chart.progressLabel = chart.renderer.text(percentLabel,
                        centerX,
                        centerY - 6 // Desloca para cima
                    )
                    .css({
                        fontSize: '14px', // 💡 AJUSTADO: Fonte de 16px para 14px
                        fontWeight: 'bold',
                        color: dataItem.percent >= 99.9 ? COMPLETE_GREEN : CEVA_RED,
                        textAlign: 'center'
                    })
                    .attr({ align: 'center' })
                    .add();

                    // CRIA O LABEL DO TOTAL PLANEJADO
                    chart.plannedLabel = chart.renderer.text(plannedLabel,
                        centerX,
                        centerY + 14 // Desloca para baixo
                    )
                    .css({
                        fontSize: '10px',
                        fontWeight: '600',
                        color: PRIMARY_BLUE,
                        textAlign: 'center'
                    })
                    .attr({ align: 'center' })
                    .add();
                }
            }
        },
        title: {
            text: dataItem.name,
            align: 'center',
            verticalAlign: 'top',
            y: 0,
            style: {
                fontSize: '14px',
                color: PRIMARY_BLUE
            }
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.y:,.0f}</b>',
            headerFormat: '<span style="font-size: 10px">{series.name} - {point.key}</span><br/>'
        },
        plotOptions: {
            pie: {
                innerSize: '65%',
                dataLabels: { enabled: false },
                startAngle: 90,
                endAngle: 450,
                center: ['50%', '65%']
            }
        },
        series: [{
            name: 'Locações',
            data: dataItem.dataSeries,
            size: '80%',
            dataLabels: { enabled: false }
        }]
    });
}


/**
 * ------------------------------------------------------------------
 * 4. LÓGICA DE FILTROS (MÊS e ANO)
 * ------------------------------------------------------------------
 */

async function fetchAllAvailableDates() {
    try {
        const { data, error } = await supabaseClient
            .from(TABELA_CICLICO)
            .select('mes_referencia')
            .not('mes_referencia', 'is', null);

        if (error) throw error;

        const uniqueDates = Array.from(new Set(data.map(item => item.mes_referencia)))
            .filter(date => date && date.match(/^\d{4}-\d{2}$/))
            .sort((a, b) => b.localeCompare(a));

        allAvailableDates = uniqueDates;

    } catch (e) {
        console.error("Erro ao buscar datas disponíveis:", e);
        allAvailableDates = [];
    }
}

function findBestDefaultDate() {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentDateString = `${currentYear}-${currentMonth}`;

    if (allAvailableDates.includes(currentDateString)) {
        return { year: currentYear, month: currentMonth };
    }

    if (allAvailableDates.length > 0) {
        const latestDate = allAvailableDates[0];
        const latestYear = latestDate.substring(0, 4);
        const latestMonth = latestDate.substring(5, 7);
        return { year: latestYear, month: latestMonth };
    }

    return { year: null, month: null };
}

async function populateYearFilter() {
    const yearMenu = document.getElementById('yearMenu');
    const selectedYearSpan = document.getElementById('selectedYear');

    if (!yearMenu || !selectedYearSpan) return;

    const { year: defaultYear, month: defaultMonth } = findBestDefaultDate();

    if (!defaultYear) {
        selectedYearSpan.textContent = 'Sem dados';
        return;
    }

    currentSelectedYear = defaultYear;
    selectedYearSpan.textContent = currentSelectedYear;

    const availableYears = Array.from(new Set(allAvailableDates.map(date => date.substring(0, 4))));

    yearMenu.innerHTML = '';

    availableYears.forEach(year => {
        const option = document.createElement('div');
        option.classList.add('dropdown-option');
        if (year === currentSelectedYear) {
            option.classList.add('selected');
        }
        option.dataset.value = year;
        option.textContent = year;

        option.addEventListener('click', () => handleFilterSelection('year', year));

        yearMenu.appendChild(option);
    });

    populateMonthFilter(currentSelectedYear, defaultMonth);
}

function populateMonthFilter(year, defaultMonthValue) {
    const monthMenu = document.getElementById('monthMenu');
    const selectedMonthSpan = document.getElementById('selectedMonth');

    if (!monthMenu || !selectedMonthSpan) return;

    const availableMonths = allAvailableDates
        .filter(date => date.startsWith(year))
        .map(date => date.substring(5, 7));

    currentSelectedMonth = defaultMonthValue || availableMonths[0];

    monthMenu.innerHTML = '';

    if (availableMonths.length === 0) {
        selectedMonthSpan.textContent = 'N/A';
        currentSelectedMonth = null;
        return;
    }

    selectedMonthSpan.textContent = monthNames[currentSelectedMonth] || 'Erro';

    availableMonths.forEach(month => {
        const option = document.createElement('div');
        option.classList.add('dropdown-option');
        if (month === currentSelectedMonth) {
            option.classList.add('selected');
        }
        option.dataset.value = month;
        option.textContent = monthNames[month];

        option.addEventListener('click', () => handleFilterSelection('month', month));

        monthMenu.appendChild(option);
    });
}

function handleFilterSelection(type, value) {
    let shouldReload = false;
    let monthDropdown = document.getElementById('monthDropdown');
    let yearDropdown = document.getElementById('yearDropdown');

    if (type === 'year' && value !== currentSelectedYear) {
        currentSelectedYear = value;
        document.getElementById('selectedYear').textContent = currentSelectedYear;

        document.querySelectorAll('#yearMenu .dropdown-option').forEach(el => {
            el.classList.remove('selected');
            if (el.dataset.value === value) { el.classList.add('selected'); }
        });

        populateMonthFilter(currentSelectedYear, null);
        shouldReload = true;
        if (yearDropdown) yearDropdown.classList.remove('open');

    } else if (type === 'month' && value !== currentSelectedMonth) {
        currentSelectedMonth = value;
        document.getElementById('selectedMonth').textContent = monthNames[currentSelectedMonth];

        document.querySelectorAll('#monthMenu .dropdown-option').forEach(el => {
            el.classList.remove('selected');
            if (el.dataset.value === value) { el.classList.add('selected'); }
        });

        shouldReload = true;
        if (monthDropdown) monthDropdown.classList.remove('open');
    }

    if (shouldReload && currentSelectedYear && currentSelectedMonth) {
        loadAndRenderCiclicoDonutCharts(currentSelectedYear, currentSelectedMonth);
    }
}

function setupDropdownEvents() {
    const yearDropdown = document.getElementById('yearDropdown');
    const yearToggle = document.getElementById('yearToggle');
    const monthDropdown = document.getElementById('monthDropdown');
    const monthToggle = document.getElementById('monthToggle');

    if (yearToggle && yearDropdown) {
        yearToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if(monthDropdown) monthDropdown.classList.remove('open');
            yearDropdown.classList.toggle('open');
        });
    }

    if (monthToggle && monthDropdown) {
        monthToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if(yearDropdown) yearDropdown.classList.remove('open');
            monthDropdown.classList.toggle('open');
        });
    }

    document.addEventListener('click', (e) => {
        if (yearDropdown && !yearDropdown.contains(e.target)) {
            yearDropdown.classList.remove('open');
        }
        if (monthDropdown && !monthDropdown.contains(e.target)) {
            monthDropdown.classList.remove('open');
        }
    });
}


/**
 * ------------------------------------------------------------------
 * 5. LÓGICA DE NAVEGAÇÃO E LOGOUT
 * ------------------------------------------------------------------
 */

async function performLogout(userProfile) {
    try {
        await supabaseClient
            .from('active_sessions')
            .delete()
            .eq('user_id', userProfile.user_id)
            .limit(1);

        await supabaseClient
            .from('cadastros')
            .update({ status: 'User Inativo' })
            .eq('id', userProfile.user_id)
            .limit(1);

    } catch (dbError) {
        console.error("Erro durante a tentativa de logout no banco (continuando a saída):", dbError);
    }

    localStorage.removeItem('user_session_data');
    window.location.href = '../index.html';
}


/**
 * ------------------------------------------------------------------
 * 6. INICIALIZAÇÃO FINAL
 * ------------------------------------------------------------------
 */

document.addEventListener('DOMContentLoaded', async () => {
    initializeDashboard();

    // --- ELEMENTOS E VARIÁVEIS DE USUÁRIO ---
    const userNameElement = document.getElementById('userName');
    const sessionDataString = localStorage.getItem('user_session_data');
    let userProfile = null;

    if (!sessionDataString) {
        window.location.href = '../index.html';
        return;
    }

    try {
        userProfile = JSON.parse(sessionDataString);
        if (userProfile && userProfile.usuario) {
            let formattedUser = userProfile.usuario.toLowerCase();
            formattedUser = formattedUser.charAt(0).toUpperCase() + formattedUser.slice(1);
            userNameElement.textContent = formattedUser;
        }
    } catch (e) {
        window.location.href = '../index.html';
        return;
    }


    // --- EVENTOS DOS BOTÕES DE NAVEGAÇÃO (Com RLS de Permissões) ---
    const navButtons = [
        { id: 'btnInventario', path: 'Inventario/Inventario.html', requiredAccess: userProfile.access_ciclico },
        { id: 'btnMapping', path: 'Mapping/Mapping.html', requiredAccess: userProfile.access_rn },
        { id: 'btnOnePage', path: 'OnePage/OnePage.html', requiredAccess: userProfile.access_consulta },
        { id: 'btnPermissoes', path: 'Permissoes/Permissoes.html', requiredAccess: userProfile.access_permissions }
    ];

    navButtons.forEach(btnInfo => {
        const btn = document.getElementById(btnInfo.id);
        if (btn) {
            if (btnInfo.requiredAccess === true) {
                btn.removeAttribute('disabled');
                btn.addEventListener('click', () => { window.location.href = btnInfo.path; });
            } else {
                btn.setAttribute('disabled', 'true');
            }
        }
    });

    // --- LÓGICA DE SAÍDA (LOGOUT) ---
    const btnSair = document.getElementById('btnSair');
    const logoutModal = document.getElementById('logoutModal');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');

    if (btnSair) { btnSair.addEventListener('click', (e) => { e.preventDefault(); logoutModal.classList.add('show'); }); }
    if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', () => { logoutModal.classList.remove('show'); });
    if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', () => {
        logoutModal.classList.remove('show');
        if (userProfile) { performLogout(userProfile); }
        else { localStorage.removeItem('user_session_data'); window.location.href = '../index.html'; }
    });

    // --- LÓGICA FINAL DO FILTRO DE MÊS/ANO E CARREGAMENTO DE DADOS ---
    await fetchAllAvailableDates();
    await populateYearFilter();
    setupDropdownEvents();

    if (currentSelectedYear && currentSelectedMonth) {
        loadAndRenderCiclicoDonutCharts(currentSelectedYear, currentSelectedMonth);
    } else {
        const chartsGrid = document.getElementById('chartsGrid');
        if (chartsGrid) {
             chartsGrid.innerHTML = `<p style="text-align:center; width: 100%; color: ${PRIMARY_BLUE}; margin-top: 20px;">Não há dados disponíveis para filtragem.</p>`;
        }
    }
});