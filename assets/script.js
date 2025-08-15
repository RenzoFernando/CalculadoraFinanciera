// RENZO FERNANDO MOSQUERA DAZA - Versión Final Corregida y Mejorada
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

    // --- ESTADO INICIAL DE LA APLICACIÓN ---
    const state = {
        partida: {
            valor: '', // Inicia vacío para que el usuario ingrese el valor.
            tipo: 'Nominal',
            periodo: 'Trimestral',
            modalidad: 'Vencida',
        },
        destino: {
            tipo: 'Efectiva Anual',
            periodo: 'Anual',
            modalidad: 'Vencida',
        },
        resultado: {
            valorNumerico: null
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

    function renderInputs(container, config, stateKey) {
        container.innerHTML = '';

        if (stateKey === 'partida') {
            container.appendChild(createInputGroup('valor', 'Valor de la Tasa (%)', 'text', config.valor, stateKey)); // Cambiado a 'text' para mejor manejo de comas/puntos
        }

        const tiposTasa = (stateKey === 'partida')
            ? ['Periódica', 'Nominal', 'Efectiva Anual']
            : ['Efectiva Anual', 'Nominal', 'Periódica'];
        container.appendChild(createInputGroup('tipo', 'Tipo de Tasa', 'select', config.tipo, stateKey, tiposTasa));

        if (config.tipo !== 'Efectiva Anual') {
            container.appendChild(createInputGroup('periodo', 'Periodo de la Tasa', 'select', config.periodo, stateKey, PERIODOS_ORDENADOS));
            container.appendChild(createInputGroup('modalidad', 'Modalidad de Pago', 'select', config.modalidad, stateKey, ['Vencida', 'Anticipada']));
        }
    }

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
            if (type === 'text') { // Para el input de valor
                field.inputMode = 'decimal'; // Mejora la experiencia en móviles
                field.placeholder = 'Ej: 8.5 o 8,5';
            }
            field.value = value;
        }
        field.id = `${stateKey}-${id}`;
        field.className = 'input-field';
        field.dataset.stateKey = stateKey;
        field.dataset.prop = id;
        group.appendChild(field);
        return group;
    }

    // --- LÓGICA DE CÁLCULO (NÚCLEO CORREGIDO) ---

    function realizarCalculoCompleto() {
        // Normaliza el valor reemplazando la coma por el punto para un parsing universal
        const valorNormalizado = String(state.partida.valor).replace(',', '.');
        const valorPartida = parseFloat(valorNormalizado);

        if (isNaN(valorPartida) || valorPartida <= 0) {
            resetUI('Ingresa un valor de tasa positivo para empezar.');
            return;
        }
        const memoria = [];
        const tasaPartidaDecimal = valorPartida / 100;
        const tea = convertirAPivoteTEA(tasaPartidaDecimal, state.partida, memoria);
        if (isNaN(tea) || !isFinite(tea)) {
            actualizarUIError('Cálculo inválido. Una tasa periódica anticipada no puede ser igual o mayor al 100%.');
            return;
        }
        const { resultadoFinal, labelFinal } = convertirDesdePivoteTEA(tea, state.destino, memoria);
        actualizarUIResultados(resultadoFinal, labelFinal, memoria.join(''), tea);
    }

    function convertirAPivoteTEA(valor, config, memoria) {
        if (config.tipo === 'Efectiva Anual') {
            memoria.push(generarPasoMemoria('1. Tasa Pivote (E.A.)', 'La tasa de partida ya es Efectiva Anual.', `E.A. = ${(valor * 100).toFixed(8)}\\%`, valor));
            return valor;
        }

        const nper = PERIODOS_MAP[config.periodo].nper;
        let ip; // Tasa periódica vencida

        if (config.tipo === 'Periódica') {
            ip = valor;
            memoria.push(generarPasoMemoria('1. Tasa Periódica de Partida', 'La tasa de partida es una tasa periódica y se usa directamente.', `i_p = ${(ip * 100).toFixed(10)}\\%`, ip));
        } else { // Nominal
            ip = valor / nper;
            memoria.push(generarPasoMemoria('1. Calcular Tasa Periódica', 'Se divide la tasa nominal por el número de periodos.', `i_p = \\frac{J}{m} = \\frac{${(valor * 100).toFixed(6)}\\%}{${nper}} = ${(ip * 100).toFixed(10)}\\%`, ip));
        }

        if (config.modalidad === 'Anticipada') {
            const ipAnticipada = ip;
            if (ipAnticipada >= 1) return NaN;
            ip = ipAnticipada / (1 - ipAnticipada);
            memoria.push(generarPasoMemoria('2. Convertir a Periódica Vencida', 'Se convierte la tasa periódica anticipada a su equivalente vencida.', `i_{p,v} = \\frac{i_{p,a}}{1 - i_{p,a}} = \\frac{${(ipAnticipada * 100).toFixed(10)}\\%}{1 - ${ipAnticipada.toFixed(10)}} = ${(ip * 100).toFixed(10)}\\%`, ip));
        }

        const ea = Math.pow(1 + ip, nper) - 1;
        memoria.push(generarPasoMemoria(`${config.modalidad === 'Anticipada' ? '3' : '2'}. Capitalizar a Efectiva Anual`, 'Se compone la tasa periódica vencida para hallar la E.A. pivote.', `E.A. = (1 + i_{p,v})^{m} - 1 = (1 + ${ip.toFixed(10)})^{${nper}} - 1 = ${(ea * 100).toFixed(10)}\\%`, ea));
        return ea;
    }

    function convertirDesdePivoteTEA(tea, config, memoria) {
        const pasoInicial = memoria.length + 1;
        if (config.tipo === 'Efectiva Anual') {
            return { resultadoFinal: tea, labelFinal: 'Efectiva Anual' };
        }

        const nper = PERIODOS_MAP[config.periodo].nper;
        let ip = Math.pow(1 + tea, 1 / nper) - 1;

        memoria.push(generarPasoMemoria(`${pasoInicial}. Descomponer E.A. a Periódica Vencida`, 'Se halla la tasa periódica vencida equivalente para el periodo de destino.', `i_{p,v} = (1 + E.A.)^{\\frac{1}{m}} - 1 = (1 + ${tea.toFixed(10)})^{ \\frac{1}{${nper}}} - 1 = ${(ip * 100).toFixed(10)}\\%`, ip));

        if (config.tipo === 'Periódica') {
            if (config.modalidad === 'Anticipada') {
                const ipVencida = ip;
                ip = ipVencida / (1 + ipVencida);
                memoria.push(generarPasoMemoria(`${pasoInicial + 1}. Convertir a Periódica Anticipada`, 'Se convierte la tasa periódica vencida a su equivalente anticipada.', `i_{p,a} = \\frac{i_{p,v}}{1 + i_{p,v}} = \\frac{${(ipVencida * 100).toFixed(10)}\\%}{1 + ${ipVencida.toFixed(10)}} = ${(ip * 100).toFixed(10)}\\%`, ip));
            }
            return { resultadoFinal: ip, labelFinal: `Periódica ${config.periodo} ${config.modalidad}` };
        }

        if (config.tipo === 'Nominal') {
            let ipFinal = ip;
            if (config.modalidad === 'Anticipada') {
                const ipVencida = ip;
                ipFinal = ipVencida / (1 + ipVencida);
                memoria.push(generarPasoMemoria(`${pasoInicial + 1}. Convertir a Periódica Anticipada`, 'Para hallar la nominal anticipada, primero se calcula la periódica anticipada.', `i_{p,a} = \\frac{i_{p,v}}{1 + i_{p,v}} = \\frac{${(ipVencida * 100).toFixed(10)}\\%}{1 + ${ipVencida.toFixed(10)}} = ${(ipFinal * 100).toFixed(10)}\\%`, ipFinal));
            }
            const resultadoFinal = ipFinal * nper;
            memoria.push(generarPasoMemoria(`${memoria.length + 1}. Componer a Tasa Nominal`, 'Se multiplica la tasa periódica final por el número de periodos.', `J = i_p \\times m = ${(ipFinal * 100).toFixed(10)}\\% \\times ${nper} = ${(resultadoFinal * 100).toFixed(10)}\\%`, resultadoFinal));
            return { resultadoFinal, labelFinal: `Nominal ${config.periodo} ${config.modalidad}` };
        }
    }

    function generarPasoMemoria(titulo, descripcion, formula, valorNumerico) {
        let formulaHtml = '';
        if (formula) {
            const valorACopiar = Number(valorNumerico).toFixed(15);
            const botonCopiarHtml = `<button class="copy-button-inline copy-button" title="Copiar valor numérico" data-copy-value="${valorACopiar}"><svg class="copy-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><svg class="check-icon hidden" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></button>`;
            formulaHtml = `<div class="formula-wrapper"><span class="katex-container">$$ ${formula} $$</span>${botonCopiarHtml}</div>`;
        }
        return `<div class="memory-step"><p><strong>${titulo}:</strong> ${descripcion}</p>${formulaHtml}</div>`;
    }

    function popularTablasDeEquivalencia(ea) {
        const formatPercent = val => (val * 100).toFixed(8) + '%'; // Aumentada la precisión aquí
        let periodicasHTML = '', nominalesHTML = '';
        PERIODOS_ORDENADOS.forEach(p_nombre => {
            const nper = PERIODOS_MAP[p_nombre].nper;
            const ip_v = Math.pow(1 + ea, 1 / nper) - 1;
            const ip_a = ip_v / (1 + ip_v);
            const nom_v = ip_v * nper;
            const nom_a = ip_a * nper;
            periodicasHTML += `<tr><td>${p_nombre}</td><td>${formatPercent(ip_v)}</td><td>${formatPercent(ip_a)}</td></tr>`;
            nominalesHTML += `<tr><td>${p_nombre}</td><td>${formatPercent(nom_v)}</td><td>${formatPercent(nom_a)}</td></tr>`;
        });
        ui.equivalencyContainer.innerHTML = `<div><h3 class="sub-title">Tasas Periódicas Equivalentes</h3><table class="equivalency-table"><thead><tr><th>Periodo</th><th>Tasa Vencida (iₚ)</th><th>Tasa Anticipada (iₐ)</th></tr></thead><tbody>${periodicasHTML}</tbody></table></div><div><h3 class="sub-title">Tasas Nominales Anuales Equivalentes</h3><table class="equivalency-table"><thead><tr><th>Periodo</th><th>Nominal Vencida (J)</th><th>Nominal Anticipada (J)</th></tr></thead><tbody>${nominalesHTML}</tbody></table></div>`;
    }

    // --- FUNCIONES DE ACTUALIZACIÓN DE UI ---
    function resetUI(memoriaPlaceholder) {
        ui.resultado.valor.textContent = '--.--%';
        ui.resultado.label.textContent = 'Esperando cálculo...';
        ui.memoriaCalculo.innerHTML = `<p class="placeholder-text">${memoriaPlaceholder}</p>`;
        ui.equivalencyContainer.innerHTML = `<p class="placeholder-text-table">Las tablas de equivalencia aparecerán aquí.</p>`;
        state.resultado.valorNumerico = null;
        ui.resultado.copyBtn.disabled = true;
    }

    function actualizarUIError(mensaje) {
        ui.resultado.valor.textContent = 'Error';
        ui.resultado.label.textContent = 'Cálculo inválido';
        ui.memoriaCalculo.innerHTML = `<p class="placeholder-text error-text">${mensaje}</p>`;
        ui.equivalencyContainer.innerHTML = `<p class="placeholder-text-table">Cálculo inválido.</p>`;
        state.resultado.valorNumerico = null;
        ui.resultado.copyBtn.disabled = true;
    }

    function actualizarUIResultados(resultadoFinal, labelFinal, memoriaHTML, ea) {
        // Aumentada la precisión del resultado principal a 10 decimales
        const valorMostrado = (resultadoFinal * 100).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 10 });
        ui.resultado.valor.textContent = `${valorMostrado}%`;
        ui.resultado.label.textContent = labelFinal;
        ui.memoriaCalculo.innerHTML = memoriaHTML;
        popularTablasDeEquivalencia(ea);
        state.resultado.valorNumerico = (resultadoFinal).toFixed(15);
        ui.resultado.copyBtn.disabled = false;
        if (window.renderMathInElement) {
            renderMathInElement(ui.memoriaCalculo, { delimiters: [{ left: "$$", right: "$$", display: true }] });
        }
    }

    // --- MANEJO DE EVENTOS ---
    function handleInputChange(e) {
        const { stateKey, prop } = e.target.dataset;
        if (!stateKey || !prop) return;

        state[stateKey][prop] = e.target.value;

        if (e.target.tagName === 'SELECT') {
            if (prop === 'tipo') {
                if (state[stateKey].tipo === 'Efectiva Anual') {
                    state[stateKey].periodo = 'Anual';
                    state[stateKey].modalidad = 'Vencida';
                } else {
                    if (state[stateKey].periodo === 'Anual') {
                        state[stateKey].periodo = 'Semestral';
                    }
                }
            }
            renderApp();
        } else {
            realizarCalculoCompleto();
        }
    }


    function handleThemeToggle() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        ui.theme.darkIcon.classList.toggle('hidden', !isDark);
        ui.theme.lightIcon.classList.toggle('hidden', isDark);
    }

    function copyToClipboard(text, buttonElement) {
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
            setTimeout(() => buttonElement.classList.remove('copied'), 1500);
        } catch (err) { console.error('Error al copiar: ', err); }
    }

    // --- INICIALIZACIÓN ---
    function renderApp() {
        const focusedElementId = document.activeElement.id;
        const focusedElementSelectionStart = document.activeElement.selectionStart;

        renderInputs(ui.partidaContainer, state.partida, 'partida');
        renderInputs(ui.destinoContainer, state.destino, 'destino');
        realizarCalculoCompleto();

        if (focusedElementId && document.getElementById(focusedElementId)) {
            const elementToFocus = document.getElementById(focusedElementId);
            elementToFocus.focus();
            if (elementToFocus.selectionStart !== undefined) {
                elementToFocus.selectionStart = focusedElementSelectionStart;
                elementToFocus.selectionEnd = focusedElementSelectionStart;
            }
        }
    }

    function init() {
        document.body.addEventListener('input', handleInputChange);

        ui.resultado.copyBtn.addEventListener('click', () => {
            if (state.resultado.valorNumerico !== null) copyToClipboard(state.resultado.valorNumerico, ui.resultado.copyBtn);
        });
        ui.memoriaCalculo.addEventListener('click', e => {
            const button = e.target.closest('.copy-button');
            if (button && button.dataset.copyValue) copyToClipboard(button.dataset.copyValue, button);
        });
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
