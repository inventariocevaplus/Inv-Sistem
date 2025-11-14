// =========================================================================
// Módulo/Carinhas/Carinhas.js - CÓDIGO FINAL E CORRIGIDO
// 🔑 CORREÇÕES:
// 1. IMAGE_BASE_PATH ajustado para "" (vazio).
// 2. Lógica de esconder o elemento da Câmera (cameraFeedContainer) no html2canvas
//    para evitar o erro "Tainted Canvas".
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO SUPABASE ---
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

    // --- CONSTANTES DE LÓGICA ---

    const TOLERANCE_CUTOFF = 0.05; // 0.05%

    // 🔑 CORREÇÃO 1: Caminho ajustado para "" (Vazio), pois o JS e as imagens estão no mesmo nível
    const IMAGE_BASE_PATH = "";

    const EMOJIS = {
        PARABENS: 'PARABENS.png',
        QUASE: 'QUASE.png',
        ATENCAO: 'ATENCAO.png',
        VAZIO: 'VAZIO.png',
    };

    // 🔑 LISTA DE METAS POR CONTRATO (MOCKADA)
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


    // --- ELEMENTOS DOM ---
    const loadingMessage = document.getElementById('loadingMessage');
    const gridsContent = document.getElementById('gridsContent');
    const contractSelectWrapper = document.getElementById('contractSelectWrapper');
    const contractSelectDisplay = document.getElementById('contractSelectDisplay');
    const contractDropdown = document.getElementById('contractDropdown');

    // --- CONFIGURAÇÃO DAS MÉTRICAS ---
    const METRICS_CONFIG_BASE = [
        { gridId: 'netGrid', column: 'net_percent', metaKey: 'net', title: 'Acuracidade "NET"' },
        { gridId: 'grossGrid', column: 'gross_percent', metaKey: 'gross', title: 'Acuracidade "GROSS"' },
        { gridId: 'locacaoGrid', column: 'accuracy_locacao', metaKey: 'locacao', title: 'Acuracidade de LOCAÇÃO' }
    ];

    // ---------------------------------------------------------------------------------
    // 1. FUNÇÕES UTILITÁRIAS
    // ---------------------------------------------------------------------------------

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

    // ---------------------------------------------------------------------------------
    // 2. LÓGICA SUPABASE E DADOS
    // ---------------------------------------------------------------------------------

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


    // ---------------------------------------------------------------------------------
    // 3. LÓGICA DO FILTRO DE CONTRATOS (Inclui o carregamento de metas)
    // ---------------------------------------------------------------------------------

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
        contractSelectDisplay.textContent = name;
        contractSelectWrapper.classList.remove('open');

        document.querySelectorAll('#contractDropdown .dropdown-option').forEach(el => {
            el.classList.remove('selected');
            if (String(el.dataset.id) === String(id)) {
                el.classList.add('selected');
            }
        });

        if (id !== null) {
            const contractKey = name ? name.toUpperCase() : '';
            selectedContractMeta = CONTRACT_METAS_MOCK[contractKey] || {};

            if (Object.keys(selectedContractMeta).length === 0) {
                 loadingMessage.textContent = `ERRO: Metas não configuradas manualmente para o contrato: "${name}". Adicione-o (com esse nome exato em MAIÚSCULO) ao CONTRACT_METAS_MOCK.`;
                 loadingMessage.style.display = 'block';
                 gridsContent.style.display = 'none';
                 return;
            }

            await loadCarinhasDashboard();
        } else {
            loadingMessage.textContent = 'Selecione um contrato para carregar os resultados.';
            loadingMessage.style.display = 'block';
            gridsContent.style.display = 'none';
        }
    }

    async function loadCarinhasDashboard() {
        if (!currentContractId || Object.keys(selectedContractMeta).length === 0) return;

        allCarinhasData = await fetchCarinhasData(currentContractId);

        if (allCarinhasData.length === 0) {
            loadingMessage.textContent = 'Não há dados de acuracidade para este contrato nos últimos 6 meses.';
            loadingMessage.style.display = 'block';
            gridsContent.style.display = 'none';
            return;
        }

        loadingMessage.style.display = 'none';
        gridsContent.style.display = 'block';

        METRICS_CONFIG_BASE.forEach(configBase => {
            const resultsMap = {};
            allCarinhasData.forEach(item => {
                const mesReferenciaKey = convertSupabaseDateToMonthKey(item.reference_month);
                const value = item[configBase.column];

                if (mesReferenciaKey && value !== null && value !== undefined) {
                    // Mantido o formato de string para compatibilidade com a função renderModuleGrid original
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
            let imageWidth = '100px';
            let statusColorClass = '';
            let displayValue = '---';
            let resultValueNumeric = null; // Inicializa

            if (!resultValueStr) {
                classification = { emoji: EMOJIS.VAZIO, statusText: 'SEM DADOS' };
                imageWidth = '100px';
                statusColorClass = 'text-gray-500';
                displayValue = '---';
            } else {
                resultValueNumeric = parsePercentage(resultValueStr);
                classification = classifyResult(resultValueNumeric, metaNumeric);
                displayValue = resultValueStr;

                if (classification.statusText === 'PARABENS!!!') {
                    statusColorClass = 'text-green-600';
                    imageWidth = '160px';
                } else if (classification.statusText === 'QUASE!!!') {
                     statusColorClass = 'text-yellow-600';
                } else if (classification.statusText === 'ATENÇÃO!!!') {
                     statusColorClass = 'text-red-600';
                }
            }

            // 💡 Caminho agora é apenas o nome do arquivo, pois estão no mesmo diretório
            const fullImagePath = `${IMAGE_BASE_PATH}${classification.emoji}`;

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
                             style="width: ${imageWidth}; height: 100px; margin: 5px 0;" />
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
    // 5. INICIALIZAÇÃO GERAL E EVENTOS
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

    const mainCarinhasContainer = document.getElementById('mainCarinhasContainer');
    const exportIcon = document.getElementById('exportIcon');
    const printIcon = document.getElementById('printIcon');

    // 🔑 ELEMENTO DA CÂMERA/VÍDEO (Ajustado para o novo ID no HTML)
    const cameraElementContainer = document.getElementById('cameraFeedContainer');

    async function handleExportAsImage() {
        const showMessage = (msg) => {
            const modal = document.createElement('div');
            modal.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; justify-content: center; align-items: center;";
            const content = document.createElement('div');
            content.style.cssText = "background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); max-width: 80%; text-align: center;";
            content.innerHTML = `<p>${msg}</p><button onclick="this.parentNode.parentNode.remove()" style="margin-top: 10px; padding: 8px 15px; background: #0F243E; color: white; border: none; border-radius: 4px; cursor: pointer;">Fechar</button>`;
            modal.appendChild(content);
            document.body.appendChild(modal);
        };

        if (loadingMessage.style.display !== 'none') {
             showMessage('Selecione um contrato e aguarde o carregamento dos dados antes de exportar.');
             return;
        }

        exportIcon.style.display = 'none';
        let cameraWasVisible = false;

        // 🔑 SOLUÇÃO CONTRA "TAINTED CANVAS": Esconder o container da câmera/vídeo
        if (cameraElementContainer) {
             // Salvamos o estado de visibilidade
             cameraWasVisible = cameraElementContainer.style.display !== 'none';
             if(cameraWasVisible) {
                 cameraElementContainer.style.display = 'none';
             }
        }


        try {
            // A opção allowTaint: false é a chave para o html2canvas não falhar se encontrar a tag,
            // mas a remoção do elemento é a garantia máxima.
            const canvas = await html2canvas(mainCarinhasContainer, {
                scale: 2,
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                allowTaint: false
            });

            const imageURL = canvas.toDataURL('image/png');
            const tempLink = document.createElement('a');
            tempLink.href = imageURL;
            tempLink.download = `Inventario_Carinhas_${contractSelectDisplay.textContent.replace(/\s/g, '_')}_` + new Date().toISOString().slice(0, 10) + '.png';

            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
            showMessage('Exportação concluída! Verifique sua pasta de downloads.');

        } catch (error) {
            console.error('Erro ao gerar a imagem de exportação:', error);
            // Mensagem atualizada para indicar o erro de segurança
            showMessage('Não foi possível gerar a imagem. Verifique se o projeto está rodando em um **servidor local (Live Server)** e se o elemento da Câmera foi configurado corretamente.');
        } finally {
            exportIcon.style.display = 'block';

            // 🔑 RESTAURAÇÃO: Restaurar o elemento da câmera
            if (cameraElementContainer && cameraWasVisible) {
                cameraElementContainer.style.display = '';
            }
        }
    }


    if (initializeSupabase()) {
        fetchContracts().then(contracts => {
            setupContractFilter(contracts);
        });
    }

    if (exportIcon && mainCarinhasContainer) {
        exportIcon.addEventListener('click', handleExportAsImage);
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