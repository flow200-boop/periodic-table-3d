import { elements } from './elements.js';
import { AtomViewer } from './atom-viewer.js';

// Application State
const state = {
  currentTemp: 298, // In Kelvin (approx 25 C)
  activeCategory: null,
  searchQuery: "",
  selectedElement: null,
  viewerInstance: null,
  isCloudMode: false,
  showPaths: true
};

// Category Mapping for UI Displays
const categoriesMap = {
  "reactive-nonmetal": "Reactive Nonmetals",
  "noble-gas": "Noble Gases",
  "alkali-metal": "Alkali Metals",
  "alkaline-earth-metal": "Alkaline Earths",
  "metalloid": "Metalloids",
  "post-transition-metal": "Post-Transition",
  "transition-metal": "Transition Metals",
  "lanthanide": "Lanthanides",
  "actinide": "Actinides"
};

// Category hex colors for inline CSS mapping
const categoryColors = {
  "reactive-nonmetal": "#38bdf8",
  "noble-gas": "#ec4899",
  "alkali-metal": "#ef4444",
  "alkaline-earth-metal": "#f97316",
  "metalloid": "#eab308",
  "post-transition-metal": "#10b981",
  "transition-metal": "#3b82f6",
  "lanthanide": "#8b5cf6",
  "actinide": "#d946ef"
};

// DOM References
const elementsGrid = document.getElementById('periodic-table');
const searchInput = document.getElementById('search-input');
const tempRange = document.getElementById('temp-range');
const tempValDisplay = document.getElementById('temp-val-display');
const filtersContainer = document.getElementById('filters-container');
const drawerOverlay = document.getElementById('drawer-overlay');
const elementDrawer = document.getElementById('element-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');

// Drawer Details Fields
const drawerSymBox = document.getElementById('drawer-sym-box');
const drawerTitle = document.getElementById('drawer-title');
const drawerCategory = document.getElementById('drawer-category');
const factMass = document.getElementById('fact-mass');
const factDensity = document.getElementById('fact-density');
const factDensityUnit = document.getElementById('fact-density-unit');
const factMelt = document.getElementById('fact-melt');
const factBoil = document.getElementById('fact-boil');
const factNeg = document.getElementById('fact-neg');
const factState = document.getElementById('fact-state');
const drawerDescription = document.getElementById('drawer-description');
const drawerShellConfig = document.getElementById('drawer-shell-config');
const drawerShellList = document.getElementById('drawer-shell-list');
const drawerDiscoverer = document.getElementById('drawer-discoverer');
const drawerDiscoverYear = document.getElementById('drawer-discover-year');

// Three.js Panel Buttons
const btnBohrMode = document.getElementById('btn-bohr-mode');
const btnCloudMode = document.getElementById('btn-cloud-mode');
const btnTogglePaths = document.getElementById('btn-toggle-paths');

// Initialize the Application
function initApp() {
  // 1. Render Category Filter Badges
  renderFilters();
  
  // 2. Render Periodic Grid Layout
  renderPeriodicGrid();
  
  // 3. Hydrate Initial Stats and Temperatures
  updateTemperatureStates(state.currentTemp);
  
  // 4. Bind Dashboard Event Listeners
  bindEvents();
}

// 1. Generates Filter Badges Programmatically
function renderFilters() {
  // Add "All Elements" Badge
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All Elements';
  allBtn.style.setProperty('--cat-color', 'rgba(255,255,255,0.4)');
  allBtn.addEventListener('click', () => selectCategory(null, allBtn));
  filtersContainer.appendChild(allBtn);

  // Add individual category badges
  Object.keys(categoriesMap).forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = categoriesMap[key];
    btn.style.setProperty('--cat-color', categoryColors[key]);
    btn.addEventListener('click', () => selectCategory(key, btn));
    filtersContainer.appendChild(btn);
  });
}

// 2. Renders the Periodic Grid
function renderPeriodicGrid() {
  elementsGrid.innerHTML = '';
  
  // Generate Lanthanide & Actinide Placeholder Cells
  // Lanthanides spacer card at Period 6, Col 3
  const lanCell = document.createElement('div');
  lanCell.className = 'element-card placeholder-card';
  lanCell.style.gridRow = '6';
  lanCell.style.gridColumn = '3';
  lanCell.style.setProperty('--cat-color', categoryColors['lanthanide']);
  lanCell.innerHTML = `
    <div class="element-header"><span class="atomic-number">57-71</span></div>
    <div class="element-symbol" style="font-size: 1.1rem; color: var(--text-secondary)">La-Lu</div>
    <div class="element-footer"><span class="element-name" style="font-size: 0.55rem">Lanthanides</span></div>
  `;
  elementsGrid.appendChild(lanCell);

  // Actinides spacer card at Period 7, Col 3
  const actCell = document.createElement('div');
  actCell.className = 'element-card placeholder-card';
  actCell.style.gridRow = '7';
  actCell.style.gridColumn = '3';
  actCell.style.setProperty('--cat-color', categoryColors['actinide']);
  actCell.innerHTML = `
    <div class="element-header"><span class="atomic-number">89-103</span></div>
    <div class="element-symbol" style="font-size: 1.1rem; color: var(--text-secondary)">Ac-Lr</div>
    <div class="element-footer"><span class="element-name" style="font-size: 0.55rem">Actinides</span></div>
  `;
  elementsGrid.appendChild(actCell);

  // Inject 118 Elements Cards
  elements.forEach(el => {
    const card = document.createElement('div');
    card.className = 'element-card';
    card.id = `el-${el.number}`;
    card.setAttribute('data-number', el.number);
    
    // Grid Positions logic mapping standard vs lanthanides vs actinides
    let row = el.period;
    let col = el.group;
    
    if (el.number >= 57 && el.number <= 71) {
      row = 9; // Lanthanides row placement
      col = el.number - 57 + 4; // Shift starting from column 4
    } else if (el.number >= 89 && el.number <= 103) {
      row = 10; // Actinides row placement
      col = el.number - 89 + 4; // Shift starting from column 4
    }
    
    card.style.gridRow = row.toString();
    card.style.gridColumn = col.toString();
    
    // Inject visual properties using Custom CSS Properties
    card.style.setProperty('--cat-color', categoryColors[el.category]);
    
    card.innerHTML = `
      <div class="element-header">
        <span class="atomic-number">${el.number}</span>
        <div class="state-badge" id="badge-${el.number}" style="--state-color: var(--state-solid)"></div>
      </div>
      <div class="element-symbol">${el.symbol}</div>
      <div class="element-footer">
        <span class="element-name">${el.name}</span>
        <span class="element-mass">${el.mass.toFixed(2)}</span>
      </div>
    `;
    
    card.addEventListener('click', () => openElementDetail(el));
    
    elementsGrid.appendChild(card);
  });

  // Inject standard spacing rows to separate actinides nicely
  const spacer = document.createElement('div');
  spacer.className = 'lanthanide-spacer';
  spacer.style.gridRow = '8';
  spacer.style.gridColumn = '1 / span 18';
  elementsGrid.appendChild(spacer);
}

// 3. Recalculates States of Matter dynamically depending on temperature input
function updateTemperatureStates(tempK) {
  // Convert K to C and F for rich display details
  const tempC = Math.round(tempK - 273.15);
  tempValDisplay.textContent = `${tempK} K | ${tempC} °C`;
  
  let solids = 0, liquids = 0, gases = 0, synthetics = 0;
  
  elements.forEach(el => {
    let state = "solid";
    
    if (el.meltingPoint === null && el.boilingPoint === null) {
      state = "synthetic"; // Synthesized elements with unknown states
    } else if (tempK < el.meltingPoint) {
      state = "solid";
    } else if (tempK >= el.meltingPoint && (el.boilingPoint === null || tempK < el.boilingPoint)) {
      state = "liquid";
    } else {
      state = "gas";
    }
    
    // Increment specific state metrics
    if (state === "solid") solids++;
    else if (state === "liquid") liquids++;
    else if (state === "gas") gases++;
    else if (state === "synthetic") synthetics++;
    
    // Update individual state badge inside cards
    const badge = document.getElementById(`badge-${el.number}`);
    if (badge) {
      badge.style.setProperty('--state-color', `var(--state-${state})`);
    }
  });

  // Update Stats UI Numbers
  document.getElementById('count-solid').textContent = solids;
  document.getElementById('count-liquid').textContent = liquids;
  document.getElementById('count-gas').textContent = gases;
  document.getElementById('count-synth').textContent = synthetics;
}

// 4. Coordinates Search & Filters Matching
function applyFiltersAndSearch() {
  const query = state.searchQuery.toLowerCase().trim();
  const cat = state.activeCategory;
  
  elements.forEach(el => {
    const card = document.getElementById(`el-${el.number}`);
    if (!card) return;
    
    const matchesSearch = query === "" || 
      el.name.toLowerCase().includes(query) || 
      el.symbol.toLowerCase().includes(query) || 
      el.number.toString() === query;
      
    const matchesCategory = cat === null || el.category === cat;
    
    if (matchesSearch && matchesCategory) {
      card.classList.remove('dimmed');
    } else {
      card.classList.add('dimmed');
    }
  });
}

// 5. Select Category Filter Click Handler
function selectCategory(categoryKey, activeBtn) {
  // Update UI active buttons classes
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  activeBtn.classList.add('active');
  
  state.activeCategory = categoryKey;
  applyFiltersAndSearch();
}

// 6. Detailed Element Drawer Drawer Triggering
function openElementDetail(el) {
  state.selectedElement = el;
  
  // Hydrate text metrics inside Drawer
  drawerSymBox.textContent = el.symbol;
  drawerSymBox.style.borderColor = categoryColors[el.category];
  drawerSymBox.style.boxShadow = `0 0 15px ${categoryColors[el.category]}33`;
  drawerSymBox.style.color = categoryColors[el.category];
  
  drawerTitle.innerHTML = `${el.name} <span>#${el.number}</span>`;
  drawerCategory.textContent = categoriesMap[el.category];
  drawerCategory.style.color = categoryColors[el.category];
  
  factMass.textContent = el.mass;
  
  // Density display formatting
  if (el.density === null) {
    factDensity.textContent = "Unknown";
    factDensityUnit.style.display = "none";
  } else {
    factDensity.textContent = el.density;
    factDensityUnit.style.display = "inline";
  }
  
  // Melting & Boiling point details
  factMelt.textContent = el.meltingPoint === null ? "Unknown" : `${el.meltingPoint}`;
  factBoil.textContent = el.boilingPoint === null ? "Unknown" : `${el.boilingPoint}`;
  factNeg.textContent = el.electronegativity === null ? "N/A" : el.electronegativity.toFixed(2);
  
  // State at Current Selected Simulation Temperature
  let currentState = "solid";
  if (el.meltingPoint === null && el.boilingPoint === null) {
    currentState = "synthetic";
  } else if (state.currentTemp < el.meltingPoint) {
    currentState = "solid";
  } else if (state.currentTemp >= el.meltingPoint && (el.boilingPoint === null || state.currentTemp < el.boilingPoint)) {
    currentState = "liquid";
  } else {
    currentState = "gas";
  }
  factState.textContent = currentState;
  factState.style.color = `var(--state-${currentState})`;
  
  drawerDescription.textContent = el.summary;
  drawerShellConfig.textContent = el.shellConfig;
  
  // Hydrate Bohr Shell listing details in tabular formats
  drawerShellList.innerHTML = '';
  const shellLabels = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  el.shells.forEach((electrons, idx) => {
    const item = document.createElement('div');
    item.className = 'shell-dot-item';
    item.style.setProperty('--cat-color', categoryColors[el.category]);
    item.innerHTML = `
      <label>Shell ${idx + 1} (${shellLabels[idx] || '?'})</label>
      <span>${electrons} e⁻</span>
    `;
    drawerShellList.appendChild(item);
  });
  
  drawerDiscoverer.textContent = el.discoverer;
  drawerDiscoverYear.textContent = el.discoveryYear;
  
  // Initialize and load the 3D WebGL Scene
  if (!state.viewerInstance) {
    state.viewerInstance = new AtomViewer('canvas3d');
  }
  
  // Sync visualization settings to panel button displays
  state.viewerInstance.setVisualizationMode(state.isCloudMode ? 'cloud' : 'bohr');
  state.viewerInstance.toggleOrbitPaths(state.showPaths);
  state.viewerInstance.loadElement(el);
  
  // Open drawers elements
  drawerOverlay.classList.add('open');
  elementDrawer.classList.add('open');
}

function closeElementDetail() {
  drawerOverlay.classList.remove('open');
  elementDrawer.classList.remove('open');
  state.selectedElement = null;
}

// 7. Bind All Interactive DOM Actions
function bindEvents() {
  // Search text input change event
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    applyFiltersAndSearch();
  });
  
  // Temperature simulation range changes
  tempRange.addEventListener('input', (e) => {
    state.currentTemp = parseInt(e.target.value);
    updateTemperatureStates(state.currentTemp);
    
    // Sync state text details live if element detail is currently open
    if (state.selectedElement) {
      let currentState = "solid";
      const el = state.selectedElement;
      if (el.meltingPoint === null && el.boilingPoint === null) {
        currentState = "synthetic";
      } else if (state.currentTemp < el.meltingPoint) {
        currentState = "solid";
      } else if (state.currentTemp >= el.meltingPoint && (el.boilingPoint === null || state.currentTemp < el.boilingPoint)) {
        currentState = "liquid";
      } else {
        currentState = "gas";
      }
      factState.textContent = currentState;
      factState.style.color = `var(--state-${currentState})`;
    }
  });
  
  // Drawers closures handlers
  closeDrawerBtn.addEventListener('click', closeElementDetail);
  drawerOverlay.addEventListener('click', closeElementDetail);
  
  // Keyboard bindings (Escape key closes drawer)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeElementDetail();
  });
  
  // Three.js Panel Mode togglers
  btnBohrMode.addEventListener('click', () => {
    state.isCloudMode = false;
    btnBohrMode.classList.add('active');
    btnCloudMode.classList.remove('active');
    if (state.viewerInstance) {
      state.viewerInstance.setVisualizationMode('bohr');
    }
  });
  
  btnCloudMode.addEventListener('click', () => {
    state.isCloudMode = true;
    btnCloudMode.classList.add('active');
    btnBohrMode.classList.remove('active');
    if (state.viewerInstance) {
      state.viewerInstance.setVisualizationMode('cloud');
    }
  });
  
  btnTogglePaths.addEventListener('click', () => {
    state.showPaths = !state.showPaths;
    btnTogglePaths.classList.toggle('active', state.showPaths);
    if (state.viewerInstance) {
      state.viewerInstance.toggleOrbitPaths(state.showPaths);
    }
  });
}

// Fire up the engine!
document.addEventListener('DOMContentLoaded', initApp);
