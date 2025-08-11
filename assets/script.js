// RENZO FERNANDO MOSQUERA DAZA

document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURACIÓN Y CONSTANTES ---
    const PERIODOS_MAP = {
        'Anual': { nper: 1, texto: 'Anual' },
        'Semestral': { nper: 2, texto: 'Semestral' },
        'Cuatrimestral': { nper: 3, texto: 'Cuatrimestral' },
        'Trimestral': { nper: 4, texto: 'Trimestral' },
        'Bimestral': { nper: 6, texto: 'Bimestral' },
        'Mensual': { nper: 12, texto: 'Mensual' },
        'Quincenal': { nper: 24, texto: 'Quincenal' },
        'Semanal': { nper: 52, texto: 'Semanal' },
        'Diaria': { nper: 360, texto: 'Diaria' }
    };
    const PERIODOS_ORDENADOS = ['Anual', 'Semestral', 'Cuatrimestral', 'Trimestral', 'Bimestral', 'Mensual', 'Quincenal', 'Semanal', 'Diaria'];

    // --- ESTADO DE LA APLICACIÓN ---
    const state = {
        partida: {
            valor: '', // Inicia vacío como se solicitó
            tipo: 'Nominal',
            periodo: 'Trimestral',
            cap: 'Vencida',
        },
        destino: {
            tipo: 'Efectiva Anual',
            periodo: 'Anual',
            cap: 'Vencida',
        },
        resultado: {
            valorNumerico: null // Almacena el valor numérico para copiarlo fácilmente
        }
    };

    // --- ELEMENTOS DEL DOM ---
    const ui = {
        partidaContainer: document.getElementById('partida-inputs-container'),
        destinoContainer: document.getElementById('destino-inputs-container'),
        resultado: {
            valor: document.getElementById('resultadoValor'),
            label: document.getElementById('resultadoLabel'),
            copyBtn: document.getElementById('copy-main-result-btn')
        },
        memoriaCalculo: document.getElementById('memoriaCalculo'),
        equivalencyContainer: document.getElementById('equivalency-tables-container'),
        theme: {
            toggleBtn: document.getElementById('theme-toggle'),
            darkIcon: document.getElementById('theme-toggle-dark-icon'),
            lightIcon: document.getElementById('theme-toggle-light-icon')
        }
    };

    // --- LÓGICA DE RENDERIZADO (UI) ---

    /**
     * Crea y renderiza los inputs para una sección (partida o destino).
     */
    function renderInputs(container, config, stateKey) {
        container.innerHTML = ''; // Limpia los inputs anteriores

        if (stateKey === 'partida') {
            container.appendChild(createInputGroup('valor', 'Valor de la Tasa (%)', 'number', config.valor, stateKey));
        }

        const tiposTasa = (stateKey === 'partida')
            ? ['Nominal', 'Efectiva Anual']
            : ['Efectiva Anual', 'Nominal', 'Periódica'];
        container.appendChild(createInputGroup('tipo', 'Tipo de Tasa', 'select', config.tipo, stateKey, tiposTasa));

        if (config.tipo !== 'Efectiva Anual') {
            container.appendChild(createInputGroup('periodo', 'Periodo de Capitalización', 'select', config.periodo, stateKey, PERIODOS_ORDENADOS));
            container.appendChild(createInputGroup('cap', 'Forma de Pago', 'select', config.cap, stateKey, ['Vencida', 'Anticipada']));
        }
    }

    /**
     * Función ayudante para crear un grupo de input (label + input/select).
     */
    function createInputGroup(id, labelText, type, value, stateKey, options = []) {
        const group = document.createElement('div');
        group.className = 'input-group';

        const label = document.createElement('label');
        label.setAttribute('for', `${stateKey}-${id}`);
        label.textContent = labelText;
        group.appendChild(label);

        let field;
        if (type === 'select') {
            field = document.createElement('select');
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                if (opt === value) option.selected = true;
                field.appendChild(option);
            });
        } else {
            field = document.createElement('input');
            field.type = type;
            field.value = value;
            if (type === 'number') {
                field.step = 'any';
                field.placeholder = 'Ingresa el valor aquí'; // Placeholder actualizado
            }
        }

        field.id = `${stateKey}-${id}`;
        field.className = 'input-field';
        field.dataset.stateKey = stateKey;
        field.dataset.prop = id;
        group.appendChild(field);

        return group;
    }

    // --- LÓGICA DE CÁLCULO ---

    function realizarCalculoCompleto() {
        const valorPartida = parseFloat(state.partida.valor);
        if (isNaN(valorPartida)) {
            resetUI('Ingresa un valor en la tasa de partida para ver el proceso de conversión.');
            return;
        }
        if (valorPartida < 0) {
            actualizarUIError('El valor de la tasa debe ser un número positivo.');
            return;
        }

        const vPartida = valorPartida / 100;
        let memoria = [];
        const ea = calcularEAPivote(vPartida, state.partida, memoria);

        if (isNaN(ea)) {
            actualizarUIError('Cálculo inválido. Una tasa anticipada no puede ser >= 100%.');
            return;
        }

        const { resultadoFinal, labelFinal } = calcularResultadoDestino(ea, state.destino, memoria);
        actualizarUIResultados(resultadoFinal, labelFinal, memoria.join(''), ea);
    }

    function calcularEAPivote(valor, config, memoria) {
        if (config.tipo === 'Efectiva Anual') {
            memoria.push(generarPasoMemoria(
                '1. Tasa Pivote (E.A.)',
                'La tasa de partida ya es Efectiva Anual, se usa directamente como pivote.',
                null,
                valor
            ));
            return valor;
        }

        const nper = PERIODOS_MAP[config.periodo].nper;
        let ip = valor / nper;

        memoria.push(generarPasoMemoria(
            '1. Calcular Tasa Periódica',
            'Se divide la tasa nominal por el número de periodos para hallar la tasa del ciclo.',
            `i_p = \\frac{${(valor * 100).toFixed(4)}\\%}{${nper}} = ${(ip * 100).toFixed(6)}\\%`,
            ip
        ));

        if (config.cap === 'Anticipada') {
            const ipAnticipada = ip;
            if (ipAnticipada >= 1) return NaN; // Validación
            ip = ip / (1 - ip);
            memoria.push(generarPasoMemoria(
                '2. Convertir a Periódica Vencida',
                'La tasa es anticipada, se convierte a su equivalente vencida para poder capitalizar.',
                `i_{p,v} = \\frac{i_{p,a}}{1 - i_{p,a}} = \\frac{${(ipAnticipada * 100).toFixed(6)}\\%}{1 - ${(ipAnticipada * 100).toFixed(6)}\\%} = ${(ip * 100).toFixed(6)}\\%`,
                ip
            ));
        }

        const ea = Math.pow(1 + ip, nper) - 1;
        memoria.push(generarPasoMemoria(
            `${config.cap === 'Anticipada' ? '3' : '2'}. Capitalizar a Efectiva Anual (Pivote)`,
            'Se compone la tasa periódica vencida para hallar la rentabilidad anual real (E.A.).',
            `E.A. = (1 + i_{p,v})^{nper} - 1 = (1 + ${(ip * 100).toFixed(6)}\\%)^{${nper}} - 1 = ${(ea * 100).toFixed(6)}\\%`,
            ea
        ));

        return ea;
    }

    function calcularResultadoDestino(ea, config, memoria) {
        const pasoInicial = memoria.length + 1;
        if (config.tipo === 'Efectiva Anual') {
            memoria.push(generarPasoMemoria(
                `${pasoInicial}. Resultado Final`,
                'Se solicita la Tasa Efectiva Anual, que es nuestro valor pivote.',
                null,
                ea
            ));
            return { resultadoFinal: ea, labelFinal: 'Efectiva Anual' };
        }

        const nper = PERIODOS_MAP[config.periodo].nper;
        let ip = Math.pow(1 + ea, 1 / nper) - 1;

        memoria.push(generarPasoMemoria(
            `${pasoInicial}. Descomponer E.A. a Periódica Vencida`,
            'Se descompone la E.A. para encontrar la tasa del ciclo de destino. El resultado siempre es una tasa vencida.',
            `i_{p,v} = (1 + E.A.)^{\\frac{1}{nper}} - 1 = (1 + ${(ea * 100).toFixed(6)}\\%)^{ \\frac{1}{${nper}}} - 1 = ${(ip * 100).toFixed(6)}\\%`,
            ip
        ));

        if (config.cap === 'Anticipada') {
            const ipVencida = ip;
            ip = ip / (1 + ip);
            memoria.push(generarPasoMemoria(
                `${pasoInicial + 1}. Convertir a Periódica Anticipada`,
                'Se convierte la tasa periódica vencida a su equivalente anticipada, según lo solicitado.',
                `i_{p,a} = \\frac{i_{p,v}}{1 + i_{p,v}} = \\frac{${(ipVencida * 100).toFixed(6)}\\%}{1 + ${(ipVencida * 100).toFixed(6)}\\%} = ${(ip * 100).toFixed(6)}\\%`,
                ip
            ));
        }

        if (config.tipo === 'Periódica') {
            memoria.push(generarPasoMemoria(
                `${memoria.length}. Resultado Final`,
                'La tasa solicitada es la periódica calculada.',
                null,
                ip
            ));
            return { resultadoFinal: ip, labelFinal: `Periódica ${config.periodo} ${config.cap}` };
        } else { // Nominal
            const resultadoFinal = ip * nper;
            memoria.push(generarPasoMemoria(
                `${memoria.length}. Componer a Tasa Nominal`,
                'Se multiplica la tasa periódica por el número de periodos para obtener la tasa nominal anual.',
                `Nominal = i_p \\times nper = ${(ip * 100).toFixed(6)}\\% \\times ${nper} = ${(resultadoFinal * 100).toFixed(6)}\\%`,
                resultadoFinal
            ));
            return { resultadoFinal, labelFinal: `Nominal ${config.periodo} ${config.cap}` };
        }
    }

    function generarPasoMemoria(titulo, descripcion, formula, valorNumerico) {
        let formulaHtml = '';
        if (formula) {
            const valorACopiar = Number(valorNumerico).toFixed(15);
            const botonCopiarHtml = `
                <button class="copy-button-inline copy-button" title="Copiar valor" data-copy-value="${valorACopiar}">
                    <svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <svg class="check-icon hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </button>`;

            formulaHtml = `
                <div class="formula-wrapper">
                    <span class="katex-container">$$ ${formula} $$</span>
                    ${botonCopiarHtml}
                </div>`;
        }
        return `<p><strong>${titulo}:</strong> ${descripcion}</p>${formulaHtml}`;
    }

    function popularTablasDeEquivalencia(ea) {
        const formatPercent = val => (val * 100).toFixed(4) + '%';
        let periodicasHTML = '';
        let nominalesHTML = '';

        PERIODOS_ORDENADOS.forEach(p_nombre => {
            const nper = PERIODOS_MAP[p_nombre].nper;
            const ip_v = Math.pow(1 + ea, 1 / nper) - 1;
            const ip_a = ip_v / (1 + ip_v);
            const nom_v = ip_v * nper;
            const nom_a = ip_a * nper;
            periodicasHTML += `<tr><td>${p_nombre}</td><td>${formatPercent(ip_v)}</td><td>${formatPercent(ip_a)}</td></tr>`;
            nominalesHTML += `<tr><td>${p_nombre}</td><td>${formatPercent(nom_v)}</td><td>${formatPercent(nom_a)}</td></tr>`;
        });

        ui.equivalencyContainer.innerHTML = `
            <div>
                <h3 class="sub-title">Tasas Periódicas Equivalentes</h3>
                <table class="equivalency-table">
                    <thead><tr><th>Periodo</th><th>Tasa Vencida (ip%v)</th><th>Tasa Anticipada (ip%a)</th></tr></thead>
                    <tbody>${periodicasHTML}</tbody>
                </table>
            </div>
            <div>
                <h3 class="sub-title">Tasas Nominales Anuales Equivalentes</h3>
                <table class="equivalency-table">
                    <thead><tr><th>Periodo</th><th>Nominal Vencida</th><th>Nominal Anticipada</th></tr></thead>
                    <tbody>${nominalesHTML}</tbody>
                </table>
            </div>`;
    }

    // --- FUNCIONES DE ACTUALIZACIÓN DE UI ---

    function resetUI(memoriaPlaceholder) {
        ui.resultado.valor.textContent = '--.--%';
        ui.resultado.label.textContent = 'Esperando cálculo...';
        ui.memoriaCalculo.innerHTML = `<p class="placeholder-text">${memoriaPlaceholder}</p>`;
        ui.equivalencyContainer.innerHTML = `<p class="placeholder-text-table">Las tablas de equivalencia aparecerán aquí una vez se realice un cálculo válido.</p>`;
        state.resultado.valorNumerico = null;
        ui.resultado.copyBtn.disabled = true;
    }

    function actualizarUIError(mensaje) {
        ui.resultado.valor.textContent = 'Error';
        ui.resultado.label.textContent = 'Cálculo inválido';
        ui.memoriaCalculo.innerHTML = `<p class="placeholder-text">${mensaje}</p>`;
        ui.equivalencyContainer.innerHTML = `<p class="placeholder-text-table">Las tablas de equivalencia aparecerán aquí una vez se realice un cálculo válido.</p>`;
        state.resultado.valorNumerico = null;
        ui.resultado.copyBtn.disabled = true;
    }

    function actualizarUIResultados(resultadoFinal, labelFinal, memoriaHTML, ea) {
        const valorMostrado = (resultadoFinal * 100).toLocaleString('en-US', {
            minimumFractionDigits: 4,
            maximumFractionDigits: 4,
            useGrouping: false
        });

        ui.resultado.valor.textContent = `${valorMostrado}%`;
        ui.resultado.label.textContent = labelFinal;
        ui.memoriaCalculo.innerHTML = memoriaHTML;
        popularTablasDeEquivalencia(ea);

        state.resultado.valorNumerico = Number(resultadoFinal).toFixed(15);
        ui.resultado.copyBtn.disabled = false;

        if (window.renderMathInElement) {
            renderMathInElement(ui.memoriaCalculo);
        }
    }

    // --- MANEJO DE EVENTOS ---

    function handleInputChange(e) {
        const { stateKey, prop } = e.target.dataset;
        if (!stateKey || !prop) return;

        const value = e.target.type === 'number' ? e.target.value : e.target.value;
        state[stateKey][prop] = value;

        // *** SOLUCIÓN AL PROBLEMA DE FOCO ***
        // Si solo cambia el valor numérico, no reconstruimos todos los inputs.
        // Solo actualizamos los cálculos.
        if (prop === 'valor') {
            realizarCalculoCompleto();
        } else {
            // Si cambia un selector (tipo, periodo, etc.), sí reconstruimos
            // los inputs para que aparezcan/desaparezcan las opciones correctas.
            if (prop === 'tipo') {
                state[stateKey].periodo = 'Anual';
                state[stateKey].cap = 'Vencida';
            }
            renderApp();
        }
    }

    function handleThemeToggle() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        ui.theme.darkIcon.classList.toggle('hidden', !isDark);
        ui.theme.lightIcon.classList.toggle('hidden', isDark);
    }

    function handleCopyClick(e) {
        const button = e.target.closest('.copy-button');
        if (!button) return;

        const valueToCopy = button.dataset.copyValue;
        if (valueToCopy) {
            copyToClipboard(valueToCopy, button);
        }
    }

    function copyToClipboard(text, buttonElement) {
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement.classList.contains('copied')) return;

            buttonElement.classList.add('copied');
            setTimeout(() => {
                buttonElement.classList.remove('copied');
            }, 1500);
        }).catch(err => {
            console.error('Error al copiar: ', err);
            // Fallback para navegadores antiguos o iframes
            try {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);

                if (buttonElement.classList.contains('copied')) return;
                buttonElement.classList.add('copied');
                setTimeout(() => {
                    buttonElement.classList.remove('copied');
                }, 1500);
            } catch (e) {
                console.error("Fallback de copiado también falló", e);
            }
        });
    }

    // --- INICIALIZACIÓN ---

    function renderApp() {
        renderInputs(ui.partidaContainer, state.partida, 'partida');
        renderInputs(ui.destinoContainer, state.destino, 'destino');
        realizarCalculoCompleto();
    }

    function init() {
        ui.partidaContainer.addEventListener('input', handleInputChange);
        ui.destinoContainer.addEventListener('input', handleInputChange);
        ui.resultado.copyBtn.addEventListener('click', () => {
            if (state.resultado.valorNumerico !== null) {
                copyToClipboard(state.resultado.valorNumerico, ui.resultado.copyBtn);
            }
        });
        ui.memoriaCalculo.addEventListener('click', handleCopyClick);
        ui.theme.toggleBtn.addEventListener('click', handleThemeToggle);

        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            ui.theme.darkIcon.classList.remove('hidden');
            ui.theme.lightIcon.classList.add('hidden');
        } else {
            ui.theme.lightIcon.classList.remove('hidden');
            ui.theme.darkIcon.classList.add('hidden');
        }

        renderApp();
    }

    init();
});
