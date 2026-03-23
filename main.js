window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {
    // Nuevos IDs para camiones (Eje 1 y Eje 2 con ruedas gemelas)
    const diagIds = {
        E1_Izq: "aWh7GmzEY20aZA3C4KSBZuA", // Eje 1 Neumático 2
        E1_Der: "ammSx3EpAVEWFRA4yst8hGA", // Eje 1 Neumático 3
        E2_ExtIzq: "a5OQtfETMnEeVAms6MINtMQ", // Eje 2 Neumático 1
        E2_IntIzq: "aYT21qD9lUkydm5SNLVP2Kw", // Eje 2 Neumático 2
        E2_IntDer: "aqnMOJwje1kmfBOwBqj0zLQ", // Eje 2 Neumático 3
        E2_ExtDer: "aDHfNLzHx0USy7isxSHgT1Q"  // Eje 2 Neumático 4
    };

    // Lógica adaptada a presiones de camión (Ej: Óptimo 7.5 - 9.0 Bar)
    function calculateStatus(val, sideVal) {
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, msg: "" }; 
        const bar = val / 100000;
        let weight = 1, color = "#20bf6b", msg = "";

        // Umbrales para vehículos pesados
        if (bar < 7.0 || bar > 9.5) { weight = 3; color = "#eb3b5a"; } 
        else if (bar < 7.5 || bar > 9.0) { weight = 2; color = "#f7b731"; }

        // Diferencia de presión (ideal para detectar un neumático pinchado en ruedas gemelas)
        if (sideVal && sideVal > 0 && Math.abs((val - sideVal) / sideVal) > 0.05) {
            weight = 3; color = "#eb3b5a"; msg = "Descompensación en eje > 5%";
        }
        return { color, weight, msg };
    }

    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const legendHtml = `
            <div style="background: white; border-radius: 8px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); font-family: sans-serif; font-size: 13px; color: #2d3436; border-left: 4px solid #0984e3;">
                <strong style="display: block; margin-bottom: 10px; font-size: 14px;">Leyenda de Alertas Camiones (Datos última semana):</strong>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #20bf6b; border-radius: 4px;"></div> Óptimo (7.5 - 9.0 Bar)</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #f7b731; border-radius: 4px;"></div> Aviso Leve</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #eb3b5a; border-radius: 4px;"></div> Alerta Crítica</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; border: 2px solid #eb3b5a; background: #ffeaa7; border-radius: 4px;"></div> Desviación > 5%</div>
                </div>
            </div>
        `;

        let html = legendHtml + '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start; padding-top: 5px;">';

        vehicles.forEach(v => {
            const hasCritical = v.maxWeight === 3;
            const fmt = (val) => val ? (val / 100000).toFixed(2) : '--';
            
            // Recopilamos alertas de todos los neumáticos
            let alerts = [...new Set([
                v.status.E1_Izq.msg, v.status.E1_Der.msg, 
                v.status.E2_ExtIzq.msg, v.status.E2_IntIzq.msg,
                v.status.E2_IntDer.msg, v.status.E2_ExtDer.msg
            ].filter(m => m))];
            
            const alertHtml = alerts.length > 0 
                ? `<div style="background: #ffeaa7; color: #eb3b5a; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 4px; margin-bottom: 15px; min-height: 28px;">⚠️ ${alerts.join('<br>')}</div>` 
                : `<div style="height: 40px;"></div>`; 

            // Estilo de los neumáticos más estrecho para encajar las ruedas gemelas
            const tireStyle = "position: absolute; width: 34px; height: 50px; border-radius: 4px; border: 2px solid #2d3436; z-index: 2; display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: bold; text-shadow: 1px 1px 2px #000; box-sizing: border-box;";

            // Diseño ensanchado para alojar los 6 neumáticos
            html += `
                <div style="background: white; border-radius: 12px; padding: 15px; width: 280px; box-shadow: 0 4px 8px rgba(0,0,0,0.05); text-align: center; border: ${hasCritical ? '2px solid #eb3b5a' : '1px solid #d1d8e0'}">
                    <div style="font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"><strong>${v.name}</strong></div>
                    ${alertHtml}
                    <div style="position: relative; width: 200px; height: 200px; margin: 0 auto;">
                        <div style="position: absolute; top: 10px; left: 70px; width: 60px; height: 180px; background: #dfe6e9; border-radius: 10px; border: 2px solid #b2bec3; z-index: 1;"></div>
                        
                        <div style="${tireStyle} top: 25px; left: 25px; background:${v.status.E1_Izq.color}">${fmt(v.pressures.E1_Izq)}</div>
                        <div style="${tireStyle} top: 25px; right: 25px; background:${v.status.E1_Der.color}">${fmt(v.pressures.E1_Der)}</div>
                        
                        <div style="${tireStyle} bottom: 25px; left: 0px; background:${v.status.E2_ExtIzq.color}">${fmt(v.pressures.E2_ExtIzq)}</div>
                        <div style="${tireStyle} bottom: 25px; left: 36px; background:${v.status.E2_IntIzq.color}">${fmt(v.pressures.E2_IntIzq)}</div>
                        
                        <div style="${tireStyle} bottom: 25px; right: 36px; background:${v.status.E2_IntDer.color}">${fmt(v.pressures.E2_IntDer)}</div>
                        <div style="${tireStyle} bottom: 25px; right: 0px; background:${v.status.E2_ExtDer.color}">${fmt(v.pressures.E2_ExtDer)}</div>
                    </div>
                    <div style="font-size: 10px; color: #636e72; margin-top: 10px;">BAR</div>
                </div>`;
        });
        container.innerHTML = html + '</div>';
    }

    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            const container = document.getElementById("fleet-container");
            container.innerHTML = '<div style="padding:20px; text-align:center;">Cargando flota de camiones...</div>';

            api.call("Get", { typeName: "Device" }, function (devices) {
                const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                
                // Hacemos 6 llamadas a la API (una por cada ID de neumático de camión)
                const calls = Object.values(diagIds).map(id => ["Get", {
                    typeName: "StatusData",
                    search: { diagnosticSearch: { id: id }, fromDate: fromDate }
                }]);

                api.multiCall(calls, function (results) {
                    const masterData = {};
                    // Inicializamos el objeto con los 6 neumáticos en null
                    devices.forEach(d => masterData[d.id] = { E1_Izq: null, E1_Der: null, E2_ExtIzq: null, E2_IntIzq: null, E2_IntDer: null, E2_ExtDer: null });

                    const keys = ['E1_Izq', 'E1_Der', 'E2_ExtIzq', 'E2_IntIzq', 'E2_IntDer', 'E2_ExtDer'];
                    
                    results.forEach((statusList, index) => {
                        const key = keys[index];
                        statusList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                        
                        statusList.forEach(log => {
                            const devId = log.device.id;
                            if (masterData[devId] && masterData[devId][key] === null) {
                                masterData[devId][key] = log.data;
                            }
                        });
                    });

                    const fleetData = devices.map(d => {
                        const p = masterData[d.id];
                        // Comparamos desviaciones en el eje delantero entre ellos
                        const s_E1_Izq = calculateStatus(p.E1_Izq, p.E1_Der);
                        const s_E1_Der = calculateStatus(p.E1_Der, p.E1_Izq);
                        // En el eje trasero comparamos las ruedas gemelas entre sí (Ext vs Int)
                        const s_E2_ExtIzq = calculateStatus(p.E2_ExtIzq, p.E2_IntIzq);
                        const s_E2_IntIzq = calculateStatus(p.E2_IntIzq, p.E2_ExtIzq);
                        const s_E2_IntDer = calculateStatus(p.E2_IntDer, p.E2_ExtDer);
                        const s_E2_ExtDer = calculateStatus(p.E2_ExtDer, p.E2_IntDer);

                        const s = {
                            E1_Izq: s_E1_Izq, E1_Der: s_E1_Der,
                            E2_ExtIzq: s_E2_ExtIzq, E2_IntIzq: s_E2_IntIzq,
                            E2_IntDer: s_E2_IntDer, E2_ExtDer: s_E2_ExtDer
                        };

                        return {
                            name: d.name, pressures: p, status: s,
                            maxWeight: Math.max(s.E1_Izq.weight, s.E1_Der.weight, s.E2_ExtIzq.weight, s.E2_IntIzq.weight, s.E2_IntDer.weight, s.E2_ExtDer.weight)
                        };
                    });

                    renderFleet(fleetData);
                }, err => { container.innerHTML = "Error cargando datos: " + err; });
            });
        },
        blur: function () {}
    };
};