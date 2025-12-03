// ======================================================================
// 1. CONFIGURAÇÃO SUPABASE REAL
// ======================================================================

const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';
let supabaseClient;
let userAccessToken = null;

try {
    const sessionDataJSON = localStorage.getItem('user_session_data');
    if (sessionDataJSON) {
        const userData = JSON.parse(sessionDataJSON);
        if (userData.token) {
            userAccessToken = userData.token;
        }
    }

    if (typeof supabase === 'object' && typeof supabase.createClient === 'function') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false }
        });
        if (userAccessToken) {
            supabaseClient.auth.setSession({ access_token: userAccessToken, refresh_token: userAccessToken, expires_in: 3600, token_type: 'bearer' });
        }
    } else {
        console.error("A biblioteca @supabase/supabase-js não foi carregada.");
    }
} catch (e) {
    console.error("Falha ao inicializar o cliente Supabase.", e);
}


// ======================================================================
// 2. ELEMENTOS E VARIÁVEIS DE ESTADO
// ======================================================================

// Elementos de Upload
const uploadFormVazias = document.getElementById('uploadFormVazias');
const contractNameInputVazias = document.getElementById('contractNameInputVazias');
const monthSelectorVazias = document.getElementById('monthSelectorVazias');
const yearInputVazias = document.getElementById('yearInputVazias');
const fileInputVazias = document.getElementById('fileInputVazias');
const selectFileBtnVazias = document.getElementById('selectFileBtnVazias');
const processFileBtnVazias = document.getElementById('processFileBtnVazias');
const fileNameDisplayVazias = document.getElementById('fileNameDisplayVazias');
const uploadMessageVazias = document.getElementById('uploadMessageVazias');

// Elementos do Dashboard (Novos)
const processingResultsVazias = document.getElementById('processingResultsVazias'); // Movido para Dashboard
const kpiTotalLocs = document.getElementById('kpiTotalLocs');
const kpiOkLocs = document.getElementById('kpiOkLocs');
const kpiAcertividade = document.getElementById('kpiAcertividade');
const contractSelectorDash = document.getElementById('contractSelectorDash');
const monthSelectorDash = document.getElementById('monthSelectorDash');
const yearSelectorDash = document.getElementById('yearSelectorDash');
const dashMessage = document.getElementById('dashMessage');


// Variável de estado para o arquivo selecionado
let selectedFile = null;

// ----------------------------------------------------------------------
// FUNÇÕES DE UTILIDADE E CÁLCULO
// ----------------------------------------------------------------------

function showMessage(element, message, type = 'info') {
    if (!element) return;
    element.innerHTML = message;
    element.className = `form-message ${type}`;
    element.style.display = 'block';
}

function clearMessage(element) {
    if (!element) return;
    element.innerHTML = '';
    element.className = 'form-message';
    element.style.display = 'none';
}

/**
 * Popula os seletores de Mês e o Datalist de Ano (somente na aba Upload).
 */
function populateSelectors() {
    // Popula Mês (SELECT)
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    if (monthSelectorVazias) {
        monthSelectorVazias.innerHTML = '<option value="">-- Mês --</option>';
        months.forEach((name, index) => {
            monthSelectorVazias.innerHTML += `<option value="${index + 1}">${name}</option>`;
        });
    }

    // Popula Ano (DATALIST)
    const yearDatalist = document.getElementById('yearListVazias');
    if (yearDatalist) {
        yearDatalist.innerHTML = '';
        const currentYear = new Date().getFullYear();
        // Sugere o ano atual e os 3 anteriores
        for (let i = currentYear + 1; i >= currentYear - 3; i--) {
            yearDatalist.innerHTML += `<option value="${i}">`;
        }
    }
}

/**
 * Lógica REAL para processar o arquivo de texto (CSV).
 */
function processFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');

                let totalLocacoes = 0;
                let locacoesOk = 0;
                let locacoesNaoOk = [];
                let locacoesOkArray = [];
                let hasDivergence = false;

                // IGNORAR a primeira linha se for cabeçalho
                if (lines.length > 0) lines.shift();

                // Função de limpeza: remove quebras de linha, tabulações e o caractere NULO (\u0000)
                const cleanString = (str) => {
                    if (!str) return '';
                    // Remove quebras de linha, tabulações e o caractere nulo
                    return str.replace(/[\n\r\t\u0000]/g, '').trim();
                };

                for (const line of lines) {
                    // CORREÇÃO: Divide a linha usando PONTO E VÍRGULA (;) como delimitador
                    const columns = line.split(';');

                    // LOCAÇÃO NA COLUNA B (ÍNDICE 1)
                    const locacao = cleanString(columns[1]);

                    // STATUS/SKU NA COLUNA C (ÍNDICE 2)
                    const status = cleanString(columns[2]).toUpperCase();

                    // Verifica se a locação é válida (não vazia)
                    if (locacao === '' || locacao === 'N/D') continue;

                    totalLocacoes++;

                    // Lógica de Validação: Status deve ser "OK"
                    if (status === 'OK') {
                        locacoesOk++;
                        locacoesOkArray.push(locacao);
                    } else {
                        // Identifica qualquer status diferente de OK como Divergência
                        hasDivergence = true;

                        // Coleta de dados detalhados para erro
                        locacoesNaoOk.push({
                            // Coluna A
                            AREA: cleanString(columns[0] || 'N/D'),
                            // Coluna B (Locação, já mapeada)
                            LOCACAO: locacao,
                            // Coluna C (SKU/Status)
                            SKU: cleanString(columns[2] || 'N/D'),
                            // Coluna D (Convertida para String no detalhe)
                            QTD: cleanString(columns[3] || '0'),
                            // Coluna E (ÍNDICE 4) - OUTRO SKU NO FISICO
                            OUTRO_SKU: cleanString(columns[4] || null),
                        });
                    }
                }

                // Define o status final
                const finalStatus = hasDivergence ? 'DIVERGENCIA' : 'CONCLUIDO';

                resolve({
                    totalLocacoes,
                    locacoesOk,
                    locacoesNaoOk,
                    locacoesOkArray,
                    finalStatus // Adiciona o status final para envio ao DB
                });

            } catch (error) {
                console.error("Erro durante o processamento do arquivo:", error);
                reject(new Error("Falha ao ler ou analisar o arquivo. Verifique se o formato CSV está correto."));
            }
        };

        reader.onerror = reject;

        // Lê o arquivo como texto
        reader.readAsText(file);
    });
}

/**
 * INTEGRAÇÃO REAL COM SUPABASE PARA SALVAR OS DADOS.
 */
async function saveProcessingData(metadata, results) {
    if (!supabaseClient) {
        throw new Error("Cliente Supabase não inicializado. Verifique a chave API.");
    }

    // Calcula a acertividade.
    const acertividade = (results.totalLocacoes > 0) ? (results.locacoesOk / results.totalLocacoes) * 100 : 0;

    const locacoesNaoOkCount = results.locacoesNaoOk.length;

    // SERIALIZAÇÃO: Converte o array de locações OK em uma string CSV
    const locacoesOkLista = results.locacoesOkArray.join(',');

    // --- 1. SALVAR OS METADADOS DO UPLOAD E KPIS (Tabela vazias_uploads) ---
    console.log("Tentando salvar resumo do upload...");

    const { data: uploadData, error: uploadError } = await supabaseClient
        .from('vazias_uploads')
        .insert([
            {
                contract_id: metadata.contractName,
                contract_name: metadata.contractName,
                reference_month: metadata.referenceMonth,
                reference_year: metadata.referenceYear,
                file_name: metadata.fileName,
                total_locacoes: results.totalLocacoes,
                locacoes_ok: results.locacoesOk,
                locacoes_nao_ok_count: locacoesNaoOkCount,
                acertividade: acertividade,
                locacoes_ok_lista: locacoesOkLista,
                // Envia o status final (CONCLUIDO ou DIVERGENCIA)
                status: results.finalStatus,
            }
        ])
        .select();

    if (uploadError) {
        console.error("Supabase Error (vazias_uploads):", uploadError);
        throw new Error(`Falha ao salvar resumo (vazias_uploads) no banco de dados: ${uploadError.message}`);
    }

    const uploadId = uploadData[0].id;
    console.log(`Resumo salvo com sucesso. ID do Upload: ${uploadId}`);

    // --- 2. SALVAR OS DETALHES DAS LINHAS NÃO OK (Tabela vazias_detalhe) ---
    if (results.locacoesNaoOk.length > 0) {
        console.log(`Tentando salvar ${results.locacoesNaoOk.length} registros de detalhe...`);
        const detailRecords = results.locacoesNaoOk.map(item => ({
            upload_id: uploadId, // Chave estrangeira
            locacao: item.LOCACAO,
            area: item.AREA,
            sku: item.SKU,
            qtd: item.QTD,
            // CORREÇÃO FINAL: Mapeando OUTRO_SKU para o campo 'outro_sku_no_fisico' no Supabase
            outro_sku_no_fisico: item.OUTRO_SKU,
        }));

        const { error: detailError } = await supabaseClient
            .from('vazias_detalhe')
            .insert(detailRecords);

        if (detailError) {
            console.error("Supabase Detail Error (vazias_detalhe):", detailError);
            throw new Error(`Falha ao salvar detalhes dos erros (vazias_detalhe) no banco de dados: ${detailError.message}`);
        }
        console.log("Detalhes salvos com sucesso.");
    }

    return uploadId;
}


// ----------------------------------------------------------------------
// 3. LÓGICA DE UPLOAD E CONTROLE DE BOTÃO
// ----------------------------------------------------------------------

/**
 * Verifica se todos os campos do formulário de upload estão preenchidos.
 */
function checkUploadFormValidity() {
    const isFileSelected = selectedFile !== null;
    const isContractValid = contractNameInputVazias && contractNameInputVazias.value.trim() !== '';
    const isMonthSelected = monthSelectorVazias && monthSelectorVazias.value.trim() !== '';
    const isYearValid = yearInputVazias && yearInputVazias.value.trim() !== '';

    return isFileSelected && isContractValid && isMonthSelected && isYearValid;
}

/**
 * Atualiza o estado (disabled/enabled) e cor do botão de Processar.
 */
function updateProcessButtonState() {
    const isValid = checkUploadFormValidity();

    if(processFileBtnVazias) {
        processFileBtnVazias.disabled = !isValid;

        // O botão de processar (primary-action) é AZUL ESCURO
        if (isValid) {
            processFileBtnVazias.classList.remove('secondary-action');
            processFileBtnVazias.classList.add('primary-action');
        } else {
            // Quando inativo, usa o secondary (VERMELHO), que o CSS desativa para cinza.
            processFileBtnVazias.classList.remove('primary-action');
            processFileBtnVazias.classList.add('secondary-action');
        }
    }
}

function handleFileSelection(event) {
    selectedFile = event.target.files[0];
    clearMessage(uploadMessageVazias);

    // O painel de resultados agora está no Dashboard, não é mais manipulado aqui.
    if (processingResultsVazias) processingResultsVazias.style.display = 'none';

    if (selectedFile) {
        fileNameDisplayVazias.textContent = selectedFile.name;
    } else {
        fileNameDisplayVazias.textContent = 'Nenhum arquivo selecionado.';
    }

    updateProcessButtonState();
}


async function handleFileUpload(e) {
    e.preventDefault();

    const contractName = contractNameInputVazias.value.trim();
    const referenceMonth = monthSelectorVazias.value;
    const referenceYear = yearInputVazias.value.trim();
    const fileName = selectedFile ? selectedFile.name : null;

    if (!checkUploadFormValidity() || !fileName) {
        showMessage(uploadMessageVazias, "Por favor, preencha o Nome do Contrato, Mês, Ano e selecione um arquivo.", "error");
        return;
    }

    // Desativa UI
    processFileBtnVazias.disabled = true;
    selectFileBtnVazias.disabled = true;

    showMessage(uploadMessageVazias,
        `<i class="fas fa-spinner fa-spin"></i> Processando dados para ${contractName} (${referenceMonth}/${referenceYear})...`,
        "info");

    try {
        // 1. CHAMA A FUNÇÃO REAL DE PROCESSAMENTO
        const results = await processFile(selectedFile);

        // 2. CHAMADA REAL DE SALVAMENTO (INTEGRAÇÃO COM SUPABASE)
        const metadata = { contractName, referenceMonth, referenceYear, fileName };
        await saveProcessingData(metadata, results);

        // A exibição de resultados e KPIs foi MOVIDA para a aba Dashboard.
        showMessage(uploadMessageVazias,
            `<i class="fas fa-check-circle"></i> Dados do Contrato '${contractName}' processados (${results.totalLocacoes} linhas) e salvos. Status: **${results.finalStatus}**. Consulte o Dashboard.`,
            "success");

        // Limpa o estado
        fileInputVazias.value = '';
        selectedFile = null;
        fileNameDisplayVazias.textContent = 'Nenhum arquivo selecionado.';

    } catch (error) {
        console.error("Erro no processamento/salvamento do arquivo:", error);
        // Exibe o erro real, seja do Supabase ou do processamento do arquivo
        const errorMessage = error.message.includes('Supabase') ? error.message : `Erro no arquivo: ${error.message}`;
        showMessage(uploadMessageVazias,
            `<i class="fas fa-exclamation-triangle"></i> Erro ao processar/salvar dados: ${errorMessage}`,
            "error");
    } finally {
        // Reativa UI
        selectFileBtnVazias.disabled = false;
        updateProcessButtonState();
    }
}


// ----------------------------------------------------------------------
// 4. LÓGICA DE DASHBOARD (KPIS E SELEÇÃO ENCADEADA)
// ----------------------------------------------------------------------

/**
 * Busca e popula o seletor de contratos com dados existentes.
 */
async function fetchContracts() {
    clearMessage(dashMessage);
    if (!contractSelectorDash) return;

    contractSelectorDash.innerHTML = '<option value="">-- Carregando Contratos --</option>';

    try {
        const { data, error } = await supabaseClient
            .from('vazias_uploads')
            .select('contract_id', { distinct: true }) // Usa distinct para buscar apenas valores únicos
            .order('contract_id', { ascending: true });

        if (error) throw error;

        const uniqueContractIds = data.map(item => item.contract_id);

        contractSelectorDash.innerHTML = '<option value="">-- Selecione o Contrato --</option>';
        uniqueContractIds.forEach(id => {
            contractSelectorDash.innerHTML += `<option value="${id}">${id}</option>`;
        });

        // Se houver contratos, habilita o seletor
        if (uniqueContractIds.length > 0) {
            contractSelectorDash.disabled = false;
        } else {
            showMessage(dashMessage, "Nenhum dado de contrato encontrado.", "info");
        }

    } catch (error) {
        console.error("Erro ao buscar contratos:", error);
        showMessage(dashMessage, `Erro ao carregar contratos: ${error.message}`, "error");
    }
}

/**
 * Busca meses e anos disponíveis para o contrato selecionado.
 */
async function fetchMonthsAndYears(contractId) {
    // Reseta meses, anos e KPIs
    if (!monthSelectorDash || !yearSelectorDash) return;

    monthSelectorDash.innerHTML = '<option value="">-- Mês --</option>';
    yearSelectorDash.innerHTML = '<option value="">-- Ano --</option>';
    monthSelectorDash.disabled = true;
    yearSelectorDash.disabled = true;

    // Esconde resultados e limpa mensagem
    if (processingResultsVazias) processingResultsVazias.style.display = 'none';
    clearMessage(dashMessage);

    if (!contractId) return;

    try {
        const { data, error } = await supabaseClient
            .from('vazias_uploads')
            .select('reference_month, reference_year')
            .eq('contract_id', contractId)
            .order('reference_year', { ascending: false })
            .order('reference_month', { ascending: false });

        if (error) throw error;

        // Processa meses únicos
        const monthMap = new Map();
        const yearSet = new Set();

        data.forEach(item => {
            yearSet.add(item.reference_year);
            // Mapeia mês/ano para evitar duplicatas desnecessárias no seletor de mês
            if (!monthMap.has(item.reference_month)) {
                monthMap.set(item.reference_month, true);
            }
        });

        // Nomes dos meses
        const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

        monthSelectorDash.innerHTML = '<option value="">-- Mês --</option>';
        // Ordena meses numericamente
        const uniqueMonths = [...monthMap.keys()].sort((a, b) => a - b);
        uniqueMonths.forEach(month => {
            monthSelectorDash.innerHTML += `<option value="${month}">${monthNames[month - 1]}</option>`;
        });

        // Processa anos únicos
        yearSelectorDash.innerHTML = '<option value="">-- Ano --</option>';
        // Ordena anos decrescentemente
        const uniqueYears = [...yearSet].sort((a, b) => b - a);
        uniqueYears.forEach(year => {
            yearSelectorDash.innerHTML += `<option value="${year}">${year}</option>`;
        });

        if (uniqueMonths.length > 0) monthSelectorDash.disabled = false;
        if (uniqueYears.length > 0) yearSelectorDash.disabled = false;

    } catch (error) {
        console.error("Erro ao buscar meses/anos:", error);
        showMessage(dashMessage, `Erro ao carregar meses/anos: ${error.message}`, "error");
    }
}

/**
 * Busca e exibe os KPIs com base na seleção completa.
 */
async function fetchKPIs() {
    const contractId = contractSelectorDash.value;
    const month = monthSelectorDash.value;
    const year = yearSelectorDash.value;

    if (processingResultsVazias) processingResultsVazias.style.display = 'none';
    clearMessage(dashMessage);

    if (!contractId || !month || !year) {
        return; // Espera todos os campos estarem preenchidos
    }

    showMessage(dashMessage, `<i class="fas fa-spinner fa-spin"></i> Carregando KPIs para ${contractId} (${month}/${year})...`, "info");

    try {
        const { data, error } = await supabaseClient
            .from('vazias_uploads')
            .select('total_locacoes, locacoes_ok, acertividade')
            .eq('contract_id', contractId)
            .eq('reference_month', month)
            .eq('reference_year', year)
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            const kpis = data[0];

            if(kpiTotalLocs && kpiOkLocs && kpiAcertividade) {
                kpiTotalLocs.textContent = kpis.total_locacoes.toLocaleString('pt-BR');
                kpiOkLocs.textContent = kpis.locacoes_ok.toLocaleString('pt-BR');
                // Formata a acertividade como porcentagem com 2 casas
                kpiAcertividade.textContent = `${kpis.acertividade.toFixed(2)}%`;
            }

            if (processingResultsVazias) processingResultsVazias.style.display = 'block';
            clearMessage(dashMessage);

        } else {
            showMessage(dashMessage, `Nenhum KPI encontrado para a seleção: ${contractId} (${month}/${year}).`, "info");
        }

    } catch (error) {
        console.error("Erro ao buscar KPIs:", error);
        showMessage(dashMessage, `Erro ao carregar KPIs: ${error.message}`, "error");
    }
}


// ----------------------------------------------------------------------
// 5. INICIALIZAÇÃO E EVENTOS
// ----------------------------------------------------------------------

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = e.currentTarget.getAttribute('data-tab');

            tabs.forEach(item => item.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            e.currentTarget.classList.add('active');
            document.getElementById(`${targetTab}-section`).classList.add('active');

            // Lógica especial: se for para o dashboard, carrega os contratos
            if (targetTab === 'dashboard') {
                fetchContracts();
            }
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {

    // Popula os seletores de Mês/Ano (da aba Upload)
    populateSelectors();

    // 5.1. Inicialização do Dropdown Rotinas (mantido)
    const rotinasDropdown = document.getElementById('rotinasDropdown');
    if (rotinasDropdown) {
        const dropdownToggle = rotinasDropdown.querySelector('.dropdown-toggle');
        const dropdownContent = rotinasDropdown.querySelector('.dropdown-content');
        const dropdownIcon = rotinasDropdown.querySelector('.dropdown-icon');

        if (dropdownToggle && dropdownContent && dropdownIcon) {
            dropdownToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = dropdownContent.classList.contains('open');

                dropdownContent.classList.toggle('open');
                dropdownIcon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-180deg)';
            });

            document.addEventListener('click', (e) => {
                if (!rotinasDropdown.contains(e.target) && dropdownContent.classList.contains('open')) {
                    dropdownContent.classList.remove('open');
                    dropdownIcon.style.transform = 'rotate(0deg)';
                }
            });
        }
    }


    // 5.2. Eventos do Formulário de Upload (Validação de todos os campos)
    if (contractNameInputVazias) contractNameInputVazias.addEventListener('input', updateProcessButtonState);
    if (monthSelectorVazias) monthSelectorVazias.addEventListener('change', updateProcessButtonState);
    if (yearInputVazias) yearInputVazias.addEventListener('input', updateProcessButtonState);

    if (selectFileBtnVazias) {
        selectFileBtnVazias.addEventListener('click', () => {
            if(fileInputVazias) fileInputVazias.click();
        });
    }

    if (fileInputVazias) {
        fileInputVazias.addEventListener('change', handleFileSelection);
    }

    if (uploadFormVazias) {
        uploadFormVazias.addEventListener('submit', handleFileUpload);
    }

    // 5.3. Inicialização da Navegação por Abas
    setupTabs();

    // 5.4. Inicializa o botão de processamento como desativado
    updateProcessButtonState();

    // 5.5. Eventos do Dashboard (Seleção Cascata)
    if (contractSelectorDash) {
        // Evento 1: Seleção de Contrato (dispara busca de meses/anos)
        contractSelectorDash.addEventListener('change', (e) => {
            fetchMonthsAndYears(e.target.value);
            // Tenta buscar KPIs imediatamente caso meses/anos já estejam preenchidos de uma sessão anterior
            fetchKPIs();
        });

        // Evento 2: Seleção de Mês (dispara busca de KPIs)
        if (monthSelectorDash) monthSelectorDash.addEventListener('change', fetchKPIs);

        // Evento 3: Seleção de Ano (dispara busca de KPIs)
        if (yearSelectorDash) yearSelectorDash.addEventListener('change', fetchKPIs);
    }
});