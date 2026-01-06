document.addEventListener('DOMContentLoaded', () => {
    // 1. CONFIGURAÇÕES E CREDENCIAIS SUPABASE
    const SUPABASE_URL = 'https://kidpprfegedkjifbwkju.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZHBwcmZlZ2Vka2ppZmJ3a2p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1OTE5NjQsImV4cCI6MjA3NjE2Nzk2NH0.OkpgPHJtFIKyicX_qeOSMVHMk58Bppf0SzyZAPgWzLw';

    const sessionDataJSON = localStorage.getItem('user_session_data');
    let accessToken = SUPABASE_ANON_KEY;
    if (sessionDataJSON) {
        try {
            const userData = JSON.parse(sessionDataJSON);
            if (userData.token) accessToken = userData.token;
        } catch (e) { console.error("Erro ao carregar token de sessão", e); }
    }

    const supabaseClient = supabase.createClient(SUPABASE_URL, accessToken);
    const TABLE_NAME = 'inventory_details';

    // 2. REFERÊNCIAS DO DOM
    const monthOptions = document.getElementById('monthOptions');
    const yearOptions = document.getElementById('yearOptions');
    const monthDisplay = document.getElementById('monthDisplay');
    const yearDisplay = document.getElementById('yearDisplay');
    const contractSelector = document.getElementById('contractSelector');
    const inputPercentual = document.getElementById('inputPercentual');
    const btnBuscar = document.getElementById('btnBuscarAllowance');

    // Referência do Dropdown Rotinas (Sidebar)
    const rotinasDropdown = document.getElementById('rotinasDropdown');

    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const years = [2025, 2026, 2027, 2028, 2029, 2030];
    let selectedMonths = [];
    let selectedYears = [];

    // --- CORREÇÃO DO MENU LATERAL (DROPDOWN ROTINAS) ---
    if (rotinasDropdown) {
        const toggleBtn = rotinasDropdown.querySelector('.dropdown-toggle');
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            rotinasDropdown.classList.toggle('active');

            // Opcional: fechar outros se houver mais menus
            const content = rotinasDropdown.querySelector('.dropdown-content');
            if (rotinasDropdown.classList.contains('active')) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        });
    }

    // 3. INICIALIZAÇÃO DOS DROPDOWNS DE DATA
    function initDropdowns() {
        months.forEach((month, index) => {
            const item = document.createElement('div');
            item.className = 'select-option-item';
            item.textContent = month;
            item.dataset.value = (index + 1).toString().padStart(2, '0');
            item.addEventListener('click', (e) => { e.stopPropagation(); toggleSelection(item, 'month'); });
            monthOptions.appendChild(item);
        });

        years.forEach(year => {
            const item = document.createElement('div');
            item.className = 'select-option-item';
            item.textContent = year;
            item.dataset.value = year;
            item.addEventListener('click', (e) => { e.stopPropagation(); toggleSelection(item, 'year'); });
            yearOptions.appendChild(item);
        });
    }

    async function toggleSelection(element, type) {
        const value = element.dataset.value;
        element.classList.toggle('selected');

        if (type === 'month') {
            selectedMonths = selectedMonths.includes(value) ? selectedMonths.filter(m => m !== value) : [...selectedMonths, value];
            updateDisplay(monthDisplay, selectedMonths, 'Mês(es)', 'month');
        } else {
            selectedYears = selectedYears.includes(value) ? selectedYears.filter(y => y !== value) : [...selectedYears, value];
            updateDisplay(yearDisplay, selectedYears, 'Ano(s)', 'year');
        }

        if (selectedMonths.length > 0 && selectedYears.length > 0) {
            await loadAvailableContracts();
        }
    }

    async function loadAvailableContracts() {
        const dateFilters = [];
        selectedYears.forEach(y => selectedMonths.forEach(m => dateFilters.push(`${y}-${m}-01`)));

        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select('contract_name')
            .in('reference_month', dateFilters);

        if (error) return;

        const uniqueContracts = [...new Set(data.map(item => item.contract_name))];
        contractSelector.innerHTML = '<option value="">-- Selecione o Contrato --</option>';
        uniqueContracts.sort().forEach(name => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = name;
            contractSelector.appendChild(opt);
        });
    }

    // 4. LÓGICA DE CÁLCULO
    btnBuscar.addEventListener('click', async () => {
        let rawPercent = inputPercentual.value.replace(',', '.');
        const percentualDigitado = parseFloat(rawPercent);
        const contrato = contractSelector.value;

        if (!contrato || isNaN(percentualDigitado) || percentualDigitado <= 0) {
            alert("Selecione o contrato e insira um percentual válido (ex: 0,2).");
            return;
        }

        const fatorPercentual = percentualDigitado / 100;
        const dateFilters = [];
        selectedYears.forEach(y => selectedMonths.forEach(m => dateFilters.push(`${y}-${m}-01`)));

        const { data, error } = await supabaseClient
            .from(TABLE_NAME)
            .select('stock_value, counted_value, reference_month')
            .eq('contract_name', contrato)
            .in('reference_month', dateFilters)
            .order('reference_month', { ascending: false });

        if (error || !data.length) {
            alert("Nenhum dado encontrado.");
            return;
        }

        // RISCO: Mês mais recente * fator
        const valorStockRecente = parseFloat(data[0].stock_value || 0);
        const resultadoRisco = valorStockRecente * fatorPercentual;

        // BSC: Soma de todos os selecionados * fator
        const somaCountedTotal = data.reduce((acc, cur) => acc + parseFloat(cur.counted_value || 0), 0);
        const resultadoBSC = somaCountedTotal * fatorPercentual;

        const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('displayRisco').textContent = brl.format(resultadoRisco);
        document.getElementById('displayBSC').textContent = brl.format(resultadoBSC);
    });

    // 5. FUNÇÕES AUXILIARES
    function updateDisplay(displayElement, selectedArray, defaultText, type) {
        if (selectedArray.length === 0) {
            displayElement.textContent = `Selecione ${defaultText}`;
        } else if (selectedArray.length <= 2) {
            if (type === 'month') {
                const names = selectedArray.map(v => months[parseInt(v) - 1]);
                displayElement.textContent = names.join(', ');
            } else {
                displayElement.textContent = selectedArray.join(', ');
            }
        } else {
            displayElement.textContent = `${selectedArray.length} selecionados`;
        }
    }

    // Controle dos Dropdowns de Filtro (Mês/Ano)
    [monthDisplay, yearDisplay].forEach(display => {
        display.addEventListener('click', (e) => {
            e.stopPropagation();
            const options = display.nextElementSibling;
            document.querySelectorAll('.select-options').forEach(opt => {
                if (opt !== options) opt.classList.remove('open');
            });
            options.classList.toggle('open');
        });
    });

    window.addEventListener('click', () => {
        document.querySelectorAll('.select-options').forEach(opt => opt.classList.remove('open'));
    });

    // Cópia
    ['copyBSC', 'copyRisco'].forEach(id => {
        document.getElementById(id).addEventListener('click', function() {
            const val = this.querySelector('.display-value').textContent;
            navigator.clipboard.writeText(val);
            this.style.backgroundColor = '#d4edda';
            setTimeout(() => this.style.backgroundColor = '', 500);
        });
    });

    initDropdowns();
});