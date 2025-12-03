// =========================================================================
// Módulo/Carinhas/Carinhas.js - CÓDIGO COMPLETO E ATUALIZADO
// 🔑 NOVO: Constantes para largura/altura das imagens de Inventário e Contrato
// 🔑 AJUSTE: Reaplicação de estilos inline para as imagens de topo (baseado nas constantes)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO SUPABASE (mantido) ---
    const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

    // Nomes de tabelas e colunas
    const TABELA_DADOS = 'inventory_details';
    const TABELA_CONTRATOS = 'contratos';

    let supabaseClient;
    let availableContracts = [];
    let currentContractId = null;
    let allCarinhasData = [];
    let selectedContractMeta = {};
    let currentContractName = '';

    // --- CONSTANTES DE LÓGICA ---

    const TOLERANCE_CUTOFF = 0.05; // 0.05%

    // Caminhos de Imagem
    const EMOJI_BASE_PATH = "";
    const INVENTARIO_IMAGE_PATH = "INVENTARIO.png";
    const CONTRATO_IMAGE_BASE_PATH = "ContratoImagens/";

    const EMOJIS = {
        PARABENS: 'PARABENS.png',
        QUASE: 'QUASE.png',
        ATENCAO: 'ATENCAO.png',
        VAZIO: 'VAZIO.png',
    };

    // 🔑 CONSTANTES DE DIMENSÃO PARA AS IMAGENS DO TOPO (INVENTÁRIO E CONTRATO)
    const TOP_IMAGE_DIMENSIONS = {
        // Você pode usar uma largura fixa ou max-width para o Contrato
        INVENTARIO_WIDTH: '120px',
        INVENTARIO_HEIGHT: '60px',
        CONTRATO_MAX_WIDTH: '190px',
        CONTRATO_HEIGHT: 'auto', // Geralmente é melhor deixar a altura do contrato automática
    };

    // Larguras e Alturas desejadas para cada emoji
    const EMOJI_WIDTHS = {
        [EMOJIS.PARABENS]: '170px',
        [EMOJIS.QUASE]: '130px',
        [EMOJIS.ATENCAO]: '130px',
        [EMOJIS.VAZIO]: '130px',
    };
    const EMOJI_HEIGHTS = {
        [EMOJIS.PARABENS]: '120px',
        [EMOJIS.QUASE]: '120px',
        [EMOJIS.ATENCAO]: '120px',
        [EMOJIS.VAZIO]: '120px',
    };

    // LISTA DE METAS POR CONTRATO (MOCKADA - mantido)
    const CONTRACT_METAS_MOCK = {
        'DEVELON': { net: '99,80%', gross: '99,70%', locacao: '99,50%' },
        'LOGITECH': { net: '99,70%', gross: '99,70%', locacao: '99,50%' },
        'OMRON': { net: '98,50%', gross: '99,70%', locacao: '99,50%' },
        'TRIUMPH': { net: '98,00%', gross: '99,70%', locacao: '99,60%' },
        'FAREVA': { net: '99,80%', gross: '99,70%', locacao: '99,50%' },
        'JCB': { net: '99,00%', gross: '99,70%', locacao: '99,50%' },
        'STANLEY BLACK & DECKER': { net: '99,80%', gross: '99,70%', locacao: '99,50%' },
        'TEREX': { net: '99,80%', gross: '99,70%', locacao: '99,50%' },
        'ASP': { net: '99,80%', gross: '99,70%', locacao: '99,50%' },
        'CONVATEC': { net: '99,90%', gross: '99,50%', locacao: '99,50%' },
        'UNILEVER': { net: '99,84%', gross: '99,74%', locacao: '99,54%' },
        'ESSITY': { net: '99,79%', gross: '99,69%', locacao: '99,49%' },
        'SEPHORA RETAIL': { net: '99,86%', gross: '99,76%', locacao: '99,56%' },
        'SEPHORA E-STOR': { net: '99,89%', gross: '99,79%', locacao: '99,59%' },
        'OBOTICARIO': { net: '99,91%', gross: '99,81%', locacao: '99,61%' },
        'NOME_CONTRATO_35': { net: '99,73%', gross: '99,63%', locacao: '99,43%' },
        'CONTRATO_NOVO_A': { net: '99,70%', gross: '99,60%', locacao: '99,40%' },
        'CONTRATO_NOVO_B': { net: '99,70%', gross: '99,60%', locacao: '99,40%' },
        'CONTRATO_NOVO_C': { net: '99,70%', gross: '99,60%', locacao: '99,40%' },
    };


    // --- ELEMENTOS DOM (mantido) ---
    const loadingMessage = document.getElementById('loadingMessage');
    const gridsContent = document.getElementById('gridsContent');
    const contractSelectWrapper = document.getElementById('contractSelectWrapper');
    const contractSelectDisplay = document.getElementById('contractSelectDisplay');
    const contractDropdown = document.getElementById('contractDropdown');
    const topImagesContainer = document.getElementById('topImagesContainer');

    // --- CONFIGURAÇÃO DAS MÉTRICAS (mantido) ---
    const METRICS_CONFIG_BASE = [
        { gridId: 'netGrid', column: 'net_percent', metaKey: 'net', title: 'Acuracidade "NET"' },
        { gridId: 'grossGrid', column: 'gross_percent', metaKey: 'gross', title: 'Acuracidade "GROSS"' },
        { gridId: 'locacaoGrid', column: 'accuracy_locacao', metaKey: 'locacao', title: 'Acuracidade de LOCAÇÃO' }
    ];

    // [Funções Utilítárias]
    function convertSupabaseDateToMonthKey(dateString) {
        if (!dateString) return null;
        try {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const year = parts[0];
                const month = parts[1];
                return `${month}/${year}`;
            }
        } catch (e) {
            console.error("Erro na conversão de data:", e);
        }
        return null;
    }

    function parsePercentage(percentStr) {
        const numericStr = String(percentStr).replace('%', '').replace(',', '.').trim();
        return parseFloat(numericStr);
    }

    function formatPercentage(value) {
        if (typeof value !== 'number' || isNaN(value)) return '0,00%';
        return value.toFixed(2).replace('.', ',') + '%';
    }

    function classifyResult(resultado, metaNumeric) {
        const corteQuase = metaNumeric - TOLERANCE_CUTOFF;
        if (resultado >= metaNumeric) {
            return { emoji: EMOJIS.PARABENS, statusText: 'PARABENS!!!' };
        }
        if (resultado >= corteQuase) {
            return { emoji: EMOJIS.QUASE, statusText: 'QUASE!!!' };
        }
        return { emoji: EMOJIS.ATENCAO, statusText: 'ATENÇÃO!!!' };
    }

    function generateMonthsToDisplay() {
        const today = new Date();
        let currentMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const months = [];

        for (let i = 0; i < 6; i++) {
            const monthDate = new Date(currentMonth);
            const monthKey = `${String(monthDate.getMonth() + 1).padStart(2, '0')}/${monthDate.getFullYear()}`;

            const monthLabel = monthDate.toLocaleString('pt-BR', { month: 'short' })
                                         .replace('.', '')
                                         .replace(/^\w/, c => c.toUpperCase());
            const yearShort = String(monthDate.getFullYear()).substring(2);

            months.unshift({ label: `${monthLabel}/${yearShort}`, key: monthKey });
            currentMonth.setMonth(currentMonth.getMonth() - 1);
        }
        return months;
    }

    // [Funções Supabase e Filtro]
    async function fetchContracts() {
        if (!supabaseClient) return [];

        try {
            const { data, error } = await supabaseClient
                .from(TABELA_CONTRATOS)
                .select('id, nome_contrato')
                .order('nome_contrato', { ascending: true });

            if (error) throw error;
            return data;

        } catch (e) {
            console.error("Erro ao buscar contratos:", e);
            return [];
        }
    }

    async function fetchCarinhasData(contractId) {
        if (!supabaseClient || !contractId) return [];

        loadingMessage.textContent = 'Carregando dados...';
        loadingMessage.style.display = 'block';
        gridsContent.style.display = 'none';

        try {
            const { data, error } = await supabaseClient
                .from(TABELA_DADOS)
                .select('reference_month, net_percent, gross_percent, accuracy_locacao')
                .eq('contract_id', contractId)
                .order('reference_month', { ascending: false });

            if (error) throw error;
            return data;

        } catch (e) {
            console.error("Erro ao buscar dados do contrato:", e);
            loadingMessage.textContent = `Erro: ${e.message}. Verifique os nomes das tabelas e colunas no console.`;
            return [];
        }
    }

    function setupContractFilter(contracts) {
        availableContracts = contracts;
        contractDropdown.innerHTML = '';

        const defaultOption = document.createElement('div');
        defaultOption.classList.add('dropdown-option');
        defaultOption.textContent = 'Selecione o Contrato...';
        defaultOption.dataset.id = '';
        defaultOption.dataset.name = '';
        defaultOption.addEventListener('click', () => handleContractSelection(null, 'Selecione o Contrato...'));
        contractDropdown.appendChild(defaultOption);

        contracts.forEach(contract => {
            const option = document.createElement('div');
            option.classList.add('dropdown-option');
            option.dataset.id = contract.id;
            option.dataset.name = contract.nome_contrato;
            option.textContent = contract.nome_contrato;

            option.addEventListener('click', () => handleContractSelection(contract.id, contract.nome_contrato));
            contractDropdown.appendChild(option);
        });

        contractSelectDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            contractSelectWrapper.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            contractSelectWrapper.classList.remove('open');
        });
    }

    async function handleContractSelection(id, name) {
        currentContractId = id;
        currentContractName = name || ''; // Armazena o nome do contrato selecionado
        contractSelectDisplay.textContent = name;
        contractSelectWrapper.classList.remove('open');

        document.querySelectorAll('#contractDropdown .dropdown-option').forEach(el => {
            el.classList.remove('selected');
            if (String(el.dataset.id) === String(id)) {
                el.classList.add('selected');
            }
        });

        if (id !== null && name !== 'Selecione o Contrato...') {
            const contractKey = name ? name.toUpperCase() : '';
            selectedContractMeta = CONTRACT_METAS_MOCK[contractKey] || {};

            if (Object.keys(selectedContractMeta).length === 0) {
                 loadingMessage.textContent = `ERRO: Metas não configuradas manualmente para o contrato: "${name}". Adicione-o (com esse nome exato em MAIÚSCULO) ao CONTRACT_METAS_MOCK.`;
                 loadingMessage.style.display = 'block';
                 gridsContent.style.display = 'none';
                 if (topImagesContainer) {
                    topImagesContainer.innerHTML = '';
                 }
                 return;
            }

            await loadCarinhasDashboard();
        } else {
            loadingMessage.textContent = 'Selecione um contrato para carregar os resultados.';
            loadingMessage.style.display = 'block';
            gridsContent.style.display = 'none';
            if (topImagesContainer) {
                topImagesContainer.innerHTML = '';
            }
        }
    }

    async function loadCarinhasDashboard() {
        if (!currentContractId || Object.keys(selectedContractMeta).length === 0) return;

        allCarinhasData = await fetchCarinhasData(currentContractId);

        if (allCarinhasData.length === 0) {
            loadingMessage.textContent = 'Não há dados de acuracidade para este contrato nos últimos 6 meses.';
            loadingMessage.style.display = 'block';
            gridsContent.style.display = 'none';
            if (topImagesContainer) {
                topImagesContainer.innerHTML = '';
            }
            return;
        }

        loadingMessage.style.display = 'none';
        gridsContent.style.display = 'block';

        // 🔑 NOVO: Injeta as imagens de INVENTÁRIO e do CONTRATO usando as constantes TOP_IMAGE_DIMENSIONS
        if (topImagesContainer) {
            topImagesContainer.innerHTML = ''; // Limpa antes de adicionar

            // 1. Imagem de INVENTÁRIO (Esquerda - Fixo)
            const inventarioImg = document.createElement('img');
            inventarioImg.src = INVENTARIO_IMAGE_PATH; // Caminho para INVENTARIO.png
            inventarioImg.alt = "Inventário";
            inventarioImg.classList.add('inventory-left-image');

            // 💡 APLICANDO ESTILO INLINE COM BASE NAS CONSTANTES
            inventarioImg.style.width = TOP_IMAGE_DIMENSIONS.INVENTARIO_WIDTH;
            inventarioImg.style.height = TOP_IMAGE_DIMENSIONS.INVENTARIO_HEIGHT;

            // 2. Imagem do Contrato (Direita - Dinâmico)
            const safeContractName = currentContractName
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase();

            const contractImageFileName = `${safeContractName}.png`;
            const contractImg = document.createElement('img');
            contractImg.src = `${CONTRATO_IMAGE_BASE_PATH}${contractImageFileName}`;
            contractImg.alt = `Logo ${currentContractName}`;
            contractImg.classList.add('contract-right-image');

            // 💡 APLICANDO ESTILO INLINE COM BASE NAS CONSTANTES
            contractImg.style.maxWidth = TOP_IMAGE_DIMENSIONS.CONTRATO_MAX_WIDTH;
            contractImg.style.height = TOP_IMAGE_DIMENSIONS.CONTRATO_HEIGHT;

            topImagesContainer.appendChild(inventarioImg);
            topImagesContainer.appendChild(contractImg);
        }

        METRICS_CONFIG_BASE.forEach(configBase => {
            const resultsMap = {};
            allCarinhasData.forEach(item => {
                const mesReferenciaKey = convertSupabaseDateToMonthKey(item.reference_month);
                const value = item[configBase.column];

                if (mesReferenciaKey && value !== null && value !== undefined) {
                    resultsMap[mesReferenciaKey] = formatPercentage(value);
                }
            });

            const metaValue = selectedContractMeta[configBase.metaKey];

            const moduleConfig = {
                gridId: configBase.gridId,
                meta: metaValue,
                results: resultsMap
            };

            renderModuleGrid(moduleConfig);
        });
    }

    // ---------------------------------------------------------------------------------
    // 4. FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO
    // ---------------------------------------------------------------------------------

    function renderModuleGrid(config) {
        const monthsGrid = document.getElementById(config.gridId);
        if (!monthsGrid) return;

        const monthsData = generateMonthsToDisplay();
        const metaNumeric = parsePercentage(config.meta);
        monthsGrid.innerHTML = '';

        monthsGrid.classList.add('data-grid-container');

        monthsData.forEach(month => {
            const resultValueStr = config.results[month.key];

            let classification;
            let statusColorClass = '';
            let displayValue = '---';
            let resultValueNumeric = null;

            if (!resultValueStr) {
                classification = { emoji: EMOJIS.VAZIO, statusText: 'SEM DADOS' };
                statusColorClass = 'text-gray-500';
                displayValue = '---';
            } else {
                resultValueNumeric = parsePercentage(resultValueStr);
                classification = classifyResult(resultValueNumeric, metaNumeric);
                displayValue = resultValueStr;

                if (classification.statusText === 'PARABENS!!!') {
                    statusColorClass = 'text-green-600';
                } else if (classification.statusText === 'QUASE!!!') {
                     statusColorClass = 'text-yellow-600';
                } else if (classification.statusText === 'ATENÇÃO!!!') {
                     statusColorClass = 'text-red-600';
                }
            }

            const imageWidth = EMOJI_WIDTHS[classification.emoji] || '100px';
            const imageHeight = EMOJI_HEIGHTS[classification.emoji] || '100px';

            const fullImagePath = `${EMOJI_BASE_PATH}${classification.emoji}`;

            const monthBlockHtml = `
                <div class="month-block" data-month-key="${month.key}">
                    <div class="month-header">${month.label}</div>

                    <div class="data-row meta-row">
                        <span class="data-label">META:</span>
                        <span class="data-separator"></span>
                        <span class="data-value value-meta">${config.meta}</span>
                    </div>

                    <div class="data-row result-row">
                        <span class="data-label">Resultado:</span>
                        <span class="data-separator"></span>
                        <span class="data-value value-result">${displayValue}</span>
                    </div>

                    <div class="emoji-area" style="padding-top: 10px;">
                        <img src="${fullImagePath}"
                             alt="${classification.statusText}"
                             style="width: ${imageWidth}; height: ${imageHeight}; margin: 5px 0;" />
                            </div>

                    <div class="parabens-area ${statusColorClass}">
                        <p>${classification.statusText}</p>
                    </div>

                </div>
            `;
            monthsGrid.innerHTML += monthBlockHtml;
        });
    }

    // ---------------------------------------------------------------------------------
    // 5. INICIALIZAÇÃO GERAL E EVENTOS (mantido)
    // ---------------------------------------------------------------------------------

    function initializeSupabase() {
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase Client Inicializado para Carinhas.");
        } else {
            loadingMessage.textContent = 'ERRO CRÍTICO: Supabase SDK não está definido.';
            console.error("ERRO CRÍTICO: Supabase SDK não está definido.");
            return false;
        }
        return true;
    }

    const printIcon = document.getElementById('printIcon');

    if (initializeSupabase()) {
        fetchContracts().then(contracts => {
            setupContractFilter(contracts);
        });
    }

    if (printIcon) {
        printIcon.addEventListener('click', () => {
            window.print();
        });
    }

    const sessionDataString = localStorage.getItem('user_session_data');
    if (sessionDataString) {
        try {
            const userProfile = JSON.parse(sessionDataString);
            const userNameElement = document.getElementById('userName');

            if (userProfile && userProfile.usuario && userNameElement) {
                let formattedUser = userProfile.usuario.toLowerCase();
                formattedUser = formattedUser.charAt(0).toUpperCase() + formattedUser.slice(1);
                userNameElement.textContent = formattedUser;
            }
        } catch (e) {
            console.warn("Sessão inválida, usando nome padrão.");
        }
    }

});