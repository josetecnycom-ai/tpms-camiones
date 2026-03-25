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
        let weight = 1, color = "#576574", msg = ""; // Color modificado a gris oscuro para óptimo

        // Umbrales para vehículos pesados
        if (bar < 7.0 || bar > 9.5) { weight = 3; color = "#eb3b5a"; } 
        else if (bar < 7.5 || bar > 9.0) { weight = 2; color = "#f7b731"; }

        // Diferencia de presión
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
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #576574; border-radius: 4px;"></div> Óptimo (7.5 - 9.0 Bar)</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #f7b731; border-radius: 4px;"></div> Aviso Leve</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; background: #eb3b5a; border-radius: 4px;"></div> Alerta Crítica</div>
                    <div style="display: flex; align-items: center; gap: 6px;"><div style="width: 16px; height: 16px; border: 2px solid #eb3b5a; background: #ffeaa7; border-radius: 4px;"></div> Desviación > 5%</div>
                </div>
            </div>
        `;

        let html = legendHtml + '<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: flex-start; padding-top: 5px;">';

        vehicles.forEach(v => {
            const hasCritical = v.maxWeight === 3;
            // Formatear a 1 decimal
            const fmtVal = (val) => val ? (val / 100000).toFixed(1) + " bar" : "-- bar";
            const valTextColor = (c) => c === "#576574" ? "#747d8c" : c;
            
            let alerts = [...new Set([
                v.status.E1_Izq.msg, v.status.E1_Der.msg, 
                v.status.E2_ExtIzq.msg, v.status.E2_IntIzq.msg,
                v.status.E2_IntDer.msg, v.status.E2_ExtDer.msg
            ].filter(m => m))];
            
            const alertHtml = alerts.length > 0 
                ? `<div style="background: #ffeaa7; color: #eb3b5a; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 4px; margin-bottom: 15px; min-height: 28px;">⚠️ ${alerts.join('<br>')}</div>` 
                : `<div style="height: 40px;"></div>`; 

            // Tarjeta más ancha (360px) para acomodar la nueva disposición
            const cardStyle = `background: white; border-radius: 12px; padding: 20px 10px; width: 360px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; border: ${hasCritical ? '2px solid #eb3b5a' : '1px solid #d1d8e0'};`;
            
            // Neumáticos más similares a la imagen (sin texto dentro, más discretos)
            const tireStyle = "position: absolute; width: 22px; height: 48px; border-radius: 6px; z-index: 2; box-shadow: inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2);";

            // Helper function to draw lines and text
            const drawLabel = (side, topY, tireCenterX, val, tireColor) => {
                const isLeft = side === 'left';
                const text = fmtVal(val);
                const textColor = valTextColor(tireColor);
                
                if (isLeft) {
                    const lineLen = tireCenterX - 75; 
                    return `
                        <div style="position: absolute; top: ${topY}px; left: 75px; width: ${lineLen}px; border-bottom: 1px solid ${textColor}; z-index: 0; opacity: 0.6;"></div>
                        <div style="position: absolute; top: ${topY - 14}px; left: 10px; width: 60px; text-align: right; font-size: 14px; color: ${textColor}; font-weight: 600; font-family: sans-serif;">${text}</div>
                    `;
                } else {
                    const lineLen = tireCenterX - 75; 
                    return `
                        <div style="position: absolute; top: ${topY}px; right: 75px; width: ${lineLen}px; border-bottom: 1px solid ${textColor}; z-index: 0; opacity: 0.6;"></div>
                        <div style="position: absolute; top: ${topY - 14}px; right: 10px; width: 60px; text-align: left; font-size: 14px; color: ${textColor}; font-weight: 600; font-family: sans-serif;">${text}</div>
                    `;
                }
            };

            html += `
                <div style="${cardStyle}">
                    <div style="font-size: 16px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #2d3436;"><strong>${v.name}</strong></div>
                    ${alertHtml}
                    
                    <div style="position: relative; width: 360px; height: 260px; margin: 0 auto; user-select: none;">
                        
                        <!-- Contenedor central 200px para el dibujo del camión -->
                        <div style="position: absolute; left: 80px; width: 200px; height: 260px; z-index: 1;">
                            <svg width="200" height="260" viewBox="0 0 200 260" style="position:absolute; left:0; top:0; z-index:1;">
                                <!-- mirrors -->
                                <ellipse cx="30" cy="45" rx="5" ry="3" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5" transform="rotate(-30 30 45)" />
                                <ellipse cx="170" cy="45" rx="5" ry="3" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5" transform="rotate(30 170 45)" />
                                <!-- cabin structure matches the image attached -->
                                <path d="M 40 40 Q 40 20 60 20 L 140 20 Q 160 20 160 40 L 160 100 L 130 148 L 70 148 L 40 100 Z" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5"/>
                                <!-- trailer lower chassis part -->
                                <rect x="75" y="145" width="50" height="80" rx="6" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5"/>
                            </svg>
                            
                            <!-- Eje 1 (Frontal) -->
                            <div style="${tireStyle} top: 60px; left: 35px; background:${v.status.E1_Izq.color}"></div>
                            <div style="${tireStyle} top: 60px; right: 35px; background:${v.status.E1_Der.color}"></div>
                            
                            <!-- Eje 2 (Trasero) -->
                            <div style="${tireStyle} top: 170px; left: 25px; background:${v.status.E2_ExtIzq.color}"></div>
                            <div style="${tireStyle} top: 170px; left: 50px; background:${v.status.E2_IntIzq.color}"></div>
                            
                            <div style="${tireStyle} top: 170px; right: 50px; background:${v.status.E2_IntDer.color}"></div>
                            <div style="${tireStyle} top: 170px; right: 25px; background:${v.status.E2_ExtDer.color}"></div>
                        </div>

                        <!-- Líneas y Etiquetas Frontales -->
                        ${drawLabel('left', 85, 126, v.pressures.E1_Izq, v.status.E1_Izq.color)}
                        ${drawLabel('right', 85, 126, v.pressures.E1_Der, v.status.E1_Der.color)}

                        <!-- Líneas y Etiquetas Traseras (Eje 2) -->
                        ${drawLabel('left', 182, 141, v.pressures.E2_IntIzq, v.status.E2_IntIzq.color)}
                        ${drawLabel('left', 205, 116, v.pressures.E2_ExtIzq, v.status.E2_ExtIzq.color)}
                        
                        ${drawLabel('right', 182, 141, v.pressures.E2_IntDer, v.status.E2_IntDer.color)}
                        ${drawLabel('right', 205, 116, v.pressures.E2_ExtDer, v.status.E2_ExtDer.color)}
                    </div>
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
                
                const calls = Object.values(diagIds).map(id => ["Get", {
                    typeName: "StatusData",
                    search: { diagnosticSearch: { id: id }, fromDate: fromDate }
                }]);

                api.multiCall(calls, function (results) {
                    const masterData = {};
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
                        const s_E1_Izq = calculateStatus(p.E1_Izq, p.E1_Der);
                        const s_E1_Der = calculateStatus(p.E1_Der, p.E1_Izq);
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
