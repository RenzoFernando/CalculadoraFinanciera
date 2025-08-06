// Lógica para la Calculadora Financiera PRO v5

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const ui = {
        partida: {
            valor: document.getElementById('tasaPartidaValor'),
            tipo: document.getElementById('tasaPartidaTipo'),
            periodo: document.getElementById('tasaPartidaPeriodo'),
            cap: document.getElementById('tasaPartidaCap'),
            dias: document.getElementById('tasaPartidaDias'),
            diasContainer: document.getElementById('partidaDiasContainer')
        },
        destino: {
            tipo: document.getElementById('tasaDestinoTipo'),
            periodo: document.getElementById('tasaDestinoPeriodo'),
            cap: document.getElementById('tasaDestinoCap'),
            dias: document.getElementById('tasaDestinoDias'),
            diasContainer: document.getElementById('destinoDiasContainer')
        },
        resultado: {
            valor: document.getElementById('resultadoValor'),
            label: document.getElementById('resultadoLabel')
        },
        memoriaCalculo: document.getElementById('memoriaCalculo'),
        tablaPeriodicas: document.getElementById('tablaPeriodicas'),
        tablaNominales: document.getElementById('tablaNominales')
    };

    // --- Datos de Configuración ---
    const periodosMap = {
        'Anual': 1, 'Semestral': 2, 'Cuatrimestral': 3, 'Trimestral': 4,
        'Bimestral': 6, 'Mensual': 12, 'Diaria': 360
    };
    const periodosOrdenados = ['Anual', 'Semestral', 'Cuatrimestral', 'Trimestral', 'Bimestral', 'Mensual', 'Diaria'];


    // --- Lógica Principal ---
    function calcularConversion() {
        // 1. LEER VALORES DE PARTIDA
        const vPartida = parseFloat(ui.partida.valor.value) / 100;
        const tPartida = ui.partida.tipo.value;
        const pPartida = ui.partida.periodo.value;
        const cPartida = ui.partida.cap.value;
        const dPartida = parseFloat(ui.partida.dias.value);

        if (isNaN(vPartida)) {
            ui.resultado.valor.textContent = '--.--%';
            ui.resultado.label.textContent = 'Valor de tasa inválido';
            return;
        }

        actualizarVisibilidadCampos();
        let memoria = [];

        // 2. CALCULAR LA E.A. EQUIVALENTE (EL PIVOTE UNIVERSAL)
        let ea = 0;
        if (tPartida === 'Efectiva Anual') {
            ea = vPartida;
            memoria.push('<p><strong>1. Punto de Partida (Pivote):</strong> Se usa la Tasa Efectiva Anual de entrada como el pivote universal para la conversión.</p>');
        } else {
            const esPeriodoCustom = (pPartida === 'Diaria' && dPartida > 0);
            const nperPartida = esPeriodoCustom ? 360 / dPartida : periodosMap[pPartida];
            const periodoTexto = esPeriodoCustom ? `${dPartida} días` : pPartida;

            let ipPartida = vPartida / (esPeriodoCustom ? 1 : nperPartida);
            memoria.push(`<p><strong>1. Descomponer a Tasa Periódica:</strong> Se divide la tasa nominal para encontrar la tasa del ciclo (${periodoTexto}). <span class="formula">${(vPartida*100).toFixed(2)}% / ${esPeriodoCustom ? 1 : nperPartida} = ${(ipPartida * 100).toFixed(4)}%</span></p>`);

            if (cPartida === 'Anticipada') {
                const ipAnticipada = ipPartida;
                ipPartida = ipPartida / (1 - ipPartida);
                memoria.push(`<p><strong>2. Ajuste a Vencida:</strong> Se convierte la tasa periódica anticipada a su equivalente vencida para poder capitalizarla. <span class="formula">${(ipAnticipada * 100).toFixed(4)}% / (1 - ${(ipAnticipada * 100).toFixed(4)}%) = ${(ipPartida * 100).toFixed(4)}%</span></p>`);
            }

            ea = Math.pow(1 + ipPartida, nperPartida) - 1;
            memoria.push(`<p><strong>3. Capitalizar a Efectiva Anual (Pivote):</strong> Se compone la tasa periódica vencida para hallar la rentabilidad anual real (E.A.), que sirve como pivote. <span class="formula">(1 + ${(ipPartida * 100).toFixed(4)}%)^${nperPartida.toFixed(2)} - 1 = ${(ea * 100).toFixed(4)}%</span></p>`);
        }

        // 3. LEER VALORES DE DESTINO Y CALCULAR RESULTADO DIRECTO
        const tDestino = ui.destino.tipo.value;
        const pDestino = ui.destino.periodo.value;
        const cDestino = ui.destino.cap.value;
        const dDestino = parseFloat(ui.destino.dias.value);

        let resultadoFinal = 0;
        let labelFinal = '';

        if (tDestino === 'Efectiva Anual') {
            resultadoFinal = ea;
            labelFinal = `Efectiva Anual`;
            memoria.push('<p><strong>4. Resultado Final:</strong> El destino solicitado es la Tasa Efectiva Anual, por lo que se muestra el valor pivote calculado.</p>');
        } else {
            const esPeriodoCustom = (pDestino === 'Diaria' && dDestino > 0);
            const nperDestino = esPeriodoCustom ? 360 / dDestino : periodosMap[pDestino];
            const periodoTexto = esPeriodoCustom ? `${dDestino} días` : pDestino;

            let ipDestino = Math.pow(1 + ea, 1 / nperDestino) - 1;
            memoria.push(`<p><strong>4. Descomponer E.A. a Periódica Vencida:</strong> Se descompone la E.A. para encontrar la tasa periódica vencida del ciclo de destino (${periodoTexto}). <span class="formula">(1 + ${(ea * 100).toFixed(4)}%)^(1/${nperDestino.toFixed(2)}) - 1 = ${(ipDestino * 100).toFixed(4)}%</span></p>`);

            if (cDestino === 'Anticipada') {
                const ipVencida = ipDestino;
                ipDestino = ipDestino / (1 + ipDestino);
                memoria.push(`<p><strong>5. Ajuste a Anticipada:</strong> Se convierte la tasa periódica vencida a su equivalente anticipada, según lo solicitado. <span class="formula">${(ipVencida * 100).toFixed(4)}% / (1 + ${(ipVencida * 100).toFixed(4)}%) = ${(ipDestino * 100).toFixed(4)}%</span></p>`);
            }

            if (tDestino === 'Periódica') {
                resultadoFinal = ipDestino;
                labelFinal = `Periódica ${pDestino} ${cDestino}`;
                memoria.push(`<p><strong>6. Resultado Final:</strong> El destino solicitado es una Tasa Periódica, por lo que se muestra el valor calculado en el paso anterior.</p>`);
            } else { // Nominal
                resultadoFinal = ipDestino * (esPeriodoCustom ? 1 : nperDestino);
                labelFinal = `Nominal ${pDestino} ${cDestino}`;
                if(esPeriodoCustom) labelFinal = `Tasa para ${dDestino} días ${cDestino}`;
                memoria.push(`<p><strong>6. Componer a Tasa Nominal:</strong> Se multiplica la tasa periódica de destino por sus períodos para obtener la tasa nominal anual solicitada. <span class="formula">${(ipDestino * 100).toFixed(4)}% * ${esPeriodoCustom ? 1 : nperDestino} = ${(resultadoFinal * 100).toFixed(4)}%</span></p>`);
            }
        }

        // 4. ACTUALIZAR UI PRINCIPAL
        ui.resultado.valor.textContent = (resultadoFinal * 100).toFixed(4) + '%';
        ui.resultado.label.textContent = labelFinal;
        ui.memoriaCalculo.innerHTML = memoria.join('');

        // 5. POBLAR TABLAS DE EQUIVALENCIA
        popularTablasDeEquivalencia(ea);
    }

    // --- Funciones Auxiliares ---
    function popularTablasDeEquivalencia(ea) {
        ui.tablaPeriodicas.innerHTML = '';
        ui.tablaNominales.innerHTML = '';
        const formatPercent = val => (val * 100).toFixed(4) + '%';

        periodosOrdenados.forEach(p_nombre => {
            const nper = periodosMap[p_nombre];
            const ip_v = Math.pow(1 + ea, 1 / nper) - 1;
            const ip_a = ip_v / (1 + ip_v);
            const nom_v = ip_v * nper;
            const nom_a = ip_a * nper;

            const rowP = `
                <tr>
                    <td>${p_nombre}</td>
                    <td class="text-right">${formatPercent(ip_v)}</td>
                    <td class="text-right">${formatPercent(ip_a)}</td>
                </tr>`;
            ui.tablaPeriodicas.innerHTML += rowP;

            const rowN = `
                <tr>
                    <td>${p_nombre}</td>
                    <td class="text-right">${formatPercent(nom_v)}</td>
                    <td class="text-right">${formatPercent(nom_a)}</td>
                </tr>`;
            ui.tablaNominales.innerHTML += rowN;
        });
    }

    function actualizarVisibilidadCampos() {
        const esPartidaEA = ui.partida.tipo.value === 'Efectiva Anual';
        ui.partida.periodo.disabled = esPartidaEA;
        ui.partida.cap.disabled = esPartidaEA;
        ui.partida.diasContainer.classList.toggle('hidden', ui.partida.periodo.value !== 'Diaria' || esPartidaEA);

        const esDestinoEA = ui.destino.tipo.value === 'Efectiva Anual';
        ui.destino.periodo.disabled = esDestinoEA;
        ui.destino.cap.disabled = esDestinoEA;
        ui.destino.diasContainer.classList.toggle('hidden', ui.destino.periodo.value !== 'Diaria' || esDestinoEA);
    }

    // --- Event Listeners ---
    Object.values(ui.partida).forEach(el => el.addEventListener('input', calcularConversion));
    Object.values(ui.destino).forEach(el => el.addEventListener('input', calcularConversion));

    // --- Inicialización ---
    calcularConversion();
});
