// ======================================================================
// 1. CONFIGURAÇÃO SUPABASE REAL (AJUSTADO)
// ======================================================================
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
// ATENÇÃO: Confirme se esta chave é a SUA CHAVE ANON PÚBLICA ATUAL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

let supabaseClient;
let userAccessToken = null; // Vamos manter esta variável para diagnóstico

// --- Lógica de Token de Sessão para autenticação ---
const sessionDataJSON = localStorage.getItem('user_session_data');
if (sessionDataJSON) {
    try {
        const userData = JSON.parse(sessionDataJSON);
        if (userData.token) {
            userAccessToken = userData.token;
            console.log("Token de Usuário Lido:", userAccessToken ? "Lido com sucesso (Tamanho: " + userAccessToken.length + ")" : "Token não encontrado/nulo");
        }
    } catch (e) {
        console.error("Erro ao analisar dados da sessão para obter o token.", e);
    }
}

// Inicializa o cliente Supabase de forma robusta e AJUSTADA
try {
    if (typeof supabase === 'object' && typeof supabase.createClient === 'function') {

        // 1. Inicializa o cliente. Usamos persistSession: false para não interferir
        // no carregamento manual que faremos abaixo.
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });

        // 2. Se um token de usuário VÁLIDO foi encontrado, forçamos o SDK a usá-lo
        // para autenticar a chamada, substituindo a chave anon.
        if (userAccessToken) {
            // Criamos um objeto de sessão básico apenas com o access_token lido
            // para que o SDK use o token na próxima requisição.
            supabaseClient.auth.setSession({ access_token: userAccessToken, refresh_token: userAccessToken, expires_in: 3600, token_type: 'bearer' });
            console.log("Token de Usuário Injetado no cliente Supabase via setSession.");
        } else {
            console.log("Token de usuário ausente. Usando a chave ANÓNIMA para todas as requisições.");
        }

    } else {
        throw new Error("A biblioteca @supabase/supabase-js não foi carregada.");
    }
} catch (e) {
    console.error("Falha ao inicializar o cliente Supabase.", e);
}
// ======================================================================


// ======================================================================
// 2. ELEMENTOS E VARIÁVEIS DE ESTADO
// ======================================================================

const baseSelector = document.getElementById('baseSelector');
const yearSelectOptions = document.getElementById('yearSelectOptions');
const yearSelectDisplay = document.getElementById('yearSelectDisplay');
const monthSelectOptions = document.getElementById('monthSelectOptions');
const monthSelectDisplay = document.getElementById('monthSelectDisplay');
const contractSelectOptions = document.getElementById('contractSelectOptions');
const contractSelectDisplay = document.getElementById('contractSelectDisplay');
const contractSelectContainer = document.getElementById('contractSelectContainer');

const consultaForm = document.getElementById('consultaForm');
const resultsModal = document.getElementById('resultsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const loadingResults = document.getElementById('loadingResults');
const noResults = document.getElementById('noResults');
const baseTitle = document.getElementById('baseTitle');
const consultaResultsTable = document.getElementById('consultaResultsTable');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');

// Variáveis de Estado (Padrão: Mês e Ano Atual)
const today = new Date();
const currentYear = today.getFullYear().toString();
const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');

let selectedBase = '';
let selectedYear = currentYear;
let selectedMonths = [currentMonth];
let selectedContractIds = [];
let lastFetchedData = []; // Armazena os últimos dados para o download CSV

// Mapeamento das tabelas de Contratos (para popular o seletor)
const CONTRACT_TABLES = {
    'CICLICO': 'ciclico_contratos', // 'nome_contrato'
    'CLAUSE': 'contratos',         // 'nome_contrato'
    'RN': 'rn_contratos'           // 'nome_contrato'
};

// Mapeamento das Tabelas de DETALHES
const DATA_TABLES_MAP = {
    'CICLICO': {
        name: 'ciclico_grade_dados',
        contractIdColumn: 'contract_id',
        dateColumn: 'mes_referencia' // 'character varying' (YYYY-MM)
    },
    'CLAUSE': {
        name: 'inventory_details',
        contractIdColumn: 'contract_id',
        dateColumn: 'reference_month' // 'date' (YYYY-MM-DD)
    },
    'RN': {
        name: 'rn_details',
        contractIdColumn: 'contract_id',
        dateColumn: 'reference_month' // 'date' (YYYY-MM-DD)
    }
};

// Nomes das colunas Integer na tabela ciclico_grade_dados (que não devem ser formatadas como R$ ou %)
const CICLICO_INTEGER_COLUMNS = ['contract_id', 'total_locacoes', 'dias_uteis_ciclo'];


// ----------------------------------------------------------------------
// FUNÇÕES DE UTILIDADE E CONTROLE DE UI
// ----------------------------------------------------------------------

function openResultsModal() {
    if (resultsModal) resultsModal.classList.add('active');
}

function closeResultsModal() {
    if (resultsModal) resultsModal.classList.remove('active');
    if (consultaResultsTable) consultaResultsTable.innerHTML = '';
    if (noResults) noResults.style.display = 'none';
    if (downloadCsvBtn) downloadCsvBtn.style.display = 'none';
    lastFetchedData = []; // Limpa os dados ao fechar
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeResultsModal);
if (resultsModal) resultsModal.addEventListener('click', (e) => {
    if (e.target === resultsModal) {
        if (closeModalBtn) closeModalBtn.click();
    }
});

function closeAllCustomSelects() {
    document.querySelectorAll('.select-options.open').forEach(options => {
        options.classList.remove('open');
    });
}

function toggleCustomSelect(optionsElement) {
    closeAllCustomSelects();
    if (optionsElement) optionsElement.classList.toggle('open');
}

function updateDisplay(displayElement, optionsElement, type) {
    if (!optionsElement || !displayElement) return;

    let selected = Array.from(optionsElement.querySelectorAll('.select-option-item.selected'));

    if (type === 'year' && selected.length > 0) {
        displayElement.textContent = selected[0].textContent.trim();
        selectedYear = selected[0].getAttribute('data-value');
        if (selectedBase) triggerContractReload(selectedBase);

    } else if (type === 'month') {
        selectedMonths = selected.map(item => item.getAttribute('data-value'));
        selectedMonths.sort(); // Garante ordem crescente
        displayElement.textContent = selected.length > 0 ? `${selected.length} Mês(es) Selecionado(s)` : 'Selecione Mês(es)';
        if (selectedBase) triggerContractReload(selectedBase);

    } else if (type === 'contract') {
        selectedContractIds = selected.map(item => item.getAttribute('data-value'));
        displayElement.textContent = selected.length > 0 ? `${selected.length} Contrato(s) Selecionado(s)` : 'Selecione Contrato(s)';
    } else {
        if (type === 'year') selectedYear = null;
        if (type === 'month') selectedMonths = [];
        if (type === 'contract') selectedContractIds = [];
    }
}

function handleSelectOption(item, optionsElement, displayElement, type, isMulti) {
    if (!item || !optionsElement) return;

    if (!isMulti) {
        optionsElement.querySelectorAll('.select-option-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        closeAllCustomSelects();
    } else {
        item.classList.toggle('selected');
    }
    updateDisplay(displayElement, optionsElement, type);
}

function createSimpleItem(value, text, isSelected = false) {
    const item = document.createElement('div');
    item.classList.add('select-option-item');
    item.setAttribute('data-value', value);
    if (isSelected) item.classList.add('selected');

    item.textContent = text;

    return item;
}

// ----------------------------------------------------------------------
// PREENCHIMENTO DOS SELETORES DE DATA
// ----------------------------------------------------------------------

function populateYearSelector() {
    if (!yearSelectOptions) return;

    const currentYearInt = new Date().getFullYear();
    const startYear = 2023;
    yearSelectOptions.innerHTML = '';

    // Inclui até o próximo ano
    for (let year = currentYearInt + 1; year >= startYear; year--) {
        const yearStr = year.toString();
        const isSelected = yearStr === currentYear;
        const item = createSimpleItem(yearStr, yearStr, isSelected);

        item.addEventListener('click', () => handleSelectOption(item, yearSelectOptions, yearSelectDisplay, 'year', false));
        yearSelectOptions.appendChild(item);
    }
}

function populateMonthSelector() {
    if (!monthSelectOptions) return;

    monthSelectOptions.innerHTML = '';
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                     "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    meses.forEach((name, index) => {
        const monthValue = (index + 1).toString().padStart(2, '0');
        const isSelected = monthValue === currentMonth;
        const item = createSimpleItem(monthValue, name, isSelected);

        item.addEventListener('click', (e) => {
            handleSelectOption(item, monthSelectOptions, monthSelectDisplay, 'month', true);
            e.stopPropagation();
        });

        monthSelectOptions.appendChild(item);
    });
}

// ----------------------------------------------------------------------
// 3. FUNÇÕES DE BUSCA SUPABASE (FILTRAGEM DE CONTRATOS E DADOS)
// ----------------------------------------------------------------------

/**
 * Busca a lista de contratos (DISTINTOS) na tabela de contratos da Base selecionada.
 */
async function fetchContracts(base) {
    if (!supabaseClient || !CONTRACT_TABLES[base]) return [];

    const tableName = CONTRACT_TABLES[base];

    // Busca apenas o ID e o NOME do contrato na tabela auxiliar
    const { data, error } = await supabaseClient
        .from(tableName)
        .select('id, nome_contrato')
        .not('id', 'is', null)
        .order('nome_contrato', { ascending: true }); // Ordena para melhor UX

    if (error) {
        console.error(`Erro ao buscar contratos para ${base} na tabela ${tableName}:`, error);
        alert(`Erro ao carregar contratos: ${error.message}.`);
        return [];
    }

    return data.map(c => ({
        id: c.id,
        // O nome correto da coluna é 'nome_contrato'
        contract_name: c.nome_contrato || `Contrato ID: ${c.id}`
    }));
}

function populateContractSelector(contracts) {
    if (!contractSelectOptions || !contractSelectDisplay || !contractSelectContainer) return;

    contractSelectOptions.innerHTML = '';
    selectedContractIds = [];

    if (contracts.length === 0) {
        contractSelectOptions.innerHTML = '<div class="select-option-item">Nenhum contrato encontrado.</div>';
        contractSelectDisplay.textContent = 'Nenhum contrato encontrado.';
        contractSelectContainer.classList.add('disabled');
        return;
    }

    contracts.forEach(contract => {
        // IDs são tratados como texto para fins de seleção
        const item = createSimpleItem(contract.id.toString(), contract.contract_name);

        item.addEventListener('click', (e) => {
            handleSelectOption(item, contractSelectOptions, contractSelectDisplay, 'contract', true);
            e.stopPropagation();
        });
        contractSelectOptions.appendChild(item);
    });

    contractSelectDisplay.textContent = 'Selecione Contrato(s)';
    contractSelectContainer.classList.remove('disabled');
}


/**
 * Busca os dados de detalhes na tabela correta (inventory_details, ciclico_grade_dados ou rn_details)
 * com base nos filtros e inclui o nome do contrato na consulta.
 */
async function fetchAndDisplayData(filters) {
    closeAllCustomSelects();
    openResultsModal();

    if (baseTitle) baseTitle.textContent = filters.base;
    if (loadingResults) loadingResults.style.display = 'block';
    if (noResults) noResults.style.display = 'none';
    if (downloadCsvBtn) downloadCsvBtn.style.display = 'none';
    if (consultaResultsTable) consultaResultsTable.innerHTML = '';

    // Garantir que a biblioteca supabase global esteja disponível
    if (!supabaseClient || !DATA_TABLES_MAP[filters.base]) {
        if (loadingResults) loadingResults.style.display = 'none';
        if (noResults) {
            noResults.textContent = "Erro de Configuração: Supabase não foi carregado corretamente.";
            noResults.style.display = 'block';
        }
        return;
    }

    const { name: dataTableName, contractIdColumn, dateColumn } = DATA_TABLES_MAP[filters.base];

    // ======================================================================
    // CORREÇÃO: Construção da string SELECT (JOIN)
    // ======================================================================
    let selectString = '*';
    let contractRelKey = ''; // Chave de relacionamento que virá no objeto retornado

    // Mapeia a tabela de contratos correta para o JOIN
    if (filters.base === 'CLAUSE') {
        contractRelKey = 'contratos';
        selectString = `*, ${contractRelKey}(nome_contrato)`;
    } else if (filters.base === 'RN') {
        contractRelKey = 'rn_contratos';
        selectString = `*, ${contractRelKey}(nome_contrato)`;
    }
    // PARA CICLICO, REMOVEMOS O JOIN TEMPORARIAMENTE PARA EVITAR O ERRO 'Could not find a relationship'
    else if (filters.base === 'CICLICO') {
        // contractRelKey permanece vazio e selectString = '*'
    }

    let query = supabaseClient
        .from(dataTableName)
        .select(selectString)
        .in(contractIdColumn, filters.contractIds)
        .order(dateColumn, { ascending: false });
    // ======================================================================


    // ----------------------------------------------------------------------
    // CORREÇÃO: LÓGICA DE FILTRO DE MÊS/ANO SIMPLIFICADA
    // ----------------------------------------------------------------------

    if (filters.base === 'CICLICO') {
        // Formato YYYY-MM
        const formattedMonths = filters.months.map(m => `${filters.year}-${m}`);
        query = query.in(dateColumn, formattedMonths);

    } else if (filters.base === 'CLAUSE' || filters.base === 'RN') {
        // Formato YYYY-MM-DD para coluna 'DATE'. Usando sempre YYYY-MM-01 e o filtro 'IN'.
        const formattedDates = filters.months.map(m => `${filters.year}-${m}-01`);
        query = query.in(dateColumn, formattedDates);
    }

    // ----------------------------------------------------------------------


    let { data, error } = await query;
    if (loadingResults) loadingResults.style.display = 'none';

    if (error) {
        console.error(`Erro ao buscar dados na tabela ${dataTableName}:`, error);
        if (noResults) {
            noResults.textContent = `Erro ao carregar dados da base ${filters.base}: ${error.message}`;
            noResults.style.display = 'block';
        }
        return;
    }

    if (data.length === 0) {
        if (noResults) {
            noResults.textContent = "Nenhum dado encontrado para os filtros selecionados.";
            noResults.style.display = 'block';
        }
        lastFetchedData = [];
        return;
    }

    // Armazena os dados brutos para o download CSV
    lastFetchedData = data;

    // ======================================================================
    // Modificação da Geração da Tabela para incluir o Nome do Contrato
    // ======================================================================

    // Obter o cabeçalho dinamicamente
    let headers = Object.keys(data[0]);

    // O JOIN retorna o nome do contrato aninhado
    if (contractRelKey) {

        // Remove a chave do relacionamento (ex: 'contratos')
        headers = headers.filter(h => h !== contractRelKey);

        // Insere o nome do contrato logo após o 'contract_id'
        const contractIdColumn = DATA_TABLES_MAP[filters.base]?.contractIdColumn;
        const contractIdIndex = headers.indexOf(contractIdColumn);
        if (contractIdIndex !== -1) {
            headers.splice(contractIdIndex + 1, 0, 'nome_contrato');
        } else {
            // Se 'contract_id' não for encontrado, coloca no início
            headers.unshift('nome_contrato');
        }
    } else {
         // Para o CICLICO (sem JOIN), adicionamos a coluna 'nome_contrato' na lista
         const contractIdColumn = DATA_TABLES_MAP[filters.base]?.contractIdColumn;
         const contractIdIndex = headers.indexOf(contractIdColumn);
         if (contractIdIndex !== -1) {
             headers.splice(contractIdIndex + 1, 0, 'nome_contrato');
         } else {
             headers.unshift('nome_contrato');
         }
    }

    let headerRow = '<thead><tr>';
    headers.forEach(h => {
        // Formata o nome da coluna para exibição (ex: NOME CONTRATO)
        headerRow += `<th>${h.replace(/_/g, ' ').toUpperCase()}</th>`;
    });
    headerRow += '</tr></thead>';

    let bodyRows = '<tbody>';
    data.forEach(row => {
        bodyRows += '<tr>';
        headers.forEach(h => {
            let cellValue = row[h];

            // Trata o campo 'nome_contrato' que vem do JOIN ou é simulado para o CICLICO
            if (h === 'nome_contrato') {
                if (contractRelKey) {
                    // Pega o valor aninhado (CLAUSE/RN)
                    cellValue = row[contractRelKey] ? row[contractRelKey].nome_contrato : 'N/A';
                } else {
                    // Simula N/A para CICLICO (Sem JOIN)
                    cellValue = 'N/A (Verifique FK)';
                }
            }

            // Formatação de Datas e Valores (mantida para a tabela HTML)
            if (Array.isArray(cellValue)) {
                cellValue = `[${cellValue.join(', ')}]`;
            } else if (cellValue && (h.includes('data') || h.includes('date') || h.includes('month'))) {
                const dateMatch = String(cellValue).match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    const [full, year, month, day] = dateMatch;
                    cellValue = `${day}/${month}/${year}`;
                } else if (String(cellValue).match(/^\d{4}-\d{2}/)) {
                    const [year, month] = String(cellValue).split('-');
                    cellValue = `${month}/${year}`;
                }
            } else if (typeof cellValue === 'number') {
                 // Formata números para exibição na tabela HTML com vírgula e 2 casas
                 cellValue = cellValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            bodyRows += `<td>${cellValue !== null && cellValue !== undefined ? cellValue : ''}</td>`;
        });
        bodyRows += '</tr>';
    });
    bodyRows += '</tbody>';

    if (consultaResultsTable) consultaResultsTable.innerHTML = headerRow + bodyRows;
    if (downloadCsvBtn) downloadCsvBtn.style.display = 'block';
}


// Função auxiliar para recarregar contratos (Chamada quando a data ou base muda)
async function triggerContractReload(base) {
    if (!contractSelectOptions || !contractSelectDisplay || !contractSelectContainer) return;

    contractSelectOptions.innerHTML = '';
    contractSelectDisplay.textContent = 'Carregando contratos...';
    contractSelectContainer.classList.add('disabled');

    const helpText = `Carregando contratos disponíveis para ${base}...`;
    const contractHelp = document.getElementById('contractHelp');
    if (contractHelp) contractHelp.textContent = helpText;

    const contracts = await fetchContracts(base);

    populateContractSelector(contracts);
}


// Função auxiliar para formatação de números para CSV PT-BR (com vírgula decimal)
function formatNumberToCsv(value) {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) || numericValue === null) return '';

    // Usa Intl.NumberFormat para garantir a formatação correta do PT-BR (vírgula decimal)
    return new Intl.NumberFormat('pt-BR', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 10 }).format(numericValue);
}

/**
 * Lógica para download CSV
 */
/**
 * Lógica para download CSV
 */
function handleDownloadCsv() {
    if (lastFetchedData.length === 0) {
        alert("Não há dados para baixar.");
        return;
    }

    // Determina a chave de relacionamento do contrato
    let contractRelKey = '';
    if (selectedBase === 'CLAUSE') {
        contractRelKey = 'contratos';
    } else if (selectedBase === 'CICLICO') {
        contractRelKey = 'ciclico_contratos';
    } else if (selectedBase === 'RN') {
        contractRelKey = 'rn_contratos';
    }

    // 1. Define os cabeçalhos (reorganizando para incluir nome_contrato)
    let rawHeaders = Object.keys(lastFetchedData[0]);
    let headers;

    if (contractRelKey) {
        headers = rawHeaders.filter(h => h !== contractRelKey);

        // Insere 'nome_contrato' logo após 'contract_id'
        const contractIdColumn = DATA_TABLES_MAP[selectedBase]?.contractIdColumn;
        const contractIdIndex = headers.indexOf(contractIdColumn);

        if (contractIdIndex !== -1) {
            headers.splice(contractIdIndex + 1, 0, 'nome_contrato');
        } else {
            headers.unshift('nome_contrato');
        }
    } else {
        // Se não tem JOIN (CICLICO), garantimos que 'nome_contrato' está na lista
        headers = rawHeaders;
        const contractIdColumn = DATA_TABLES_MAP[selectedBase]?.contractIdColumn;
        const contractIdIndex = headers.indexOf(contractIdColumn);
        if (contractIdIndex !== -1) {
            headers.splice(contractIdIndex + 1, 0, 'nome_contrato');
        } else {
             headers.unshift('nome_contrato');
        }
    }

    // Formata o cabeçalho (substitui underscores por espaço)
    const csvHeader = headers.map(h => `"${h.replace(/_/g, ' ').toUpperCase()}"`).join(';');

    // 2. Formata as linhas
    const csvRows = lastFetchedData.map(row => {
        return headers.map(h => {
            let value = row[h];
            const headerLower = h.toLowerCase(); // Usa minúsculas para a verificação

            // Trata o campo 'nome_contrato'
            if (h === 'nome_contrato') {
                if (contractRelKey) {
                     // Pega o valor aninhado (CLAUSE/RN)
                    value = row[contractRelKey] ? row[contractRelKey].nome_contrato : 'N/A';
                } else {
                    // Simula N/A para CICLICO (Sem JOIN)
                    value = 'N/A (Verifique FK)';
                }
            }

            // --- INÍCIO DA CORREÇÃO CRÍTICA PARA PORCENTAGEM E DECIMAIS ---
            const numericValue = parseFloat(value);
            const isNumeric = !isNaN(numericValue) && numericValue !== null;

            if (isNumeric) {
                // VERIFICA SE É A BASE CICLICO E SE É UMA COLUNA INTEGER (CONTAGEM)
                if (selectedBase === 'CICLICO' && CICLICO_INTEGER_COLUMNS.includes(h)) {
                    // Estas são contagens (integer), não devem ser formatadas com vírgula decimal
                    value = numericValue.toString(); // Garante que seja string
                }

                // LÓGICA DE PORCENTAGEM AJUSTADA (DIVISÃO POR 100)
                else if (
                    headerLower.includes('percent') ||
                    headerLower.includes('target_net') ||
                    headerLower.includes('accuracy') || // Inclui ACCURACY LOCACAO, ITEM, PECAS, MES, etc.
                    headerLower.includes('meta')
                ) {
                    // 1. Divide por 100 para transformar o valor em decimal percentual (ex: 98.5 -> 0.985)
                    value = numericValue / 100;
                    // 2. Formata para o padrão PT-BR (vírgula decimal)
                    value = formatNumberToCsv(value);
                }

                // OUTROS VALORES NUMÉRICOS (R$)
                else if (headerLower.includes('value') || headerLower.includes('stock')) {
                    // Outros campos numéricos (R$) devem vir formatados com vírgula decimal
                    value = formatNumberToCsv(value);
                }

                // CASO DE COLUNAS NUMÉRICAS NÃO MAPEADAS QUE DEVEM TER VÍRGULA
                else if (typeof value === 'number') {
                     // Formata qualquer outro número que não seja os Integers do CICLICO
                     value = formatNumberToCsv(value);
                }
            }
            // --- FIM DA CORREÇÃO CRÍTICA ---

            // Lógica para tratar Datas
            if (value && (headerLower.includes('data') || headerLower.includes('date') || headerLower.includes('month'))) {
                const dateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
                if (dateMatch) {
                    const [full, year, month, day] = dateMatch;
                    value = `${day}/${month}/${year}`;
                } else if (String(value).match(/^\d{4}-\d{2}/)) {
                    const [year, month] = String(value).split('-');
                    value = `${month}/${year}`;
                }
            }

            // Lógica para tratar Arrays e JSONB
            if (Array.isArray(value)) {
                // Para arrays, tentamos converter os elementos numéricos para pt-BR
                const arrayContent = value.map(item => {
                    const itemNumeric = parseFloat(item);
                    if (!isNaN(itemNumeric) && itemNumeric !== null) {
                        return formatNumberToCsv(itemNumeric);
                    }
                    return String(item);
                }).join(', ');
                value = `[${arrayContent}]`;
            } else if (typeof value === 'object' && value !== null) {
                if (h !== 'nome_contrato') {
                    value = JSON.stringify(value);
                }
            }

            // Garante que o valor seja tratado como string e escape aspas duplas
            let stringValue = String(value);

            // Adiciona aspas em volta do valor (necessário pelo separador ;)
            stringValue = stringValue.replace(/"/g, '""');

            // Retorna o valor entre aspas para lidar com vírgulas e pontos-e-vírgulas internos
            return `"${stringValue}"`;
        }).join(';'); // Use ponto-e-vírgula (;) como separador para compatibilidade com Excel em PT-BR
    });

    // Adiciona o BOM (Byte Order Mark) para garantir a compatibilidade com caracteres especiais (UTF-8)
    const csvContent = "\ufeff" + [csvHeader, ...csvRows].join('\n');

    // Cria e baixa o arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const fileName = `${selectedBase}_Consulta_${selectedYear}${selectedMonths.join('-')}.csv`;
    link.setAttribute('download', fileName);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


// ----------------------------------------------------------------------
// 4. INICIALIZAÇÃO E EVENTOS
// ----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a navegação da sidebar
    const rotinasDropdown = document.getElementById('rotinasDropdown');
    if (rotinasDropdown) {
        const dropdownToggle = rotinasDropdown.querySelector('.dropdown-toggle');
        if (dropdownToggle) {
            dropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                rotinasDropdown.classList.toggle('open');
            });
        }
    }

    populateYearSelector();
    populateMonthSelector();

    // Garante que os valores iniciais de estado sejam definidos
    updateDisplay(yearSelectDisplay, yearSelectOptions, 'year');
    updateDisplay(monthSelectDisplay, monthSelectOptions, 'month');

    populateContractSelector([]);
});

// Eventos de Toggle e Fechamento
if (yearSelectDisplay) yearSelectDisplay.addEventListener('click', () => toggleCustomSelect(yearSelectOptions));
if (monthSelectDisplay) monthSelectDisplay.addEventListener('click', () => toggleCustomSelect(monthSelectOptions));
if (contractSelectDisplay) contractSelectDisplay.addEventListener('click', () => {
    if (contractSelectContainer && !contractSelectContainer.classList.contains('disabled')) {
        toggleCustomSelect(contractSelectOptions);
    }
});
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-select-month-container') &&
        !e.target.closest('.custom-select-year-container') &&
        !e.target.closest('.custom-select-contract-container') &&
        !e.target.closest('.select-styled')) {
        closeAllCustomSelects();
    }
});


// Evento de seleção da Base
if (baseSelector) baseSelector.addEventListener('change', async (event) => {
    selectedBase = event.target.value;

    if (selectedBase) {
        await triggerContractReload(selectedBase);
    } else {
        if (contractSelectDisplay) contractSelectDisplay.textContent = 'Selecione uma Base primeiro';
        if (contractSelectContainer) contractSelectContainer.classList.add('disabled');
    }
});


// Evento de submissão do formulário (Pesquisa de Dados Finais)
if (consultaForm) consultaForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validação
    if (!selectedBase || selectedMonths.length === 0 || !selectedYear || selectedContractIds.length === 0) {
        alert("Por favor, preencha todos os filtros (Base, Mês(es), Ano e Contrato(s)).");
        return;
    }

    const filters = {
        base: selectedBase,
        year: selectedYear,
        months: selectedMonths,
        // Garante que os IDs dos contratos sejam inteiros (bigint) para a consulta.
        contractIds: selectedContractIds.map(id => parseInt(id, 10))
    };

    await fetchAndDisplayData(filters);
});

// Evento para download CSV
if (downloadCsvBtn) downloadCsvBtn.addEventListener('click', handleDownloadCsv);