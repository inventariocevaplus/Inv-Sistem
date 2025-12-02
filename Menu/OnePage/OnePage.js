// *****************************************************************
// CÓDIGO OnePage.js COMPLETO E FINALIZADO (VERSÃO INTEGRAL)
// ✅ CORREÇÃO: Unificação Automática de IDs (Lê Contratos, Ciclico e RN).
// ✅ DADOS: Todos os Targets e KPIs originais mantidos.
// ✅ AUTOMÁTICO: Resolve o problema de 1 Nome = Vários IDs sem mexer no código.
// *****************************************************************

const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
// 🔑 CHAVE DE API MANTIDA: Versão funcional.
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

// Definição das Tabelas
const TABELA_CONTRATOS = 'contratos';               // Geralmente IDs do Inventory
const TABELA_RN_CONTRATOS = 'rn_contratos';         // IDs do RN (Ex: Fareva ID 16)
const TABELA_CONTRATOS_MASTER = 'ciclico_contratos'; // IDs do Cíclico (Ex: Logitech ID 30)

const TABELA_DADOS_CICLICO = 'ciclico_grade_dados';
const TABELA_DADOS_INVENTORY = 'inventory_details'; // Contém stock_value, contract_id, reference_month
const TABELA_DADOS_RN = 'rn_details';               // Contém acuracia_mes
const TABELA_MAPPING_CONTRATOS = 'mapping_contratos'; // Colunas: contrato_nome, posicoes_wh_fisico

const sessionDataJSON = localStorage.getItem('user_session_data');
let accessToken = SUPABASE_ANON_KEY;
let userProfile = {};

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

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, accessToken);

let availableDatesMap = {};
let allContractNames = [];
let selectedMonths = [];

// =================================================================
// MAPAS GLOBAIS (AJUSTADOS PARA MULTIPLOS IDs)
// =================================================================

// Mapeamento ID -> Nome (Ex: {36: "LOGITECH", 30: "LOGITECH", 18: "LOGITECH"})
let GLOBAL_CONTRACT_ID_TO_NAME = {};
// Mapeamento Nome -> Lista de IDs (Ex: {"LOGITECH": [36, 30, 18]})
let GLOBAL_CONTRACT_NAME_TO_IDS = {};
// Mapa de Posições Físicas
let GLOBAL_POSICOES_MAP = {};

// 🆕 BLOCO DE DADOS FIXOS PARA TARGETS DOS CONTRATOS (COMPLETO E ORIGINAL)
const GLOBAL_TARGETS_MAP = {
    "DEVELON": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.50,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 'N/A',
        "EPM": 100,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "JCB": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.00,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": '-',
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "ESSITY": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": '-',
        "NET": '-',
        "GROSS": '-',
        "ILA": '-',
        "NIL Picking": '-',
        "SNAPSHOT": '-',
        "EPM": '-',
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "ASP": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 70.00,
        "NET": 99.50,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": '-',
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "LOGITECH": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.70,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": '-',
        "EPM": 1000,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "STANLEY BLACK & DECKER": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.80,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": 5000,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "CONVATEC": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.90,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": 500,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "UNILEVER": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 70.00,
        "NET": 99.50,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": 30000,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "TEREX": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.90,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": 900,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "TRIUMPH": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 98.00,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 'N/A',
        "EPM": 3000,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "OMRON": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 70.00,
        "NET": 99.50,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 'N/A',
        "EPM": 100,
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "SEPHORA RETAIL": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": '-',
        "NET": '-',
        "GROSS": '-',
        "ILA": '-',
        "NIL Picking": '-',
        "SNAPSHOT": '-',
        "EPM": '-',
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "SEPHORA E-STORE": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": '-',
        "GROSS": '-',
        "ILA": '-',
        "NIL Picking": '-',
        "SNAPSHOT": '-',
        "EPM": '-',
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "FAREVA": {
        "Valor de Estoque": '-',
        "Total de Posições": '-',
        "Assesment de Inventario": 90.00,
        "NET": 99.80,
        "GROSS": 99.70,
        "ILA": 99.50,
        "NIL Picking": 99.85,
        "SNAPSHOT": 95.00,
        "EPM": '-',
        "SUSPENSE": '-',
        "Cíclico Projetado": '-',
        "Cíclico Realizado": '-',
        "Cíclico Realizado -": '-',
        "Meta de Posições Diaria": '-',
        "Dias Disponíveis P/ Contar": '-',
    },
    "OBOTICARIO": {
         "Valor de Estoque": '-', "Total de Posições": '-', "Assesment de Inventario": '-',
         "NET": '-', "GROSS": '-', "ILA": '-', "NIL Picking": '-', "SNAPSHOT": '-', "EPM": '-', "SUSPENSE": '-', "Cíclico Projetado": '-', "Cíclico Realizado": '-', "Cíclico Realizado -": '-', "Meta de Posições Diaria": '-', "Dias Disponíveis P/ Contar": '-',
    }
};

// 🌟 KPI_MASTER_LIST REORDENADA E COMPLETA
const KPI_MASTER_LIST = [
    // === 1. DADOS DE INVENTORY (Direto) ===
    { nome: "Valor de Estoque", un: "R$", data_column: "stock_value", source_table: TABELA_DADOS_INVENTORY, type: "direct", target_goal: "lower_is_better" },

    // 2. Total de Posições (static_map)
    { nome: "Total de Posições", un: "Quant.", data_column: "posicoes_wh_fisico", source_table: TABELA_MAPPING_CONTRATOS, type: "static_map", target_goal: "N/A" },

    // 3. ATIVO: Assesment de Inventario
    {
        nome: "Assesment de Inventario",
        un: "%",
        data_column: "assesment_inventario",
        source_table: TABELA_DADOS_INVENTORY,
        type: "direct",
        target_goal: "higher_is_better"
    },

    // 4. DADOS DE INVENTORY (Direto)
    { nome: "NET", un: "%", data_column: "net_percent", source_table: TABELA_DADOS_INVENTORY, type: "direct", target_goal: "higher_is_better" },
    { nome: "GROSS", un: "%", data_column: "gross_percent", source_table: TABELA_DADOS_INVENTORY, type: "direct", target_goal: "higher_is_better" },
    { nome: "ILA", un: "%", data_column: "accuracy_locacao", source_table: TABELA_DADOS_INVENTORY, type: "direct", target_goal: "higher_is_better" },

    // 5. ATIVO: SUSPENSE
    {
        nome: "SUSPENSE",
        un: "R$",
        data_column: "suspense_value",
        source_table: TABELA_DADOS_INVENTORY,
        type: "direct",
        target_goal: "lower_is_better"
    },

    // 7. ATIVO: NIL Picking (Busca da TABELA_DADOS_RN: acuracia_mes)
    { nome: "NIL Picking", un: "%", data_column: "acuracia_mes", source_table: TABELA_DADOS_RN, type: "direct", target_goal: "lower_is_better" },

    // 8. ATIVO: SNAPSHOT
    {
        nome: "SNAPSHOT",
        un: "%",
        data_column: "snapshot_percent",
        source_table: TABELA_DADOS_INVENTORY,
        type: "direct",
        target_goal: "higher_is_better"
    },

    // 9. ATIVO: EPM
    {
        nome: "EPM",
        un: "Quant.",
        data_column: "epm_value",
        source_table: TABELA_DADOS_INVENTORY,
        type: "direct",
        target_goal: "higher_is_better"
    },

    // === 11. DADOS DE CÍCLICO (Calculados e Diretos) ===

    // Cíclico Projetado (Dado direto de total_locacoes)
    { nome: "Cíclico Projetado", un: "Quant.", data_column: "total_locacoes", source_table: TABELA_DADOS_CICLICO, type: "direct", target_goal: "N/A" },

    // Cíclico Realizado (Cálculo de soma de REALIZADO)
    { nome: "Cíclico Realizado", un: "Quant.", calculation_type: "SUM_REALIZADO", data_column: "calculated_realizado", source_table: TABELA_DADOS_CICLICO, type: "calculated", target_goal: "N/A" },

    // Cíclico Realizado - (%) (Cálculo de porcentagem)
    { nome: "Cíclico Realizado -", un: "%", calculation_type: "PERCENT_REALIZADO", data_column: "calculated_percent", source_table: TABELA_DADOS_CICLICO, type: "calculated", target_goal: "higher_is_better" },

    // Meta de Posições Diaria
    { nome: "Meta de Posições Diaria", un: "Quant.", calculation_type: "FIRST_PLAN_VALUE", data_column: "calculated_meta_diaria", source_table: TABELA_DADOS_CICLICO, source_column: "plano_locacoes", type: "calculated", target_goal: "N/A" },

    // Dias Disponíveis P/ Contar
    { nome: "Dias Disponíveis P/ Contar", un: "Quant.", data_column: "dias_uteis_ciclo", source_table: TABELA_DADOS_CICLICO, type: "direct", target_goal: "N/A" },
];

const monthNames = [null, 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

document.addEventListener('DOMContentLoaded', () => {
    const userNameSpan = document.getElementById('userName');
    const selectContrato = document.getElementById('selectContrato');
    const selectAno = document.getElementById('selectAno');
    const mesContainer = document.getElementById('mesMultiSelectContainer');
    const mesDisplay = document.getElementById('mesDisplay');
    const mesDropdown = document.getElementById('mesDropdown');


    if (userProfile && userProfile.usuario) {
        let username = userProfile.usuario.toLowerCase();
        username = username.charAt(0).toUpperCase() + username.slice(1);
        userNameSpan.textContent = username;
    } else {
        userNameSpan.textContent = 'Usuário Desconhecido';
    }


    async function fetchFilterMasterData() {
        const data = {};
        // 🆕 LISTA DE TABELAS ATUALIZADA: Inclui todas as 3 tabelas de cadastro
        const contractTables = [
            { name: TABELA_CONTRATOS, key: 'contratos' },
            { name: TABELA_CONTRATOS_MASTER, key: 'ciclicoContratos' },
            { name: TABELA_RN_CONTRATOS, key: 'rnContratos' }
        ];
        let allContracts = [];

        // 1. Busca todos os contratos (ID e Nome) de TODAS as tabelas
        for (const table of contractTables) {
            try {
                const { data: contratos, error } = await supabaseClient
                    .from(table.name)
                    .select('id, nome_contrato');

                if (error) throw error;
                allContracts = allContracts.concat(contratos || []);
            } catch (e) {
                console.error(`Erro ao buscar contratos da tabela ${table.name}:`, e);
            }
        }

        data.contratosMaster = allContracts;
        const tablesToFetch = [
            { name: TABELA_DADOS_CICLICO, select: 'contract_name, mes_referencia', key: 'ciclicoDados' },
            { name: TABELA_DADOS_INVENTORY, select: 'contract_id, reference_month', key: 'inventoryDados' },
            { name: TABELA_DADOS_RN, select: 'contract_id, reference_month', key: 'rnDados' },
        ];
        // 2. Busca datas disponíveis para os filtros de Ano/Mês
        for (const table of tablesToFetch) {
            try {
                const { data: tableData, error } = await supabaseClient
                    .from(table.name)
                    .select(table.select);
                if (error) throw error;
                data[table.key] = tableData || [];
            } catch (e) {
                console.error(`Erro ao buscar dados da tabela ${table.name}:`, e);
                data[table.key] = [];
            }
        }

        // 3. Busca dados da tabela de Mapeamento para Total de Posições
        try {
            const { data: mappingData, error } = await supabaseClient
                .from(TABELA_MAPPING_CONTRATOS)
                .select('contratos, "Posições WH físico"');
            if (error) throw error;
            data.mappingContratos = mappingData || [];
        } catch (e) {
            console.error(`Erro ao buscar dados da tabela TABELA_MAPPING_CONTRATOS:`, e);
            data.mappingContratos = [];
        }

        return data;
    }


    async function loadFilters() {
        availableDatesMap = {};
        GLOBAL_POSICOES_MAP = {};
        GLOBAL_CONTRACT_ID_TO_NAME = {};
        GLOBAL_CONTRACT_NAME_TO_IDS = {}; // 🆕 Resetar o mapa (Array de IDs)

        const data = await fetchFilterMasterData();
        const contractNameSet = new Set();

        // 4. Constrói o Mapeamento UNIFICADO ID <-> Nome
        // ESSA É A LÓGICA QUE PERMITE NOVOS CONTRATOS AUTOMATICAMENTE
        data.contratosMaster.forEach(c => {
             if (c.id && c.nome_contrato) {
                // Normaliza o nome (Upper Case e sem espaços) para evitar duplicatas por erro de digitação
                const cleanName = c.nome_contrato.trim().toUpperCase();

                // Mapeamento 1:1 (ID -> Nome Normalizado)
                GLOBAL_CONTRACT_ID_TO_NAME[c.id] = cleanName;

                // Mapeamento 1:N (Nome -> ARRAY de IDs)
                if (!GLOBAL_CONTRACT_NAME_TO_IDS[cleanName]) {
                    GLOBAL_CONTRACT_NAME_TO_IDS[cleanName] = [];
                }
                // Adiciona o ID ao array se ainda não existir
                if (!GLOBAL_CONTRACT_NAME_TO_IDS[cleanName].includes(c.id)) {
                    GLOBAL_CONTRACT_NAME_TO_IDS[cleanName].push(c.id);
                }

                contractNameSet.add(cleanName);
             }
        });

        // 🆕 BLOCO DE DEBUG PARA CHECAR M.A.P.E.A.M.E.N.T.O
        console.log("--- DEBUG Mapeamento de Contratos ---");
        console.log("IDs do LOGITECH (Universal):", GLOBAL_CONTRACT_NAME_TO_IDS['LOGITECH']);
        console.log("IDs do FAREVA (Universal):", GLOBAL_CONTRACT_NAME_TO_IDS['FAREVA']);
        console.log("--- FIM DEBUG Mapeamento ---");

        // 5. Preenche o Mapa de Posições Físicas
        data.mappingContratos.forEach(item => {
            if (item.contratos && item["Posições WH físico"] !== undefined) {
                const cleanName = item.contratos.trim().toUpperCase();
                GLOBAL_POSICOES_MAP[cleanName] = item["Posições WH físico"];
                contractNameSet.add(cleanName);
            }
        });

        // 6. 🆕 Garante que todos os contratos com targets apareçam no filtro
        Object.keys(GLOBAL_TARGETS_MAP).forEach(contractName => {
            contractNameSet.add(contractName.trim().toUpperCase());
        });

        // 7. Popula datas disponíveis e lista de nomes de contratos (restante)
        data.ciclicoDados.forEach(item => {
            if (item.contract_name) {
                contractNameSet.add(item.contract_name.trim().toUpperCase());
            }
            extractDateParts(item.mes_referencia);
        });
        [...data.inventoryDados, ...data.rnDados].forEach(item => {
            const contractId = item.contract_id;
            const contractName = GLOBAL_CONTRACT_ID_TO_NAME[contractId];
            if (contractName) {
                contractNameSet.add(contractName);
            }
            extractDateParts(item.reference_month);
        });

        allContractNames = Array.from(contractNameSet).sort();
        populateContractSelect(allContractNames);

        const years = Object.keys(availableDatesMap).sort().reverse();
        populateYearSelect(years);

        updateMonthFilterOptions();
    }

    // =================================================================
    // FUNÇÕES AUXILIARES DE FORMATAÇÃO E CÁLCULO
    // =================================================================

    function formatKpiValue(value, unit) {
        if (value === null || value === undefined) return '-';
        let numValue = parseFloat(value);
        if (isNaN(numValue)) return String(value);

        switch (unit) {
            case 'R$':
                return 'R$ ' + numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            case '%':
                // Para percentual, usamos 2 casas e a vírgula como separador decimal
                return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
            case 'Quant.':
                // Para quantidades, usamos 0 casas decimais
                return numValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
            default:
                return numValue.toLocaleString('pt-BR');
        }
    }

    // 🆕 NOVA FUNÇÃO: Formatação de Target
    function formatTargetValue(value, unit) {
        if (value === null || value === undefined || value === '-' || value === 'N/A') return value || '-';

        let numValue = parseFloat(value);
        if (isNaN(numValue)) return String(value); // Retorna a string se não for número

        switch (unit) {
            case 'R$':
                return 'R$ ' + numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            case '%':
                return numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
            case 'Quant.':
                return numValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
            default:
                return String(value);
        }
    }

    // 🆕 NOVA FUNÇÃO: Aplica a classe de cor na célula com base no Target
    function applyKpiStyle(tdElement, kpiName, contract, rawDataValue) {
        if (rawDataValue === null || rawDataValue === undefined || rawDataValue === '-') return;
        const kpiDefinition = KPI_MASTER_LIST.find(kpi => kpi.nome === kpiName);
        if (!kpiDefinition || kpiDefinition.target_goal === "N/A") return;

        // Obtém o Target (Normalizando o nome)
        const cleanContract = contract.trim().toUpperCase();
        let rawTargetValue = null;

        // Tenta buscar o target pelo nome exato ou normalizado
        if (GLOBAL_TARGETS_MAP[contract]) {
            rawTargetValue = GLOBAL_TARGETS_MAP[contract][kpiName];
        } else if (GLOBAL_TARGETS_MAP[cleanContract]) {
            rawTargetValue = GLOBAL_TARGETS_MAP[cleanContract][kpiName];
        } else {
             // Tenta fallback insensitive busca nas chaves do mapa
             const key = Object.keys(GLOBAL_TARGETS_MAP).find(k => k.toUpperCase() === cleanContract);
             if (key) rawTargetValue = GLOBAL_TARGETS_MAP[key][kpiName];
        }

        if (rawTargetValue === null || rawTargetValue === '-' || rawTargetValue === 'N/A') return;

        const targetValue = parseFloat(rawTargetValue);
        const dataValue = parseFloat(rawDataValue);

        if (isNaN(targetValue) || isNaN(dataValue)) return;

        let isTargetAchieved = false;
        if (kpiDefinition.target_goal === 'higher_is_better') {
            isTargetAchieved = dataValue >= targetValue;
        } else if (kpiDefinition.target_goal === 'lower_is_better') {
            isTargetAchieved = dataValue <= targetValue;
        }

        if (isTargetAchieved) {
            tdElement.classList.add('kpi-above-target');
        } else {
            tdElement.classList.add('kpi-below-target');
        }
    }


    // =================================================================
    // FUNÇÃO PRINCIPAL DE BUSCA DE DADOS (KPI DATA)
    // =================================================================

    function getSelectQuery(tableName) {
        // Filtra KPIs que NÃO são 'placeholder' E NÃO são 'static_map'
        const kpisForTable = KPI_MASTER_LIST.filter(kpi =>
             kpi.source_table === tableName &&
             kpi.type !== 'placeholder' &&
             kpi.type !== 'static_map'
        );
        // Filtra apenas KPIs de tipo 'direct' para a query SELECT
        let dataCols = kpisForTable
            .filter(kpi => kpi.type === 'direct')
            .map(kpi => kpi.data_column);
        // Filtra as colunas de origem para os KPIs calculados
        const calculatedSourceCols = kpisForTable
            .filter(kpi => kpi.type === 'calculated' && kpi.source_column)
            .map(kpi => kpi.source_column);
        let additionalCols = [];
        let identifierCol = '';
        let dateCol = '';
        if (tableName === TABELA_DADOS_CICLICO) {
            identifierCol = 'contract_name';
            dateCol = 'mes_referencia';
            // Colunas necessárias para cálculo do Cíclico
            additionalCols = ['realizado_locacoes', 'total_locacoes', 'dias_uteis_ciclo', 'realizado_acumulado', ...calculatedSourceCols];
        } else if (tableName === TABELA_DADOS_INVENTORY) {
            identifierCol = 'contract_id';
            dateCol = 'reference_month';
        } else if (tableName === TABELA_DADOS_RN) {
             identifierCol = 'contract_id';
             dateCol = 'reference_month';
             dataCols = ['acuracia_mes'];
        } else {
            return '';
        }

        // Combina colunas de identificação, data, dados e adicionais, removendo duplicatas
        const allCols = [identifierCol, dateCol, ...new Set([...dataCols, ...additionalCols])];
        return allCols.join(', ');
    }


    async function fetchKpiData(contracts, year, months) {
        // Normaliza para garantir busca correta
        const cleanContracts = contracts.map(c => c.trim().toUpperCase());

        // 🆕 PASSO 1: OBTÉM TODOS OS IDs DOS CONTRATOS SELECIONADOS A PARTIR DOS NOMES (Usando flatMap)
        const contractIdsToUse = cleanContracts
            .flatMap(name => GLOBAL_CONTRACT_NAME_TO_IDS[name] || [])
            .filter((value, index, self) => self.indexOf(value) === index); // IDs únicos

        if (contractIdsToUse.length === 0 && contracts.length > 0) {
            console.warn("[FETCH] Nenhum ID válido encontrado para os contratos selecionados.");
            // Não retornamos vazio aqui para permitir que a busca do Cíclico (que usa Nome) ainda funcione
        }

        // Geração de DOIS formatos de data
        const formattedDates_InventoryRN = months.map(m => `${year}-${String(m).padStart(2, '0')}-01`);
        const formattedDates_Ciclico = months.map(m => `${year}-${String(m).padStart(2, '0')}`);

        const tablesToFetch = [
            TABELA_DADOS_CICLICO,
            TABELA_DADOS_INVENTORY,
            TABELA_DADOS_RN
        ];

        const fetchPromises = tablesToFetch.map(tableName => {
            const selectQuery = getSelectQuery(tableName);
            if (selectQuery.trim().length === 0) return Promise.resolve(null);

            let query = supabaseClient.from(tableName).select(selectQuery);
            let datesToUse = [];

            if (tableName === TABELA_DADOS_CICLICO) {
                // Filtra por NOME do Contrato (passamos os originais)
                query = query.in('contract_name', contracts);
                datesToUse = formattedDates_Ciclico;
            } else {
                // Filtra por ID do Contrato (TABELA_DADOS_INVENTORY e TABELA_DADOS_RN)
                // O array contractIdsToUse contém IDs de TODAS as tabelas de contratos mapeadas
                if (contractIdsToUse.length === 0) return Promise.resolve(null);
                query = query.in('contract_id', contractIdsToUse);
                datesToUse = formattedDates_InventoryRN;
            }

            const dateColumnName = tableName === TABELA_DADOS_CICLICO ? 'mes_referencia' : 'reference_month';
            query = query.in(dateColumnName, datesToUse);

            return query.then(({ data, error }) => {
                if (error) {
                    console.error(`Erro na busca de ${tableName}:`, error);
                    return null;
                }
                return { tableName, data: data || [] };
            })
            .catch(e => {
                 console.error(`Falha na promise de fetchKpiData para ${tableName}:`, e);
                 return null;
            });
        });

        const results = await Promise.all(fetchPromises);

        // Passamos os contratos limpos para garantir comparação correta
        const consolidatedData = consolidateResults(results.filter(r => r !== null), cleanContracts);

        populateDataGrid(consolidatedData, year);
    }

    function consolidateResults(results, contractsToFilter) {
        const unifiedMap = new Map();
        results.forEach(result => {
            result.data.forEach(item => {
                let contractName = null;
                let date = item.mes_referencia || item.reference_month;

                // 🆕 LÓGICA DE RESOLUÇÃO DE NOME
                if (item.contract_name) {
                     contractName = item.contract_name.trim().toUpperCase();
                } else if (item.contract_id) {
                    // Converte ID -> Nome Normalizado
                    contractName = GLOBAL_CONTRACT_ID_TO_NAME[item.contract_id];
                }

                // Se o nome resolvido não estiver na lista de filtro, ignora
                if (!contractName || !contractsToFilter.includes(contractName)) {
                    return;
                }

                if (date) {
                    const monthIdentifier = date.substring(0, 7);
                    const key = `${contractName}_${monthIdentifier}`;

                    if (unifiedMap.has(key)) {
                        const existingData = unifiedMap.get(key);
                        unifiedMap.set(key, {
                            ...existingData,
                            ...item,
                            contract_name: contractName,
                            mes_referencia: monthIdentifier,
                            reference_month: monthIdentifier
                        });
                    } else {
                        unifiedMap.set(key, {
                            contract_name: contractName,
                            mes_referencia: monthIdentifier,
                            reference_month: monthIdentifier,
                            ...item
                        });
                    }
                }
            });
        });

        return Array.from(unifiedMap.values());
    }


    // =================================================================
    // FUNÇÃO PARA PREENCHER OS DADOS NA GRADE (COM FORMATAÇÃO E CÁLCULOS)
    // =================================================================

    function populateDataGrid(data, year) {
        const kpiUnitMap = new Map(KPI_MASTER_LIST.map(kpi => [kpi.data_column, kpi.un]));
        const kpiNameMap = new Map(KPI_MASTER_LIST.map(kpi => [kpi.data_column, kpi.nome]));


        if (!data || data.length === 0) {
             document.getElementById('tableBody').querySelectorAll('td[data-type="data"], .data-target').forEach(td => {
                 td.textContent = '-';
                 td.classList.remove('kpi-above-target', 'kpi-below-target');
             });
             return;
        }

        const contractData = {};
        // 1. Organiza e CALCULA os dados
        data.forEach(item => {
            const contract = item.contract_name; // Já normalizado UPPERCASE
            const rawDate = item.mes_referencia || item.reference_month;
            const date = rawDate ? rawDate.substring(0, 7) : null;

            if (!date) return;

            const month = parseInt(date.split('-')[1], 10);

            if (!contract) return;

            if (!contractData[contract]) contractData[contract] = {};
            if (!contractData[contract][month]) contractData[contract][month] = {};

            KPI_MASTER_LIST.forEach(kpi => {
                const kpiColumn = kpi.data_column;

                // IGNORA KPIs de placeholder.
                if (kpi.type === 'placeholder') return;

                // CÁLCULO PARA DADOS ESTÁTICOS DE MAPA (Total de Posições)
                if (kpi.type === 'static_map') {
                    const posicoesValue = GLOBAL_POSICOES_MAP[contract];
                    if (posicoesValue !== undefined) {
                        contractData[contract][month][kpiColumn] = posicoesValue;
                    }
                    return;
                }

                // LÓGICA DE CÁLCULO PARA KPI's DO CÍCLICO
                if (kpi.source_table === TABELA_DADOS_CICLICO) {

                    const totalLocacoes = parseFloat(item.total_locacoes) || 0;
                    const realizadoAcumuladoArray = item.realizado_acumulado || [];
                    const planoLocacoes = item.plano_locacoes;

                    let realizadoAcumulado = 0;
                    if (Array.isArray(realizadoAcumuladoArray)) {
                        for (let i = realizadoAcumuladoArray.length - 1; i >= 0; i--) {
                            const currentValue = parseFloat(realizadoAcumuladoArray[i]);
                            if (!isNaN(currentValue) && currentValue > 0) {
                                realizadoAcumulado = currentValue;
                                break;
                            }
                        }
                    }

                    if (kpi.data_column === "total_locacoes") {
                        contractData[contract][month][kpiColumn] = totalLocacoes;

                    } else if (kpi.calculation_type === "SUM_REALIZADO") {
                        contractData[contract][month][kpiColumn] = realizadoAcumulado;
                    } else if (kpi.calculation_type === "PERCENT_REALIZADO") {
                        let calculatedValue = 0;
                        if (totalLocacoes > 0) {
                            calculatedValue = (realizadoAcumulado / totalLocacoes) * 100;
                        }
                        contractData[contract][month][kpiColumn] = calculatedValue;
                    } else if (kpi.calculation_type === "FIRST_PLAN_VALUE") {
                        let metaDiaria = 0;
                        if (planoLocacoes && Array.isArray(planoLocacoes) && planoLocacoes.length > 0) {
                            const firstValueStr = String(planoLocacoes[0]);
                            const parts = firstValueStr.split(',');
                            metaDiaria = parseFloat(parts[0]) || 0;
                        } else if (planoLocacoes && typeof planoLocacoes === 'string') {
                            const parts = planoLocacoes.split(',');
                            metaDiaria = parseFloat(parts[0]) || 0;
                        }

                        contractData[contract][month][kpiColumn] = metaDiaria;
                    } else if (kpi.type === 'direct') {
                        const dataValue = item[kpiColumn];
                        if (dataValue !== null && dataValue !== undefined) {
                            contractData[contract][month][kpiColumn] = dataValue;
                        }
                    }

                } else {
                    // Lógica para colunas de dados diretas (Tabelas Inventory, RN)
                    const dataValue = item[kpiColumn];
                    if (dataValue !== null && dataValue !== undefined) {
                        contractData[contract][month][kpiColumn] = dataValue;
                    }
                }
            });
        });

        // 2. Popula a grade
        const rows = document.getElementById('tableBody').querySelectorAll('tr');
        rows.forEach(row => {
            const rawContractName = row.dataset.contract; // Nome original (display)
            if (rawContractName) {
                const contract = rawContractName.trim().toUpperCase(); // Nome chave (key)

                const tdTarget = row.querySelector('.data-target');
                if (tdTarget) {
                    const kpiName = row.querySelector('td:nth-child(2)').textContent;
                    const unit = row.querySelector('td:nth-child(3)').textContent;

                    // Busca Target de forma segura
                    let targetValue = '-';
                    if (GLOBAL_TARGETS_MAP[rawContractName]) {
                        targetValue = GLOBAL_TARGETS_MAP[rawContractName][kpiName];
                    } else if (GLOBAL_TARGETS_MAP[contract]) {
                        targetValue = GLOBAL_TARGETS_MAP[contract][kpiName];
                    }

                    tdTarget.textContent = formatTargetValue(targetValue, unit);
                }

                const tdDataCells = row.querySelectorAll('td[data-type="data"]');
                tdDataCells.forEach(td => {
                    td.classList.remove('kpi-above-target', 'kpi-below-target');

                    const month = parseInt(td.dataset.month, 10);
                    const kpiColumn = td.dataset.kpi;
                    const unit = kpiUnitMap.get(kpiColumn);
                    const kpiDefinition = KPI_MASTER_LIST.find(k => k.data_column === kpiColumn);
                    const kpiName = kpiNameMap.get(kpiColumn);

                    if (kpiDefinition && kpiDefinition.type === 'placeholder') {
                        td.textContent = '-';
                        return;
                    }

                    if (kpiDefinition && kpiDefinition.type === 'static_map') {
                        const staticValue = GLOBAL_POSICOES_MAP[contract];
                        td.textContent = formatKpiValue(staticValue, unit);
                        return;
                    }

                    if (contractData[contract] && contractData[contract][month] && contractData[contract][month][kpiColumn] !== undefined) {
                        const dataValue = contractData[contract][month][kpiColumn];
                        td.textContent = formatKpiValue(dataValue, unit);
                        applyKpiStyle(td, kpiName, contract, dataValue);
                    } else {
                        td.textContent = '-';
                    }
                });
            }
        });
    }

    // =================================================================
    // FUNÇÃO PRINCIPAL DE FILTRAGEM E ATUALIZAÇÃO DA GRADE
    // =================================================================

    function filterDataAndRefreshGrid() {
        const selectedContract = selectContrato.value;
        const selectedYear = selectAno.value;
        const currentSelectedMonths = selectedMonths;

        if (selectedContract === "!placeholder") {
             updateTableHeader(currentSelectedMonths);
             renderStaticKpiRows([], currentSelectedMonths);
             populateDataGrid([], selectedYear);
             return;
        }

        const contractsToDisplay = selectedContract ? [selectedContract] : allContractNames;

        updateTableHeader(currentSelectedMonths);
        renderStaticKpiRows(contractsToDisplay, currentSelectedMonths);

        if (selectedYear && currentSelectedMonths.length > 0 && contractsToDisplay.length > 0) {
            fetchKpiData(contractsToDisplay, selectedYear, currentSelectedMonths);
        } else {
            populateDataGrid([], selectedYear);
        }
    }


    // =================================================================
    // INICIALIZAÇÃO E EVENTOS
    // =================================================================

    loadFilters();
    selectAno.addEventListener('change', updateMonthFilterOptions);
    selectContrato.addEventListener('change', filterDataAndRefreshGrid);

    // FUNÇÕES AUXILIARES DE FILTROS

    function extractDateParts(dateString) {
        if (!dateString) return;
        const parts = dateString.substring(0, 7).split('-');
        if (parts.length >= 2) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            if (!availableDatesMap[year]) availableDatesMap[year] = new Set();
            availableDatesMap[year].add(month);
        }
    }

    function populateContractSelect(names) {
        selectContrato.innerHTML = '<option value="!placeholder" selected disabled>Selecione os Contratos</option>';
        const allOption = document.createElement('option');
        allOption.value = "";
        allOption.textContent = "Todos os Contratos";
        selectContrato.appendChild(allOption);

        names.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectContrato.appendChild(option);
        });
    }

    function populateYearSelect(years) {
        selectAno.innerHTML = '<option value="">Todos os Anos</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectAno.appendChild(option);
        });
    }

    function updateMonthFilterOptions() {
        const selectedYear = selectAno.value;
        mesDropdown.innerHTML = '';
        selectedMonths = [];

        let monthsToDisplay = [];
        if (selectedYear && availableDatesMap[selectedYear]) {
            monthsToDisplay = Array.from(availableDatesMap[selectedYear]).sort((a, b) => a - b);
        } else {
            const allMonths = new Set();
            Object.values(availableDatesMap).forEach(monthSet => {
                monthSet.forEach(month => allMonths.add(month));
            });
            monthsToDisplay = Array.from(allMonths).sort((a, b) => a - b);
        }

        monthsToDisplay.forEach(monthNumber => {
            const optionDiv = document.createElement('div');
            optionDiv.classList.add('select-option');
            optionDiv.dataset.value = monthNumber;
            optionDiv.textContent = monthNames[monthNumber];
            optionDiv.addEventListener('click', toggleMonthSelection);
            mesDropdown.appendChild(optionDiv);
        });

        updateMonthDisplay();
        filterDataAndRefreshGrid();
    }

    function toggleMonthSelection(event) {
        const option = event.target;
        const monthValue = parseInt(option.dataset.value, 10);
        option.classList.toggle('selected');
        const index = selectedMonths.indexOf(monthValue);
        if (index > -1) {
            selectedMonths.splice(index, 1);
        } else {
            selectedMonths.push(monthValue);
        }
        selectedMonths.sort((a, b) => a - b);
        updateMonthDisplay();
        filterDataAndRefreshGrid();
    }

    function updateMonthDisplay() {
        const count = selectedMonths.length;
        if (count === 0) {
            mesDisplay.textContent = 'Selecionar o mês';
        } else if (count === 1) {
            mesDisplay.textContent = monthNames[selectedMonths[0]];
        } else {
            mesDisplay.textContent = `${count} Meses Selecionados`;
        }
    }

    mesDisplay.addEventListener('click', (event) => {
        mesContainer.classList.toggle('open');
        event.stopPropagation();
    });
    document.addEventListener('click', (event) => {
        if (!mesContainer.contains(event.target)) {
            mesContainer.classList.remove('open');
        }
    });

    function renderStaticKpiRows(contractNames, months) {
        const tableBody = document.getElementById('tableBody');
        const messageArea = document.getElementById('infoMessage');
        tableBody.innerHTML = '';
        if (!contractNames || contractNames.length === 0) {
            messageArea.style.display = 'block';
            return;
        }

        messageArea.style.display = 'none';
        contractNames.forEach(contractName => {
            const cleanContract = contractName.trim().toUpperCase();

            KPI_MASTER_LIST.forEach((kpi, index) => {
                const tr = document.createElement('tr');
                tr.dataset.contract = contractName; // Usa nome original para display

                const tdContract = document.createElement('td');
                if (index === 0) tdContract.textContent = contractName;
                tr.appendChild(tdContract);

                const tdKpiName = document.createElement('td');
                tdKpiName.textContent = kpi.nome;
                tr.appendChild(tdKpiName);

                const tdUn = document.createElement('td');
                tdUn.textContent = kpi.un;
                tr.appendChild(tdUn);

                const tdTarget = document.createElement('td');

                // LÓGICA DE TARGET
                let targetValue = '-';
                if (GLOBAL_TARGETS_MAP[contractName]) {
                    targetValue = GLOBAL_TARGETS_MAP[contractName][kpi.nome];
                } else if (GLOBAL_TARGETS_MAP[cleanContract]) {
                    targetValue = GLOBAL_TARGETS_MAP[cleanContract][kpi.nome];
                }

                tdTarget.textContent = formatTargetValue(targetValue, kpi.un);
                tdTarget.classList.add('data-target');
                tdTarget.dataset.kpi = kpi.data_column;
                tr.appendChild(tdTarget);

                months.forEach(monthNumber => {
                     const tdData = document.createElement('td');

                     if (kpi.type === 'static_map') {
                         const staticValue = GLOBAL_POSICOES_MAP[cleanContract];
                         tdData.textContent = formatKpiValue(staticValue, kpi.un);
                     } else {
                        tdData.textContent = (kpi.type === 'placeholder') ? '-' : '...';
                     }

                     tdData.dataset.month = monthNumber;
                     tdData.dataset.kpi = kpi.data_column;
                     tdData.dataset.type = 'data';
                     tr.appendChild(tdData);
                });
                tableBody.appendChild(tr);
            });
        });
    }

    function updateTableHeader(months) {
        const headerRow = document.getElementById('tableHeaderRow');
        while (headerRow.children.length > 4) {
            headerRow.removeChild(headerRow.lastChild);
        }
        months.forEach(monthNumber => {
            const th = document.createElement('th');
            th.textContent = monthNames[monthNumber].toUpperCase().substring(0, 3);
            headerRow.appendChild(th);
        });
    }
});