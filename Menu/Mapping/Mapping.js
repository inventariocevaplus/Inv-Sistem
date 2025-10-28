// =========================================================================
// CONFIGURAÇÃO SUPABASE (COPIE E COLE AQUI AS SUAS CHAVES REAIS)
// =========================================================================
const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co'; // SUBSTITUA PELA SUA URL REAL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw'; // SUBSTITUA PELA SUA CHAVE REAL

// Inicialização do cliente Supabase
const { createClient } = supabase;
const supabaseClient = typeof supabase !== 'undefined'
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : {
        from: () => ({
            insert: () => ({ error: { message: 'Supabase não inicializado.' } }),
            select: () => ({ data: [], error: { message: 'Supabase não inicializado.' } }),
            upsert: () => ({ error: { message: 'Supabase não inicializado.' } }),
            delete: () => ({ data: [], error: { message: 'Supabase não inicializado.' } }),
        })
    };

if (typeof supabase === 'undefined') {
    console.error('Atenção: A biblioteca Supabase não foi carregada. Nenhuma função de DB funcionará.');
}

const CONTRATOS_TABLE = 'mapping_contratos';
// =========================================================================

// =========================================================================
// 1. DEFINIÇÃO DAS COLUNAS (Ordem Lógica) - APENAS AS VISÍVEIS NA GRADE
// =========================================================================
const CONTRACT_COLUMNS = [
    "contratos",
    "Segmento",
    "bu",
    "Data Contrato",
    "Vencimento",
    "Prazo para aviso de Saída",
    "diretor",
    "gerente",
    "Gestor de Inventário",
    "Ressarcimento $",
    "Equipe Atual de Inventario (White Color)",
    "Equipe Atual de Inventario (Blue Color)",
    "Equipe Ideal de Inventario (White Color)",
    "Equipe Ideal de Inventario (Blue Color)",
    "Recursos operacionais compartilhados",
    "sistema",
    "Posições WH contrato",
    "Posições WH físico",
    "Produtividade de Contagem Baixo",
    "Produtividade de Contagem Alto",
    "Produtividade de Contagem Alto pallet fechado",
    "Target Contratual",
    "Ciclo de Inventário",
    "Modalidade de contagem",
    "KPI Performance",
    "Inventário Geral",
    "Periodo para ajuste",
    "Análise Resultado Inventário Geral $",
    "cap",
    "Valor Estoque (Seguro)",
    "Batimento Estoque",
    "Modalidade de ajuste",
    "Sistema mandatório",
    "HC reconhecido pelo Cliente",
    "Slotting Master",
    "Avaria CEVA",
    "FIFO / FEFO",
    "Seguro WH",
    "provisão",
    "analista",
    "habilidades",
    "cargo",
    "Ações"
];


// Variável global para armazenar o perfil do usuário
let globalUserProfile = {};

// Variável global para gerenciar a exclusão (Usado pela Modal)
let rowToDelete = null;

// =========================================================================
// FUNÇÕES AUXILIARES PARA CORREÇÃO DE FORMATOS
// =========================================================================
function convertToISO(dateString) {
    if (!dateString || dateString === '-') return null;

    const parts = dateString.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts;
        if (day.length === 2 && month.length === 2 && year.length === 4) {
            return `${year}-${month}-${day}`;
        }
    }
    return null;
}
function formatDateToBR(isoDateString) {
    if (!isoDateString || isoDateString === '-') return '-';

    const value = String(isoDateString);
    if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return value;
    }

    try {
        const parts = value.split('T')[0].split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
    } catch (e) {
        console.warn("Erro ao formatar data ISO:", value, e);
    }
    return value;
}
function cleanNumericValue(valueString, isFloat = false) {
    if (!valueString || valueString === '-') return null;

    let cleaned = String(valueString).trim();

    if (cleaned === '') return null;

    if (isFloat) {
        // Remove R$, ., e troca , por .
        cleaned = cleaned.replace(/[^\d,\.]/g, '');
        cleaned = cleaned.replace(/\./g, '');
        cleaned = cleaned.replace(',', '.');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    } else {
        cleaned = cleaned.replace(/[^\d]/g, '');
        const num = parseInt(cleaned, 10);
        return isNaN(num) ? null : num;
    }
}
function convertToBoolean(valueString) {
    if (!valueString || valueString === '-') return null;
    const cleanValue = valueString.trim().toLowerCase();
    if (cleanValue === 'sim' || cleanValue === 's' || cleanValue === 'true') {
        return true;
    }
    if (cleanValue === 'não' || cleanValue === 'nao' || cleanValue === 'n' || cleanValue === 'false') {
        return false;
    }
    return null;
}

// =========================================================================
// FUNÇÕES DE TOAST (AVISO DISCRETO)
// =========================================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast ? toast.querySelector('i') : null;

    if (!toast || !toastMessage || !toastIcon) {
        if (type === 'error') alert(`ERRO: ${message}`);
        console.error("Elemento toast não encontrado. Mensagem:", message);
        return;
    }

    toastMessage.textContent = message;
    toast.className = 'toast-hidden';
    toastIcon.className = '';
    toast.style.backgroundColor = '';

    if (type === 'success') {
        toast.style.backgroundColor = '#28a745';
        toastIcon.classList.add('fas', 'fa-check-circle');
    } else if (type === 'error') {
        toast.style.backgroundColor = '#dc3545';
        toastIcon.classList.add('fas', 'fa-exclamation-triangle');
    } else {
         toast.style.backgroundColor = '#ffc107';
         toastIcon.classList.add('fas', 'fa-info-circle');
    }

    setTimeout(() => {
        toast.classList.remove('toast-hidden');
        toast.classList.add('toast-visible');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.classList.add('toast-hidden');
    }, 3000);
}


// =========================================================================
// FUNÇÃO CRÍTICA: Salva todas as linhas (NOVAS e EDITADAS)
// =========================================================================
async function saveAllChanges() {
    if (globalUserProfile.role !== 'MASTER') {
        showToast("Ação negada. Apenas MASTER pode salvar.", 'error');
        return;
    }

    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr.new-row[data-new="true"], tr[data-edited="true"]');
    if (rows.length === 0) {
        showToast("Nenhuma alteração para salvar.", 'info');
        return;
    }

    const updatesToSend = [];
    const insertsToSend = [];
    const logEntries = [];
    const user = globalUserProfile.usuario || 'Desconhecido';
    const tableName = CONTRATOS_TABLE;

    rows.forEach(row => {
        const rowData = {};
        const isNew = row.hasAttribute('data-new');
        const recordId = row.getAttribute('data-id');
        const originalData = JSON.parse(row.getAttribute('data-original') || '{}');

        // Coleta os dados de todas as colunas visíveis
        CONTRACT_COLUMNS.filter(col => col !== 'Ações').forEach(col => {
            const cell = row.querySelector(`td[data-col="${col}"]`);
            if (cell) {
                const value = cell.textContent.trim();
                let processedValue = value === '-' ? null : value;

                // === CORREÇÕES DE FORMATO (Antes de ENVIAR ao DB) ===
                if (col === "Data Contrato" || col === "Vencimento") {
                    processedValue = convertToISO(value);
                } else if (col === "Posições WH contrato" || col === "Posições WH físico" || col === "HC reconhecido pelo Cliente") {
                    processedValue = cleanNumericValue(value, false);
                } else if (col === "Target Contratual") {
                    const num = cleanNumericValue(value, true);
                    processedValue = num !== null ? num / 100 : null; // DIVISÃO POR 100
                } else if (
                    col === "Ressarcimento $" || col === "Valor Estoque (Seguro)" ||
                    col === "Produtividade de Contagem Baixo" || col === "Produtividade de Contagem Alto" ||
                    col === "Produtividade de Contagem Alto pallet fechado" ||
                    col.includes("Equipe") || col.includes("Recursos operacionais compartilhados")
                ) {
                    processedValue = cleanNumericValue(value, true);
                } else if (col === "Slotting Master" || col === "FIFO / FEFO") {
                     processedValue = convertToBoolean(value);
                }
                // =====================================================

                rowData[col] = processedValue;
            }
        });

        const dataEntry = { ...rowData };

        // 1. CLASSIFICAÇÃO DOS DADOS
        if (isNew) {
            delete dataEntry.id;
            const userUUID = globalUserProfile.user?.id || globalUserProfile.uuid || globalUserProfile.id;

            if (userUUID) {
                dataEntry.user_uuid = userUUID; // INJETA O UUID APENAS NA CRIAÇÃO
            }
            insertsToSend.push(dataEntry);

            logEntries.push({
                usuario_edicao: user,
                id_contrato: null,
                acao: 'INSERT',
                coluna_alterada: 'ALL',
                valor_anterior: null,
                valor_novo: JSON.stringify(dataEntry),
                data_edicao: new Date().toISOString()
            });

        } else if (row.hasAttribute('data-edited')) {
            if (recordId && recordId !== 'new') {
                 dataEntry.id = recordId;
            } else {
                 console.error(`Registro editado sem ID válido. Pulando.`);
                 return;
            }

            updatesToSend.push(dataEntry);

            // 2. Prepara entradas de log para UPDATE
            CONTRACT_COLUMNS.filter(col => col !== 'Ações' && col !== 'id').forEach(col => {
                const novoValor = rowData[col] !== undefined ? rowData[col] : null;
                const valorOriginal = originalData[col] !== undefined ? originalData[col] : null;

                // Comparação robusta para logar apenas o que mudou
                if (String(novoValor) !== String(valorOriginal)) {
                    logEntries.push({
                        usuario_edicao: user,
                        id_contrato: recordId,
                        acao: 'UPDATE',
                        coluna_alterada: col,
                        valor_anterior: valorOriginal,
                        valor_novo: novoValor,
                        data_edicao: new Date().toISOString()
                    });
                }
            });
        }
    });

    try {
        let savedUpdates = 0;
        let savedInserts = 0;

        // PASSO 1: Fazer UPDATE das linhas existentes
        if (updatesToSend.length > 0) {
            const { error: updateError } = await supabaseClient
                .from(tableName)
                .upsert(updatesToSend, { onConflict: 'id' });

            if (updateError) throw updateError;
            savedUpdates = updatesToSend.length;
        }

        // PASSO 2: Fazer INSERT das novas linhas
        if (insertsToSend.length > 0) {
            const { error: insertError } = await supabaseClient
                .from(tableName)
                .insert(insertsToSend);

            if (insertError) throw insertError;
            savedInserts = insertsToSend.length;
        }

        // PASSO 3: Log
        if (logEntries.length > 0) {
            await supabaseClient.from('mapping_log_edicao').insert(logEntries);
        }

        const totalSaved = savedUpdates + savedInserts;
        showToast(`Sucesso! ${savedUpdates} ATUALIZADO(S) e ${savedInserts} INSERIDO(S).`, 'success');

        // Recarrega os dados para limpar os status 'new' e 'edited'
        searchData({ forceLoad: true });

    } catch (error) {
        console.error("Erro Crítico ao salvar dados/log:", error.message || error);

        const errorMessage = error.message.includes("violates row-level security policy")
            ? "ERRO RLS: A inserção/atualização foi bloqueada. Verifique suas permissões."
            : error.message.includes("invalid input syntax")
            ? "ERRO: Campo de número/data inválido. Verifique o formato."
            : error.message.includes("duplicate key value")
            ? "ERRO DE CHAVE DUPLICADA: Contrato já existe ou erro de sequência."
            : `ERRO ao salvar: ${error.message}`;

        showToast(errorMessage, 'error');
    }
}

// =========================================================================
// FUNÇÕES DE MODAL E EXCLUSÃO
// =========================================================================
function openDeleteModal(rowElement) {
    const modal = document.getElementById('deleteModal');
    const contractNameDisplay = document.getElementById('contractToDeleteName');
    const contractName = rowElement.querySelector('td[data-col="contratos"]')?.textContent || 'Contrato Desconhecido';

    rowToDelete = rowElement;

    if (contractNameDisplay) {
        contractNameDisplay.textContent = contractName;
    }
    if (modal) {
        modal.style.display = 'block';
    }
}
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.style.display = 'none';
    }
    rowToDelete = null;
}
async function confirmDeleteAction() {
    if (!rowToDelete) {
        closeDeleteModal();
        return;
    }

    const rowElement = rowToDelete;
    const recordId = rowElement.getAttribute('data-id');
    const contractName = rowElement.querySelector('td[data-col="contratos"]')?.textContent || 'Contrato Desconhecido';

    closeDeleteModal();

    if (rowElement.hasAttribute('data-new')) {
        rowElement.remove();
        showToast(`Linha nova para o contrato '${contractName}' removida da tela.`, 'info');
        return;
    }

    if (!recordId) {
        console.error("ID do registro não encontrado para exclusão.");
        showToast("ERRO: ID do registro não encontrado para exclusão.", 'error');
        return;
    }

    const tableName = CONTRATOS_TABLE;
    const user = globalUserProfile.usuario || 'Desconhecido';

    try {
        // Excluir logs relacionados (para evitar erro de Foreign Key)
        await supabaseClient
            .from('mapping_log_edicao')
            .delete()
            .eq('id_contrato', recordId);

        // Excluir o contrato principal
        const { data, error: contractDeleteError } = await supabaseClient
            .from(tableName)
            .delete()
            .eq('id', recordId)
            .select();

        if (contractDeleteError) throw contractDeleteError;

        if (data && data.length > 0) {
            rowElement.remove();
            showToast(`O contrato '${contractName}' foi excluído com sucesso!`, 'success');
        } else {
             throw new Error("Ação bloqueada. Nenhum registro foi excluído. Verifique suas permissões (RLS) para DELETE.");
        }

    } catch (error) {
        console.error("Erro ao excluir registro:", error.message || error);
        const userFriendlyError = error.message.includes("Ação bloqueada")
            ? error.message
            : `ERRO no servidor (Permissão ou Chave): ${error.message}`;

        showToast(userFriendlyError, 'error');
    }
}
async function deleteRow(rowElement) {
    if (globalUserProfile.role !== 'MASTER') {
        showToast("Ação negada. Apenas usuários MASTER podem excluir linhas.", 'error');
        return;
    }
    openDeleteModal(rowElement);
}

// =========================================================================
// FUNÇÕES DE SUPORTE (RENDERIZAÇÃO E BUSCA)
// =========================================================================
function renderTableHeader() {
    const headerRow = document.getElementById('tableHeaderRow');
    if (!headerRow) return;

    let headerHTML = '';
    CONTRACT_COLUMNS.forEach(col => {
        headerHTML += `<th>${col.toUpperCase()}</th>`;
    });
    headerRow.innerHTML = headerHTML;
}

function renderResults(data) {
    const tableBody = document.getElementById('tableBody');
    const resultsArea = document.getElementById('resultsArea');
    const isMaster = globalUserProfile.role === 'MASTER';

    if (resultsArea) resultsArea.style.display = 'block';

    if (data.length === 0) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="${CONTRACT_COLUMNS.length}">Nenhum resultado encontrado.</td></tr>`;
        return;
    }

    let tableRows = '';
    const dataColumns = CONTRACT_COLUMNS.filter(col => col !== 'Ações');

    data.forEach(row => {
        tableRows += `<tr data-id="${row.id}" data-original='${JSON.stringify(row)}'>`;

        dataColumns.forEach(col => {
            let cellValue = row[col] !== null && row[col] !== undefined ? row[col] : '-';
            const isEditable = isMaster ? 'contenteditable="true"' : 'contenteditable="false"';

            // === AJUSTE PARA FORMATAR VALORES NA EXIBIÇÃO ===
            if (col === "Data Contrato" || col === "Vencimento") {
                cellValue = formatDateToBR(String(cellValue));
            }
            else if (col === "Slotting Master" || col === "FIFO / FEFO") {
                if (cellValue === true) cellValue = 'Sim';
                if (cellValue === false) cellValue = 'Não';
            }
            // Formatação para R$ (moeda)
            else if (col === "Ressarcimento $" || col === "Valor Estoque (Seguro)") {
                 if (typeof cellValue === 'number' && cellValue !== '-') {
                     cellValue = 'R$' + cellValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                 }
            }
            // Colunas de PORCENTAGEM (Multiplica por 100 para exibição)
            else if (col === "Target Contratual") {
                 let numericValue = typeof cellValue === 'string' ? parseFloat(cellValue) : cellValue;
                 if (!isNaN(numericValue) && numericValue !== null) {
                    const percentageValue = numericValue * 100;
                    cellValue = percentageValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 }) + '%';
                 }
            }
            // Outras colunas decimais
            else if (
                (typeof cellValue === 'number' || (typeof cellValue === 'string' && !isNaN(parseFloat(cellValue)))) &&
                (col.includes('Equipe') || col.includes('Produtividade') || col.includes('Recursos operacionais compartilhados') || col === "HC reconhecido pelo Cliente")
            ) {
                 let numericValue = typeof cellValue === 'string' ? parseFloat(cellValue) : cellValue;
                 if (!isNaN(numericValue) && numericValue !== null) {
                    cellValue = numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
                 }
            }
            // =========================================================

            tableRows += `<td ${isEditable} data-col="${col}">${cellValue}</td>`;
        });

        // Coluna Ações
        tableRows += `<td>`;
        if (isMaster) {
            tableRows += `<i class="fas fa-trash icon-delete" title="Excluir Linha"></i>`;
        } else {
            tableRows += `<i class="fas fa-eye" title="Visualizar"></i>`;
        }
        tableRows += `</td></tr>`;
    });

    if (tableBody) tableBody.innerHTML = tableRows;

    if (isMaster) {
        addCellEditListeners(tableBody);
        addActionListener(tableBody);
    }
}

function handleCellInput(e) {
    const row = e.target.closest('tr');

    if (row && !row.hasAttribute('data-new')) {
        row.setAttribute('data-edited', 'true');
        row.style.backgroundColor = '#fff3cd';
    }
}

function addCellEditListeners(tableBody) {
    const cells = tableBody.querySelectorAll('td[contenteditable="true"]');
    cells.forEach(cell => {
        cell.removeEventListener('input', handleCellInput);
        cell.addEventListener('input', handleCellInput);
    });
}

function addActionListener(tableBody) {
    const deleteIcons = tableBody.querySelectorAll('.icon-delete');
    deleteIcons.forEach(icon => {
        icon.removeEventListener('click', handleDeleteClick);
        icon.addEventListener('click', handleDeleteClick);
    });
}

function handleDeleteClick(e) {
    const row = e.target.closest('tr');
    if (row) {
        deleteRow(row);
    }
}

async function searchData({ forceLoad = false } = {}) {
    const tableBody = document.getElementById('tableBody');
    const tableHeaderRow = document.getElementById('tableHeaderRow');

    if (!tableBody || !tableHeaderRow) return;

    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput ? searchInput.value.trim() : '';
    const normalizedSearchTerm = searchTerm.toUpperCase();
    const MAX_RESULTS = 200;
    const isWildcardSearch = normalizedSearchTerm === '*';

    if (!forceLoad && !isWildcardSearch && normalizedSearchTerm.length < 3) {
        if (normalizedSearchTerm.length > 0) {
             showToast("Digite no mínimo 3 caracteres para pesquisar, ou '*' para todos.", 'info');
        }
        renderResults([]);
        return;
    }

    try {
        let query = supabaseClient.from(CONTRATOS_TABLE).select('*');

        if (!isWildcardSearch && normalizedSearchTerm.length >= 3) {
            const searchPattern = `%${normalizedSearchTerm}%`;
            query = query.or(`bu.ilike.${searchPattern},gerente.ilike.${searchPattern},contratos.ilike.${searchPattern}`);
        }

        const { data, error } = await query
            .order('contratos', { ascending: true })
            .limit(MAX_RESULTS);

        if (error) throw error;

        if (isWildcardSearch && data.length === MAX_RESULTS) {
             showToast(`Atenção: Apenas os primeiros ${MAX_RESULTS} resultados foram carregados.`, 'info');
        }

        renderResults(data);

    } catch (error) {
        console.error("Erro ao pesquisar dados:", error.message || error);
        showToast("Erro ao carregar dados. Verifique a RLS de SELECT.", 'error');
    }
}

async function downloadCSV() {
    if (typeof Papa === 'undefined') {
        showToast("A biblioteca PapaParse é necessária para o download do CSV.", 'error');
        return;
    }

    try {
        const { data, error } = await supabaseClient
            .from(CONTRATOS_TABLE)
            .select('*');

        if (error) throw error;
        if (data.length === 0) {
            showToast("Nenhum dado encontrado para baixar.", 'info');
            return;
        }

        const csv = Papa.unparse(data);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mapping_contratos_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("Download do CSV concluído!", 'success');

    } catch (error) {
        console.error("Erro ao baixar CSV:", error.message || error);
        showToast("Erro ao baixar CSV. Verifique a RLS de SELECT.", 'error');
    }
}


function addContractRow() {
    if (globalUserProfile.role !== 'MASTER') {
        showToast("Ação negada. Apenas MASTER pode adicionar.", 'error');
        return;
    }

    const inputContrato = document.getElementById('inputContrato');
    const contractName = inputContrato ? inputContrato.value.trim() : '';
    const tableBody = document.getElementById('tableBody');
    const resultsArea = document.getElementById('resultsArea');

    if (!contractName) {
        showToast("Por favor, insira o nome do novo contrato.", 'info');
        if (inputContrato) inputContrato.focus();
        return;
    }

    if (resultsArea) resultsArea.style.display = 'block';

    let newRow = `<tr class="new-row" data-new="true" data-id="new" data-original='{}'>`;

    CONTRACT_COLUMNS.forEach(col => {
        let cellContent = '-';
        let isEditable = true;

        if (col === "contratos") {
            cellContent = contractName;
        } else if (col === "Ações") {
            cellContent = '<i class="fas fa-trash icon-delete" title="Excluir Linha"></i>';
            isEditable = false;
        }

        if (isEditable) {
            newRow += `<td contenteditable="true" data-col="${col}" data-new="true">${cellContent}</td>`;
        } else {
            newRow += `<td>${cellContent}</td>`;
        }
    });

    newRow += '</tr>';

    if (tableBody) {
        if (tableBody.children.length === 1 && tableBody.querySelector('td[colspan]')) {
             tableBody.innerHTML = '';
        }
        tableBody.insertAdjacentHTML('afterbegin', newRow);
        const firstCell = tableBody.querySelector('.new-row td[contenteditable="true"]');
        if(firstCell) firstCell.focus();
    }

    if (inputContrato) inputContrato.value = '';

    if (globalUserProfile.role === 'MASTER') {
        const newRowElement = tableBody.querySelector('.new-row');
        if (newRowElement) addActionListener(newRowElement.closest('tbody'));
    }
}


// =========================================================================
// FUNÇÃO CRÍTICA: GERENCIA A MUDANÇA DE CONTEÚDO (REDIMENSIONAMENTO)
// =========================================================================
function switchContent(key) {
    // 1. ATUALIZA OS LINKS ATIVOS (Apenas no contexto do Mapping.html/Grade)
    const links = {
        linkGrade: document.getElementById('linkGrade'),
        linkDash: document.getElementById('linkDash'),
        linkAnalista: document.getElementById('linkAnalista')
    };

    // Remove 'active' de todos e adiciona no clicado
    Object.values(links).forEach(link => link && link.classList.remove('active'));
    if (links[key]) links[key].classList.add('active');


    // 2. TRATA A MUDANÇA DE CONTEÚDO
    switch (key) {
        case 'linkGrade':
            // Se estiver no Mapping.html (o arquivo atual), apenas garante que a Grade está visível
            document.querySelector('.data-tools').style.display = 'flex';
            document.getElementById('resultsArea').style.display = 'block';
            searchData({ forceLoad: false });
            break;

        case 'linkDash':
            // Lógica para mostrar o Dash no Mapping.html (se você não tiver o Dash.html)
            document.querySelector('.data-tools').style.display = 'none';
            document.getElementById('resultsArea').innerHTML = '<p style="text-align: center; margin-top: 50px;">O Dashboard será carregado aqui (implementação pendente ou arquivo Dash.html não encontrado).</p>';
            document.getElementById('resultsArea').style.display = 'block';

            // SE TIVER O Dash.html, substitua o bloco acima por:
            // window.location.href = 'Dash.html';
            break;

        case 'linkAnalista':
            // ⭐️ AÇÃO CRUCIAL: Redireciona para o novo arquivo HTML ⭐️
            window.location.href = 'Analista.html';
            break;

        default:
            console.warn('Navegação desconhecida:', key);
            break;
    }
}


// =========================================================================
// 3. LÓGICA DE INICIALIZAÇÃO E INTERAÇÃO (DOMContentLoaded)
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {

    // Carregamento e Restauração da Sessão do Usuário
    const sessionData = localStorage.getItem('user_session_data');
    let isMaster = false;
    const userNameSpan = document.getElementById('userName'); // Busca o elemento aqui

    if (sessionData) {
        try {
            globalUserProfile = JSON.parse(sessionData);

            // Tenta restaurar a sessão Supabase
            if (globalUserProfile.access_token) {
                 const { error: sessionError } = await supabaseClient.auth.setSession({
                      access_token: globalUserProfile.access_token,
                      refresh_token: globalUserProfile.refresh_token
                 });

                 if (sessionError) {
                      console.error("Erro ao restaurar a sessão Supabase:", sessionError.message);
                 } else {
                      console.log("Supabase Client: Sessão de usuário autenticada restaurada.");
                 }
            }

            // Define o status MASTER
            if (globalUserProfile && globalUserProfile.role === 'MASTER') {
                isMaster = true;
            }

            // ⭐️ LÓGICA AJUSTADA PARA CARREGAR O NOME (MAIS ROBUSTA) ⭐️
            if (globalUserProfile.usuario && userNameSpan) {
                let username = globalUserProfile.usuario.toLowerCase().trim();

                if (username.length > 0) {
                    // Capitaliza a primeira letra
                    username = username.charAt(0).toUpperCase() + username.slice(1);
                    userNameSpan.textContent = username;
                } else {
                    userNameSpan.textContent = "Usuário"; // Fallback para usuário vazio
                }
            } else if (userNameSpan) {
                 // Se houver dados de sessão (mas o campo 'usuario' estiver vazio)
                 userNameSpan.textContent = "Desconectado";
            }
        } catch (e) {
            console.error("Erro ao parsear dados de sessão no Mapping:", e);
            if (userNameSpan) userNameSpan.textContent = "Erro Sessão";
        }
    } else if (userNameSpan) {
        // Se não houver dados no Local Storage
        userNameSpan.textContent = "Fazer Login";
    }
    // FIM DA LÓGICA DE CARREGAMENTO DO NOME


    // Configuração de visibilidade dos botões de MASTER
    const links = {
        linkGrade: document.getElementById('linkGrade'),
        linkDash: document.getElementById('linkDash'),
        linkAnalista: document.getElementById('linkAnalista'),
    };
    const addContractBtn = document.getElementById('addContractBtn');
    const saveAllBtn = document.getElementById('saveAllBtn');
    const inputContrato = document.getElementById('inputContrato');


    if (!isMaster) {
        if (addContractBtn) addContractBtn.style.display = 'none';
        if(inputContrato) inputContrato.style.display = 'none';
        if (saveAllBtn) saveAllBtn.style.display = 'none';
    }


    // Listeners de Navegação
    Object.keys(links).forEach(key => {
        if (links[key]) {
            links[key].addEventListener('click', (e) => {
                e.preventDefault();
                switchContent(key);
            });
        }
    });

    // Listeners de Ferramentas e Botões de Ação
    const searchBtn = document.getElementById('searchBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const deleteModal = document.getElementById('deleteModal');

    if (searchBtn) searchBtn.addEventListener('click', searchData);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadCSV);
    if (addContractBtn) addContractBtn.addEventListener('click', addContractRow);

    if (isMaster && saveAllBtn) saveAllBtn.addEventListener('click', saveAllChanges);

    // Listeners da Modal de Exclusão
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDeleteAction);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                closeDeleteModal();
            }
        });
    }

    // Inicialização da Visão Principal (Grade)
    renderTableHeader();
    searchData({ forceLoad: true });
});