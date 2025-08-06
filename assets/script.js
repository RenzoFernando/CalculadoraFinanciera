// Lógica para la Calculadora Financiera PRO v2

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
        flujo: {
            partida: document.getElementById('flujoPartida'),
            flecha1: document.getElementById('flujoFlecha1'),
            periodica: document.getElementById('flujoPeriodica'),
            flecha2: document.getElementById('flujoFlecha2'),
            destino: document.getElementById('flujoDestino')
        },
        memoriaCalculo: document.getElementById('memoriaCalculo')
    };

    // --- Datos de Configuración ---
    const periodosMap = {
        'Anual': 1, 'Semestral': 2, 'Cuatrimestral': 3, 'Trimestral': 4,
        'Bimestral': 6, 'Mensual': 12, 'Diaria': 360
    };

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
            memoria.push('<p>1. Se toma la <strong>Tasa Efectiva Anual (E.A.)</strong> de partida como pivote.</p>');
        } else {
            const esPeriodoCustom = (pPartida === 'Diaria' && dPartida > 0);
            const nperPartida = esPeriodoCustom ? 360 / dPartida : periodosMap[pPartida];
            const periodoTexto = esPeriodoCustom ? `${dPartida} días` : pPartida;

            let ipPartida = vPartida / (esPeriodoCustom ? 1 : nperPartida);
            memoria.push(`<p>1. Tasa periódica (${periodoTexto}): <strong>${(ipPartida * 100).toFixed(4)}%</strong>.</p>`);

            if (cPartida === 'Anticipada') {
                const ipAnticipada = ipPartida;
                ipPartida = ipPartida / (1 - ipPartida);
                memoria.push(`<p>2. Se convierte T.P. Anticipada a Vencida: <strong>${(ipPartida * 100).toFixed(4)}%</strong>.</p>`);
            } else {
                memoria.push('<p>2. La tasa periódica de partida ya es vencida.</p>');
            }

            ea = Math.pow(1 + ipPartida, nperPartida) - 1;
            memoria.push(`<p>3. Se calcula la <strong>E.A.</strong> pivote: <strong>${(ea * 100).toFixed(4)}%</strong>.</p>`);
        }

        // 3. LEER VALORES DE DESTINO Y CALCULAR RESULTADO
        const tDestino = ui.destino.tipo.value;
        const pDestino = ui.destino.periodo.value;
        const cDestino = ui.destino.cap.value;
        const dDestino = parseFloat(ui.destino.dias.value);

        let resultadoFinal = 0;
        let labelFinal = '';

        if (tDestino === 'Efectiva Anual') {
            resultadoFinal = ea;
            labelFinal = `Efectiva Anual`;
            memoria.push('<p>4. El destino es la <strong>E.A.</strong>, se muestra el valor pivote.</p>');
        } else {
            const esPeriodoCustom = (pDestino === 'Diaria' && dDestino > 0);
            const nperDestino = esPeriodoCustom ? 360 / dDestino : periodosMap[pDestino];
            const periodoTexto = esPeriodoCustom ? `${dDestino} días` : pDestino;

            let ipDestino = Math.pow(1 + ea, 1 / nperDestino) - 1;
            memoria.push(`<p>4. Se calcula T.P. Vencida de destino (${periodoTexto}): <strong>${(ipDestino * 100).toFixed(4)}%</strong>.</p>`);

            if (cDestino === 'Anticipada') {
                ipDestino = ipDestino / (1 + ipDestino);
                memoria.push(`<p>5. Se convierte T.P. Vencida a Anticipada: <strong>${(ipDestino * 100).toFixed(4)}%</strong>.</p>`);
            } else {
                memoria.push('<p>5. El destino es una tasa periódica vencida.</p>');
            }

            resultadoFinal = ipDestino * (esPeriodoCustom ? 1 : nperDestino);
            labelFinal = `Nominal ${pDestino} ${cDestino}`;
            if(esPeriodoCustom) labelFinal = `Tasa para ${dDestino} días ${cDestino}`;

            memoria.push(`<p>6. Se calcula la <strong>Tasa Final</strong> de destino: <strong>${(resultadoFinal * 100).toFixed(4)}%</strong>.</p>`);
        }

        // 4. ACTUALIZAR UI
        ui.resultado.valor.textContent = (resultadoFinal * 100).toFixed(4) + '%';
        ui.resultado.label.textContent = labelFinal;
        ui.memoriaCalculo.innerHTML = memoria.join('');
        actualizarFlujo(tPartida, tDestino);
    }

    // --- Funciones Auxiliares ---
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

    function actualizarFlujo(tPartida, tDestino) {
        ui.flujo.partida.textContent = tPartida;
        ui.flujo.flecha1.textContent = '→';
        ui.flujo.flecha2.textContent = '→';
        ui.flujo.destino.textContent = tDestino;
    }

    // --- Event Listeners ---
    Object.values(ui.partida).forEach(el => el.addEventListener('input', calcularConversion));
    Object.values(ui.destino).forEach(el => el.addEventListener('input', calcularConversion));

    // --- Inicialización ---
    calcularConversion();
});
