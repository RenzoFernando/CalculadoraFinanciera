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
    // Centralizamos todos los valores de los inputs en un solo objeto.
    // La UI será un reflejo de este estado.
    const state = {
        partida: {
            valor: 28,
            tipo: 'Nominal',
            periodo: 'Trimestral',
            cap: 'Vencida',
        },
        destino: {
            tipo: 'Efectiva Anual',
            periodo: 'Anual',
            cap: 'Vencida',
        }
    };

    // --- ELEMENTOS DEL DOM ---
    const ui = {
        partidaContainer: document.getElementById('partida-inputs-container'),
        destinoContainer: document.getElementById('destino-inputs-container'),
        resultado: {
            valor: document.getElementById('resultadoValor'),
            label: document.getElementById('resultadoLabel')
        },
        memoriaCalculo: document.getElementById('memoriaCalculo'),
        tablaPeriodicas: document.getElementById('tablaPeriodicas'),
        tablaNominales: document.getElementById('tablaNominales'),
        theme: {
            toggleBtn: document.getElementById('theme-toggle'),
            darkIcon: document.getElementById('theme-toggle-dark-icon'),
            lightIcon: document.getElementById('theme-toggle-light-icon')
        }
    };

    // --- LÓGICA DE RENDERIZADO (UI) ---

    /**
     * Crea y renderiza los inputs para una sección (partida o destino)
     * basándose en el estado actual. Esto resuelve el problema de ocultar
     * campos innecesarios, ya que directamente no se crean en el DOM.
     * @param {HTMLElement} container - El div contenedor para los inputs.
     * @param {object} config - El objeto de estado para esta sección (state.partida o state.destino).
     * @param {string} stateKey - La clave del estado ('partida' o 'destino').
     */
    function renderInputs(container, config, stateKey) {
        container.innerHTML = ''; // Limpia los inputs anteriores

        // 1. Input para el Valor de la Tasa (solo para 'partida')
        if (stateKey === 'partida') {
            container.appendChild(createInputGroup('valor', 'Valor de la Tasa (%)', 'number', config.valor, stateKey));
        }

        // 2. Selector para el Tipo de Tasa
        const tiposTasa = (stateKey === 'partida')
            ? ['Nominal', 'Efectiva Anual']
            : ['Efectiva Anual', 'Nominal', 'Periódica'];
        container.appendChild(createInputGroup('tipo', 'Tipo de Tasa', 'select', config.tipo, stateKey, tiposTasa));

        // 3. Inputs condicionales que dependen del Tipo de Tasa
        if (config.tipo !== 'Efectiva Anual') {
            // Selector de Periodo de Capitalización
            container.appendChild(createInputGroup('periodo', 'Periodo de Capitalización', 'select', config.periodo, stateKey, PERIODOS_ORDENADOS));

            // Selector de Forma de Pago (Capitalización)
            container.appendChild(createInputGroup('cap', 'Forma de Pago', 'select', config.cap, stateKey, ['Vencida', 'Anticipada']));
        }
    }

    /**
     * Función ayudante para crear un grupo de input (label + input/select).
     * @returns {HTMLElement} - El div del grupo de input.
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
                if (opt === value) {
                    option.selected = true;
                }
                field.appendChild(option);
            });
        } else {
            field = document.createElement('input');
            field.type = type;
            field.value = value;
            if (type === 'number') field.step = 'any';
        }

        field.id = `${stateKey}-${id}`;
        field.className = 'input-field';
        field.dataset.stateKey = stateKey;
        field.dataset.prop = id;
        group.appendChild(field);

        return group;
    }

    // --- LÓGICA DE CÁLCULO ---

    /**
     * Función principal que orquesta todo el cálculo y la actualización de la UI.
     */
    function realizarCalculoCompleto() {
        const vPartida = parseFloat(state.partida.valor) / 100;
        if (isNaN(vPartida) || vPartida < 0) {
            actualizarUIError('El valor de la tasa de partida debe ser un número positivo.');
            return;
        }

        let memoria = [];
        // 1. Convertir la tasa de partida a una Tasa Efectiva Anual (EA), que es nuestro pivote.
        const ea = calcularEAPivote(vPartida, state.partida, memoria);

        if (isNaN(ea)) {
            actualizarUIError('Cálculo inválido. Revise la tasa de partida (una tasa anticipada no puede ser >= 100%).');
            return;
        }

        // 2. Convertir la EA pivote a la tasa de destino solicitada.
        const { resultadoFinal, labelFinal } = calcularResultadoDestino(ea, state.destino, memoria);

        // 3. Actualizar la interfaz con los resultados.
        actualizarUIResultados(resultadoFinal, labelFinal, memoria, ea);
    }

    /**
     * Convierte cualquier tasa de entrada a su Tasa Efectiva Anual (EA) equivalente.
     * @returns {number} La tasa EA calculada.
     */
    function calcularEAPivote(valor, config, memoria) {
        if (config.tipo === 'Efectiva Anual') {
            memoria.push(`<p><strong>1. Tasa Pivote (E.A.):</strong> La tasa de partida ya es Efectiva Anual, se usa directamente como pivote.</p>`);
            return valor;
        }

        const nper = PERIODOS_MAP[config.periodo].nper;
        let ip = valor / nper; // Tasa periódica

        memoria.push(`<p><strong>1. Calcular Tasa Periódica:</strong> Se divide la tasa nominal por el número de periodos para hallar la tasa del ciclo.</p>
        <div class="formula-wrapper">$$ i_p = \\frac{${(valor * 100).toFixed(2)}\\%}{${nper}} = ${(ip * 100).toFixed(5)}\\% $$</div>`);

        if (config.cap === 'Anticipada') {
            const ipAnticipada = ip;
            ip = ip / (1 - ip); // Convertir a periódica vencida
            memoria.push(`<p><strong>2. Convertir a Periódica Vencida:</strong> La tasa es anticipada, se convierte a su equivalente vencida para poder capitalizar.</p>
            <div class="formula-wrapper">$$ i_{p,v} = \\frac{i_{p,a}}{1 - i_{p,a}} = \\frac{${(ipAnticipada * 100).toFixed(5)}\\%}{1 - ${(ipAnticipada * 100).toFixed(5)}\\%} = ${(ip * 100).toFixed(5)}\\% $$</div>`);
        }

        const ea = Math.pow(1 + ip, nper) - 1;
        memoria.push(`<p><strong>${config.cap === 'Anticipada' ? '3' : '2'}. Capitalizar a Efectiva Anual (Pivote):</strong> Se compone la tasa periódica vencida para hallar la rentabilidad anual real (E.A.).</p>
        <div class="formula-wrapper">$$ E.A. = (1 + i_{p,v})^{nper} - 1 = (1 + ${(ip * 100).toFixed(5)}\\%)^{${nper}} - 1 = ${(ea * 100).toFixed(5)}\\% $$</div>`);

        return ea;
    }

    /**
     * Convierte la tasa EA pivote a la tasa de destino deseada.
     * @returns {object} Objeto con el resultado final y su etiqueta.
     */
    function calcularResultadoDestino(ea, config, memoria) {
        const pasoInicial = memoria.length + 1;
        if (config.tipo === 'Efectiva Anual') {
            memoria.push(`<p><strong>${pasoInicial}. Resultado Final:</strong> Se solicita la Tasa Efectiva Anual, que es nuestro valor pivote.</p>`);
            return { resultadoFinal: ea, labelFinal: 'Efectiva Anual' };
        }

        const nper = PERIODOS_MAP[config.periodo].nper;
        let ip = Math.pow(1 + ea, 1 / nper) - 1; // Tasa periódica vencida

        memoria.push(`<p><strong>${pasoInicial}. Descomponer E.A. a Periódica Vencida:</strong> Se descompone la E.A. para encontrar la tasa del ciclo de destino. El resultado siempre es una tasa vencida.</p>
        <div class="formula-wrapper">$$ i_{p,v} = (1 + E.A.)^{\\frac{1}{nper}} - 1 = (1 + ${(ea * 100).toFixed(5)}\\%)^{ \\frac{1}{${nper}}} - 1 = ${(ip * 100).toFixed(5)}\\% $$</div>`);

        if (config.cap === 'Anticipada') {
            const ipVencida = ip;
            ip = ip / (1 + ip); // Convertir a periódica anticipada
            memoria.push(`<p><strong>${pasoInicial + 1}. Convertir a Periódica Anticipada:</strong> Se convierte la tasa periódica vencida a su equivalente anticipada, según lo solicitado.</p>
            <div class="formula-wrapper">$$ i_{p,a} = \\frac{i_{p,v}}{1 + i_{p,v}} = \\frac{${(ipVencida * 100).toFixed(5)}\\%}{1 + ${(ipVencida * 100).toFixed(5)}\\%} = ${(ip * 100).toFixed(5)}\\% $$</div>`);
        }

        if (config.tipo === 'Periódica') {
            memoria.push(`<p><strong>${memoria.length}. Resultado Final:</strong> La tasa solicitada es periódica.</p>`);
            return {
                resultadoFinal: ip,
                labelFinal: `Periódica ${config.periodo} ${config.cap}`
            };
        } else { // Nominal
            const resultadoFinal = ip * nper;
            memoria.push(`<p><strong>${memoria.length}. Componer a Tasa Nominal:</strong> Se multiplica la tasa periódica por el número de periodos para obtener la tasa nominal anual.</p>
            <div class="formula-wrapper">$$ Nominal = i_p \\times nper = ${(ip * 100).toFixed(5)}\\% \\times ${nper} = ${(resultadoFinal * 100).toFixed(5)}\\% $$</div>`);
            return {
                resultadoFinal,
                labelFinal: `Nominal ${config.periodo} ${config.cap}`
            };
        }
    }

    /**
     * Rellena las tablas de equivalencia a partir de una tasa EA.
     */
    function popularTablasDeEquivalencia(ea) {
        ui.tablaPeriodicas.innerHTML = '';
        ui.tablaNominales.innerHTML = '';
        const formatPercent = val => (val * 100).toFixed(4) + '%';

        PERIODOS_ORDENADOS.forEach(p_nombre => {
            const nper = PERIODOS_MAP[p_nombre].nper;
            const ip_v = Math.pow(1 + ea, 1 / nper) - 1;
            const ip_a = ip_v / (1 + ip_v);
            const nom_v = ip_v * nper;
            const nom_a = ip_a * nper;

            ui.tablaPeriodicas.innerHTML += `<tr><td>${p_nombre}</td><td>${formatPercent(ip_v)}</td><td>${formatPercent(ip_a)}</td></tr>`;
            ui.tablaNominales.innerHTML += `<tr><td>${p_nombre}</td><td>${formatPercent(nom_v)}</td><td>${formatPercent(nom_a)}</td></tr>`;
        });
    }

    // --- FUNCIONES DE ACTUALIZACIÓN DE UI ---

    function actualizarUIError(mensaje) {
        ui.resultado.valor.textContent = 'Error';
        ui.resultado.label.textContent = 'Cálculo inválido';
        ui.memoriaCalculo.innerHTML = `<p class="placeholder-text">${mensaje}</p>`;
        ui.tablaPeriodicas.innerHTML = '';
        ui.tablaNominales.innerHTML = '';
    }

    function actualizarUIResultados(resultadoFinal, labelFinal, memoria, ea) {
        ui.resultado.valor.textContent = (resultadoFinal * 100).toFixed(5) + '%';
        ui.resultado.label.textContent = labelFinal;
        ui.memoriaCalculo.innerHTML = memoria.join('');
        popularTablasDeEquivalencia(ea);
        // Re-renderizar las fórmulas matemáticas con KaTeX
        if (window.renderMathInElement) {
            renderMathInElement(ui.memoriaCalculo);
        }
    }

    // --- MANEJO DE EVENTOS ---

    /**
     * Manejador de eventos central para todos los inputs.
     * Actualiza el estado y vuelve a renderizar la app.
     */
    function handleInputChange(e) {
        const { stateKey, prop } = e.target.dataset;
        if (stateKey && prop) {
            const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
            state[stateKey][prop] = value;

            // Si se cambia el tipo, resetear opciones dependientes a valores por defecto
            if (prop === 'tipo') {
                state[stateKey].periodo = 'Anual';
                state[stateKey].cap = 'Vencida';
            }

            // Vuelve a renderizar los inputs y recalcular todo
            renderApp();
        }
    }

    function handleThemeToggle() {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        ui.theme.darkIcon.classList.toggle('hidden', !isDark);
        ui.theme.lightIcon.classList.toggle('hidden', isDark);
    }

    // --- INICIALIZACIÓN ---

    /**
     * Función que renderiza la aplicación completa. Se llama al inicio y
     * cada vez que hay un cambio en el estado.
     */
    function renderApp() {
        renderInputs(ui.partidaContainer, state.partida, 'partida');
        renderInputs(ui.destinoContainer, state.destino, 'destino');
        realizarCalculoCompleto();
    }

    function init() {
        // Asignar manejadores de eventos a los contenedores padres
        ui.partidaContainer.addEventListener('input', handleInputChange);
        ui.destinoContainer.addEventListener('input', handleInputChange);
        ui.theme.toggleBtn.addEventListener('click', handleThemeToggle);

        // Cargar tema guardado
        if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            ui.theme.darkIcon.classList.remove('hidden');
            ui.theme.lightIcon.classList.add('hidden');
        } else {
            ui.theme.lightIcon.classList.remove('hidden');
            ui.theme.darkIcon.classList.add('hidden');
        }

        // Renderizar la aplicación por primera vez
        renderApp();
    }

    init();
});