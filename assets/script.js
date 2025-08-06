// Lógica para la Calculadora Financiera PRO

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const partida = {
        valor: document.getElementById('tasaPartidaValor'),
        tipo: document.getElementById('tasaPartidaTipo'),
        periodo: document.getElementById('tasaPartidaPeriodo'),
        cap: document.getElementById('tasaPartidaCap')
    };
    const destino = {
        tipo: document.getElementById('tasaDestinoTipo'),
        periodo: document.getElementById('tasaDestinoPeriodo'),
        cap: document.getElementById('tasaDestinoCap')
    };
    const resultado = {
        valor: document.getElementById('resultadoValor'),
        label: document.getElementById('resultadoLabel')
    };
    const flujo = {
        partida: document.getElementById('flujoPartida'),
        flecha1: document.getElementById('flujoFlecha1'),
        periodica: document.getElementById('flujoPeriodica'),
        flecha2: document.getElementById('flujoFlecha2'),
        destino: document.getElementById('flujoDestino')
    };
    const memoriaCalculo = document.getElementById('memoriaCalculo');

    // --- Datos de configuración ---
    const periodosMap = {
        'Anual': 1, 'Semestral': 2, 'Cuatrimestral': 3, 'Trimestral': 4,
        'Bimestral': 6, 'Mensual': 12, 'Diaria': 360
    };

    // --- Lógica de cálculo ---
    function calcularConversion() {
        // 1. LEER VALORES DE PARTIDA
        const vPartida = parseFloat(partida.valor.value) / 100;
        const tPartida = partida.tipo.value;
        const pPartida = partida.periodo.value;
        const cPartida = partida.cap.value;

        if (isNaN(vPartida)) return;

        // Ajustar UI si es E.A.
        partida.periodo.disabled = (tPartida === 'Efectiva Anual');
        partida.cap.disabled = (tPartida === 'Efectiva Anual');

        // 2. CALCULAR LA E.A. EQUIVALENTE (EL PIVOTE UNIVERSAL)
        let ea = 0;
        let memoria = [];
        if (tPartida === 'Efectiva Anual') {
            ea = vPartida;
            memoria.push('<p>1. Se toma la <strong>Tasa Efectiva Anual (E.A.)</strong> de partida como pivote.</p>');
        } else {
            const nperPartida = periodosMap[pPartida];
            let ipPartida = vPartida / nperPartida;
            memoria.push(`<p>1. Se calcula la tasa periódica de partida: ${vPartida * 100}% / ${nperPartida} = <strong>${(ipPartida * 100).toFixed(4)}%</strong>.</p>`);

            if (cPartida === 'Anticipada') {
                const ipAnticipada = ipPartida;
                ipPartida = ipPartida / (1 - ipPartida);
                memoria.push(`<p>2. Se convierte la tasa periódica anticipada a vencida: ${(ipAnticipada * 100).toFixed(4)}% / (1 - ${(ipAnticipada * 100).toFixed(4)}%) = <strong>${(ipPartida * 100).toFixed(4)}%</strong>.</p>`);
            } else {
                memoria.push('<p>2. La tasa periódica de partida ya es vencida.</p>');
            }

            ea = Math.pow(1 + ipPartida, nperPartida) - 1;
            memoria.push(`<p>3. Se calcula la <strong>E.A.</strong> equivalente: (1 + ${(ipPartida * 100).toFixed(4)}%)^${nperPartida} - 1 = <strong>${(ea * 100).toFixed(4)}%</strong>.</p>`);
        }

        // 3. LEER VALORES DE DESTINO Y CALCULAR RESULTADO
        const tDestino = destino.tipo.value;
        const pDestino = destino.periodo.value;
        const cDestino = destino.cap.value;

        destino.periodo.disabled = (tDestino === 'Efectiva Anual');
        destino.cap.disabled = (tDestino === 'Efectiva Anual');

        let resultadoFinal = 0;
        let labelFinal = '';

        if (tDestino === 'Efectiva Anual') {
            resultadoFinal = ea;
            labelFinal = `Efectiva Anual`;
            memoria.push('<p>4. El destino es la <strong>E.A.</strong>, por lo que se muestra el valor pivote.</p>');
        } else {
            const nperDestino = periodosMap[pDestino];
            let ipDestino = Math.pow(1 + ea, 1 / nperDestino) - 1;
            memoria.push(`<p>4. Se calcula la tasa periódica vencida de destino desde la E.A.: (1 + ${(ea * 100).toFixed(4)}%)^(1/${nperDestino}) - 1 = <strong>${(ipDestino * 100).toFixed(4)}%</strong>.</p>`);

            if (cDestino === 'Anticipada') {
                const ipVencida = ipDestino;
                ipDestino = ipDestino / (1 + ipDestino);
                memoria.push(`<p>5. Se convierte la tasa periódica vencida a anticipada: ${(ipVencida * 100).toFixed(4)}% / (1 + ${(ipVencida * 100).toFixed(4)}%) = <strong>${(ipDestino * 100).toFixed(4)}%</strong>.</p>`);
            } else {
                memoria.push('<p>5. El destino es una tasa periódica vencida.</p>');
            }

            resultadoFinal = ipDestino * nperDestino;
            labelFinal = `Nominal ${pDestino} ${cDestino}`;
            memoria.push(`<p>6. Se calcula la <strong>Tasa Nominal</strong> de destino: ${(ipDestino * 100).toFixed(4)}% * ${nperDestino} = <strong>${(resultadoFinal * 100).toFixed(4)}%</strong>.</p>`);
        }

        // 4. ACTUALIZAR UI
        resultado.valor.textContent = (resultadoFinal * 100).toFixed(4) + '%';
        resultado.label.textContent = labelFinal;
        memoriaCalculo.innerHTML = memoria.join('');
        actualizarFlujo(tPartida, tDestino);
    }

    function actualizarFlujo(tPartida, tDestino) {
        flujo.partida.textContent = tPartida === 'Efectiva Anual' ? 'E.A. Partida' : 'Nominal Partida';
        flujo.periodica.textContent = 'Periódica Vencida';
        flujo.destino.textContent = tDestino === 'Efectiva Anual' ? 'E.A. Destino' : 'Nominal Destino';

        if (tPartida === 'Nominal') {
            flujo.flecha1.textContent = '÷';
            flujo.flecha2.textContent = '^';
        } else { // EA
            flujo.flecha1.textContent = '->';
            flujo.flecha2.textContent = '->';
        }
    }

    // --- Event Listeners ---
    Object.values(partida).forEach(el => el.addEventListener('input', calcularConversion));
    Object.values(destino).forEach(el => el.addEventListener('input', calcularConversion));

    // --- Cálculo inicial ---
    calcularConversion();
});
