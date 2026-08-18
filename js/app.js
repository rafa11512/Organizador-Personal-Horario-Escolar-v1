/**
 * ORGANIZADOR DE HORARIO ESCOLAR - MOTOR JAVASCRIPT VANILLA
 * Detección de colisiones y exportación a PDF.
 */

// Estado principal de la aplicacion
let state = {
  term: "Próxima Reinscripción",
  subjects: [],
  selectedGroupIds: [], // grupos seleccionados en el horario
  currentView: "schedule", // vista actual
  generatedCombinations: [],
  currentCombinationIndex: 0,
  theme: "dark",
  gridStyle: "default", // 'default' | 'glass' | 'rounded' | 'dots'
  drafts: [],
  activeDraftId: null,
  settings: {
    activeDays: ["Lun", "Mar", "Mie", "Jue", "Vie"],
    startHour: 7,
    endHour: 21
  }
};

const DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const PALETTE = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#1f2937", "#4b5563", "#71717a", "#4c1d95", "#8b0000", "#006400", "#00008b", "#ff1493", "#ff8c00", "#00ced1", "#ff00ff", "#2f4f4f", "#808000", "#4682b4"];

function getContrastYIQ(hexcolor) {
  if (!hexcolor) return 'white';
  hexcolor = hexcolor.replace("#", "");
  if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(c => c + c).join('');
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
}

// Convierte un formato "HH:MM" a minutos para calcular cruces de horario y horas libres
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function renderColorPalette(selectedColor, inputId) {
  const current = selectedColor || '#6366f1';
  return `
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.25rem;">
      ${PALETTE.map(c => `
        <button type="button" 
                style="width: 24px; height: 24px; border-radius: 50%; background-color: ${c}; border: 2px solid ${c.toLowerCase() === current.toLowerCase() ? 'var(--text-main)' : 'transparent'}; cursor: pointer; transition: transform 0.1s;"
                onclick="document.getElementById('${inputId}').value = '${c}'; this.parentElement.querySelectorAll('button').forEach(b => b.style.borderColor='transparent'); this.style.borderColor='var(--text-main)';">
        </button>
      `).join('')}
    </div>
    <input type="hidden" id="${inputId}" value="${current}">
  `;
}

let currentScheduleZoom = 1;
window.changeScheduleZoom = function(delta) {
  if (delta === 0) currentScheduleZoom = 1;
  else currentScheduleZoom = Math.max(0.5, Math.min(2, currentScheduleZoom + delta));
  
  const container = document.querySelector('.schedule-container');
  if (container) container.style.zoom = currentScheduleZoom;
};

// Inicializacion de la app
document.addEventListener("DOMContentLoaded", async () => {
  await loadAppData();
  setupEventListeners();
  renderApp();
  if (window.lucide) {
    window.lucide.createIcons();
  }
});

// Cargar datos de la aplicacion desde archivo inicial (JSON del servidor o disco)
async function loadAppData() {
    // 1. Intentar cargar desde el almacenamiento interno del navegador (Modo Vercel)
    const storedDataStr = localStorage.getItem("horarioAppData");
    if (storedDataStr) {
      try {
        const json = JSON.parse(storedDataStr);
        state.subjects = json.subjects || [];
        state.term = json.term || state.term;
        state.settings = json.settings || state.settings;
        const initialSelected = json.selectedGroupIds || getDefaultGroupSelection(state.subjects);
        state.selectedGroupIds = initialSelected;
        state.theme = json.theme || state.theme;
        state.gridStyle = json.gridStyle || state.gridStyle;
        state.drafts = json.drafts || [{ id: "draft-1", name: "Opción A", selectedGroupIds: initialSelected }];
        state.activeDraftId = json.activeDraftId || "draft-1";
        document.body.setAttribute("data-theme", state.theme);
        return; // Éxito, evitamos petición de red
      } catch (err) {
        console.warn("No se pudo leer LocalStorage, cargando desde JSON.");
      }
    }

    // 2. Si no hay datos en el navegador, descargar archivo base inicial
    try {
      const res = await fetch("data/initial_data.json?v=" + Date.now());
    const json = await res.json();
    state.subjects = json.subjects || [];
    state.term = json.term || state.term;
    state.settings = json.settings || state.settings;
    const initialSelected = json.selectedGroupIds || getDefaultGroupSelection(state.subjects);
    state.selectedGroupIds = initialSelected;
    state.theme = json.theme || state.theme;
    state.gridStyle = json.gridStyle || state.gridStyle;
    
    state.drafts = json.drafts || [{ id: "draft-1", name: "Opción A", selectedGroupIds: initialSelected }];
    state.activeDraftId = json.activeDraftId || "draft-1";
    
    document.body.setAttribute("data-theme", state.theme);
      saveStateToLocalStorage();
    } catch (err) {
    console.warn("No se pudo cargar initial_data.json por red (posible CORS en file://). Usando datos de prueba locales.");
    state.term = "Semestre de Prueba (Local)";
    state.subjects = [
      {
        "id": "sub-test-local",
        "code": "DEMO-101",
        "name": "Materia de Prueba",
        "color": "#3b82f6",
        "credits": 5,
        "hoursPerWeek": 4,
        "groups": [
          {
            "id": "grp-demo-a",
            "groupCode": "A",
            "classroom": "Aula Local",
            "professor": "Profesor Demo",
            "professorRating": 5,
            "professorDifficulty": "Baja",
            "tags": ["Demo"],
            "review": "Cargado localmente",
            "schedule": [
              { "day": "Lun", "start": "08:00", "end": "10:00" },
              { "day": "Mie", "start": "08:00", "end": "10:00" }
            ]
          }
        ]
      }
    ];
    const initialSelected = getDefaultGroupSelection(state.subjects);
    state.selectedGroupIds = initialSelected;
    state.drafts = [{ id: "draft-1", name: "Opción A", selectedGroupIds: initialSelected }];
    state.activeDraftId = "draft-1";
    document.body.setAttribute("data-theme", state.theme);
  }
}

function getDefaultGroupSelection(subjects) {
  // Seleccionar el primer grupo de cada materia por defecto si esta disponible
  return subjects.map(s => s.groups && s.groups.length > 0 ? s.groups[0].id : null).filter(Boolean);
}

function saveStateToLocalStorage() {
  // Sincronizar grupos seleccionados con el borrador activo en memoria
  if (state.drafts && state.activeDraftId) {
    const activeDraft = state.drafts.find(d => d.id === state.activeDraftId);
    if (activeDraft) {
      activeDraft.selectedGroupIds = [...state.selectedGroupIds];
    }
  }
  // Ya no se guarda en localStorage por cada click para priorizar initial_data.json
}

async function saveToServer() {
  saveStateToLocalStorage(); // Se asegura de que todo esté en la memoria del navegador
  
  // Mostramos directamente el mensaje de éxito del modo Vercel / Local
  showCustomAlert(
    "Guardado en Navegador", 
    "Tus datos se han guardado en la memoria de este navegador. Tu horario no se perderá al recargar la página.", 
    "save"
  );
}

// Detectores de eventos globales
function setupEventListeners() {
  // Pestañas de navegación
  document.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetView = e.currentTarget.getAttribute("data-nav");
      switchView(targetView);
    });
  });

  // Botones para cerrar modales
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", closeModal);
  });

  // Cambiar tema de colores desde la cabecera (solo oscuro/claro)
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      state.theme = (state.theme === "light") ? "dark" : "light";
      document.body.setAttribute("data-theme", state.theme);
      saveStateToLocalStorage();
      renderApp();
    });
  }

  // Eventos de botones eliminados o antiguos

  // Guardar en Servidor
  const saveServerBtn = document.getElementById("btn-save-server");
  if (saveServerBtn) {
    saveServerBtn.addEventListener("click", saveToServer);
  }

  // Botón para exportar JSON (Guardar Copia local)
  const exportBtn = document.getElementById("btn-export-json");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportJSONFile);
  }

  // Botón para importar JSON
  const importInput = document.getElementById("input-import-json");
  if (importInput) {
    importInput.addEventListener("change", importJSONFile);
  }

  // Botón para restablecer datos de prueba
  const resetBtn = document.getElementById("btn-reset-data");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetToDefaultData);
  }
}

function switchView(viewName) {
  if (viewName === "settings") {
    openSettingsModal();
    return;
  }
  if (viewName === "about") {
    openAboutModal();
    return;
  }
  state.currentView = viewName;
  document.querySelectorAll(".nav-item").forEach(item => {
    item.classList.toggle("active", item.getAttribute("data-nav") === viewName);
  });
  renderApp();
}

const themeNamesUI = {
  dark: { name: "Oscuro", icon: "moon" },
  light: { name: "Claro", icon: "sun" },
  cyberpunk: { name: "Cyberpunk", icon: "cpu" },
  dracula: { name: "Drácula", icon: "ghost" },
  pastel: { name: "Pastel", icon: "palette" },
  nordic: { name: "Nórdico", icon: "snowflake" },
  sepia: { name: "Sepia", icon: "coffee" }
};

function updateThemeButtonUI() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const config = themeNamesUI[state.theme] || themeNamesUI.dark;
  btn.innerHTML = `<i data-lucide="${config.icon}" style="width:16px;height:16px;"></i> ${config.name}`;
}

// RENDER PRINCIPAL
function renderApp() {
  updateSidebarStats();
  
  const mainArea = document.getElementById("view-container");
  const rightSidebar = document.getElementById("right-sidebar");
  if (!mainArea) return;

  if (state.currentView === "schedule") {
    renderScheduleView(mainArea);
    renderRightSidebar();
    if (state.isRightSidebarOpen) {
      rightSidebar.style.display = "flex";
    } else {
      rightSidebar.style.display = "none";
    }
  } else {
    if (rightSidebar) rightSidebar.style.display = "none";
    
    if (state.currentView === "professors") {
      renderProfessorsView(mainArea);
    } else if (state.currentView === "manage") {
      renderManageView(mainArea);
    } else if (state.currentView === "settings") {
      openSettingsModal();
    } else if (state.currentView === "about") {
      openAboutModal();
    }
  }

  updateThemeButtonUI();
  // Cargar íconos en los nuevos elementos HTML
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Contador de estadisticas de la barra lateral
function updateSidebarStats() {
  const selectedGroups = getSelectedGroupsList();
  const collisions = detectCollisions(selectedGroups);

  let totalHours = 0;
  let totalCredits = 0;
  let ratingSum = 0;

  selectedGroups.forEach(g => {
    const parentSub = state.subjects.find(s => s.groups && s.groups.some(x => x.id === g.id));
    if (parentSub) {
      totalCredits += parentSub.credits || 0;
      totalHours += parentSub.hoursPerWeek || 0;
    }
    ratingSum += g.professorRating || 0;
  });

  const avgRating = selectedGroups.length > 0 ? (ratingSum / selectedGroups.length).toFixed(1) : "0.0";
  const gapHours = calculateGapHours();

  document.getElementById("stat-subjects").textContent = selectedGroups.length;
  document.getElementById("stat-hours").textContent = totalHours + " hrs";
  document.getElementById("stat-credits").textContent = totalCredits;
  document.getElementById("stat-avg-rating").textContent = avgRating;
  
  const gapEl = document.getElementById("stat-gaps");
  if (gapEl) {
    gapEl.textContent = gapHours + " hrs";
  }
  
  const collisionBadge = document.getElementById("stat-collisions");
  if (collisionBadge) {
    if (collisions.length > 0) {
      collisionBadge.innerHTML = `<i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> ${collisions.length} Empalme(s)`;
      collisionBadge.style.color = "var(--danger)";
    } else {
      collisionBadge.innerHTML = `<i data-lucide="check-circle" style="width:16px;height:16px;"></i> Sin empalmes`;
      collisionBadge.style.color = "var(--success)";
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

// Calculo de Horas Muertas entre clases
function calculateGapHours() {
  const selectedGroups = getSelectedGroupsList();
  const dayBlocks = {};
  DAYS.forEach(d => dayBlocks[d] = []);

  selectedGroups.forEach(grp => {
    (grp.schedule || []).forEach(slot => {
      if (dayBlocks[slot.day]) {
        const startMin = timeToMinutes(slot.start);
        const endMin = timeToMinutes(slot.end);
        dayBlocks[slot.day].push({ startMin, endMin });
      }
    });
  });

  let totalGapMinutes = 0;
  DAYS.forEach(day => {
    const blocks = dayBlocks[day];
    if (blocks.length <= 1) return;
    blocks.sort((a, b) => a.startMin - b.startMin);
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentEnd = blocks[i].endMin;
      const nextStart = blocks[i + 1].startMin;
      if (nextStart > currentEnd) {
        totalGapMinutes += (nextStart - currentEnd);
      }
    }
  });

  return (totalGapMinutes / 60).toFixed(1);
}

function getSelectedGroupsList() {
  const list = [];
  if (!state.subjects || !Array.isArray(state.subjects)) return list;
  const currentSelection = state.selectedGroupIds || [];
  state.subjects.forEach(sub => {
    if (sub.groups && Array.isArray(sub.groups)) {
      sub.groups.forEach(grp => {
        if (currentSelection.includes(grp.id)) {
          list.push({ ...grp, subjectName: sub.name, subjectCode: sub.code, color: sub.color });
        }
      });
    }
  });
  return list;
}

// ALGORITMO DE DETECCION DE EMPALMES
function detectCollisions(groupsList) {
  const collisions = [];
  const timeSlotsMap = [];

  groupsList.forEach(grp => {
    if (!grp.schedule) return;
    grp.schedule.forEach(block => {
      const startMin = timeToMinutes(block.start);
      const endMin = timeToMinutes(block.end);

      timeSlotsMap.push({
        groupId: grp.id,
        subjectName: grp.subjectName,
        groupCode: grp.groupCode,
        professor: grp.professor,
        day: block.day,
        start: block.start,
        end: block.end,
        startMin,
        endMin
      });
    });
  });

  // Comparar cada bloque con el resto para buscar cruces
  for (let i = 0; i < timeSlotsMap.length; i++) {
    for (let j = i + 1; j < timeSlotsMap.length; j++) {
      const a = timeSlotsMap[i];
      const b = timeSlotsMap[j];

      if (a.day === b.day && a.groupId !== b.groupId) {
        // Condición para que exista un empalme de horarios
        if (a.startMin < b.endMin && a.endMin > b.startMin) {
          collisions.push({
            groupA: a,
            groupB: b,
            day: a.day,
            overlapTime: `${Math.max(a.startMin, b.startMin)} - ${Math.min(a.endMin, b.endMin)}`
          });
        }
      }
    }
  }

  return collisions;
}

// FUNCIONES DE GESTIÓN DE BORRADORES
function switchDraft(draftId) {
  saveStateToLocalStorage();
  state.activeDraftId = draftId;
  const target = state.drafts.find(d => d.id === draftId);
  if (target) {
    state.selectedGroupIds = [...(target.selectedGroupIds || [])];
  }
  saveStateToLocalStorage();
  renderApp();
}

function openCreateDraftModal() {
  const name = prompt("Nombre para la nueva opción de horario:", "Opción " + String.fromCharCode(65 + state.drafts.length));
  if (!name || !name.trim()) return;
  const newDraft = {
    id: "draft-" + Date.now(),
    name: name.trim(),
    selectedGroupIds: [...state.selectedGroupIds]
  };
  state.drafts.push(newDraft);
  state.activeDraftId = newDraft.id;
  saveStateToLocalStorage();
  renderApp();
}

function renameCurrentDraft() {
  const draft = state.drafts.find(d => d.id === state.activeDraftId);
  if (!draft) return;
  const newName = prompt("Nuevo nombre para este borrador de horario:", draft.name);
  if (newName && newName.trim()) {
    draft.name = newName.trim();
    saveStateToLocalStorage();
    renderApp();
  }
}

function deleteCurrentDraft() {
  if (state.drafts.length <= 1) {
    alert("Debes conservar al menos un borrador de horario.");
    return;
  }
  if (confirm("¿Estás seguro de eliminar este borrador de horario?")) {
    state.drafts = state.drafts.filter(d => d.id !== state.activeDraftId);
    state.activeDraftId = state.drafts[0].id;
    state.selectedGroupIds = [...(state.drafts[0].selectedGroupIds || [])];
    saveStateToLocalStorage();
    renderApp();
  }
}

// EXPORTAR A IMAGEN (PNG)
async function exportScheduleToImage() {
  const scheduleEl = document.querySelector(".schedule-container");
  if (!scheduleEl) {
    alert("No se encontró la tabla de horarios para exportar.");
    return;
  }

  if (!window.html2canvas) {
    alert("Cargando motor de captura de imagen...");
    return;
  }

  try {
    const activeThemeBg = getComputedStyle(document.body).getPropertyValue('--bg-primary').trim() || '#0f172a';
    const canvas = await window.html2canvas(scheduleEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: activeThemeBg
    });

    const activeDraftName = (state.drafts.find(d => d.id === state.activeDraftId) || {}).name || 'Horario';
    const link = document.createElement("a");
    link.download = `Horario_${activeDraftName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } catch (err) {
    console.error("Error exportando a imagen:", err);
    alert("No se pudo generar la imagen del horario.");
  }
}

// 1. RENDER HORARIO SEMANAL VIEW
function renderScheduleView(container) {
  const selectedGroups = getSelectedGroupsList();
  const collisions = detectCollisions(selectedGroups);
  const collidingGroupIds = new Set();
  collisions.forEach(c => {
    collidingGroupIds.add(c.groupA.groupId);
    collidingGroupIds.add(c.groupB.groupId);
  });

  let html = `
    <div class="page-header">
      <div class="page-title">
        <h2>Mi Horario Semanal</h2>
        <p>Previsualización de materias seleccionadas y detección de colisiones en tiempo real.</p>
      </div>
      <div class="header-actions">
        <div class="zoom-controls" style="display: flex; gap: 4px; align-items: center; margin-right: 10px; background: var(--bg-card); padding: 4px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <button class="icon-btn" onclick="changeScheduleZoom(-0.1)" title="Alejar"><i data-lucide="zoom-out" style="width:16px;height:16px;"></i></button>
          <button class="icon-btn" onclick="changeScheduleZoom(0)" title="Restaurar"><i data-lucide="maximize" style="width:16px;height:16px;"></i></button>
          <button class="icon-btn" onclick="changeScheduleZoom(0.1)" title="Acercar"><i data-lucide="zoom-in" style="width:16px;height:16px;"></i></button>
        </div>
        <button class="btn btn-secondary" onclick="exportScheduleToImage()"><i data-lucide="image" style="width:16px;height:16px; margin-right:4px; vertical-align:middle;"></i> Exportar Imagen HD</button>
        <button class="btn btn-outline" onclick="toggleRightSidebar()"><i data-lucide="clipboard-list" style="width:16px;height:16px; margin-right:4px; vertical-align:middle;"></i> Materias</button>
        <button class="btn btn-primary" onclick="triggerPrintSchedule('Mi Horario Semanal', getSelectedGroupsList())"><i data-lucide="printer" style="width:16px;height:16px; margin-right:4px; vertical-align:middle;"></i> Imprimir PDF</button>
      </div>
    </div>

    <!-- Toolbar de Gestión de Borradores -->
    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); padding: 0.6rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
        <span style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted); display:flex; align-items:center; gap:4px;">
          <i data-lucide="layers" style="width:16px;height:16px;"></i> Opción de Horario:
        </span>
        <select id="draft-selector" class="form-control" style="width: auto; padding: 0.35rem 0.6rem; font-size: 0.85rem;" onchange="switchDraft(this.value)">
          ${state.drafts.map(d => `<option value="${d.id}" ${d.id === state.activeDraftId ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="openCreateDraftModal()" title="Crear nuevo borrador"><i data-lucide="plus" style="width:14px;height:14px;"></i> Nuevo Borrador</button>
        <button class="btn btn-secondary btn-sm" onclick="renameCurrentDraft()" title="Renombrar borrador actual"><i data-lucide="edit" style="width:14px;height:14px;"></i> Renombrar</button>
        ${state.drafts.length > 1 ? `<button class="btn btn-danger btn-sm" onclick="deleteCurrentDraft()" title="Eliminar este borrador"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>` : ''}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); display:flex; align-items:center; gap:6px;">
        <i data-lucide="clock" style="width:14px;height:14px; color: var(--warning);"></i> Horas Muertas: <strong style="color: var(--warning);">${calculateGapHours()} hrs/sem</strong>
      </div>
    </div>
  `;

  if (collisions.length > 0) {
    html += `
        <div class="alert-banner alert-danger" style="margin-top: 1rem;">
          <i data-lucide="alert-triangle" class="alert-icon"></i>
          <div>
            <strong>¡Atención!</strong> Hay ${collisions.length} empalme(s) en la selección actual. Revisa el horario.
          </div>
          <ul style="margin-top: 0.3rem; padding-left: 1.2rem;">
            ${collisions.map(c => `
              <li><strong>${c.day}</strong>: ${c.groupA.subjectName} (${c.groupA.groupCode}) empalma con ${c.groupB.subjectName} (${c.groupB.groupCode}) entre ${c.groupA.start} y ${c.groupB.end}.</li>
            `).join('')}
          </ul>
        </div>
    `;
  }

  // Generar la rejilla del horario
  html += `
    <div class="schedule-container ${state.gridStyle ? 'grid-style-' + state.gridStyle : ''}" style="zoom: ${currentScheduleZoom};">
      <div class="timetable-header-row" style="grid-template-columns: 80px repeat(${state.settings.activeDays.length}, 1fr);">
        <!-- Header row -->
        <div class="timetable-header">Hora</div>
        ${state.settings.activeDays.map(day => `<div class="timetable-header">${day}</div>`).join('')}
      </div>
      <div class="timetable-body" style="grid-template-columns: 80px repeat(${state.settings.activeDays.length}, 1fr);">
        <div class="time-labels-column">
          <!-- Time Rows (Dynamic based on settings) -->
          ${Array.from({length: state.settings.endHour - state.settings.startHour + 1}, (_, i) => {
            const h = i + state.settings.startHour;
            return `<div class="time-slot-label">${h.toString().padStart(2, '0')}:00</div>`;
          }).join('')}
        </div>
        <!-- Day Columns with absolute positioned class blocks -->
        ${state.settings.activeDays.map(day => {
          return `
            <div class="day-column" data-day="${day}">
              ${renderDayEvents(day, selectedGroups, collidingGroupIds)}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderDayEvents(day, selectedGroups, collidingGroupIds) {
  let eventsHtml = '';
  
  let dayBlocks = [];
  selectedGroups.forEach(grp => {
    if (!grp.schedule) return;
    grp.schedule.forEach(block => {
      if (block.day === day) {
        dayBlocks.push({
          grp: grp,
          startMin: timeToMinutes(block.start),
          endMin: timeToMinutes(block.end),
          startStr: block.start,
          endStr: block.end
        });
      }
    });
  });

  if (dayBlocks.length === 0) return '';

  dayBlocks.sort((a, b) => a.startMin - b.startMin);

  let clusters = [];
  let currentCluster = [];
  let clusterEnd = 0;

  dayBlocks.forEach(block => {
    if (currentCluster.length === 0) {
      currentCluster.push(block);
      clusterEnd = block.endMin;
    } else {
      if (block.startMin < clusterEnd) {
        currentCluster.push(block);
        clusterEnd = Math.max(clusterEnd, block.endMin);
      } else {
        clusters.push(currentCluster);
        currentCluster = [block];
        clusterEnd = block.endMin;
      }
    }
  });
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  clusters.forEach(cluster => {
    let columns = [];
    cluster.forEach(block => {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        let lastBlockInCol = columns[i][columns[i].length - 1];
        if (block.startMin >= lastBlockInCol.endMin) {
          columns[i].push(block);
          block.colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        block.colIndex = columns.length;
        columns.push([block]);
      }
    });
    
    let numCols = columns.length;
    cluster.forEach(block => {
      const gridStartMin = state.settings.startHour * 60;
      const topPx = (block.startMin - gridStartMin);
      const heightPx = (block.endMin - block.startMin);
      const isColliding = collidingGroupIds.has(block.grp.id);
      
      const widthPct = 100 / numCols;
      const leftPct = block.colIndex * widthPct;
      const bg = block.grp.color || '#6366f1';
      const textColor = getContrastYIQ(bg);
      
      eventsHtml += `
        <div class="schedule-event ${isColliding ? 'collision' : ''}"
             style="top: ${topPx}px; height: ${heightPx}px; background-color: ${bg}; color: ${textColor}; width: calc(${widthPct}% - 6px); left: calc(${leftPct}% + 3px);"
             onclick="openScheduleTooltip(event, '${block.grp.id}', '${block.startStr}', '${block.endStr}')"
             title="">
          <div class="event-title">${block.grp.subjectName} (${block.grp.classroom})</div>
          <div class="event-details" style="opacity:1; color: ${textColor}; display:flex; align-items:center; gap:4px;"><i data-lucide="user" style="width:12px;height:12px;"></i> ${block.grp.professor}</div>
        </div>
      `;
    });
  });

  return eventsHtml;
}

// 3. RANKING DE PROFESORES VIEW
function renderProfessorsView(container) {
  // Juntar a todos los profesores de todas las materias
  const profList = [];
  state.subjects.forEach(sub => {
    if (sub.groups) {
      sub.groups.forEach(grp => {
        profList.push({
          id: grp.id,
          name: grp.professor,
          rating: grp.professorRating || 0,
          difficulty: grp.professorDifficulty || "Media",
          tags: grp.tags || [],
          review: grp.review || "",
          subjectName: sub.name,
          subjectCode: sub.code,
          groupCode: grp.groupCode,
          classroom: grp.classroom
        });
      });
    }
  });

  // Ordenar de mejor a peor calificación
  profList.sort((a, b) => b.rating - a.rating);

  let html = `
    <div class="page-header">
      <div class="page-title">
        <h2>Ranking de Profesores (Mejor a Peor)</h2>
        <p>Evalúa y compara a los profesores registrados por puntuación, dificultad y reseñas de alumnos.</p>
      </div>
    </div>

    <div class="professors-list" style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color); overflow: hidden;">
      ${profList.map((prof, idx) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); transition: background 0.2s;" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-primary); width: 35px; text-align: right;">#${idx + 1}</div>
            <div>
              <h3 style="font-size: 1.1rem; margin-bottom: 0.1rem; color: var(--text-main);">${prof.name}</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);">${prof.subjectCode}: ${prof.subjectName} (Grupo ${prof.groupCode})</p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 2rem;">
            <div class="star-rating" style="font-size: 1.1rem; display:flex; align-items:center; gap:4px;"><i data-lucide="star" style="width:16px;height:16px; fill:#fbbf24; color:#fbbf24;"></i> ${prof.rating.toFixed(1)}</div>
            <button class="btn btn-secondary btn-sm" onclick="openProfessorModal('${prof.id}')">Ver info</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

function openProfessorModal(groupId) {
  let profData = null;
  for (let sub of state.subjects) {
    if (sub.groups) {
      profData = sub.groups.find(g => g.id === groupId);
      if (profData) {
        profData = { ...profData, subjectName: sub.name, subjectCode: sub.code };
        break;
      }
    }
  }
  if (!profData) return;

  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <div class="modal-header">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 2rem;"><i data-lucide="user" style="width:32px;height:32px;"></i></span>
        <div>
          <h3 style="margin-bottom: 0;">${profData.professor}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0;">${profData.subjectCode} - ${profData.subjectName}</p>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <div style="padding: 0.5rem 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-hover); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
        <div style="text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 700; color: #fbbf24; display:flex; align-items:center; justify-content:center; gap:4px;"><i data-lucide="star" style="width:20px;height:20px; fill:#fbbf24; color:#fbbf24;"></i> ${profData.professorRating.toFixed(1)}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Puntuación</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.5rem;">${profData.professorDifficulty}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Dificultad</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 1rem; font-weight: 600; color: var(--text-main); margin-top: 0.5rem;">${profData.classroom}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Aula Regular</div>
        </div>
      </div>
      
      <h4 style="font-size: 0.9rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.5rem;">Etiquetas y Estilo</h4>
      <div class="tag-cloud" style="margin-bottom: 1.5rem;">
        ${(profData.tags || []).map(t => `<span class="pill-tag">${t}</span>`).join('')}
      </div>

      <h4 style="font-size: 0.9rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 0.5rem;">Reseña de Alumnos</h4>
      <p style="font-size: 0.95rem; line-height: 1.5; color: var(--text-main); padding-left: 1rem; border-left: 3px solid var(--accent-primary); font-style: italic;">
        "${profData.review || 'Sin reseña registrada.'}"
      </p>
    </div>
  `;
  backdrop.classList.add("active");
}

// 4. GESTOR DE MATERIAS Y GRUPOS (CRUD VIEW)
function renderManageView(container) {
  let html = `
    <div class="page-header">
      <div class="page-title">
        <h2>Gestor de Materias, Grupos y Profesores</h2>
        <p>Administra tu catálogo de asignaturas, opciones de grupos, horarios y calificaciones de docentes.</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-outline" onclick="printFullDatabaseReport()"><i data-lucide="printer" style="width:16px;height:16px; margin-right:4px; vertical-align:middle;"></i> Reporte BD</button>
        <button class="btn btn-primary" onclick="openAddSubjectModal()"><i data-lucide="plus" style="width:16px;height:16px; margin-right:4px; vertical-align:middle;"></i> Agregar Nueva Materia</button>
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      ${state.subjects.map(sub => `
        <div class="card" style="border-left: 6px solid ${sub.color || '#6366f1'};">
          <div class="card-header">
            <div>
              <span class="subject-tag" style="background-color: ${sub.color || '#6366f1'};">
                ${sub.code}
              </span>
              <h3 style="font-size: 1.2rem; display: inline-block; margin-left: 0.5rem;">${sub.name}</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
                Créditos: ${sub.credits} | Horas por semana: ${sub.hoursPerWeek} hrs
              </p>
            </div>

            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="openAddGroupModal('${sub.id}')"><i data-lucide="plus" style="width:14px;height:14px; margin-right:4px; vertical-align:middle;"></i> Agregar Grupo/Profesor</button>
              <button class="btn btn-outline btn-sm" onclick="openEditSubjectModal('${sub.id}')"><i data-lucide="edit" style="width:14px;height:14px; margin-right:4px; vertical-align:middle;"></i> Editar</button>
              <button class="btn btn-danger btn-sm" onclick="deleteSubject('${sub.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
            </div>
          </div>

          <h4 style="font-size: 0.9rem; margin-top: 0.5rem; color: var(--text-muted);">Grupos / Profesores disponibles:</h4>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.75rem; margin-top: 0.5rem;">
            ${(sub.groups || []).map(grp => {
              const isSelected = state.selectedGroupIds.includes(grp.id);
              return `
                <div style="background: var(--bg-primary); border: 1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}; border-radius: var(--radius-md); padding: 0.75rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong>Grupo ${grp.groupCode} - ${grp.professor}</strong>
                  </div>
                  <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; display:flex; align-items:center; gap:4px;">
                    <i data-lucide="map-pin" style="width:14px;height:14px;"></i> ${grp.classroom}
                  </p>
                  <div style="font-size: 0.775rem; color: var(--accent-primary); margin-top: 0.25rem; display:flex; align-items:center; gap:4px;">
                    <i data-lucide="calendar" style="width:14px;height:14px;"></i> ${grp.schedule.map(s => `${s.day} ${s.start}-${s.end}`).join(', ')}
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.6rem;">
                    <label style="font-size: 0.8rem; cursor: pointer;">
                      <input type="checkbox" name="select-${sub.id}" ${isSelected ? 'checked' : ''} onchange="toggleSelectGroup('${sub.id}', '${grp.id}')">
                      Mostrar en horario
                    </label>
                    <div style="display: flex; gap: 0.25rem;">
                      <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="openEditGroupModal('${sub.id}', '${grp.id}')"><i data-lucide="edit" style="width:14px;height:14px;"></i></button>
                      <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.4rem; font-size: 0.75rem;" onclick="deleteGroup('${sub.id}', '${grp.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

function toggleSelectGroup(subjectId, groupId) {
  const index = state.selectedGroupIds.indexOf(groupId);
  if (index > -1) {
    state.selectedGroupIds.splice(index, 1);
  } else {
    state.selectedGroupIds.push(groupId);
  }
  saveStateToLocalStorage();
  
  if (state.currentView === "schedule") {
    const mainArea = document.getElementById("view-container");
    if (mainArea) {
      renderScheduleView(mainArea);
    }
    updateSidebarStats();
  } else {
    renderApp();
  }
}

function deleteSubject(subjectId) {
  if (confirm("¿Estás seguro de eliminar esta materia?")) {
    state.subjects = state.subjects.filter(s => s.id !== subjectId);
    saveStateToLocalStorage();
    renderApp();
  }
}

function deleteGroup(subjectId, groupId) {
  const sub = state.subjects.find(s => s.id === subjectId);
  if (sub) {
    sub.groups = sub.groups.filter(g => g.id !== groupId);
    state.selectedGroupIds = state.selectedGroupIds.filter(id => id !== groupId);
    saveStateToLocalStorage();
    renderApp();
  }
}

// MANEJO DE FORMULARIOS Y MODALES
function closeModal() {
  document.getElementById("modal-backdrop").classList.remove("active");
}

function showCustomAlert(title, message, iconName = "info") {
  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  modalContent.innerHTML = `
    <div class="modal-header">
      <h3 style="display:flex; align-items:center; gap:8px;">
        <i data-lucide="${iconName}" style="color:var(--accent-primary); width: 24px; height: 24px;"></i> ${title}
      </h3>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="padding-top: 10px;">
      <p style="margin-bottom: 20px; font-size:16px; color: var(--text-light); line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn btn-primary" onclick="closeModal()">Aceptar</button>
      </div>
    </div>
  `;
  backdrop.classList.add("active");
  if (window.lucide) window.lucide.createIcons();
}

function showCustomConfirm(title, message, iconName, confirmText, confirmClass, onConfirm) {
  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");
  
  window.tempConfirmCallback = () => {
    closeModal();
    onConfirm();
  };

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3 style="display:flex; align-items:center; gap:8px;">
        <i data-lucide="${iconName}" style="color:var(--accent-primary); width: 24px; height: 24px;"></i> ${title}
      </h3>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body" style="padding-top: 10px;">
      <p style="margin-bottom: 20px; font-size:16px; color: var(--text-light); line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button class="btn ${confirmClass}" onclick="window.tempConfirmCallback()">${confirmText}</button>
      </div>
    </div>
  `;
  backdrop.classList.add("active");
  if (window.lucide) window.lucide.createIcons();
}

function openAddSubjectModal() {
  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Agregar Nueva Materia</h3>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <form id="form-add-subject">
      <div class="form-row">
        <div class="form-group">
          <label>Clave de Materia (ej. MAT-101)</label>
          <input type="text" class="form-control" id="new-sub-code" required placeholder="Clave">
        </div>
        <div class="form-group">
          <label>Color Distintivo</label>
          ${renderColorPalette('#6366f1', 'new-sub-color')}
        </div>
      </div>
      <div class="form-group">
        <label>Nombre Completo de Asignatura</label>
        <input type="text" class="form-control" id="new-sub-name" required placeholder="ej. Cálculo Diferencial">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Créditos</label>
          <input type="number" class="form-control" id="new-sub-credits" value="8" min="1">
        </div>
        <div class="form-group">
          <label>Horas a la Semana</label>
          <input type="number" class="form-control" id="new-sub-hours" value="5" min="1">
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Materia</button>
      </div>
    </form>
  `;

  backdrop.classList.add("active");
  if (window.lucide) window.lucide.createIcons();

  document.getElementById("form-add-subject").addEventListener("submit", (e) => {
    e.preventDefault();
    const newSubject = {
      id: "sub-" + Date.now(),
      code: document.getElementById("new-sub-code").value.trim(),
      name: document.getElementById("new-sub-name").value.trim(),
      color: document.getElementById("new-sub-color").value,
      credits: parseInt(document.getElementById("new-sub-credits").value) || 0,
      hoursPerWeek: parseInt(document.getElementById("new-sub-hours").value) || 0,
      groups: []
    };
    state.subjects.push(newSubject);
    saveStateToLocalStorage();
    closeModal();
    renderApp();
  });
}

function openAddGroupModal(subjectId) {
  const sub = state.subjects.find(s => s.id === subjectId);
  if (!sub) return;

  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Agregar Grupo a: ${sub.name}</h3>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <form id="form-add-group">
      <div class="form-row">
        <div class="form-group">
          <label>Código de Grupo (ej. 101-A)</label>
          <input type="text" class="form-control" id="new-grp-code" required placeholder="Grupo">
        </div>
        <div class="form-group">
          <label>Aula / Salón</label>
          <input type="text" class="form-control" id="new-grp-room" placeholder="ej. Aula A-204">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Nombre del Profesor</label>
          <input type="text" class="form-control" id="new-grp-prof" required placeholder="Profesor">
        </div>
        <div class="form-group">
          <label>Puntuación (1.0 a 5.0)</label>
          <input type="number" step="0.1" min="1.0" max="5.0" class="form-control" id="new-grp-rating" value="4.5">
        </div>
      </div>
      <div class="form-group">
        <label>Reseña u Opinión</label>
        <textarea class="form-control" id="new-grp-review" rows="2" placeholder="Comentarios del profesor..."></textarea>
      </div>

      <h4 style="font-size: 0.9rem; margin-top: 1rem; color: var(--accent-primary);">Bloques de Horario (Día y Horas):</h4>
      <div id="new-grp-schedule-list" style="margin-bottom: 0.5rem;"></div>
      <button type="button" class="btn btn-sm" style="margin-top: 0.5rem; background-color: var(--success); color: white;" onclick="addScheduleRow('new-grp-schedule-list')">
        <i data-lucide="plus" style="width:16px;height:16px; margin-right: 4px;"></i> Agregar Horario
      </button>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Grupo</button>
      </div>
    </form>
  `;

  backdrop.classList.add("active");
  addScheduleRow('new-grp-schedule-list');
  if (window.lucide) window.lucide.createIcons();

  document.getElementById("form-add-group").addEventListener("submit", (e) => {
    e.preventDefault();
    const scheduleBlocks = [];
    document.querySelectorAll(".schedule-block-row").forEach(row => {
      const day = row.querySelector(".block-day").value;
      const start = row.querySelector(".block-start").value;
      const end = row.querySelector(".block-end").value;
      if (day && start && end) {
        scheduleBlocks.push({ day, start, end });
      }
    });

    const newGroup = {
      id: "grp-" + Date.now(),
      groupCode: document.getElementById("new-grp-code").value.trim(),
      classroom: document.getElementById("new-grp-room").value.trim() || "Por asignar",
      professor: document.getElementById("new-grp-prof").value.trim(),
      professorRating: parseFloat(document.getElementById("new-grp-rating").value) || 4.0,
      professorDifficulty: "Media",
      tags: ["Registrado por alumno"],
      review: document.getElementById("new-grp-review").value.trim(),
      schedule: scheduleBlocks
    };

    sub.groups.push(newGroup);
    if (!state.selectedGroupIds.some(id => sub.groups.some(g => g.id === id))) {
      state.selectedGroupIds.push(newGroup.id);
    }

    saveStateToLocalStorage();
    closeModal();
    renderApp();
  });
}

function addScheduleRow(containerId) {
  const container = document.getElementById(containerId);
  const div = document.createElement("div");
  div.className = "form-row schedule-block-row";
  div.style.marginTop = "0.5rem";
  div.innerHTML = `
    <select class="form-control block-day">
      <option value="Lun">Lunes</option>
      <option value="Mar">Martes</option>
      <option value="Mie">Miércoles</option>
      <option value="Jue">Jueves</option>
      <option value="Vie">Viernes</option>
      <option value="Sab">Sábado</option>
    </select>
    <div style="display: flex; gap: 0.25rem; align-items: center; width: 100%;">
      <input type="time" class="form-control block-start" value="07:00">
      <span>a</span>
      <input type="time" class="form-control block-end" value="09:00">
      <button type="button" class="btn btn-danger btn-sm" style="margin-left: auto; padding: 0.4rem 0.5rem;" onclick="this.closest('.schedule-block-row').remove()" title="Eliminar"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
    </div>
  `;
  container.appendChild(div);
  if (window.lucide) window.lucide.createIcons();
}

// IMPORTAR Y EXPORTAR ARCHIVO JSON
function exportJSONFile() {
  saveStateToLocalStorage();
  const stateData = {
    term: state.term,
    subjects: state.subjects,
    selectedGroupIds: state.selectedGroupIds,
    theme: state.theme,
    gridStyle: state.gridStyle,
    drafts: state.drafts,
    activeDraftId: state.activeDraftId,
    settings: state.settings
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateData, null, 2));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "horario_respaldo.json");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showCustomAlert("Copia Guardada", "¡Archivo de respaldo descargado exitosamente en tu dispositivo!", "download");
}

function importJSONFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.subjects || !Array.isArray(imported.subjects)) {
        showCustomAlert("Archivo Inválido", "El archivo no tiene el formato válido de horario. Se ignoró la carga.", "alert-triangle");
        return;
      }
      state.subjects = imported.subjects;
      state.term = imported.term || state.term;
      state.selectedGroupIds = imported.selectedGroupIds || getDefaultGroupSelection(state.subjects);
      saveStateToLocalStorage();
      showCustomAlert("Importación Exitosa", "¡Datos de horarios importados correctamente!<br><br><small><i>(No olvides usar el botón 'Guardar' si quieres hacerlos permanentes)</i></small>", "check-circle");
      renderApp();
    } catch (err) {
      showCustomAlert("Archivo Dañado", "El archivo no es un JSON válido. Se ignoró la carga.", "alert-circle");
    }
  };
  reader.readAsText(file);
}

async function resetToDefaultData() {
    showCustomConfirm(
      "Recargar Base de Datos",
      "¿Deseas descartar todos los cambios de tu navegador y recargar el horario base original desde el archivo?",
      "refresh-ccw",
      "Recargar",
      "btn-primary",
      async () => {
        localStorage.removeItem("horarioAppData");
        await loadAppData();
        renderApp();
      }
    );
  }

// MOTOR DE IMPRESION
function triggerPrintSchedule(title, groups) {
  const scheduleHtml = document.querySelector('.schedule-container').outerHTML;
  printReport(title, groups, scheduleHtml);
}

function printFullDatabaseReport() {
  const allGroups = [];
  state.subjects.forEach(sub => {
    if (sub.groups) {
      sub.groups.forEach(g => {
        allGroups.push({ ...g, subjectName: sub.name, subjectCode: sub.code });
      });
    }
  });
  printReport("Reporte Completo - Base de Datos (Materias y Profesores)", allGroups, "");
}

function printReport(title, groupsList, includeGridHtml = '') {
  let printArea = document.getElementById("print-area");
  
  printArea.innerHTML = `
    ${includeGridHtml ? '<style>@media print { @page { size: landscape; margin: 5mm; } body, html { margin: 0; padding: 0; height: 100vh; overflow: hidden; } .schedule-container { width: 100vw; height: 95vh; overflow: hidden; transform: scale(0.85); transform-origin: top center; page-break-inside: avoid; margin-bottom: 0; } }</style>' : ''}
    <div style="margin-bottom: 2rem; border-bottom: 2px solid #000; padding-bottom: 1rem;">
      <h2>${title}</h2>
    </div>
    
    ${includeGridHtml ? `
      <div style="display: flex; justify-content: center; width: 100%;">
        ${includeGridHtml}
      </div>
    ` : `
    <div>
      <h3>Lista Desglosada de Grupos</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
        <thead>
          <tr>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2; text-align: left;">Clave</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2; text-align: left;">Materia</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2; text-align: left;">Grupo</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2; text-align: left;">Profesor</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2; text-align: left;">Aula</th>
            <th style="border: 1px solid #ddd; padding: 8px; background: #f2f2f2; text-align: left;">Horarios</th>
          </tr>
        </thead>
        <tbody>
          ${groupsList.map(g => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;">${g.subjectCode || ''}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${g.subjectName || ''}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${g.groupCode}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${g.professor}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${g.classroom}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${(g.schedule || []).map(s => `${s.day} ${s.start}-${s.end}`).join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    `}
  `;
  
  // Llamar a la ventana de impresion del navegador
  window.print();
  // Limpiar el area de impresion despues de imprimir para no dejar elementos ocultos
  setTimeout(() => { printArea.innerHTML = ''; }, 1000);
}

function openEditSubjectModal(subId) {
  const sub = state.subjects.find(s => s.id === subId);
  if (!sub) return;

  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Editar Materia</h3>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <form id="form-edit-subject">
      <div class="form-row">
        <div class="form-group">
          <label>Clave de Materia</label>
          <input type="text" class="form-control" id="edit-sub-code" value="${sub.code}" required>
        </div>
        <div class="form-group">
          <label>Color Distintivo</label>
          ${renderColorPalette(sub.color || '#6366f1', 'edit-sub-color')}
        </div>
      </div>
      <div class="form-group">
        <label>Nombre Completo de Asignatura</label>
        <input type="text" class="form-control" id="edit-sub-name" value="${sub.name}" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Créditos</label>
          <input type="number" class="form-control" id="edit-sub-credits" value="${sub.credits}" min="1">
        </div>
        <div class="form-group">
          <label>Horas a la Semana</label>
          <input type="number" class="form-control" id="edit-sub-hours" value="${sub.hoursPerWeek}" min="1">
        </div>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </form>
  `;

  backdrop.classList.add("active");

  document.getElementById("form-edit-subject").addEventListener("submit", (e) => {
    e.preventDefault();
    sub.code = document.getElementById("edit-sub-code").value.trim().toUpperCase();
    sub.name = document.getElementById("edit-sub-name").value.trim();
    sub.color = document.getElementById("edit-sub-color").value;
    sub.credits = parseInt(document.getElementById("edit-sub-credits").value) || 8;
    sub.hoursPerWeek = parseInt(document.getElementById("edit-sub-hours").value) || 5;

    saveStateToLocalStorage();
    closeModal();
    renderApp();
  });
}

function openEditGroupModal(subId, groupId) {
  const sub = state.subjects.find(s => s.id === subId);
  if (!sub) return;
  const grp = sub.groups.find(g => g.id === groupId);
  if (!grp) return;

  const backdrop = document.getElementById("modal-backdrop");
  const modalContent = document.getElementById("modal-content");

  modalContent.innerHTML = `
    <div class="modal-header">
      <h3>Editar Grupo de: ${sub.name}</h3>
      <button class="btn btn-secondary btn-sm modal-close" onclick="closeModal()">✕</button>
    </div>
    <form id="form-edit-group">
      <div class="form-row">
        <div class="form-group">
          <label>Código de Grupo</label>
          <input type="text" class="form-control" id="edit-grp-code" value="${grp.groupCode}" required>
        </div>
        <div class="form-group">
          <label>Aula / Salón</label>
          <input type="text" class="form-control" id="edit-grp-room" value="${grp.classroom}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Nombre del Profesor</label>
          <input type="text" class="form-control" id="edit-grp-prof" value="${grp.professor}" required>
        </div>
        <div class="form-group">
          <label>Puntuación</label>
          <input type="number" step="0.1" min="1.0" max="5.0" class="form-control" id="edit-grp-rating" value="${grp.professorRating}">
        </div>
      </div>
      <div class="form-group">
        <label>Reseña u Opinión</label>
        <textarea class="form-control" id="edit-grp-review" rows="2">${grp.review || ''}</textarea>
      </div>

      <h4 style="font-size: 0.9rem; margin-top: 1rem; color: var(--accent-primary);">Bloques de Horario:</h4>
      <div id="edit-grp-schedule-list" style="margin-bottom: 0.5rem;"></div>
      <button type="button" class="btn btn-sm" style="margin-top: 0.5rem; background-color: var(--success); color: white;" onclick="addScheduleRow('edit-grp-schedule-list')">
        <i data-lucide="plus" style="width:16px;height:16px; margin-right: 4px;"></i> Agregar Horario
      </button>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar Cambios</button>
      </div>
    </form>
  `;

  backdrop.classList.add("active");
  
  const scheduleContainer = document.getElementById("edit-grp-schedule-list");
  grp.schedule.forEach(block => {
    const div = document.createElement("div");
    div.className = "form-row schedule-block-row";
    div.style.marginTop = "0.5rem";
    div.innerHTML = `
      <select class="form-control block-day">
        ${["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"].map(d => `<option value="${d}" ${block.day === d ? 'selected' : ''}>${d}</option>`).join('')}
      </select>
      <div style="display: flex; gap: 0.25rem; align-items: center; width: 100%;">
        <input type="time" class="form-control block-start" value="${block.start}">
        <span>a</span>
        <input type="time" class="form-control block-end" value="${block.end}">
        <button type="button" class="btn btn-danger btn-sm" style="margin-left: auto; padding: 0.4rem 0.5rem;" onclick="this.closest('.schedule-block-row').remove()" title="Eliminar"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
      </div>
    `;
    scheduleContainer.appendChild(div);
  });
  if (window.lucide) window.lucide.createIcons();

  document.getElementById("form-edit-group").addEventListener("submit", (e) => {
    e.preventDefault();
    const scheduleBlocks = [];
    document.querySelectorAll(".schedule-block-row").forEach(row => {
      const day = row.querySelector(".block-day").value;
      const start = row.querySelector(".block-start").value;
      const end = row.querySelector(".block-end").value;
      if (day && start && end) {
        scheduleBlocks.push({ day, start, end });
      }
    });

    grp.groupCode = document.getElementById("edit-grp-code").value.trim();
    grp.classroom = document.getElementById("edit-grp-room").value.trim() || "Por asignar";
    grp.professor = document.getElementById("edit-grp-prof").value.trim();
    grp.professorRating = parseFloat(document.getElementById("edit-grp-rating").value) || 4.0;
    grp.review = document.getElementById("edit-grp-review").value.trim();
    grp.schedule = scheduleBlocks;

    saveStateToLocalStorage();
    closeModal();
    renderApp();
  });
}

// 5. CONFIGURACIoN
function openSettingsModal() {
  const overlay = document.getElementById("settings-modal-overlay");
  const container = document.getElementById("settings-modal-container");
  if (!overlay || !container) return;

  const modalBody = container.querySelector('.settings-modal-body');
  const scrollPos = modalBody ? modalBody.scrollTop : 0;

  const allDays = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  
  let html = `
    <div class="settings-modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
      <div class="page-title" style="margin: 0;">
        <h2 style="margin: 0; font-size: 1.5rem;">Configuración</h2>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem;">Personaliza las preferencias visuales y funcionales de tu organizador.</p>
      </div>
      <button class="icon-btn" onclick="closeSettingsModal()" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 0.5rem; border-radius: 50%; transition: background 0.2s;">
        <i data-lucide="x" style="width:24px;height:24px;"></i>
      </button>
    </div>
    
    <div class="settings-modal-body" style="max-height: 70vh; overflow-y: auto; padding-right: 0.5rem;">
        <div class="card" style="padding: 1rem; border: 1px solid var(--border-color); background: var(--bg-card); display: flex; flex-direction: column; gap: 1rem;">
          <h3 style="font-size: 1.1rem; margin: 0; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="calendar" style="width:18px;height:18px; color:var(--accent-primary);"></i> Días Visibles
          </h3>
        
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; margin-top: 0.25rem;">
          Selecciona qué días de la semana deseas mostrar en la cuadrícula de horarios.
        </p>
        
        <div style="display: flex; flex-wrap: wrap; gap: 0.75rem;">
          ${allDays.map(day => {
            const isChecked = state.settings.activeDays.includes(day);
            return `
              <label style="display: flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer; transition: border-color 0.2s;">
                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleDayVisibility('${day}', this.checked)">
                ${day}
              </label>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="card" style="margin-top: 1.5rem;">
        <div class="card-header" style="display:flex; align-items:center;">
          <i data-lucide="clock" style="width:20px;height:20px; margin-right:8px;"></i>
          <h3 style="font-size: 1.1rem; margin:0;">Rango de Horas</h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; margin-top: 0.25rem;">
          Configura el rango de horas visible en tu cuadrícula del horario.
        </p>
        
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size: 0.9rem;">
            Hora de Inicio:
            <select id="config-start-hour" class="form-input" style="width: 120px;" onchange="updateHourRange()">
              ${Array.from({length: 24}, (_, i) => `<option value="${i}" ${state.settings.startHour === i ? 'selected' : ''}>${i.toString().padStart(2, '0')}:00</option>`).join('')}
            </select>
          </label>
          <label style="display:flex; flex-direction:column; gap:0.25rem; font-size: 0.9rem;">
            Hora de Fin:
            <select id="config-end-hour" class="form-input" style="width: 120px;" onchange="updateHourRange()">
              ${Array.from({length: 24}, (_, i) => `<option value="${i}" ${state.settings.endHour === i ? 'selected' : ''}>${i.toString().padStart(2, '0')}:00</option>`).join('')}
            </select>
          </label>
        </div>
      </div>

      <!-- Personalización Visual: Temas -->
      <div class="card" style="margin-top: 1.5rem;">
        <div class="card-header" style="display:flex; align-items:center;">
          <i data-lucide="palette" style="width:20px;height:20px; margin-right:8px;"></i>
          <h3 style="font-size: 1.1rem; margin:0;">Tema Visual Completo</h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; margin-top: 0.25rem;">
          Selecciona una paleta estética predefinida para transformar toda la interfaz.
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 0.75rem;">
          ${[
            { id: 'dark', name: 'Oscuro', color: '#0f172a' },
            { id: 'light', name: 'Claro', color: '#ffffff' },
            { id: 'cyberpunk', name: 'Cyberpunk', color: '#ff0055' },
            { id: 'dracula', name: 'Drácula', color: '#bd93f9' },
            { id: 'pastel', name: 'Pastel', color: '#b5838d' },
            { id: 'nordic', name: 'Nordic', color: '#88c0d0' },
            { id: 'sepia', name: 'Retro Sepia', color: '#9e472a' }
          ].map(t => `
            <button type="button" 
                    style="display:flex; flex-direction:column; align-items:center; padding:0.6rem; border-radius: var(--radius-md); border: 2px solid ${state.theme === t.id ? 'var(--accent-primary)' : 'var(--border-color)'}; background: var(--bg-secondary); cursor:pointer; transition: all 0.2s;"
                    onclick="changeTheme('${t.id}')">
              <span style="width:24px; height:24px; border-radius:50%; background-color: ${t.color}; border: 1px solid rgba(255,255,255,0.3); margin-bottom: 0.4rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></span>
              <span style="font-size: 0.75rem; font-weight: 500; color: var(--text-main);">${t.name}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Estilo de Cuadrícula -->
      <div class="card" style="margin-top: 1.5rem; margin-bottom: 1rem;">
        <div class="card-header" style="display:flex; align-items:center;">
          <i data-lucide="layout-grid" style="width:20px;height:20px; margin-right:8px;"></i>
          <h3 style="font-size: 1.1rem; margin:0;">Estilo de Cuadrícula de Horarios</h3>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; margin-top: 0.25rem;">
          Elige la textura y acabado visual de la tabla semanal.
        </p>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
          ${[
            { id: 'default', name: 'Estándar', desc: 'Líneas limpias e interfaz sólida' },
            { id: 'glass', name: 'Glassmorphism', desc: 'Efecto cristal traslúcido y sombras' },
            { id: 'rounded', name: 'Redondeado', desc: 'Bordes suaves y tarjetas flotantes' },
            { id: 'dots', name: 'Puntos Minimalistas', desc: 'Fondo de cuadrícula de puntos' }
          ].map(g => `
            <button type="button" 
                    style="text-align:left; padding:0.75rem; border-radius: var(--radius-md); border: 2px solid ${state.gridStyle === g.id ? 'var(--accent-primary)' : 'var(--border-color)'}; background: var(--bg-secondary); cursor:pointer; transition: border-color 0.2s;"
                    onclick="changeGridStyle('${g.id}')">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${g.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${g.desc}</div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;
  overlay.classList.remove("hidden");
  
  const newModalBody = container.querySelector('.settings-modal-body');
  if (newModalBody) {
    newModalBody.scrollTop = scrollPos;
  }
  
  if (window.lucide) window.lucide.createIcons({ root: container });
}

window.closeSettingsModal = function() {
  const overlay = document.getElementById("settings-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
};

window.changeTheme = function(themeName) {
  state.theme = themeName;
  document.body.setAttribute("data-theme", themeName);
  saveStateToLocalStorage();
  renderApp();
  openSettingsModal();
};

window.changeGridStyle = function(styleName) {
  state.gridStyle = styleName;
  saveStateToLocalStorage();
  renderApp();
  openSettingsModal();
};

window.updateHourRange = function() {
  const start = parseInt(document.getElementById("config-start-hour").value);
  const end = parseInt(document.getElementById("config-end-hour").value);
  if (start <= end) {
    state.settings.startHour = start;
    state.settings.endHour = end;
    saveStateToLocalStorage();
    renderApp();
    openSettingsModal();
  } else {
    alert("La hora de inicio debe ser menor a la hora de fin.");
  }
};

window.toggleDayVisibility = function(day, isChecked) {
  const activeDays = new Set(state.settings.activeDays);
  if (isChecked) {
    activeDays.add(day);
  } else {
    activeDays.delete(day);
  }
  
  const order = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  state.settings.activeDays = order.filter(d => activeDays.has(d));
  saveStateToLocalStorage();
  renderApp();
  openSettingsModal();
};

function openAboutModal() {
  const overlay = document.getElementById("about-modal-overlay");
  const container = document.getElementById("about-modal-container");
  if (!overlay || !container) return;
  
  let html = `
    <div class="settings-modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 1rem;">
      <div class="page-title" style="margin: 0;">
        <h2 style="margin: 0; font-size: 1.5rem;">Acerca de</h2>
        <p style="margin: 0.25rem 0 0 0; font-size: 0.85rem;">Información sobre el proyecto y créditos.</p>
      </div>
      <button class="icon-btn" onclick="closeAboutModal()" style="background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 0.5rem; border-radius: 50%; transition: background 0.2s;">
        <i data-lucide="x" style="width:24px;height:24px;"></i>
      </button>
    </div>
    
    <div class="settings-modal-body" style="text-align: center; padding: 2rem 1rem; max-height: 70vh; overflow-y: auto;">
      <div style="margin-bottom: 1rem; display: flex; justify-content: center;">
        <i data-lucide="graduation-cap" style="width: 64px; height: 64px; color: var(--accent-primary);"></i>
      </div>
      <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--accent-primary);">Organizador de Horario Escolar</h3>
      <p style="font-size: 1rem; color: var(--text-main); margin-bottom: 2rem; max-width: 450px; margin-left: auto; margin-right: auto; line-height: 1.5;">
        Una herramienta interactiva disenada para ayudar a los estudiantes universitarios y de distintos niveles a planificar 
        su reinscripcion, organizar su horario y gestionar sus materias y profesores de forma visual.
      </p>
      
      <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 1.5rem;">
        <p style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Creado y Disenado por</p>
        <p style="font-size: 1.5rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">Rafael Piedra Sanchez</p>
        <a href="https://github.com/rafa11512" target="_blank" title="GitHub Profile" style="display: inline-block; margin-top: 10px; color: var(--text-main); text-decoration: none; transition: color 0.2s;">
          <i data-lucide="github" style="width: 24px; height: 24px;"></i>
        </a>
      </div>
    </div>
  `;
  container.innerHTML = html;
  overlay.classList.remove("hidden");
  if (window.lucide) window.lucide.createIcons({ root: container });
}

window.closeAboutModal = function() {
  const overlay = document.getElementById("about-modal-overlay");
  if (overlay) overlay.classList.add("hidden");
};

// 7. RIGHT SIDEBAR (TREE MENU)
function toggleRightSidebar() {
  const sidebar = document.getElementById("right-sidebar");
  if (sidebar.style.display === "none" || !sidebar.style.display) {
    sidebar.style.display = "flex";
    state.isRightSidebarOpen = true;
  } else {
    sidebar.style.display = "none";
    state.isRightSidebarOpen = false;
  }
}

window.toggleRightSidebar = toggleRightSidebar;

function toggleTreeSubject(subjectId) {
  const content = document.getElementById("tree-sub-" + subjectId);
  if (content.style.display === "none") {
    content.style.display = "flex";
  } else {
    content.style.display = "none";
  }
}

window.toggleTreeSubject = toggleTreeSubject;

function renderRightSidebar() {
  const container = document.getElementById("tree-menu-container");
  if (!container) return;

  let html = '';
  state.subjects.forEach(sub => {
    html += `
      <div class="tree-node-subject">
        <div class="tree-node-header">
          <span style="display:flex; align-items:center; gap:0.5rem; overflow:hidden;">
            <div style="min-width:12px; height:12px; border-radius:50%; background-color:${sub.color || '#6366f1'}"></div>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${sub.name}</span>
          </span>
        </div>
        <div class="tree-node-children" id="tree-sub-${sub.id}" style="display: flex;">
          ${(sub.groups || []).map(grp => {
            const isSelected = state.selectedGroupIds.includes(grp.id);
            return `
              <div class="tree-node-group">
                <span title="${grp.professor}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">
                  Grp: ${grp.groupCode} - ${grp.professor}
                </span>
                <label class="switch" style="margin-left:auto;">
                  <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelectGroup('${sub.id}', '${grp.id}')">
                  <span class="slider"></span>
                </label>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.openScheduleTooltip = function(event, groupId, start, end) {
  event.stopPropagation();
  let tooltip = document.getElementById('global-schedule-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'global-schedule-tooltip';
    tooltip.className = 'schedule-tooltip';
    document.body.appendChild(tooltip);
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.schedule-event') && !e.target.closest('.schedule-tooltip')) {
        tooltip.classList.remove('show');
      }
    });
    
    window.addEventListener('scroll', () => {
      tooltip.classList.remove('show');
    }, true);
  }

  let grpData = null;
  for (const sub of state.subjects) {
    if (sub.groups) {
      const g = sub.groups.find(x => x.id === groupId);
      if (g) {
        grpData = { ...g, subjectName: sub.name, subjectCode: sub.code, color: sub.color };
        break;
      }
    }
  }

  if (!grpData) return;

  tooltip.innerHTML = `
    <h4 style="margin-bottom: 0.5rem; color: ${grpData.color || 'var(--accent-primary)'};">${grpData.subjectCode} - ${grpData.subjectName}</h4>
    <p style="font-size: 0.85rem; margin-bottom: 0.25rem;"><strong>Grupo:</strong> ${grpData.groupCode}</p>
    <p style="font-size: 0.85rem; margin-bottom: 0.25rem;"><strong>Profesor:</strong> ${grpData.professor}</p>
    <p style="font-size: 0.85rem; margin-bottom: 0.25rem;"><strong>Aula:</strong> ${grpData.classroom}</p>
    <p style="font-size: 0.85rem; margin-bottom: 0;"><strong>Horario:</strong> ${start} - ${end}</p>
  `;

  const rect = event.currentTarget.getBoundingClientRect();
  tooltip.style.left = (rect.left + rect.width / 2) + 'px';
  tooltip.style.top = (rect.top + window.scrollY) + 'px';
  tooltip.classList.add('show');
};
