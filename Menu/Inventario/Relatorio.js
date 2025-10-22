// =========================================================================
// Relatorio.js (Geração de Relatórios) - LÓGICA COMPLETA DE EXPORTAÇÃO
// 🚀 AJUSTADO: Seletor de Ano convertido para dropdown customizado (Abre para CIMA).
// 🚀 AJUSTE PRINCIPAL: Inclusão de TODAS as colunas das bases de detalhe.
// 🚀 CORRIGIDO: Preenchimento de dados ausentes com 0 / 'N/A'.
// 🚀 CORRIGIDO: Exportação de valores numéricos em formato puro para formatação no Excel.
// =========================================================================

// 🚨 CREDENCIAIS SUPABASE (Substitua se necessário)
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// --- Lógica de Token de Sessão ---
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

// ⚠️ TABELAS DE CONTRATOS
const TABLE_RN_CONTRATOS = 'rn_contratos';
const TABLE_CLAUSE_CONTRATOS = 'contratos';
const TABLE_CICLICO_CONTRATOS = 'ciclico_contratos';

// 💥 ESTADOS GLOBAIS
let selectedMonthsData = [];
let selectedYearValue = new Date().getFullYear().toString(); // NOVA VARIÁVEL GLOBAL
let allUniqueContractsMap = {};
let selectedContractsData = [];

// =======================================================
// DADOS FIXOS: DEFINIÇÃO DE COLUNAS COMPLETAS
// =======================================================

// Colunas detalhadas da base Clause (inventory_details), excluindo meta fields
const CLAUSE_DETAIL_COLUMNS = [
    'accuracy_item', 'accuracy_locacao', 'accuracy_pecas', 'counted_value',
    'cycle_count', 'gross_percent', 'gross_variation_value', 'negative_value',
    'net_percent', 'net_variation_value', 'part_numbers_correct',
    'part_numbers_counted', 'part_numbers_in_stock', 'pieces_in_stock',
    'positive_value', 'stock_value', 'target_net'
];

// Colunas detalhadas da base RN (rn_details), excluindo meta fields
const RN_DETAIL_COLUMNS = [
    'acuracia_mes', 'erros_percent', 'meta', 'nil_picking', 'nilpi_percent',
    'qtd_erros', 'qtd_linhas', 'repi_percent', 'repicking'
];

// Colunas detalhadas da base Cíclico (ciclico_grade_dados), excluindo meta fields
const CICLICO_DETAIL_COLUMNS = [
    'acompanhamento_plano', 'dias_inventario', 'dias_uteis_ciclo', 'locacoes_incorretas',
    'pecas_contadas', 'pecas_incorretas', 'plano_acumulado', 'plano_locacoes',
    'realizado_acumulado', 'realizado_locacoes', 'status_plano', 'total_locacoes'
];

// Cabeçalho Compilado Final (RN + Clause)
const COMPILED_RN_CLAUSE_HEADERS = [
    'Mês/Ano', 'ID Contrato', 'Contrato', 'Analista',
    // RN Colunas
    ...RN_DETAIL_COLUMNS.map(col => `RN_${col}`),
    // Clause Colunas
    ...CLAUSE_DETAIL_COLUMNS.map(col => `Clause_${col}`)
];

// Cabeçalho Cíclico Final
const COMPILED_CICLICO_HEADERS = [
    'Mês/Ano', 'ID Contrato', 'Contrato',
    ...CICLICO_DETAIL_COLUMNS
];


// =======================================================
// UTILS
// =======================================================

/**
 * Converte um valor para número, tratando o separador decimal brasileiro
 * (vírgula) e retorna 0 se for vazio/inválido.
 * ⚠️ Importante: Para o Excel, precisamos que o número use o ponto (.) como decimal.
 * @param {string|number} value - O valor a ser convertido.
 * @returns {number} O valor numérico formatado para Excel (com ponto) ou 0.
 */
function parseNumericValue(value) {
    if (typeof value === 'number') return value;

    let strValue = String(value || '0').trim();

    // Substitui vírgula por ponto se o valor vier formatado pelo Mock/Base
    strValue = strValue.replace(',', '.');

    const parsed = parseFloat(strValue);

    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Gera um valor mockado para um campo específico, tratando tipos (simula o retorno da base).
 */
function generateMockValue(columnName) {
    // Valores numéricos: percentuais (0-100) ou monetários (0-15000)
    if (columnName.includes('accuracy') || columnName.includes('percent') || columnName.includes('acuracia') || columnName.includes('meta')) {
        return parseNumericValue((Math.random() * 99 + 1).toFixed(2)); // Ex: 95.23
    }
    if (columnName.includes('value') || columnName.includes('stock')) {
        return parseNumericValue((Math.random() * 15000).toFixed(2)); // Ex: 1250.75
    }

    // Valores inteiros: contagens
    if (columnName.includes('qtd') || columnName.includes('numbers') || columnName.includes('pecas') || columnName.includes('locacoes') || columnName.includes('dias') || columnName.includes('cycle') || columnName.includes('picking') || columnName.includes('total_locacoes')) {
        return Math.floor(Math.random() * 5000) || 0;
    }

    // Arrays/JSONB (Retorna valor simbólico para visualização no Excel)
    if (columnName.includes('plano') || columnName.includes('realizado') || columnName.includes('locacoes_incorretas') || columnName.includes('pecas_incorretas') || columnName.includes('dias_inventario') || columnName.includes('acompanhamento_plano') || columnName.includes('status_plano')) {
        return '[Array/JSON Data]';
    }

    // Default para texto ou outros
    return 'N/A';
}

// =======================================================
// LÓGICA DE POPULAR SELETORES DE MÊS/ANO (CUSTOMIZADA)
// =======================================================

function populateMonthSelectors() {
    const monthDisplay = document.getElementById('monthSelectDisplay');
    const monthOptionsContainer = document.getElementById('monthSelectOptions');

    // NOVOS ELEMENTOS DO ANO
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
        yearOptionsContainer.classList.remove('open'); // Fecha o ano se abrir o mês
    });

    // --- LÓGICA DO ANO CUSTOMIZADO (NOVO) ---
    yearOptionsContainer.innerHTML = '';
    const currentYear = new Date().getFullYear();
    yearDisplay.textContent = selectedYearValue;

    // Gera anos: +/- 2 anos do ano atual
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
            // Limpa a seleção anterior
            Array.from(yearOptionsContainer.children).forEach(child => child.classList.remove('selected'));

            item.classList.add('selected');
            selectedYearValue = yearValue;
            yearDisplay.textContent = yearValue;
            yearOptionsContainer.classList.remove('open'); // Fecha o dropdown
        });

        yearOptionsContainer.appendChild(item);
    }

    yearDisplay.addEventListener('click', () => {
        yearOptionsContainer.classList.toggle('open');
        monthOptionsContainer.classList.remove('open'); // Fecha o mês se abrir o ano
    });

    // --- LÓGICA DE FECHAR AO CLICAR FORA ---
    document.addEventListener('click', (e) => {
        const monthContainer = document.querySelector('.custom-select-month-container');
        const yearContainer = document.querySelector('.custom-select-year-container');

        // Fecha Mês
        if (monthContainer && !monthContainer.contains(e.target)) {
            monthOptionsContainer.classList.remove('open');
        }
        // Fecha Ano
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


// =======================================================
// LÓGICA DE CONTRATOS (DEDUPLICADA e CUSTOM DROPDOWN)
// (Mantida inalterada)
// =======================================================

async function loadContractList() {
    const display = document.getElementById('contractSelectDisplay');
    const optionsContainer = document.getElementById('contractSelectOptions');

    display.textContent = 'Buscando contratos...';
    optionsContainer.innerHTML = '';

    const contractTables = [
        { name: TABLE_RN_CONTRATOS, source: 'RN' },
        { name: TABLE_CLAUSE_CONTRATOS, source: 'Clause' },
        { name: TABLE_CICLICO_CONTRATOS, source: 'Cíclico' }
    ];

    allUniqueContractsMap = {};
    let hasError = false;

    for (const table of contractTables) {
        try {
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

            if (cell && cell.v !== undefined && typeof cell.v === 'number') {
                const header = headers[C];

                // Regras de formatação estendidas para novos campos
                if (header.includes('value') || header.includes('stock_value') || header.includes('gross_variation_value') || header.includes('negative_value') || header.includes('positive_value')) {
                    // Formato de Moeda/Decimal para Valor
                    cell.z = '#,##0.00';
                } else if (header.includes('percent') || header.includes('acuracia') || header.includes('accuracy') || header.includes('meta')) {
                    // Formato de Percentual (assumindo que o valor mockado é 0-100)
                    cell.z = '#,##0.00';
                } else if (header.includes('qtd') || header.includes('numbers') || header.includes('pecas') || header.includes('locacoes') || header.includes('dias') || header.includes('cycle') || header.includes('picking')) {
                    // Formato de Número Inteiro para Contagens
                    cell.z = '#,##0';
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

    /* Escreve o arquivo */
    XLSX.writeFile(wb, `Relatorio_Compilado_Completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * SIMULAÇÃO: Busca dados de múltiplas bases e meses, gerando TODAS as colunas.
 */
async function fetchReportData(selectedBases, selectedMonths, selectedContracts, selectedYear) {
    const reportData = { clause: [], rn: [], ciclico: [] };

    // Simulação da estrutura das bases de detalhe
    const mockData = (base) => {
        const columnsToMock = base === 'CLAUSE' ? CLAUSE_DETAIL_COLUMNS :
                              base === 'RN' ? RN_DETAIL_COLUMNS :
                              CICLICO_DETAIL_COLUMNS;

        return selectedMonths.flatMap(monthNumber => {
            const mesAno = `${monthNumber}/${selectedYear}`;
            return selectedContracts.flatMap(contract => {
                const baseKey = base === 'CLAUSE' ? 'Clause' : base === 'RN' ? 'RN' : 'Cíclico';
                const contractId = contract.ids[baseKey];

                // Se o contrato não existe nessa base, ele não seria retornado.
                if (!contractId) return [];

                const dataRow = {
                    'Mês/Ano': mesAno,
                    'ID Contrato': contractId,
                    'Contrato': contract.name,
                    'Analista': 'Analista Mock',
                };

                // Gera mock para TODAS as colunas da base
                columnsToMock.forEach(col => {
                    dataRow[col] = generateMockValue(col);
                });

                return [dataRow];
            });
        });
    };

    if (selectedBases.includes('CLAUSE')) reportData.clause = mockData('CLAUSE');
    if (selectedBases.includes('RN')) reportData.rn = mockData('RN');
    if (selectedBases.includes('CICLICO')) reportData.ciclico = mockData('CICLICO');

    // Não precisamos passar 'headers' pelo retorno, usamos as constantes globais
    return { data: reportData };
}

/**
 * Função principal para gerar e baixar o relatório.
 */
async function handleGenerateReport() {
    // 1. Coleta de Filtros
    const basesCheckboxGroup = document.getElementById('basesCheckboxGroup');
    const selectedBases = Array.from(basesCheckboxGroup.querySelectorAll('input:checked')).map(cb => cb.value);

    const mode = document.querySelector('input[name="mode"]:checked').value;

    const selectedContracts = getSelectedContractsForQuery();

    const selectedMonths = selectedMonthsData;
    const selectedYear = selectedYearValue; // 💥 NOVO: Usa a variável global

    // Validações
    if (selectedBases.length === 0) return alert("Selecione ao menos uma Base de Dados.");
    if (selectedContracts.length === 0) return alert("Selecione ao menos um Contrato.");
    if (selectedMonths.length === 0) return alert("Selecione ao menos um Mês de Referência.");
    if (!selectedYear) return alert("Selecione um Ano de Referência.");


    // 2. Busca de Dados
    const { data: rawData } = await fetchReportData(selectedBases, selectedMonths, selectedContracts, selectedYear);

    // 3. Processamento/Compilação dos Dados (Modo Compilado)
    const sheetsToExport = {};

    if (mode === 'compilado') {
        // --- 3a. Compilação RN + CLAUSE ---
        const basesClauseRn = ['CLAUSE', 'RN'].filter(base => selectedBases.includes(base));

        if (basesClauseRn.length > 0) {
            const compiledClauseRn = [];

            // Loop por cada combinação Mês/Ano e Contrato
            for (const monthNumber of selectedMonths) {
                const mesAno = `${monthNumber}/${selectedYear}`;

                for (const contract of selectedContracts) {
                    const clauseId = contract.ids['Clause'];
                    const rnId = contract.ids['RN'];
                    const primaryId = clauseId || rnId;

                    if (!primaryId) continue;

                    // Tenta encontrar dados no mockData
                    const clauseData = rawData.clause.find(c => c['ID Contrato'] === clauseId && c['Mês/Ano'] === mesAno);
                    const rnData = rawData.rn.find(r => r['ID Contrato'] === rnId && r['Mês/Ano'] === mesAno);

                    // A linha base deve ser criada mesmo que não haja dados para garantir o 0
                    const compiledRow = {
                        'Mês/Ano': mesAno,
                        'ID Contrato': primaryId,
                        'Contrato': contract.name,
                        'Analista': (clauseData || rnData)?.Analista || 'N/A', // Pega Analista do que tiver dado
                    };

                    let hasAnyData = false;

                    // Preenche todas as colunas RN
                    RN_DETAIL_COLUMNS.forEach(col => {
                        const value = rnData ? rnData[col] : 0;
                        compiledRow[`RN_${col}`] = (typeof value === 'string' && value.includes('Array')) ? value : parseNumericValue(value);
                        if (rnData) hasAnyData = true;
                    });

                    // Preenche todas as colunas Clause
                    CLAUSE_DETAIL_COLUMNS.forEach(col => {
                        const value = clauseData ? clauseData[col] : 0;
                        compiledRow[`Clause_${col}`] = (typeof value === 'string' && value.includes('Array')) ? value : parseNumericValue(value);
                        if (clauseData) hasAnyData = true;
                    });

                    // Adiciona a linha ao relatório (deve vir mesmo que vazia, se a base foi selecionada)
                    if (hasAnyData || selectedBases.includes('CLAUSE') || selectedBases.includes('RN')) {
                        compiledClauseRn.push(compiledRow);
                    }
                }
            }

            if (compiledClauseRn.length > 0) {
                 sheetsToExport['RN_Clause_Compilado'] = sheet_from_array_of_arrays(compiledClauseRn, COMPILED_RN_CLAUSE_HEADERS);
            }
        }

        // --- 3b. Compilação CÍCLICO ---
        if (selectedBases.includes('CICLICO')) {
             const processedCiclico = [];

             for (const monthNumber of selectedMonths) {
                const mesAno = `${monthNumber}/${selectedYear}`;

                for (const contract of selectedContracts) {
                    const contractId = contract.ids['Cíclico'];

                    if (!contractId) continue;

                    const ciclicoData = rawData.ciclico.find(r => r['ID Contrato'] === contractId && r['Mês/Ano'] === mesAno);

                    const processedRow = {
                        'Mês/Ano': mesAno,
                        'ID Contrato': contractId,
                        'Contrato': contract.name,
                        'Analista': ciclicoData?.Analista || 'N/A',
                    };

                    // Garante que todas as colunas Cíclico são incluídas e formatadas
                    CICLICO_DETAIL_COLUMNS.forEach(col => {
                        const value = ciclicoData ? ciclicoData[col] : 0;

                        // Se for um array/jsonb, mantém a string ou define 'N/A'. Se for numérico, define 0.
                        const isArrayOrText = (typeof value === 'string' && value.includes('Array')) || col.includes('acompanhamento_plano') || col.includes('dias_inventario') || col.includes('locacoes_incorretas') || col.includes('pecas_incorretas') || col.includes('plano_acumulado') || col.includes('status_plano');

                        processedRow[col] = ciclicoData
                            ? isArrayOrText ? value : parseNumericValue(value)
                            : isArrayOrText ? 'N/A' : 0;
                    });

                    // Adiciona a linha se houver dados ou se a base CÍCLICO foi selecionada
                    if (ciclicoData || selectedBases.includes('CICLICO')) {
                         processedCiclico.push(processedRow);
                    }
                }
            }

             if (processedCiclico.length > 0) {
                 sheetsToExport['Ciclico_Compilado'] = sheet_from_array_of_arrays(processedCiclico, COMPILED_CICLICO_HEADERS);
             }
        }

    } else if (mode === 'diversas') {
        alert("O modo 'Diversas' não está implementado. Focando no modo 'Compilado'.");
        return;
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