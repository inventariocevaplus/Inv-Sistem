// =========================================================================
// Relatorio.js (Geração de Relatórios) - VERSÃO APENAS RN E CLAUSE
// -------------------------------------------------------------------------
// 💥 FINAL VERSION: Código otimizado, removendo todo o escopo CÍCLICO.
// -------------------------------------------------------------------------
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (Substitua se necessário)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// --- Lógica de Token de Sessão (Mantida) ---
const sessionDataJSON = localStorage.getItem('user_session_data');
let accessToken = SUPABASE_ANON_KEY;
let userPermissions = {};

if (sessionDataJSON) {
    try {
        const userData = JSON.parse(sessionDataJSON);
        if (userData.token) {
            accessToken = userData.token;
        }
        userPermissions = userData;
    } catch (e) {
        console.error("Erro ao analisar dados da sessão para obter o token/permissões.", e);
    }
}

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, accessToken);

// ⚠️ TABELAS DE CONTRATOS (Apenas RN e Clause)
const TABLE_RN_CONTRATOS = 'rn_contratos';
const TABLE_CLAUSE_CONTRATOS = 'contratos';
// REMOVIDO: const TABLE_CICLICO_CONTRATOS = 'ciclico_contratos';

// 💥 ESTADOS GLOBAIS
let selectedMonthsData = [];
let selectedYearValue = new Date().getFullYear().toString();
let allUniqueContractsMap = {};
let selectedContractsData = [];

// =======================================================
// DADOS FIXOS: DEFINIÇÃO DE COLUNAS COMPLETAS
// =======================================================

const CLAUSE_DETAIL_COLUMNS = [
    'accuracy_item', 'accuracy_locacao', 'accuracy_pecas', 'counted_value',
    'cycle_count', 'gross_percent', 'gross_variation_value', 'negative_value',
    'net_percent', 'net_variation_value', 'part_numbers_correct',
    'part_numbers_counted', 'part_numbers_in_stock', 'pieces_in_stock',
    'positive_value', 'stock_value', 'target_net'
];

const RN_DETAIL_COLUMNS = [
    'acuracia_mes', 'erros_percent', 'meta', 'nil_picking', 'nilpi_percent',
    'qtd_erros', 'qtd_linhas', 'repi_percent', 'repicking'
];

// REMOVIDO: CICLICO_ALL_COLUMNS e COMPILED_CICLICO_HEADERS

// Cabeçalho Compilado Final (RN + Clause)
const COMPILED_RN_CLAUSE_HEADERS = [
    'Mês/Ano', 'ID Contrato', 'Contrato', 'Analista',
    ...RN_DETAIL_COLUMNS.map(col => `RN_${col}`),
    ...CLAUSE_DETAIL_COLUMNS.map(col => `Clause_${col}`)
];


// =======================================================
// UTILS
// =======================================================

/**
 * Converte um valor para número e retorna 0 se for vazio/inválido.
 */
function parseNumericValue(value) {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value.toString().replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : num;
}

/**
 * Gera um valor mockado para um campo específico.
 * (Função mantida, mas a lógica de mock cíclico não será usada)
 */
function generateMockValue(columnName) {
    // Valores Inteiros (Contagens) - ALEATÓRIO
    if (columnName.includes('qtd') || columnName.includes('numbers') || columnName.includes('pecas') || columnName.includes('cycle') || columnName.includes('picking')) {
        return Math.floor(Math.random() * 5000) || 0;
    }

    // Valores Numéricos com Decimal (Percentuais) - ALEATÓRIO
    if (columnName.includes('accuracy') || columnName.includes('percent') || columnName.includes('acuracia') || columnName.includes('meta') || columnName.includes('value') || columnName.includes('stock') || columnName.includes('variation')) {
        return parseNumericValue((Math.random() * 99 + 1).toFixed(2));
    }

    // Datas/Strings Genéricas
    if (columnName === 'mes_referencia') {
        return '2025-10-MOCK';
    }
    if (columnName === 'contract_name') {
        return 'CONTRATO MOCK';
    }
    if (columnName === 'data_geracao') {
        return new Date().toISOString();
    }

    // Default
    return 'N/A';
}


// =======================================================
// LÓGICA DE POPULAR SELETORES DE MÊS/ANO E CONTRATOS
// =======================================================

function populateMonthSelectors() {
    const monthDisplay = document.getElementById('monthSelectDisplay');
    const monthOptionsContainer = document.getElementById('monthSelectOptions');
    const yearDisplay = document.getElementById('yearSelectDisplay');
    const yearOptionsContainer = document.getElementById('yearSelectOptions');

    if (!monthDisplay || !monthOptionsContainer || !yearDisplay || !yearOptionsContainer) return;

    monthOptionsContainer.innerHTML = '';

    // --- LÓGICA DO MÊS ---
    MESES.forEach((monthName, index) => {
        const monthNumber = String(index + 1).padStart(2, '0');

        const item = document.createElement('div');
        item.classList.add('select-option-item');
        item.textContent = monthName;
        item.dataset.value = monthNumber;

        const today = new Date();
        if (index === today.getMonth()) {
            item.classList.add('selected');
            selectedMonthsData = [monthNumber];
            updateMonthDisplay(monthDisplay);
        }

        item.addEventListener('click', () => {
            const isSelected = item.classList.toggle('selected');

            if (isSelected) {
                if (!selectedMonthsData.includes(monthNumber)) {
                    selectedMonthsData.push(monthNumber);
                }
            } else {
                selectedMonthsData = selectedMonthsData.filter(m => m !== monthNumber);
            }
            selectedMonthsData.sort();
            updateMonthDisplay(monthDisplay);
        });

        monthOptionsContainer.appendChild(item);
    });

    monthDisplay.addEventListener('click', () => {
        monthOptionsContainer.classList.toggle('open');
        yearOptionsContainer.classList.remove('open');
    });

    // --- LÓGICA DO ANO CUSTOMIZADO ---
    yearOptionsContainer.innerHTML = '';
    const currentYear = new Date().getFullYear();
    selectedYearValue = String(currentYear); // Redefine para o ano atual
    yearDisplay.textContent = selectedYearValue;

    for (let i = -2; i <= 2; i++) {
        const year = currentYear + i;
        const yearValue = String(year);

        const item = document.createElement('div');
        item.classList.add('select-option-item');
        item.textContent = yearValue;
        item.dataset.value = yearValue;

        if (yearValue === selectedYearValue) {
            item.classList.add('selected');
        }

        item.addEventListener('click', () => {
            Array.from(yearOptionsContainer.children).forEach(child => child.classList.remove('selected'));
            item.classList.add('selected');
            selectedYearValue = yearValue;
            yearDisplay.textContent = yearValue;
            yearOptionsContainer.classList.remove('open');
        });

        yearOptionsContainer.appendChild(item);
    }

    yearDisplay.addEventListener('click', () => {
        yearOptionsContainer.classList.toggle('open');
        monthOptionsContainer.classList.remove('open');
    });

    document.addEventListener('click', (e) => {
        const monthContainer = document.querySelector('.custom-select-month-container');
        const yearContainer = document.querySelector('.custom-select-year-container');

        if (monthContainer && !monthContainer.contains(e.target)) {
            monthOptionsContainer.classList.remove('open');
        }
        if (yearContainer && !yearContainer.contains(e.target)) {
            yearOptionsContainer.classList.remove('open');
        }
    });
}

function updateMonthDisplay(displayElement) {
    if (selectedMonthsData.length === 0) {
        displayElement.textContent = "Selecione Mês(es)";
    } else if (selectedMonthsData.length === 1) {
        const monthIndex = parseInt(selectedMonthsData[0], 10) - 1;
        displayElement.textContent = MESES[monthIndex];
    } else {
        displayElement.textContent = `${selectedMonthsData.length} Mês(es) selecionado(s)`;
    }
}

/**
 * Carrega a lista de contratos de RN e Clause.
 */
async function loadContractList() {
    const display = document.getElementById('contractSelectDisplay');
    const optionsContainer = document.getElementById('contractSelectOptions');

    display.textContent = 'Buscando contratos...';
    optionsContainer.innerHTML = '';

    // Apenas RN e Clause
    const contractTables = [
        { name: TABLE_RN_CONTRATOS, source: 'RN' },
        { name: TABLE_CLAUSE_CONTRATOS, source: 'Clause' },
    ];

    allUniqueContractsMap = {};
    let hasError = false;

    for (const table of contractTables) {
        try {
            // Assume que RN e Clause usam 'id' e 'nome_contrato'
            const { data, error } = await supabaseClient
                .from(table.name)
                .select('id, nome_contrato')
                .order('nome_contrato', { ascending: true });

            if (error) throw error;

            data.forEach(c => {
                const contractName = c.nome_contrato.toUpperCase().trim();

                if (!allUniqueContractsMap[contractName]) {
                    allUniqueContractsMap[contractName] = {
                        name: c.nome_contrato,
                        ids: {}
                    };
                }
                allUniqueContractsMap[contractName].ids[table.source] = c.id;
            });

        } catch (e) {
            console.error(`Erro ao carregar contratos da tabela ${table.name}:`, e);
            hasError = true;
        }
    }

    const uniqueContractsArray = Object.values(allUniqueContractsMap).sort((a, b) => a.name.localeCompare(b.name));

    if (uniqueContractsArray.length === 0) {
        const errorMessage = hasError
            ? "Erro ao carregar contratos de uma ou mais bases. Verifique as colunas 'id' e 'nome_contrato'."
            : "Nenhum contrato encontrado.";
        display.textContent = errorMessage;
        display.style.color = 'red';
        return;
    }

    display.style.color = '';
    selectedContractsData = [];

    uniqueContractsArray.forEach(contract => {
        const item = document.createElement('div');
        item.classList.add('select-option-item');

        const sources = Object.keys(contract.ids).join(', ');

        item.innerHTML = `
            <input type="checkbox" data-name="${contract.name}">
            ${contract.name}
            <span style="font-size: 0.75em; color: #888;">(${sources})</span>
        `;

        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            item.classList.toggle('selected', checkbox.checked);
            updateSelectedContracts(contract.name, checkbox.checked);
        });

        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });

        optionsContainer.appendChild(item);
    });

    display.addEventListener('click', () => {
        optionsContainer.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        const container = document.querySelector('.custom-select-contract-container');
        if (container && !container.contains(e.target)) {
            optionsContainer.classList.remove('open');
        }
    });

    updateContractDisplay(display);
}

function updateSelectedContracts(contractName, isSelected) {
    if (isSelected && !selectedContractsData.includes(contractName)) {
        selectedContractsData.push(contractName);
    } else if (!isSelected) {
        selectedContractsData = selectedContractsData.filter(name => name !== contractName);
    }
    updateContractDisplay(document.getElementById('contractSelectDisplay'));
}

function updateContractDisplay(displayElement) {
    if (selectedContractsData.length === 0) {
        displayElement.textContent = "Selecione Contrato(s)";
    } else if (selectedContractsData.length === 1) {
        displayElement.textContent = selectedContractsData[0];
    } else {
        displayElement.textContent = `${selectedContractsData.length} Contrato(s) selecionado(s)`;
    }
}


// =======================================================
// LÓGICA DE EXPORTAÇÃO (XLSX)
// =======================================================

function getSelectedContractsForQuery() {
    return selectedContractsData.map(contractName => {
        const uniqueContract = allUniqueContractsMap[contractName.toUpperCase().trim()];
        if (!uniqueContract) return null;

        return {
            name: uniqueContract.name,
            ids: uniqueContract.ids
        };
    }).filter(c => c !== null);
}

/**
 * Converte a folha de dados (JSON) em uma folha de planilha (Worksheet)
 * e aplica a formatação de números.
 */
function sheet_from_array_of_arrays(data, headers) {
    const ws = XLSX.utils.json_to_sheet(data, { header: headers });

    const range = XLSX.utils.decode_range(ws['!ref']);

    for(let R = range.s.r; R <= range.e.r; ++R) {
        for(let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({c:C, r:R});
            const cell = ws[cell_address];
            const header = headers[C];

            if (cell && cell.v !== undefined) {

                // REMOVIDA LÓGICA DE TRATAMENTO DE ARRAY CÍCLICO (CICLICO_ALL_COLUMNS)

                // --- FORMATAÇÃO NUMÉRICA ---
                if (typeof cell.v === 'number') {
                    if (header.includes('value') || header.includes('stock_value') || header.includes('gross_variation_value') || header.includes('negative_value') || header.includes('positive_value')) {
                        cell.z = '#,##0.00';
                    } else if (header.includes('percent') || header.includes('acuracia') || header.includes('accuracy') || header.includes('meta')) {
                        cell.z = '#,##0.00';
                    } else if (header.includes('qtd') || header.includes('numbers') || header.includes('pecas') || header.includes('cycle') || header.includes('picking') || header.includes('ID Contrato')) {
                        cell.z = '#,##0';
                    }
                }
            }
        }
    }

    return ws;
}

/**
 * Gera e baixa o arquivo XLSX com abas para cada conjunto de dados.
 */
function downloadXLSX(dataSheets) {
    const wb = XLSX.utils.book_new();

    for (const sheetName in dataSheets) {
        const sheet = dataSheets[sheetName];
        XLSX.utils.book_append_sheet(wb, sheet, sheetName);
    }

    XLSX.writeFile(wb, `Relatorio_Compilado_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * SIMULAÇÃO: Busca dados de múltiplas bases e meses. (Apenas Mock)
 */
async function fetchReportData(selectedBases, selectedMonths, selectedContracts, selectedYear) {
    // REMOVIDO: const reportData = { clause: [], rn: [], ciclico: [] };
    const reportData = { clause: [], rn: [] };

    const mockData = (base) => {
        const columnsToMock = base === 'CLAUSE' ? CLAUSE_DETAIL_COLUMNS :
                              base === 'RN' ? RN_DETAIL_COLUMNS :
                              []; // Nunca deve chegar aqui

        return selectedMonths.flatMap(monthNumber => {
            const mesAno = `${monthNumber}/${selectedYear}`;
            return selectedContracts.flatMap(contract => {
                const baseKey = base === 'CLAUSE' ? 'Clause' : 'RN';
                const contractId = contract.ids[baseKey];

                if (!contractId) return [];

                const dataRow = {
                    'Mês/Ano': mesAno,
                    'ID Contrato': contractId,
                    'contract_name': contract.name,
                };

                // Preenche as colunas específicas da base
                columnsToMock.forEach(col => {
                    if (dataRow[col] === undefined) {
                        dataRow[col] = generateMockValue(col);
                    }
                });

                return [dataRow];
            });
        });
    };

    if (selectedBases.includes('CLAUSE')) reportData.clause = mockData('CLAUSE');
    if (selectedBases.includes('RN')) reportData.rn = mockData('RN');
    // REMOVIDO: Lógica de mock CICLICO

    return { data: reportData };
}

/**
 * Função auxiliar para compilar RN e Clause.
 */
function compileRnClauseRow(rawData, contract, mesAno, selectedBases) {
    const clauseId = contract.ids['Clause'];
    const rnId = contract.ids['RN'];
    const primaryId = clauseId || rnId;

    if (!primaryId) return null;

    const clauseData = rawData.clause.find(c => c['ID Contrato'] === clauseId && c['Mês/Ano'] === mesAno);
    const rnData = rawData.rn.find(r => r['ID Contrato'] === rnId && r['Mês/Ano'] === mesAno);

    const compiledRow = {
        'Mês/Ano': mesAno,
        'ID Contrato': primaryId,
        'Contrato': contract.name,
        'Analista': (clauseData || rnData)?.Analista || 'N/A',
    };

    let hasAnyData = false;

    // Preenche todas as colunas RN
    RN_DETAIL_COLUMNS.forEach(col => {
        const value = rnData ? rnData[col] : 0;
        compiledRow[`RN_${col}`] = parseNumericValue(value);
        if (rnData) hasAnyData = true;
    });

    // Preenche todas as colunas Clause
    CLAUSE_DETAIL_COLUMNS.forEach(col => {
        const value = clauseData ? clauseData[col] : 0;
        compiledRow[`Clause_${col}`] = parseNumericValue(value);
        if (clauseData) hasAnyData = true;
    });

    if (hasAnyData || selectedBases.includes('CLAUSE') || selectedBases.includes('RN')) {
        return compiledRow;
    }
    return null;
}

// REMOVIDO: Função processCiclicoRow

/**
 * Função principal para gerar e baixar o relatório.
 */
async function handleGenerateReport() {
    // 1. Coleta de Filtros
    const basesCheckboxGroup = document.getElementById('basesCheckboxGroup');
    // Filtra apenas RN e CLAUSE
    const selectedBases = Array.from(basesCheckboxGroup.querySelectorAll('input:checked')).map(cb => cb.value).filter(v => v !== 'CICLICO');

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const selectedContracts = getSelectedContractsForQuery();
    const selectedMonths = selectedMonthsData;
    const selectedYear = selectedYearValue;

    // Validações
    if (selectedBases.length === 0) return alert("Selecione ao menos uma Base de Dados (RN ou Clause).");
    if (selectedContracts.length === 0) return alert("Selecione ao menos um Contrato.");
    if (selectedMonths.length === 0) return alert("Selecione ao menos um Mês de Referência.");
    if (!selectedYear) return alert("Selecione um Ano de Referência.");


    // 2. Busca de Dados
    const { data: rawData } = await fetchReportData(selectedBases, selectedMonths, selectedContracts, selectedYear);

    // 3. Processamento/Compilação dos Dados
    const sheetsToExport = {};

    // REMOVIDO: Lógica de processamento CÍCLICO

    // ===========================================
    // MODO 1: COMPILADO (Apenas RN + CLAUSE)
    // ===========================================
    if (mode === 'compilado') {

        const compiledClauseRn = [];
        for (const monthNumber of selectedMonths) {
            const mesAno = `${monthNumber}/${selectedYear}`;
            for (const contract of selectedContracts) {
                const row = compileRnClauseRow(rawData, contract, mesAno, selectedBases);
                if (row) {
                    compiledClauseRn.push(row);
                }
            }
        }
        if (compiledClauseRn.length > 0) {
             sheetsToExport['RN_Clause_Compilado'] = sheet_from_array_of_arrays(compiledClauseRn, COMPILED_RN_CLAUSE_HEADERS);
        }

        if (Object.keys(sheetsToExport).length === 0) {
             alert("Nenhum dado encontrado para as bases e contratos selecionados.");
        }

    // ===========================================
    // MODO 2: DIVERSAS (Apenas RN/CLAUSE)
    // ===========================================
    } else if (mode === 'diversas') {

        // --- Geração de Abas Individuais RN/CLAUSE ---
        for (const contract of selectedContracts) {
            // Certifica que o nome da aba não tem mais que 31 caracteres
            const sheetName = contract.name.substring(0, 31);
            const contractData = [];

            for (const monthNumber of selectedMonths) {
                const mesAno = `${monthNumber}/${selectedYear}`;
                const row = compileRnClauseRow(rawData, contract, mesAno, selectedBases);
                if (row) {
                    contractData.push(row);
                }
            }

            if (contractData.length > 0) {
                sheetsToExport[sheetName] = sheet_from_array_of_arrays(contractData, COMPILED_RN_CLAUSE_HEADERS);
            }
        }

        if (Object.keys(sheetsToExport).length === 0) {
             alert("Nenhum dado encontrado para as bases e contratos selecionados.");
        }
    }

    // 4. Exportação (Gera XLSX)
    if (Object.keys(sheetsToExport).length > 0) {
        downloadXLSX(sheetsToExport);
    } else {
        alert("Nenhum dado encontrado com os filtros selecionados.");
    }
}

// =======================================================
// INICIALIZAÇÃO E EVENTOS
// =======================================================

function setupRotinasDropdown() {
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
}

function initializeReport() {
    populateMonthSelectors();
    loadContractList();
    setupRotinasDropdown();

    const generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateReport);
    }
}

document.addEventListener('DOMContentLoaded', initializeReport);