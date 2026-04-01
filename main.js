window.geotab = window.geotab || {};
window.geotab.addin = window.geotab.addin || {};

geotab.addin.tirePressureAddin = function (api, state) {

    // ─── IDs de diagnóstico ────────────────────────────────────────────────────
    const diagIds = {
        E1_Izq:    "aWh7GmzEY20aZA3C4KSBZuA",
        E1_Der:    "ammSx3EpAVEWFRA4yst8hGA",
        E2_ExtIzq: "a5OQtfETMnEeVAms6MINtMQ",
        E2_IntIzq: "aYT21qD9lUkydm5SNLVP2Kw",
        E2_IntDer: "aqnMOJwje1kmfBOwBqj0zLQ",
        E2_ExtDer: "aDHfNLzHx0USy7isxSHgT1Q"
    };

    const diagTempIds = {
        E1_Izq:    "a1ZcS5E35KkOVBXxcqSCihQ",
        E1_Der:    "ayIh-pPu-BUyW35gJQDE-eQ",
        E2_ExtIzq: "aB1AI1v7VZEuEpL9DL2pX5w",
        E2_IntIzq: "aJ6V9PwpaWEK6YwvKSLxuDg",
        E2_IntDer: "ajfPPsCzHZkOMSeHqdB122g",
        E2_ExtDer: "alXGwTauFBkq48G840Hni1g"
    };

    // ─── Configuración de umbrales (editable via modal) ───────────────────────
    const STORAGE_KEY = "tpms_camiones_config_v1_3";

    const defaultConfig = {
        optMin:    7.5,
        optMax:    9.0,
        warnMin:   7.0,
        warnMax:   9.5,
        devPct:    5,       // % de descompensación entre ruedas gemelas
        tempWarn:  75,      // °C inicio de aviso
        tempCrit:  85       // °C crítica
    };

    function loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? Object.assign({}, defaultConfig, JSON.parse(saved)) : Object.assign({}, defaultConfig);
        } catch (e) { return Object.assign({}, defaultConfig); }
    }

    function saveConfig(cfg) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch (e) {}
    }

    let cfg = loadConfig();

    // ─── Lógica de estado ──────────────────────────────────────────────────────
    function calculateStatus(val, sideVal, tempVal) {
        if (!val || val <= 0) return { color: "#d1d8e0", weight: 0, msg: "" };
        const bar = val / 100000;
        let weight = 1, color = "#576574", msgs = [];

        // Presión
        if (bar < cfg.warnMin || bar > cfg.warnMax) { weight = 3; color = "#eb3b5a"; msgs.push("Presión Crítica"); }
        else if (bar < cfg.optMin || bar > cfg.optMax) { weight = Math.max(weight, 2); if (color !== "#eb3b5a") color = "#f7b731"; msgs.push("Presión de Aviso"); }

        // Descompensación en eje
        if (sideVal && sideVal > 0 && Math.abs((val - sideVal) / sideVal) > cfg.devPct / 100) {
            weight = 3; color = "#eb3b5a"; msgs.push(`Descompensación en eje > ${cfg.devPct}%`);
        }

        // Temperatura
        if (tempVal !== null && tempVal !== undefined && tempVal > 0) {
            if (tempVal >= cfg.tempCrit) { weight = 3; color = "#eb3b5a"; msgs.push(`Temp. Crítica (${Math.round(tempVal)}°C)`); }
            else if (tempVal >= cfg.tempWarn) { weight = Math.max(weight, 2); if (color !== "#eb3b5a") color = "#f7b731"; msgs.push(`Temp. Alta (${Math.round(tempVal)}°C)`); }
        }

        return { color, weight, msg: msgs.join(" | ") };
    }

    // ─── Modal de configuración ────────────────────────────────────────────────
    function injectModal() {
        if (document.getElementById("tpms-modal")) return;

        const overlay = document.createElement("div");
        overlay.id = "tpms-modal";
        overlay.style.cssText = `
            display:none; position:fixed; inset:0; z-index:9999;
            background:rgba(0,0,0,0.45); backdrop-filter:blur(3px);
            align-items:center; justify-content:center; overflow-y:auto;
        `;

        overlay.innerHTML = `
            <div style="
                background:#fff; border-radius:16px; padding:32px 28px; margin: 20px 0;
                width:400px; max-width:95vw; box-shadow:0 20px 60px rgba(0,0,0,0.25);
                font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
                animation: tpms-slide-in .22s cubic-bezier(.16,1,.3,1);
            ">
                <style>
                    @keyframes tpms-slide-in { from { opacity:0; transform:translateY(-18px) scale(.97); } to { opacity:1; transform:none; } }
                    .tpms-field { display:flex; flex-direction:column; gap:4px; margin-bottom:14px; }
                    .tpms-field label { font-size:12px; font-weight:600; color:#636e72; text-transform:uppercase; letter-spacing:.5px; }
                    .tpms-field input {
                        padding:9px 12px; border:1.5px solid #dfe6e9; border-radius:8px;
                        font-size:14px; color:#2d3436; outline:none; transition:border .15s;
                    }
                    .tpms-field input:focus { border-color:#0984e3; }
                    .tpms-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
                    .tpms-sep { height:1px; background:#f1f2f6; margin:18px 0; }
                    .tpms-btn-bar { display:flex; gap:10px; justify-content:flex-end; margin-top:22px; }
                    .tpms-btn { padding:9px 20px; border-radius:8px; border:none; font-size:13px; font-weight:600; cursor:pointer; transition:opacity .15s; }
                    .tpms-btn:hover { opacity:.85; }
                    .tpms-btn-cancel { background:#f1f2f6; color:#636e72; }
                    .tpms-btn-save   { background:#0984e3; color:#fff; }
                    .tpms-btn-reset  { background:#ffeaa7; color:#b8860b; margin-right:auto; }
                </style>

                <div style="display:flex; align-items:center; gap:10px; margin-bottom:22px;">
                    <span style="font-size:22px;">⚙️</span>
                    <div>
                        <div style="font-size:17px; font-weight:700; color:#2d3436;">Configuración Umbrales</div>
                        <div style="font-size:12px; color:#b2bec3; margin-top:2px;">Se guardan en el navegador</div>
                    </div>
                </div>

                <div style="font-size:11px; font-weight:700; color:#0984e3; letter-spacing:.8px; margin-bottom:10px;">PRESIÓN ÓPTIMA (Verde)</div>
                <div class="tpms-row">
                    <div class="tpms-field"><label>Mín (<span style="text-transform:lowercase">bar</span>)</label><input id="cfg-optMin" type="number" step="0.1" min="0" max="20"></div>
                    <div class="tpms-field"><label>Máx (<span style="text-transform:lowercase">bar</span>)</label><input id="cfg-optMax" type="number" step="0.1" min="0" max="20"></div>
                </div>

                <div class="tpms-sep"></div>

                <div style="font-size:11px; font-weight:700; color:#f7b731; letter-spacing:.8px; margin-bottom:10px;">PRESIÓN AVISO (Amarillo)</div>
                <div class="tpms-row">
                    <div class="tpms-field"><label>Mín (<span style="text-transform:lowercase">bar</span>)</label><input id="cfg-warnMin" type="number" step="0.1" min="0" max="20"></div>
                    <div class="tpms-field"><label>Máx (<span style="text-transform:lowercase">bar</span>)</label><input id="cfg-warnMax" type="number" step="0.1" min="0" max="20"></div>
                </div>

                <div class="tpms-sep"></div>

                <div style="font-size:11px; font-weight:700; color:#eb3b5a; letter-spacing:.8px; margin-bottom:10px;">LÍMITES TEMPERATURA</div>
                <div class="tpms-row">
                    <div class="tpms-field"><label>Aviso (°C)</label><input id="cfg-tempWarn" type="number" step="1" min="0" max="150" title="A partir de este valor se muestra advertencia amarilla"></div>
                    <div class="tpms-field"><label>Crítico (°C)</label><input id="cfg-tempCrit" type="number" step="1" min="0" max="150" title="A partir de este valor se muestra alerta roja"></div>
                </div>

                <div class="tpms-sep"></div>

                <div style="font-size:11px; font-weight:700; color:#eb3b5a; letter-spacing:.8px; margin-bottom:10px;">DESCOMPENSACIÓN GEMELAS</div>
                <div class="tpms-field">
                    <label>Tolerancia máxima (%)</label>
                    <input id="cfg-devPct" type="number" step="1" min="1" max="50">
                </div>

                <div class="tpms-btn-bar">
                    <button class="tpms-btn tpms-btn-reset" id="cfg-reset">Restablecer</button>
                    <button class="tpms-btn tpms-btn-cancel" id="cfg-cancel">Cancelar</button>
                    <button class="tpms-btn tpms-btn-save"   id="cfg-save">Guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // ── Event listeners del modal ──────────────────────────────────────────
        document.getElementById("cfg-cancel").addEventListener("click", closeModal);
        document.getElementById("cfg-reset").addEventListener("click", function () {
            cfg = Object.assign({}, defaultConfig);
            saveConfig(cfg);
            fillModalFields();
            closeModal();
            window._tpms_reload && window._tpms_reload();
        });
        document.getElementById("cfg-save").addEventListener("click", function () {
            const vals = {
                optMin:   parseFloat(document.getElementById("cfg-optMin").value),
                optMax:   parseFloat(document.getElementById("cfg-optMax").value),
                warnMin:  parseFloat(document.getElementById("cfg-warnMin").value),
                warnMax:  parseFloat(document.getElementById("cfg-warnMax").value),
                devPct:   parseFloat(document.getElementById("cfg-devPct").value),
                tempWarn: parseFloat(document.getElementById("cfg-tempWarn").value),
                tempCrit: parseFloat(document.getElementById("cfg-tempCrit").value)
            };
            if (Object.values(vals).some(isNaN)) { alert("Por favor, revisa los valores introducidos."); return; }
            cfg = vals;
            saveConfig(cfg);
            closeModal();
            window._tpms_reload && window._tpms_reload();
        });
        overlay.addEventListener("mousedown", function (e) {
            if (e.target === overlay) closeModal();
        });
    }

    function fillModalFields() {
        document.getElementById("cfg-optMin").value   = cfg.optMin;
        document.getElementById("cfg-optMax").value   = cfg.optMax;
        document.getElementById("cfg-warnMin").value  = cfg.warnMin;
        document.getElementById("cfg-warnMax").value  = cfg.warnMax;
        document.getElementById("cfg-devPct").value   = cfg.devPct;
        document.getElementById("cfg-tempWarn").value = cfg.tempWarn;
        document.getElementById("cfg-tempCrit").value = cfg.tempCrit;
    }

    function openModal() {
        injectModal();
        fillModalFields();
        const m = document.getElementById("tpms-modal");
        m.style.display = "flex";
    }

    function closeModal() {
        const m = document.getElementById("tpms-modal");
        if (m) m.style.display = "none";
    }

    // ─── Render de la flota ────────────────────────────────────────────────────
    function renderFleet(vehicles) {
        const container = document.getElementById("fleet-container");
        vehicles.sort((a, b) => b.maxWeight - a.maxWeight);

        const legendHtml = `
            <div style="background:white; border-radius:8px; padding:15px; margin-bottom:20px; box-shadow:0 2px 4px rgba(0,0,0,0.05); font-family:sans-serif; font-size:13px; color:#2d3436; border-left:4px solid #0984e3; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                <div>
                    <strong style="display:block; margin-bottom:10px; font-size:14px;">Leyenda de Alertas (Datos 7 días):</strong>
                    <div style="display:flex; flex-wrap:wrap; gap:15px; align-items:center;">
                        <div style="display:flex; align-items:center; gap:6px;"><div style="width:16px; height:16px; background:#576574; border-radius:4px;"></div> Óptimo (${cfg.optMin}–${cfg.optMax}bar | <${cfg.tempWarn}°C)</div>
                        <div style="display:flex; align-items:center; gap:6px;"><div style="width:16px; height:16px; background:#f7b731; border-radius:4px;"></div> Aviso (≥${cfg.tempWarn}°C)</div>
                        <div style="display:flex; align-items:center; gap:6px;"><div style="width:16px; height:16px; background:#eb3b5a; border-radius:4px;"></div> Alerta Crítica (≥${cfg.tempCrit}°C)</div>
                        <div style="display:flex; align-items:center; gap:6px;"><div style="width:16px; height:16px; border:2px solid #eb3b5a; background:#ffeaa7; border-radius:4px;"></div> Desv. Eje > ${cfg.devPct}%</div>
                    </div>
                </div>
                <button id="tpms-settings-btn" style="
                    display:flex; align-items:center; gap:7px; padding:9px 16px;
                    background:#0984e3; color:white; border:none; border-radius:8px;
                    font-size:13px; font-weight:600; cursor:pointer;
                    box-shadow:0 2px 8px rgba(9,132,227,0.35); transition:opacity .15s;
                    white-space:nowrap; flex-shrink:0; margin-left:auto;
                " onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
                    ⚙️ Configurar umbrales
                </button>
            </div>
        `;

        let html = legendHtml + '<div style="display:flex; flex-wrap:wrap; gap:20px; justify-content:flex-start; padding-top:5px;">';

        vehicles.forEach(v => {
            const hasCritical = v.maxWeight === 3;
            
            // Función para formatear el valor de presión y temperatura combinado
            const fmtVal = (pVal, tVal) => {
                let pStr = pVal ? (pVal / 100000).toFixed(1) + " bar" : "-- bar";
                let tStr = tVal !== null && tVal !== undefined && tVal > 0 ? Math.round(tVal) + "°C" : "--°C";
                return `${pStr} / ${tStr}`;
            };
            const valTextColor = (c) => c === "#576574" ? "#747d8c" : c;

            let alerts = [...new Set([
                v.status.E1_Izq.msg, v.status.E1_Der.msg,
                v.status.E2_ExtIzq.msg, v.status.E2_IntIzq.msg,
                v.status.E2_IntDer.msg, v.status.E2_ExtDer.msg
            ].filter(m => m))];

            const alertHtml = alerts.length > 0
                ? `<div style="background:#ffeaa7; color:#eb3b5a; font-size:11px; font-weight:bold; padding:6px; border-radius:4px; margin-bottom:15px; min-height:28px;">⚠️ ${alerts.join('<br>')}</div>`
                : `<div style="height:40px;"></div>`;

            // Aumentamos ancho a 440px para acomodar texto más largo "7.9 bar / 45°C"
            const cardStyle = `background:white; border-radius:12px; padding:20px 10px; width:440px; box-shadow:0 4px 12px rgba(0,0,0,0.08); text-align:center; border:${hasCritical ? '2px solid #eb3b5a' : '1px solid #d1d8e0'};`;
            const tireStyle = "position:absolute; width:22px; height:48px; border-radius:6px; z-index:2; box-shadow:inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2); transition: background 0.3s ease;";

            const drawLabel = (side, topY, tireCenterX, pVal, tVal, tireColor) => {
                const isLeft = side === 'left';
                const text  = fmtVal(pVal, tVal);
                const color = valTextColor(tireColor);
                // Calculamos longitud de línea sabiendo que ocupamos 120px para la zona de texto exterior
                const lineLen = tireCenterX - 110; 
                if (isLeft) return `
                    <div style="position:absolute; top:${topY}px; left:110px; width:${lineLen}px; border-bottom:1px solid ${color}; z-index:0; opacity:0.6;"></div>
                    <div style="position:absolute; top:${topY - 14}px; left:5px; width:100px; text-align:right; font-size:14px; color:${color}; font-weight:600; font-family:sans-serif; letter-spacing: -0.3px;">${text}</div>
                `;
                return `
                    <div style="position:absolute; top:${topY}px; right:110px; width:${lineLen}px; border-bottom:1px solid ${color}; z-index:0; opacity:0.6;"></div>
                    <div style="position:absolute; top:${topY - 14}px; right:5px; width:100px; text-align:left; font-size:14px; color:${color}; font-weight:600; font-family:sans-serif; letter-spacing: -0.3px;">${text}</div>
                `;
            };

            html += `
                <div style="${cardStyle}">
                    <div style="font-size:16px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; color:#2d3436;"><strong>${v.name}</strong></div>
                    ${alertHtml}
                    <!-- Aumentar width a 420px del wrapper interior -->
                    <div style="position:relative; width:420px; height:260px; margin:0 auto; user-select:none;">
                        <!-- SVG del camión posicionado a left: 110px -->
                        <div style="position:absolute; left:110px; width:200px; height:260px; z-index:1;">
                            <svg width="200" height="260" viewBox="0 0 200 260" style="position:absolute; left:0; top:0; z-index:1;">
                                <ellipse cx="30"  cy="45" rx="5" ry="3" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5" transform="rotate(-30 30 45)" />
                                <ellipse cx="170" cy="45" rx="5" ry="3" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5" transform="rotate(30 170 45)" />
                                <path d="M 40 40 Q 40 20 60 20 L 140 20 Q 160 20 160 40 L 160 100 L 130 148 L 70 148 L 40 100 Z" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5"/>
                                <rect x="75" y="145" width="50" height="80" rx="6" fill="#f4f6f9" stroke="#b2bec3" stroke-width="1.5"/>
                            </svg>
                            <div style="${tireStyle} top:60px;  left:35px;  background:${v.status.E1_Izq.color}"></div>
                            <div style="${tireStyle} top:60px;  right:35px; background:${v.status.E1_Der.color}"></div>
                            
                            <div style="${tireStyle} top:170px; left:25px;  background:${v.status.E2_ExtIzq.color}"></div>
                            <div style="${tireStyle} top:170px; left:50px;  background:${v.status.E2_IntIzq.color}"></div>
                            
                            <div style="${tireStyle} top:170px; right:50px; background:${v.status.E2_IntDer.color}"></div>
                            <div style="${tireStyle} top:170px; right:25px; background:${v.status.E2_ExtDer.color}"></div>
                        </div>
                        
                        <!-- Coordenadas calculadas sumando el padding izquierdo de 110px -->
                        ${drawLabel('left',  85,  110 + 35 + 11, v.pressures.E1_Izq,    v.temps.E1_Izq,    v.status.E1_Izq.color)}
                        ${drawLabel('right', 85,  110 + 35 + 11, v.pressures.E1_Der,    v.temps.E1_Der,    v.status.E1_Der.color)}
                        
                        ${drawLabel('left',  182, 110 + 50 + 11, v.pressures.E2_IntIzq, v.temps.E2_IntIzq, v.status.E2_IntIzq.color)}
                        ${drawLabel('left',  205, 110 + 25 + 11, v.pressures.E2_ExtIzq, v.temps.E2_ExtIzq, v.status.E2_ExtIzq.color)}
                        
                        ${drawLabel('right', 182, 110 + 50 + 11, v.pressures.E2_IntDer, v.temps.E2_IntDer, v.status.E2_IntDer.color)}
                        ${drawLabel('right', 205, 110 + 25 + 11, v.pressures.E2_ExtDer, v.temps.E2_ExtDer, v.status.E2_ExtDer.color)}
                    </div>
                </div>`;
        });

        container.innerHTML = html + '</div>';

        const btn = document.getElementById("tpms-settings-btn");
        if (btn) btn.addEventListener("click", openModal);
    }

    // ─── Carga de datos ────────────────────────────────────────────────────────
    function loadData() {
        const container = document.getElementById("fleet-container");
        container.innerHTML = '<div style="padding:20px; text-align:center;">Cargando flota de camiones...</div>';

        api.call("Get", { typeName: "Device" }, function (devices) {
            const fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            // Llamadas combinadas para presiones y temperaturas
            const calls = [];
            Object.values(diagIds).forEach(id => {
                calls.push(["Get", { typeName: "StatusData", search: { diagnosticSearch: { id: id }, fromDate: fromDate } }]);
            });
            Object.values(diagTempIds).forEach(id => {
                calls.push(["Get", { typeName: "StatusData", search: { diagnosticSearch: { id: id }, fromDate: fromDate } }]);
            });

            api.multiCall(calls, function (results) {
                const masterData = {};
                devices.forEach(d => {
                    masterData[d.id] = { 
                        press: { E1_Izq: null, E1_Der: null, E2_ExtIzq: null, E2_IntIzq: null, E2_IntDer: null, E2_ExtDer: null },
                        temp:  { E1_Izq: null, E1_Der: null, E2_ExtIzq: null, E2_IntIzq: null, E2_IntDer: null, E2_ExtDer: null }
                    };
                });

                const keys = ['E1_Izq', 'E1_Der', 'E2_ExtIzq', 'E2_IntIzq', 'E2_IntDer', 'E2_ExtDer'];

                // Las primeras 6 llamadas son de presión
                for (let i = 0; i < 6; i++) {
                    const statusList = results[i];
                    const key = keys[i];
                    statusList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                    statusList.forEach(log => {
                        const devId = log.device.id;
                        if (masterData[devId] && masterData[devId].press[key] === null) {
                            masterData[devId].press[key] = log.data;
                        }
                    });
                }
                
                // Las siguientes 6 (índices 6 al 11) son de temperatura
                for (let i = 6; i < 12; i++) {
                    const statusList = results[i];
                    const key = keys[i - 6];
                    statusList.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
                    statusList.forEach(log => {
                        const devId = log.device.id;
                        if (masterData[devId] && masterData[devId].temp[key] === null) {
                            masterData[devId].temp[key] = log.data;
                        }
                    });
                }

                const fleetData = devices.map(d => {
                    const p = masterData[d.id].press;
                    const t = masterData[d.id].temp;
                    const s = {
                        E1_Izq:    calculateStatus(p.E1_Izq, p.E1_Der, t.E1_Izq),
                        E1_Der:    calculateStatus(p.E1_Der, p.E1_Izq, t.E1_Der),
                        E2_ExtIzq: calculateStatus(p.E2_ExtIzq, p.E2_IntIzq, t.E2_ExtIzq),
                        E2_IntIzq: calculateStatus(p.E2_IntIzq, p.E2_ExtIzq, t.E2_IntIzq),
                        E2_IntDer: calculateStatus(p.E2_IntDer, p.E2_ExtDer, t.E2_IntDer),
                        E2_ExtDer: calculateStatus(p.E2_ExtDer, p.E2_IntDer, t.E2_ExtDer)
                    };
                    return {
                        name: d.name, pressures: p, temps: t, status: s,
                        maxWeight: Math.max(...Object.values(s).map(x => x.weight))
                    };
                });

                renderFleet(fleetData);
            }, err => { container.innerHTML = "Error cargando datos: " + err; });
        });
    }

    // ─── API pública del add-in ────────────────────────────────────────────────
    return {
        initialize: function (api, state, callback) { callback(); },
        focus: function (api, state) {
            window._tpms_reload = loadData;
            loadData();
        },
        blur: function () {
            window._tpms_reload = null;
        }
    };
};
