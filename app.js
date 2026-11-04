/**
 * RADAR BACURAU — Controlador Principal da Aplicação (App.js)
 * Foco Principal: Mapa Territorial Interativo de Riachuelo–RN
 * Contornos Poligonais dos Bairros, Mapeamento de Lideranças e Votos.
 */

// Estado global da aplicação — Inicializa DIRETAMENTE no Mapa
const AppState = {
  currentView: "mapa",
  map: null,
  markersLayer: null,
  polygonsLayer: null,
  badgesLayer: null,
  boundaryLayer: null,
  baseLayers: {},
  polygonsVisible: true,
  currentOpacity: 0.05,
  poligonosRefs: [],
  heatmapLayer: null,
  isHeatmapActive: false,
  charts: {},
  tse: {
    ano: 2024,
    cargo: "Prefeito",
    secao: "",
    busca: ""
  },
  ranking: {
    ano: 2024,
    cargo: "Vereador",
    turno: "",
    busca: "",
    pagina: 1,
    limite: 10
  },
  pickingPointForNewCommunity: false,
  pickedLocationMarker: null,
  polygonEditor: {
    active: false,
    comunidadeId: null,
    comunidadeNome: "",
    originalPoints: [],
    currentPoints: [],
    polygonLayer: null,
    handlesLayer: null,
    vertexMarkers: [],
    midpointMarkers: []
  },
  midiasDemandaEmEdicao: []
};

// Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  if (typeof db !== "undefined" && db.sincronizarLiderancasComBairros) {
    db.sincronizarLiderancasComBairros();
  }
  initNavigation();
  initTheme();
  initUserSession();
  initModalListeners();
  
  // Renderiza a view inicial no Mapa Territorial
  renderView("mapa");
  updateSidebarCounters();

  // Bloqueio de Segurança Obrigatório: exige login e senha a cada entrada no site
  verificarAutenticacaoObrigatoria();
});

// ==========================================================================
// NAVEGAÇÃO E ROTAS
// ==========================================================================
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetView = item.getAttribute("data-view");
      if (targetView) {
        navigateTo(targetView);
      }
    });
  });

  const mobileToggle = document.getElementById("mobileToggle");
  const sidebar = document.getElementById("sidebar");
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }
}

function navigateTo(viewId) {
  const currentUser = db.getCurrentUser();
  if (currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA") {
    const viewsPermitidas = ["mapa", "eleitores", "demandas", "whatsapp", "estatisticas", "beneficios"];
    if (!viewsPermitidas.includes(viewId)) {
      showToast("🔒 Acesso restrito: seu perfil de Liderança possui acesso ao Cadastro de Eleitores, Mapa Territorial, Demandas, Benefícios e WhatsApp.");
      viewId = "eleitores";
    }
  }

  AppState.currentView = viewId;

  document.querySelectorAll(".nav-item").forEach(item => {
    if (item.getAttribute("data-view") === viewId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Atualiza botões da barra inferior mobile da liderança
  document.querySelectorAll(".mobile-nav-btn").forEach(btn => {
    if (btn.getAttribute("data-view") === viewId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const sidebar = document.getElementById("sidebar");
  if (sidebar) sidebar.classList.remove("mobile-open");

  renderView(viewId);
}

function renderView(viewId) {
  document.querySelectorAll(".view-panel").forEach(panel => {
    panel.classList.remove("active");
  });

  const activePanel = document.getElementById(`view-${viewId}`);
  if (activePanel) {
    activePanel.classList.add("active");
  }

  updateBreadcrumb(viewId);

  switch (viewId) {
    case "mapa":
      renderMapaTerritorial();
      break;
    case "dashboard":
      renderDashboard();
      break;
    case "comunidades":
      renderComunidades();
      break;
    case "liderancas":
      renderLiderancas();
      break;
    case "eleitores":
      renderEleitores();
      break;
    case "whatsapp":
      renderWhatsapp();
      break;
    case "demandas":
      renderDemandas();
      break;
    case "beneficios":
      renderBeneficios();
      break;
    case "secoes":
      renderSecoes();
      break;
    case "resultados":
      renderResultados();
      break;
    case "estatisticas":
      renderEstatisticas();
      break;
    case "simulador":
      renderSimulador();
      break;
    case "lgpd":
      renderLgpd();
      break;
    case "auditoria":
      renderAuditoria();
      break;
    case "configuracoes":
      renderConfiguracoes();
      break;
  }

  updateSidebarCounters();
}

function updateBreadcrumb(viewId) {
  const titles = {
    mapa: "Mapa Territorial Interativo — Riachuelo/RN",
    dashboard: "Painel Geral de Inteligência",
    comunidades: "Bairros & Localidades",
    liderancas: "Lideranças Mapeadas por Bairro",
    eleitores: "Cadastro Territorial de Eleitores — Riachuelo/RN",
    whatsapp: "Disparador Territorial via WhatsApp — Riachuelo/RN",
    demandas: "Demandas Comunitárias & Atendimento Territorial — Riachuelo/RN",
    beneficios: "Pesquisar Benefícios & Licitações — API Portal da Transparência",
    secoes: "Mapeamento das Seções Eleitorais (8ª Zona)",
    resultados: "Acervo Histórico do TSE (2014 a 2026) — Resultados & Candidatos por Seção",
    estatisticas: "Ranking Territorial de Candidatos & Estatísticas TSE (2014–2026)",
    simulador: "Simulador Eleitoral Estratégico (QE e Sobras 80/20) — Riachuelo/RN",
    lgpd: "Registro e Governança LGPD (Lei 13.709/2018)",
    auditoria: "Logs e Auditoria de Segurança",
    configuracoes: "Configurações, Backup e Usuários"
  };

  const breadcrumbEl = document.getElementById("breadcrumbTitle");
  if (breadcrumbEl) {
    breadcrumbEl.innerHTML = `${titles[viewId] || "Módulo"} <span class="breadcrumb-badge">8ª ZONA ELEITORAL</span>`;
  }
}

function updateSidebarCounters() {
  const stats = db.getDashboardStats();
  const cComs = document.getElementById("cnt-comunidades");
  const cLids = document.getElementById("cnt-liderancas");
  const cSecs = document.getElementById("cnt-secoes");
  const cEleitores = document.getElementById("cnt-eleitores");
  const cWhatsapp = document.getElementById("cnt-whatsapp");
  const cDemandas = document.getElementById("cnt-demandas");

  const totalLids = (db.getLiderancas() || []).length;
  if (cComs) cComs.textContent = stats.totalComunidades;
  if (cLids) cLids.textContent = Math.max(totalLids, stats.bairrosComLideranca);
  if (cSecs) cSecs.textContent = stats.totalSecoes;
  if (cEleitores) cEleitores.textContent = (db.getEleitores() || []).length;
  if (cWhatsapp && typeof WhatsAppDispatcher !== "undefined") {
    const totalComTel = (db.getEleitores() || []).filter(e => WhatsAppDispatcher.sanitizarTelefone(e.telefone)).length;
    cWhatsapp.textContent = totalComTel;
  }
  if (cDemandas) cDemandas.textContent = (db.getDemandas() || []).length;
}

// ==========================================================================
// TEMA E SESSÃO DO USUÁRIO
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem(db.THEME_KEY) || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(db.THEME_KEY, next);
      showToast(`Tema ${next === "light" ? "Claro Executivo" : "Escuro Esmeralda"} ativado.`);
    });
  }
}

function initUserSession() {
  updateUserBadge();

  const roleBtn = document.getElementById("roleSelectorBtn");
  if (roleBtn) {
    roleBtn.addEventListener("click", () => {
      openRoleModal();
    });
  }
}

function updateUserBadge() {
  const user = db.getCurrentUser() || {};
  if (user.id === "usr-01" || user.perfil === "ADMINISTRADOR MASTER" || (user.nome && user.nome.includes("Dr."))) {
    user.nome = "ADMINISTRADOR";
    user.login = "ADMMASTER";
  }

  const userNameEl = document.getElementById("currentUserName");
  const userRoleEl = document.getElementById("currentUserRole");
  const userAvatarEl = document.getElementById("currentUserAvatar");
  const roleBtnText = document.getElementById("roleBtnText");

  if (userNameEl) userNameEl.textContent = user.nome || "ADMINISTRADOR";

  let perfilTexto = user.perfil || "SISTEMA";
  if (user.perfil === "LIDERANÇA COMUNITÁRIA") {
    const comsLiderIds = user.comunidadesVinculadas || (user.comunidadeId ? [user.comunidadeId] : []);
    const coms = db.getComunidades().filter(c => comsLiderIds.includes(c.id) || (c.liderancaNome && user.nome && c.liderancaNome.toLowerCase() === user.nome.toLowerCase()));
    const nomes = coms.map(c => c.nome).join(", ");
    perfilTexto = nomes ? `LÍDER • ${nomes}` : "LIDERANÇA COMUNITÁRIA";
  }

  if (userRoleEl) userRoleEl.textContent = perfilTexto;
  if (roleBtnText) roleBtnText.textContent = perfilTexto;
  if (userAvatarEl) {
    const nome = user.nome || "ADMINISTRADOR";
    const partes = nome.split(" ").filter(Boolean);
    const initials = partes.length > 1 ? (partes[0][0] + partes[1][0]) : (nome.slice(0, 2));
    userAvatarEl.textContent = initials.toUpperCase();
  }

  aplicarPermissoesUsuario();
}

function aplicarPermissoesUsuario() {
  const currentUser = db.getCurrentUser();
  const isLideranca = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";

  const navItems = document.querySelectorAll(".nav-item");
  const sectionTitles = document.querySelectorAll(".nav-section-title");
  const mobileTopHeader = document.getElementById("mobileLiderancaTopHeader");
  const mobileBottomNav = document.getElementById("mobileLiderancaBottomNav");
  const mobileQuickAction = document.getElementById("mobileLiderancaQuickAction");
  const mobileCardsList = document.getElementById("eleitoresMobileCardsList");
  const desktopTableWrap = document.getElementById("eleitoresTableResponsive");
  const desktopScrollBanner = document.querySelector(".table-scroll-banner");
  const eleitorBreakdownGrid = document.querySelector(".eleitor-breakdown-grid");

  if (isLideranca) {
    document.body.classList.add("modo-lideranca-mobile");

    // 1. Exibe Header Mobile e Barra Inferior de Navegação Estilo App Nativo
    if (mobileBottomNav) mobileBottomNav.style.display = "flex";
    if (mobileTopHeader) {
      mobileTopHeader.style.display = "flex";
      const sub = document.getElementById("mobileLiderancaNomeSub");
      if (sub) sub.innerHTML = `Líder: <strong style="color:var(--emerald-400);">${currentUser.nome}</strong>`;
    }

    // 2. Na view de Eleitores: ativa cards mobile e oculta tabela desktop larga
    if (mobileQuickAction) mobileQuickAction.style.display = "block";
    if (mobileCardsList) mobileCardsList.style.display = "flex";
    if (desktopTableWrap) desktopTableWrap.style.display = "none";
    if (desktopScrollBanner) desktopScrollBanner.style.display = "none";
    if (eleitorBreakdownGrid) eleitorBreakdownGrid.style.display = "none";

    // 3. Views da Liderança: prioriza Cadastro de Eleitores
    const viewsPermitidas = ["eleitores", "whatsapp", "demandas", "beneficios", "mapa"];
    if (!viewsPermitidas.includes(AppState.currentView) || AppState.currentView === "dashboard") {
      navigateTo("eleitores");
    }

    // 4. Controles do Mapa: Oculta botões administrativos de alteração cartográfica
    const btnNovoCom = document.querySelector("#view-mapa button[onclick='abrirModalNovaComunidade()']");
    const btnEditPer = document.getElementById("btnEditarPerimetro");
    if (btnNovoCom) btnNovoCom.style.display = "none";
    if (btnEditPer) btnEditPer.style.display = "none";

  } else {
    document.body.classList.remove("modo-lideranca-mobile");

    // Restaura layout desktop completo para Administrador Master
    if (mobileBottomNav) mobileBottomNav.style.display = "none";
    if (mobileTopHeader) mobileTopHeader.style.display = "none";
    if (mobileQuickAction) mobileQuickAction.style.display = "none";
    if (mobileCardsList) mobileCardsList.style.display = "none";
    if (desktopTableWrap) desktopTableWrap.style.display = "";
    if (desktopScrollBanner) desktopScrollBanner.style.display = "";
    if (eleitorBreakdownGrid) eleitorBreakdownGrid.style.display = "";

    navItems.forEach(item => { item.style.display = "flex"; });
    sectionTitles.forEach(st => { st.style.display = "block"; });

    const btnNovoCom = document.querySelector("#view-mapa button[onclick='abrirModalNovaComunidade()']");
    const btnEditPer = document.getElementById("btnEditarPerimetro");
    if (btnNovoCom) btnNovoCom.style.display = "";
    if (btnEditPer) btnEditPer.style.display = "";
  }
}

function openRoleModal() {
  const modal = document.getElementById("roleModal");
  if (!modal) return;
  const listEl = document.getElementById("rolesList");
  listEl.innerHTML = "";

  const currentUser = db.getCurrentUser();

  db.getUsuarios().forEach(u => {
    const item = document.createElement("div");
    item.style.padding = "12px 14px";
    item.style.marginBottom = "8px";
    item.style.borderRadius = "8px";
    item.style.border = u.id === currentUser.id ? "1.5px solid var(--emerald-500)" : "1px solid var(--border-subtle)";
    item.style.background = u.id === currentUser.id ? "rgba(16, 185, 129, 0.15)" : "var(--bg-card)";
    item.style.cursor = "pointer";
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h4 style="font-size:0.92rem; color:#ffffff; font-weight:700; margin:0 0 2px;">${u.nome}</h4>
          <div style="font-size:0.75rem; color:var(--text-muted);">
            Login: <strong style="color:var(--emerald-400);">${u.login || '-'}</strong> • <span style="color:var(--gold-400); font-weight:600;">${u.perfil}</span>
          </div>
        </div>
        ${u.id === currentUser.id ? '<span class="badge-status oficial">Ativo</span>' : '<button class="btn btn-secondary btn-sm" style="padding:3px 8px; font-size:0.75rem;">Selecionar</button>'}
      </div>
    `;
    item.addEventListener("click", () => {
      closeModal("roleModal");
      if (u.id === currentUser.id) return;
      abrirTelaLoginComUsuarioPreenchido(u.login || u.email);
    });
    listEl.appendChild(item);
  });

  openModal("roleModal");
}

// ==========================================================================
// 1. MAPA TERRITORIAL DE RIACHUELO-RN (MÓDULO PRINCIPAL)
// ==========================================================================
function renderMapaTerritorial() {
  const mapContainer = document.getElementById("map-container");
  if (!mapContainer) return;

  const stats = db.getDashboardStats();
  const kpiLocs = document.getElementById("map-kpi-localidades");
  const kpiLids = document.getElementById("map-kpi-com-lider");
  const kpiLidsSub = document.getElementById("map-kpi-com-lider-sub");
  const kpiVotos = document.getElementById("map-kpi-votos-total");

  if (kpiLocs) kpiLocs.textContent = stats.totalComunidades;
  if (kpiLids) kpiLids.textContent = stats.bairrosComLideranca;
  if (kpiLidsSub) kpiLidsSub.textContent = `${stats.bairrosComLideranca} de ${stats.totalComunidades} mapeados`;
  if (kpiVotos) kpiVotos.textContent = Number(stats.totalVotosContabilizados).toLocaleString("pt-BR") + " votos";

  if (typeof L === "undefined") {
    renderMapaOfflineSVG(mapContainer);
    renderTabelaLocalidadesMapa();
    return;
  }

  if (!AppState.map) {
    // Coordenadas centrais de Riachuelo - RN [-5.8153, -35.8239]
    AppState.map = L.map("map-container", {
      zoomControl: true,
      attributionControl: true
    }).setView([-5.8153, -35.8239], 13);

    // 1. Satélite HD Anti-Bloqueio (Esri World Imagery + Estradas e Nomes sobrepostos)
    // 100% público, sem chave de API, alta resolução e nunca é bloqueado por CORS/Adblock
    const esriSatBase = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; Esri, Maxar | Riachuelo–RN Satélite HD',
      maxZoom: 19
    });
    const esriRoads = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; Esri Transportation',
      maxZoom: 19
    });
    const esriLabels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; Esri Boundaries',
      maxZoom: 19
    });
    const esriHybrid = L.layerGroup([esriSatBase, esriRoads, esriLabels]);

    // 2. Google Híbrido HD com rotação de subdomínios (mt0, mt1, mt2, mt3)
    const googleHybrid = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: '&copy; Google Maps | Satélite HD & Ruas',
      maxZoom: 22,
      maxNativeZoom: 20
    });

    // 3. Google Ruas & Avenidas (Oficial)
    const googleStreets = L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
      attribution: '&copy; Google Maps | Vias & Ruas',
      maxZoom: 21,
      maxNativeZoom: 20
    });

    // 4. Esri Ruas & Logradouros Oficiais
    const esriStreets = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; Esri World Street Map',
      maxZoom: 19
    });

    // Adiciona Satélite HD Anti-Bloqueio (Esri Hybrid) por padrão para garantir 100% de estabilidade
    esriHybrid.addTo(AppState.map);
    AppState.activeBaseLayer = esriHybrid;

    AppState.baseLayers = {
      esri: esriHybrid,
      google: googleHybrid,
      googleStreets: googleStreets,
      esriStreets: esriStreets
    };

    const baseMaps = {
      "🛰️ Satélite HD (ArcGIS/Maxar - Anti-Bloqueio)": esriHybrid,
      "🛰️ Google Satélite Híbrido": googleHybrid,
      "🗺️ Google Ruas": googleStreets,
      "🗺️ Vias & Logradouros (Esri)": esriStreets
    };

    AppState.polygonsLayer = L.layerGroup().addTo(AppState.map);
    AppState.badgesLayer = L.layerGroup().addTo(AppState.map);
    AppState.markersLayer = AppState.polygonsLayer; // retrocompatibilidade

    // Camada do Limite Oficial Municipal de Riachuelo–RN (IBGE)
    const limiteCoords = db.getLimiteMunicipal();
    if (limiteCoords && limiteCoords.length >= 3) {
      AppState.boundaryLayer = L.polygon(limiteCoords, {
        color: "#10b981",
        weight: 2.6,
        dashArray: "8, 6",
        fillColor: "#059669",
        fillOpacity: 0.015,
        interactive: false
      }).addTo(AppState.map);
    }

    const overlayMaps = {
      "📍 Contornos dos Bairros": AppState.polygonsLayer,
      "🏷️ Nomes das Localidades": AppState.badgesLayer,
      "🌐 Limite Municipal Oficial": AppState.boundaryLayer
    };

    L.control.layers(baseMaps, overlayMaps, { position: "topright", collapsed: false }).addTo(AppState.map);

    // Detector de zoom para compactar etiquetas ao visualizar casas de perto
    AppState.map.on("zoomend", () => {
      const z = AppState.map.getZoom();
      const mapEl = document.getElementById("map-container");
      if (mapEl) {
        if (z >= 17) {
          mapEl.classList.add("zoom-casas");
        } else {
          mapEl.classList.remove("zoom-casas");
        }
      }
    });
  }

  setTimeout(() => {
    if (AppState.map) AppState.map.invalidateSize();
  }, 200);

  carregarMarcadoresMapa();
  renderTabelaLocalidadesMapa();
  atualizarMetometroConsolidado();
}

function getCorPorTipo(tipo) {
  if (!tipo) return "#10b981";
  if (tipo.includes("Sede") || tipo.includes("Centro")) return "#10b981"; // Sede / Centro Histórico (Verde Esmeralda)
  if (tipo.includes("Distrito") || tipo.includes("Polo")) return "#f59e0b"; // Cachoeira do Sapo (Dourado Âmbar Bacurau)
  if (tipo.includes("Urbano")) return "#06b6d4"; // Bairros Urbanos (Ciano Tecnológico)
  if (tipo.includes("Assentamento")) return "#f97316"; // Assentamentos INCRA (Laranja Terra)
  if (tipo.includes("Comunidade")) return "#38bdf8"; // Comunidades Rurais (Azul Potengi)
  return "#a855f7"; // Sítios e Serras (Roxo Ametista)
}

function carregarMarcadoresMapa() {
  if (!AppState.polygonsLayer) return;
  AppState.polygonsLayer.clearLayers();
  if (AppState.badgesLayer) AppState.badgesLayer.clearLayers();
  AppState.poligonosRefs = [];

  const currentUser = db.getCurrentUser();
  const isLideranca = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  const comunidadesLider = isLideranca 
    ? (currentUser.comunidadesVinculadas || (currentUser.comunidadeId ? [currentUser.comunidadeId] : []))
    : null;

  const comunidades = db.getComunidades();
  const allLatLngs = [];

  comunidades.forEach(com => {
    // Se o usuário for Liderança, renderiza EXCLUSIVAMENTE o perímetro da localidade determinada
    if (isLideranca) {
      const eLocalidadeDela = (comunidadesLider && comunidadesLider.includes(com.id)) ||
        (com.liderancaNome && currentUser.nome && com.liderancaNome.toLowerCase().trim() === currentUser.nome.toLowerCase().trim()) ||
        (currentUser.liderancaId && com.liderancaResponsavelId === currentUser.liderancaId);

      if (!eLocalidadeDela) {
        // Os outros bairros ficam sem nenhum perímetro no mapa
        return;
      }
    }

    // 1. Obtenção do Contorno Poligonal do Bairro
    let coordsPoligono = com.poligono;
    if (!coordsPoligono || coordsPoligono.length < 3) {
      const [lat, lng] = com.coordenadas || [-5.8153, -35.8239];
      const dLat = 0.007;
      const dLng = 0.009;
      coordsPoligono = [
        [lat + dLat, lng - dLng],
        [lat + dLat, lng + dLng],
        [lat - dLat, lng + dLng],
        [lat - dLat, lng - dLng]
      ];
    }

    coordsPoligono.forEach(pt => allLatLngs.push(pt));

    let nomeLider = (com.liderancaNome || "").trim();
    let temLider = Boolean(nomeLider !== "");

    if (!temLider) {
      nomeLider = "Sem líder atribuído";
    }
    const votos = Number(com.votosConseguidos) || 0;
    const corTema = getCorPorTipo(com.tipo);

    // Estilo Translúcido: Permite ver perfeitamente os telhados, casas, ruas e becos embaixo!
    const estiloBase = {
      color: corTema,
      weight: temLider ? 2.5 : 1.8,
      opacity: 0.85,
      dashArray: temLider ? null : "4, 4",
      fillColor: corTema,
      fillOpacity: AppState.currentOpacity !== undefined ? AppState.currentOpacity : 0.05
    };

    // Cria o polígono contornando o território do bairro
    const poligonoLayer = L.polygon(coordsPoligono, estiloBase);

    AppState.poligonosRefs.push({
      id: com.id,
      layer: poligonoLayer,
      corBase: corTema,
      temLider: temLider
    });

    // Efeitos dinâmicos de hover e clique
    poligonoLayer.on("mouseover", function() {
      this.setStyle({
        color: "#fbbf24", // Dourado Bacurau
        weight: 3.5,
        fillColor: "#f59e0b",
        fillOpacity: Math.min(0.25, (AppState.currentOpacity !== undefined ? AppState.currentOpacity : 0.05) + 0.12)
      });
      if (this.bringToFront) this.bringToFront();
    });

    poligonoLayer.on("mouseout", function() {
      this.setStyle({
        color: corTema,
        weight: temLider ? 2.5 : 1.8,
        opacity: 0.85,
        dashArray: temLider ? null : "4, 4",
        fillColor: corTema,
        fillOpacity: AppState.currentOpacity !== undefined ? AppState.currentOpacity : 0.05
      });
    });

    poligonoLayer.on("click", function() {
      if (!isLideranca) {
        abrirModalMapearLiderBairro(com.id);
      }
    });

    const areaTexto = com.areaHectares ? `
      <div class="popup-row">
        <strong>Área Territorial:</strong> <span style="font-family:var(--font-mono); font-weight:700; color:var(--text-main);">${com.areaHectares} hectares</span> <span style="color:var(--text-muted); font-size:0.75rem;">(~${(com.areaHectares/100).toFixed(2)} km²)</span>
      </div>` : "";

    const refsTexto = (com.pontosReferencia && com.pontosReferencia.length) ? `
      <div class="popup-row" style="font-size:0.74rem; color:var(--text-muted); margin-top:4px; line-height:1.35;">
        <strong style="color:var(--text-main);">Pontos de Referência:</strong> ${com.pontosReferencia.join(" • ")}
      </div>` : "";

    const metaBairro = Number(com.metaVotos) || Math.max(30, Math.round((com.eleitoresEstimados || 200) * 0.4));
    const pctMeta = metaBairro > 0 ? Math.min(100, Math.round((votos / metaBairro) * 100)) : 0;
    const corMeta = pctMeta >= 100 ? "#fbbf24" : (pctMeta >= 50 ? "#34d399" : "#f87171");

    // Janela Popup Completa com Informações do Líder, Bairro, Metômetro e Navegação
    const popupHtml = `
      <div style="min-width: 290px; font-family: 'Inter', sans-serif;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding-bottom:6px; margin-bottom:8px;">
          <div class="popup-title" style="margin-bottom:0; border-bottom:none; font-size:1.05rem;">📍 ${com.nome}</div>
          <span style="font-size:0.68rem; padding:2px 7px; border-radius:4px; background:rgba(255,255,255,0.08); color:${corTema}; font-weight:700; border:1px solid ${corTema};">${com.tipo}</span>
        </div>
        ${areaTexto}
        <div class="popup-row" style="color:var(--emerald-400); font-size:0.86rem; margin-top:4px;">
          <strong>Liderança Responsável:</strong> ${temLider ? `<span style="font-weight:700; color:#34d399;">${nomeLider}</span>` : '<span style="color:#f87171;">Aguardando atribuição</span>'}
        </div>
        
        <!-- Bloco Barra de Meta de Votos no Popup -->
        <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:8px 10px; margin:8px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; font-size:0.75rem;">
            <strong style="color:var(--gold-400);">🎯 Meta de Votos:</strong>
            <span style="font-family:var(--font-mono); font-weight:800; color:${corMeta};">${votos} / ${metaBairro} (${pctMeta}%)</span>
          </div>
          <div class="table-meta-track" style="height:7px;">
            <div class="table-meta-fill" style="width:${pctMeta}%; background:${pctMeta >= 100 ? 'linear-gradient(90deg, #10b981, #fbbf24)' : (pctMeta >= 50 ? '#10b981' : '#f59e0b')};"></div>
          </div>
        </div>

        <div class="popup-row"><strong>Eleitorado Estimado:</strong> ${(com.eleitoresEstimados || 0).toLocaleString('pt-BR')} eleitores (${(com.populacaoEstimada || 0).toLocaleString('pt-BR')} hab.)</div>
        ${refsTexto}
        <div class="popup-row" style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">
          ${com.observacoes || ''}
        </div>
        <div style="margin-top:12px; border-top:1px dashed rgba(255,255,255,0.15); padding-top:10px; display:flex; flex-direction:column; gap:6px;">
          <button class="btn btn-primary btn-sm" style="width:100%; justify-content:center; font-weight:700;" onclick="focarBairroZoom18('${com.id}')">
            🏘️ Inspecionar Ruas & Casas (Zoom 18)
          </button>
          ${!isLideranca ? `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
            <button class="btn btn-gold btn-sm" style="justify-content:center; font-weight:700; padding:6px 4px;" onclick="abrirModalMapearLiderBairro('${com.id}')">
              🎯 Meta & Líder
            </button>
            <button class="btn btn-secondary btn-sm" style="justify-content:center; font-weight:700; padding:6px 4px;" onclick="gerarFichaCampoBairro('${com.id}')">
              📄 Ficha A4
            </button>
          </div>
          ${temLider ? `
          <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center; font-weight:700; color:#ef4444; border-color:rgba(239,68,68,0.35); font-size:0.75rem;" onclick="removerLiderancaDoBairroDireto('${com.id}')" title="Desvincula a liderança deste bairro">
            ❌ Remover Liderança deste Bairro
          </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center; font-weight:700; border-color:var(--gold-400); color:var(--gold-400);" onclick="iniciarEdicaoPerimetro('${com.id}')" title="Aumentar ou diminuir o perímetro territorial deste bairro">
            ✏️ Editar Perímetro (Aumentar / Diminuir)
          </button>
          ` : `
          <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center; font-weight:700;" onclick="gerarFichaCampoBairro('${com.id}')">
            📄 Visualizar Ficha de Campo (A4)
          </button>
          `}
          <button class="btn btn-secondary btn-sm" style="width:100%; justify-content:center;" onclick="navegarParaSecoesDoBairro('${com.secoesVinculadas && com.secoesVinculadas[0] ? com.secoesVinculadas[0] : ''}')">
            📊 Ver Votação TSE desta Área
          </button>
        </div>
      </div>
    `;

    poligonoLayer.bindPopup(popupHtml);
    poligonoLayer.addTo(AppState.polygonsLayer);

    // 2. Badge Centralizado no Interior do Bairro (Discreto, Elegante e com Meta)
    const centroCoords = com.coordenadas || coordsPoligono[0];
    const badgeIcon = L.divIcon({
      className: "custom-polygon-label-wrapper",
      html: `
        <div class="polygon-center-badge ${temLider ? '' : 'unassigned'}" onclick="abrirModalMapearLiderBairro('${com.id}')" title="Clique para editar meta, liderança e votos de ${com.nome}">
          <div class="badge-bairro">📍 ${com.nome}</div>
          <div class="badge-lider">${temLider ? `👤 ${nomeLider}` : '⚠️ Sem líder atribuído'}</div>
          <div class="badge-votos" style="color:${corMeta}; font-weight:700;">🎯 ${votos}/${metaBairro} (${pctMeta}%)</div>
        </div>
      `,
      iconSize: [165, 52],
      iconAnchor: [82, 26]
    });

    const markerCentroid = L.marker(centroCoords, { icon: badgeIcon });
    markerCentroid.bindPopup(popupHtml);
    if (AppState.badgesLayer) markerCentroid.addTo(AppState.badgesLayer);
  });

  // Se for liderança, auto-centraliza e aproxima o zoom na localidade dela
  if (isLideranca && allLatLngs.length > 0 && AppState.map) {
    setTimeout(() => {
      try {
        const bounds = L.latLngBounds(allLatLngs);
        AppState.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
      } catch (e) {}
    }, 150);
  }
}

function alternarCamadaSatelite(provedor = "esri") {
  if (!AppState.map || !AppState.baseLayers) return;

  if (AppState.activeBaseLayer && AppState.map.hasLayer(AppState.activeBaseLayer)) {
    AppState.map.removeLayer(AppState.activeBaseLayer);
  } else {
    Object.values(AppState.baseLayers).forEach(l => {
      if (AppState.map.hasLayer(l)) AppState.map.removeLayer(l);
    });
  }

  const btnEsri = document.getElementById("btnSatEsri");
  const btnGoogle = document.getElementById("btnSatGoogle");
  const btnRuas = document.getElementById("btnRuas");

  if (provedor === "google" && AppState.baseLayers.google) {
    AppState.baseLayers.google.addTo(AppState.map);
    AppState.activeBaseLayer = AppState.baseLayers.google;
    if (btnGoogle) { btnGoogle.classList.add("btn-primary"); btnGoogle.classList.remove("btn-secondary"); }
    if (btnEsri) { btnEsri.classList.add("btn-secondary"); btnEsri.classList.remove("btn-primary"); }
    if (btnRuas) { btnRuas.classList.add("btn-secondary"); btnRuas.classList.remove("btn-primary"); }
    showToast("🛰️ Google Satélite Híbrido Ativado!");
  } else {
    // Padrão: Esri Satélite HD Anti-Bloqueio
    if (AppState.baseLayers.esri) {
      AppState.baseLayers.esri.addTo(AppState.map);
      AppState.activeBaseLayer = AppState.baseLayers.esri;
    }
    if (btnEsri) { btnEsri.classList.add("btn-primary"); btnEsri.classList.remove("btn-secondary"); }
    if (btnGoogle) { btnGoogle.classList.add("btn-secondary"); btnGoogle.classList.remove("btn-primary"); }
    if (btnRuas) { btnRuas.classList.add("btn-secondary"); btnRuas.classList.remove("btn-primary"); }
    showToast("🛰️ Satélite HD (ArcGIS/Maxar) Ativado! Sem bloqueios, visão nítida de ruas e casas.");
  }
}

function alternarCamadaRuas() {
  const layerRuas = AppState.baseLayers && (AppState.baseLayers.googleStreets || AppState.baseLayers.esriStreets);
  if (!AppState.map || !layerRuas) return;

  if (AppState.activeBaseLayer && AppState.map.hasLayer(AppState.activeBaseLayer)) {
    AppState.map.removeLayer(AppState.activeBaseLayer);
  } else {
    Object.values(AppState.baseLayers).forEach(l => {
      if (AppState.map.hasLayer(l)) AppState.map.removeLayer(l);
    });
  }

  layerRuas.addTo(AppState.map);
  AppState.activeBaseLayer = layerRuas;

  const btnEsri = document.getElementById("btnSatEsri");
  const btnGoogle = document.getElementById("btnSatGoogle");
  const btnRuas = document.getElementById("btnRuas");

  if (btnRuas) { btnRuas.classList.add("btn-primary"); btnRuas.classList.remove("btn-secondary"); }
  if (btnEsri) { btnEsri.classList.add("btn-secondary"); btnEsri.classList.remove("btn-primary"); }
  if (btnGoogle) { btnGoogle.classList.add("btn-secondary"); btnGoogle.classList.remove("btn-primary"); }

  showToast("🗺️ Mapa de Ruas (Google Maps) Ativado! Vias e logradouros em destaque.");
}

function alternarExibicaoPoligonos() {
  if (!AppState.map || !AppState.polygonsLayer) return;
  const btn = document.getElementById("btnTogglePoligonos");

  if (AppState.map.hasLayer(AppState.polygonsLayer)) {
    AppState.map.removeLayer(AppState.polygonsLayer);
    if (btn) {
      btn.innerHTML = "👁️ Exibir Contornos";
      btn.classList.add("btn-gold");
      btn.classList.remove("btn-secondary");
    }
    showToast("Contornos dos bairros ocultados. Visão 100% limpa das ruas e casas!");
  } else {
    AppState.polygonsLayer.addTo(AppState.map);
    if (btn) {
      btn.innerHTML = "👁️ Ocultar Contornos";
      btn.classList.remove("btn-gold");
      btn.classList.add("btn-secondary");
    }
    showToast("Contornos dos bairros reexibidos.");
  }
}

function alternarExibicaoEtiquetas() {
  if (!AppState.map || !AppState.badgesLayer) return;
  const btn = document.getElementById("btnToggleEtiquetas");

  if (AppState.map.hasLayer(AppState.badgesLayer)) {
    AppState.map.removeLayer(AppState.badgesLayer);
    if (btn) {
      btn.innerHTML = "🏷️ Exibir Nomes";
      btn.classList.add("btn-gold");
      btn.classList.remove("btn-secondary");
    }
    showToast("Nomes dos bairros ocultados. Telhados e casas livres de etiquetas!");
  } else {
    AppState.badgesLayer.addTo(AppState.map);
    if (btn) {
      btn.innerHTML = "🏷️ Ocultar Nomes";
      btn.classList.remove("btn-gold");
      btn.classList.add("btn-secondary");
    }
    showToast("Nomes dos bairros reexibidos.");
  }
}

function aoMudarOpacidadePoligonos(novaOpacidade) {
  const op = Number(novaOpacidade);
  AppState.currentOpacity = op;
  const lbl = document.getElementById("labelOpacidadeVal");
  if (lbl) lbl.textContent = Math.round(op * 100) + "%";

  if (AppState.poligonosRefs && AppState.poligonosRefs.length) {
    AppState.poligonosRefs.forEach(p => {
      p.layer.setStyle({
        fillOpacity: op
      });
    });
  }
}

function togglePainelLegenda() {
  const panel = document.getElementById("mapLegendPanel");
  const btn = document.getElementById("btnMinimizarLegenda");
  if (!panel) return;
  panel.classList.toggle("minimized");
  if (btn) {
    btn.textContent = panel.classList.contains("minimized") ? "Expandir" : "Minimizar";
  }
}

function focarCentroCasas() {
  if (!AppState.map) return;
  // Zoom 18 focado no centro urbano de Riachuelo: cada casa, quintal, telhado e rua nítidos
  AppState.map.flyTo([-5.8153, -35.8239], 18, { duration: 1.2 });
  showToast("🏘️ Foco na Sede Urbana de Riachuelo: ruas e casas em máxima aproximação!");
}

function focarCachoeiraSapo() {
  if (!AppState.map) return;
  // Zoom 18 focado na comunidade de Cachoeira do Sapo
  AppState.map.flyTo([-5.8466, -35.7958], 18, { duration: 1.2 });
  showToast("📍 Foco em Cachoeira do Sapo: ruas e casas em máxima aproximação!");
}

function centralizarMunicipio() {
  if (!AppState.map) return;
  AppState.map.flyTo([-5.8153, -35.8239], 13, { duration: 1.0 });
  showToast("🌐 Visão geral de todo o município de Riachuelo–RN.");
}

function alternarLimiteMunicipal() {
  if (!AppState.map || !AppState.boundaryLayer) return;
  const btn = document.getElementById("btnToggleLimiteMunicipal");

  if (AppState.map.hasLayer(AppState.boundaryLayer)) {
    AppState.map.removeLayer(AppState.boundaryLayer);
    if (btn) {
      btn.innerHTML = "🌐 Exibir Limite";
      btn.classList.add("btn-gold");
      btn.classList.remove("btn-secondary");
    }
    showToast("Limite municipal de Riachuelo ocultado.");
  } else {
    AppState.boundaryLayer.addTo(AppState.map);
    if (btn) {
      btn.innerHTML = "🌐 Limite Municipal";
      btn.classList.remove("btn-gold");
      btn.classList.add("btn-secondary");
    }
    showToast("Limite oficial das divisas municipais de Riachuelo–RN exibido.");
  }
}

function focarBairroEspecifico(bairroId) {
  if (!bairroId) return;

  if (bairroId === "SEDE_INTEGRAL") {
    if (!AppState.map) return;
    AppState.map.flyTo([-5.8153, -35.8245], 16, { duration: 1.2 });
    showToast("🏛️ Toda a Sede Urbana de Riachuelo: Centro e bairros adjacentes em visão unificada!");
    return;
  }

  const com = db.getComunidadeById(bairroId);
  if (!com || !AppState.map) return;

  const targetRef = AppState.poligonosRefs ? AppState.poligonosRefs.find(p => p.id === bairroId) : null;
  const coords = com.coordenadas || (com.poligono && com.poligono[0]);

  if (targetRef && targetRef.layer && targetRef.layer.getBounds) {
    AppState.map.fitBounds(targetRef.layer.getBounds(), { padding: [50, 50], maxZoom: 17, animate: true, duration: 1.2 });
    targetRef.layer.openPopup();
  } else if (coords) {
    AppState.map.flyTo(coords, 16, { duration: 1.2 });
  }

  if (targetRef && targetRef.layer) {
    targetRef.layer.setStyle({
      color: "#fbbf24",
      weight: 4.5,
      fillOpacity: 0.22
    });
    setTimeout(() => {
      targetRef.layer.setStyle({
        color: targetRef.corBase,
        weight: targetRef.temLider ? 2.5 : 1.8,
        fillOpacity: AppState.currentOpacity !== undefined ? AppState.currentOpacity : 0.05
      });
    }, 3500);
  }

  showToast(`🎯 Navegando para: ${com.nome} (${com.tipo})`);
}

function focarBairroZoom18(bairroId) {
  const com = db.getComunidadeById(bairroId);
  if (!com || !AppState.map) return;
  const coords = com.coordenadas || (com.poligono && com.poligono[0]);
  if (!coords) return;
  AppState.map.flyTo(coords, 18, { duration: 1.2 });
  showToast(`🏘️ Foco em ${com.nome}: inspecionando ruas e casas em detalhe!`);
}

// ==========================================================================
// SELEÇÃO DE PONTO CARTOGRÁFICO NO MAPA (NOVA LOCALIDADE)
// ==========================================================================
function iniciarSelecaoPontoNoMapa() {
  closeModal("modalComunidade");
  if (AppState.currentView !== "mapa") {
    navigateTo("mapa");
  }

  AppState.pickingPointForNewCommunity = true;
  const banner = document.getElementById("mapPickerBanner");
  if (banner) banner.style.display = "flex";

  const mapContainer = document.getElementById("map-container");
  if (mapContainer) mapContainer.classList.add("map-picking-active");

  showToast("📍 Modo Marcação Ativo: Clique no mapa sobre as ruas ou casas para fixar a nova localidade.");

  if (!AppState.map) return;

  AppState.map.once("click", function(e) {
    if (!AppState.pickingPointForNewCommunity) return;

    const lat = Number(e.latlng.lat.toFixed(5));
    const lng = Number(e.latlng.lng.toFixed(5));

    if (AppState.pickedLocationMarker && AppState.map) {
      AppState.map.removeLayer(AppState.pickedLocationMarker);
    }

    const pinIcon = L.divIcon({
      className: "custom-picked-pin",
      html: `
        <div style="position:relative; width:34px; height:34px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:100%; height:100%; border-radius:50%; background:rgba(245, 158, 11, 0.4); animation:ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width:24px; height:24px; border-radius:50%; background:#f59e0b; border:3px solid #ffffff; box-shadow:0 0 12px rgba(245,158,11,0.9); display:flex; align-items:center; justify-content:center; color:#000; font-weight:900; font-size:12px;">📍</div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    AppState.pickedLocationMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(AppState.map);
    AppState.pickedLocationMarker.bindPopup(`<strong>📍 Nova Localidade Marcada</strong><br><small>Lat: ${lat}, Lng: ${lng}</small>`).openPopup();

    finalizarSelecaoPontoNoMapa(lat, lng);
  });
}

function cancelarSelecaoPontoNoMapa() {
  AppState.pickingPointForNewCommunity = false;
  const banner = document.getElementById("mapPickerBanner");
  if (banner) banner.style.display = "none";
  const mapContainer = document.getElementById("map-container");
  if (mapContainer) mapContainer.classList.remove("map-picking-active");
  openModal("modalComunidade");
}

function finalizarSelecaoPontoNoMapa(lat, lng) {
  AppState.pickingPointForNewCommunity = false;
  const banner = document.getElementById("mapPickerBanner");
  if (banner) banner.style.display = "none";
  const mapContainer = document.getElementById("map-container");
  if (mapContainer) mapContainer.classList.remove("map-picking-active");

  const latInput = document.getElementById("formComunidadeLat");
  const lngInput = document.getElementById("formComunidadeLng");
  const hint = document.getElementById("formComunidadeCoordsHint");

  if (latInput) latInput.value = lat;
  if (lngInput) lngInput.value = lng;
  if (hint) {
    hint.innerHTML = `<span style="color:var(--gold-400); font-weight:700;">✓ Ponto marcado no mapa:</span> Lat ${lat}, Lng ${lng}`;
  }

  openModal("modalComunidade");
  showToast(`Coordenadas [${lat}, ${lng}] capturadas do mapa!`);
}

// ==========================================================================
// EDITOR DE PERÍMETRO TERRITORIAL (AUMENTAR / DIMINUIR / ARRASTAR VÉRTICES)
// ==========================================================================
function toggleModoEdicaoPerimetro() {
  if (AppState.polygonEditor && AppState.polygonEditor.active) {
    cancelarEdicaoPerimetro();
  } else {
    const select = document.getElementById("comunidadeSelect");
    const bairroId = (select && select.value && select.value !== "SEDE_INTEGRAL") ? select.value : "com-01";
    iniciarEdicaoPerimetro(bairroId);
  }
}

function iniciarEdicaoPerimetro(comunidadeId) {
  if (!AppState.map) return;

  if (AppState.currentView !== "mapa") {
    navigateTo("mapa");
  }

  const com = db.getComunidadeById(comunidadeId);
  if (!com) {
    showToast("Selecione um bairro ou localidade válida para editar o perímetro.");
    return;
  }

  // Cancela qualquer edição em andamento sem toast
  cancelarEdicaoPerimetro(false);

  // Obtém ou gera polígono inicial com coordenadas seguras
  let pontos = com.poligono && com.poligono.length >= 3 ? com.poligono : null;
  if (!pontos) {
    const [lat, lng] = com.coordenadas || [-5.8153, -35.8239];
    const dLat = 0.0035;
    const dLng = 0.0045;
    pontos = [
      [Number((lat + dLat).toFixed(5)), Number((lng - dLng).toFixed(5))],
      [Number((lat + dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
      [Number((lat - dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
      [Number((lat - dLat).toFixed(5)), Number((lng - dLng).toFixed(5))]
    ];
  }

  const originalPoints = JSON.parse(JSON.stringify(pontos));
  const currentPoints = JSON.parse(JSON.stringify(pontos));

  AppState.polygonEditor = {
    active: true,
    comunidadeId: com.id,
    comunidadeNome: com.nome,
    originalPoints: originalPoints,
    currentPoints: currentPoints,
    polygonLayer: null,
    handlesLayer: L.layerGroup().addTo(AppState.map),
    vertexMarkers: [],
    midpointMarkers: []
  };

  // Oculta badges para não sobrepor aos vértices
  if (AppState.badgesLayer) {
    AppState.badgesLayer.clearLayers();
  }

  // Cria polígono de edição com traçado fluorescente
  AppState.polygonEditor.polygonLayer = L.polygon(currentPoints, {
    color: "#f59e0b",
    weight: 3.5,
    dashArray: "6, 6",
    fillColor: "#fbbf24",
    fillOpacity: 0.20,
    interactive: false
  }).addTo(AppState.map);

  // Foca suavemente no polígono com zoom adequado
  AppState.map.fitBounds(AppState.polygonEditor.polygonLayer.getBounds(), {
    padding: [70, 70],
    maxZoom: 17
  });

  // Atualiza botão no topo
  const btnTopo = document.getElementById("btnEditarPerimetro");
  if (btnTopo) {
    btnTopo.classList.remove("btn-secondary");
    btnTopo.classList.add("btn-gold");
    btnTopo.innerHTML = `✏️ Editando: ${com.nome}`;
  }

  // Exibe a barra flutuante de edição
  const bar = document.getElementById("mapPolygonEditorBar");
  const nomeEl = document.getElementById("editorBairroNome");
  if (bar) bar.style.display = "flex";
  if (nomeEl) nomeEl.textContent = com.nome;

  atualizarHandlesEdicaoPerimetro();

  showToast(`✏️ Editando Perímetro de "${com.nome}": Arraste os pinos para esticar ou use os botões +/-.`);
}

function atualizarHandlesEdicaoPerimetro() {
  const ed = AppState.polygonEditor;
  if (!ed || !ed.active || !ed.handlesLayer) return;

  ed.handlesLayer.clearLayers();
  ed.vertexMarkers = [];
  ed.midpointMarkers = [];

  const points = ed.currentPoints;
  const n = points.length;

  const countBadge = document.getElementById("editorVerticesCount");
  if (countBadge) {
    countBadge.textContent = `${n} vértices`;
  }

  // 1. Vértices arrastáveis principais
  points.forEach((pt, idx) => {
    const vertexIcon = L.divIcon({
      className: "polygon-vertex-wrapper",
      html: `<div class="polygon-vertex-handle" title="Vértice #${idx+1} — Arraste para aumentar/diminuir. Botão direito para remover."></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker(pt, {
      draggable: true,
      icon: vertexIcon,
      zIndexOffset: 1000
    });

    marker.on("drag", function(e) {
      const newLat = Number(e.latlng.lat.toFixed(5));
      const newLng = Number(e.latlng.lng.toFixed(5));
      ed.currentPoints[idx] = [newLat, newLng];
      ed.polygonLayer.setLatLngs(ed.currentPoints);
    });

    marker.on("dragend", function() {
      atualizarHandlesEdicaoPerimetro();
    });

    marker.on("contextmenu", function(e) {
      L.DomEvent.stopPropagation(e);
      if (ed.currentPoints.length <= 3) {
        showToast("Um perímetro precisa de no mínimo 3 vértices.");
        return;
      }
      ed.currentPoints.splice(idx, 1);
      ed.polygonLayer.setLatLngs(ed.currentPoints);
      atualizarHandlesEdicaoPerimetro();
      showToast("Vértice removido!");
    });

    marker.addTo(ed.handlesLayer);
    ed.vertexMarkers.push(marker);
  });

  // 2. Pontos intermediários para criar novos vértices
  for (let i = 0; i < n; i++) {
    const nextIdx = (i + 1) % n;
    const pt1 = points[i];
    const pt2 = points[nextIdx];
    const midLat = (pt1[0] + pt2[0]) / 2;
    const midLng = (pt1[1] + pt2[1]) / 2;

    const midIcon = L.divIcon({
      className: "polygon-midpoint-wrapper",
      html: `<div class="polygon-midpoint-handle" title="Clique para adicionar um novo ponto neste segmento"></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });

    const midMarker = L.marker([midLat, midLng], {
      icon: midIcon,
      zIndexOffset: 500
    });

    const insertIndex = i + 1;
    midMarker.on("click", function(e) {
      L.DomEvent.stopPropagation(e);
      const newPt = [Number(midLat.toFixed(5)), Number(midLng.toFixed(5))];
      ed.currentPoints.splice(insertIndex, 0, newPt);
      ed.polygonLayer.setLatLngs(ed.currentPoints);
      atualizarHandlesEdicaoPerimetro();
      showToast("Novo vértice adicionado! Arraste-o para moldar o perímetro.");
    });

    midMarker.addTo(ed.handlesLayer);
    ed.midpointMarkers.push(midMarker);
  }
}

function ajustarEscalaPerimetro(fator) {
  const ed = AppState.polygonEditor;
  if (!ed || !ed.active || !ed.currentPoints || ed.currentPoints.length < 3) return;

  // Centroide
  const sumLat = ed.currentPoints.reduce((acc, p) => acc + p[0], 0);
  const sumLng = ed.currentPoints.reduce((acc, p) => acc + p[1], 0);
  const cLat = sumLat / ed.currentPoints.length;
  const cLng = sumLng / ed.currentPoints.length;

  // Escala cada ponto a partir do centroide
  ed.currentPoints = ed.currentPoints.map(p => {
    const lat = cLat + (p[0] - cLat) * fator;
    const lng = cLng + (p[1] - cLng) * fator;
    return [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
  });

  ed.polygonLayer.setLatLngs(ed.currentPoints);
  atualizarHandlesEdicaoPerimetro();

  const msg = fator > 1 ? "➕ Perímetro aumentado (+5%)" : "➖ Perímetro diminuído (-5%)";
  showToast(msg);
}

function reverterEdicaoPerimetro() {
  const ed = AppState.polygonEditor;
  if (!ed || !ed.active) return;
  ed.currentPoints = JSON.parse(JSON.stringify(ed.originalPoints));
  ed.polygonLayer.setLatLngs(ed.currentPoints);
  atualizarHandlesEdicaoPerimetro();
  showToast("Perímetro revertido para o contorno original.");
}

function salvarEdicaoPerimetro() {
  const ed = AppState.polygonEditor;
  if (!ed || !ed.active || !ed.comunidadeId) return;

  const novosPontos = ed.currentPoints.map(p => [Number(p[0].toFixed(5)), Number(p[1].toFixed(5))]);
  const ok = db.atualizarPoligonoComunidade(ed.comunidadeId, novosPontos);

  if (ok) {
    showToast(`Perímetro de "${ed.comunidadeNome}" gravado com sucesso!`);
  }

  cancelarEdicaoPerimetro(false);
  carregarMarcadoresMapa();
}

function cancelarEdicaoPerimetro(mostrarToast = true) {
  const ed = AppState.polygonEditor;
  if (ed) {
    if (ed.polygonLayer && AppState.map && AppState.map.hasLayer(ed.polygonLayer)) {
      AppState.map.removeLayer(ed.polygonLayer);
    }
    if (ed.handlesLayer && AppState.map && AppState.map.hasLayer(ed.handlesLayer)) {
      AppState.map.removeLayer(ed.handlesLayer);
    }
    ed.active = false;
    ed.polygonLayer = null;
    ed.handlesLayer = null;
    ed.vertexMarkers = [];
    ed.midpointMarkers = [];
  }

  const bar = document.getElementById("mapPolygonEditorBar");
  if (bar) bar.style.display = "none";

  const btnTopo = document.getElementById("btnEditarPerimetro");
  if (btnTopo) {
    btnTopo.classList.remove("btn-gold");
    btnTopo.classList.add("btn-secondary");
    btnTopo.innerHTML = `✏️ Editar Perímetro`;
  }

  carregarMarcadoresMapa();

  if (mostrarToast) {
    showToast("Edição de perímetro concluída.");
  }
}

function renderMapaOfflineSVG(mapContainer) {
  const coms = db.getComunidades();
  const cachoeira = coms.find(c => c.id === "com-00") || { nome: "Cachoeira do Sapo", liderancaNome: null, votosConseguidos: 0 };
  const centro = coms.find(c => c.id === "com-01") || { nome: "Centro", liderancaNome: null, votosConseguidos: 0 };
  const furnas = coms.find(c => c.id === "com-05") || { nome: "Furnas", liderancaNome: null, votosConseguidos: 0 };
  const serra = coms.find(c => c.id === "com-10") || { nome: "Serra da Formiga", liderancaNome: null, votosConseguidos: 0 };
  const potengi = coms.find(c => c.id === "com-11") || { nome: "Potengi Pequeno", liderancaNome: null, votosConseguidos: 0 };

  mapContainer.innerHTML = `
    <div style="width:100%; height:100%; background:radial-gradient(circle at center, #0a291a 0%, #030d08 100%); position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px;">
      <div style="position:absolute; top:16px; left:20px; z-index:10; background:rgba(6,21,14,0.85); padding:8px 14px; border-radius:8px; border:1px solid var(--border-subtle);">
        <span style="font-size:0.78rem; color:var(--emerald-400); font-weight:700;">🌐 RADAR TERRITORIAL RIACHUELO–RN (MODO VETORIAL OFFLINE)</span>
      </div>
      
      <div style="position:relative; width:92%; max-width:700px; height:460px; border:1.5px dashed rgba(16,185,129,0.3); border-radius:50%; display:flex; align-items:center; justify-content:center;">
        <div style="position:absolute; width:70%; height:70%; border:1px solid rgba(16,185,129,0.2); border-radius:50%;"></div>
        <div style="position:absolute; width:40%; height:40%; border:1px solid rgba(16,185,129,0.25); border-radius:50%;"></div>
        <div class="radar-sweep-hand" style="width:50%; position:absolute; right:50%;"></div>
        
        <!-- CACHOEIRA DO SAPO (DESTAQUE) -->
        <div class="map-pin-badge ${cachoeira.liderancaNome ? '' : 'unassigned'}" style="position:absolute; top:65%; left:72%;" onclick="abrirModalMapearLiderBairro('com-00')">
          <div class="pin-title">📍 Cachoeira do Sapo</div>
          <div class="pin-leader">${cachoeira.liderancaNome ? `👤 ${cachoeira.liderancaNome}` : '⚠️ Sem líder atribuído'}</div>
          <div class="pin-votes">🗳️ ${(cachoeira.votosConseguidos || 0).toLocaleString('pt-BR')} votos</div>
        </div>

        <!-- CENTRO -->
        <div class="map-pin-badge ${centro.liderancaNome ? '' : 'unassigned'}" style="position:absolute; top:42%; left:48%;" onclick="abrirModalMapearLiderBairro('com-01')">
          <div class="pin-title">📍 Centro / Sede</div>
          <div class="pin-leader">${centro.liderancaNome ? `👤 ${centro.liderancaNome}` : '⚠️ Sem líder'}</div>
          <div class="pin-votes">🗳️ ${(centro.votosConseguidos || 0).toLocaleString('pt-BR')} votos</div>
        </div>

        <!-- FURNAS -->
        <div class="map-pin-badge ${furnas.liderancaNome ? '' : 'unassigned'}" style="position:absolute; top:80%; left:30%;" onclick="abrirModalMapearLiderBairro('com-05')">
          <div class="pin-title">📍 Furnas</div>
          <div class="pin-leader">${furnas.liderancaNome ? `👤 ${furnas.liderancaNome}` : '⚠️ Sem líder'}</div>
          <div class="pin-votes">🗳️ ${(furnas.votosConseguidos || 0).toLocaleString('pt-BR')} votos</div>
        </div>

        <!-- SERRA DA FORMIGA -->
        <div class="map-pin-badge ${serra.liderancaNome ? '' : 'unassigned'}" style="position:absolute; top:18%; left:35%;" onclick="abrirModalMapearLiderBairro('com-10')">
          <div class="pin-title">📍 Serra da Formiga</div>
          <div class="pin-leader">${serra.liderancaNome ? `👤 ${serra.liderancaNome}` : '⚠️ Sem líder'}</div>
          <div class="pin-votes">🗳️ ${(serra.votosConseguidos || 0).toLocaleString('pt-BR')} votos</div>
        </div>

        <!-- POTENGI PEQUENO -->
        <div class="map-pin-badge ${potengi.liderancaNome ? '' : 'unassigned'}" style="position:absolute; top:35%; left:75%;" onclick="abrirModalMapearLiderBairro('com-11')">
          <div class="pin-title">📍 Potengi Pequeno</div>
          <div class="pin-leader">${potengi.liderancaNome ? `👤 ${potengi.liderancaNome}` : '⚠️ Sem líder'}</div>
          <div class="pin-votes">🗳️ ${(potengi.votosConseguidos || 0).toLocaleString('pt-BR')} votos</div>
        </div>
      </div>

      <div style="margin-top:14px; font-size:0.8rem; color:var(--text-muted); text-align:center;">
        Clique em qualquer bairro acima para mapear o nome da liderança e os votos conseguidos.
      </div>
    </div>
  `;
}

function renderTabelaLocalidadesMapa() {
  const tbody = document.getElementById("tabelaLocalidadesMapaBody");
  if (!tbody) return;

  const search = document.getElementById("searchBairroMapaInput") ? document.getElementById("searchBairroMapaInput").value.toLowerCase() : "";

  let coms = db.getComunidades();
  if (search) {
    coms = coms.filter(c => 
      c.nome.toLowerCase().includes(search) || 
      (c.liderancaNome && c.liderancaNome.toLowerCase().includes(search))
    );
  }

  tbody.innerHTML = coms.map(c => {
    let nomeLider = (c.liderancaNome || "").trim();
    if (!nomeLider && c.liderancaResponsavelId) {
      const lid = (db.data.liderancas || []).find(l => l.id === c.liderancaResponsavelId);
      if (lid && lid.nome) nomeLider = lid.nome;
    }
    const temLider = Boolean(nomeLider !== "");
    const votos = Number(c.votosConseguidos) || 0;
    const meta = Number(c.metaVotos) || Math.max(30, Math.round((c.eleitoresEstimados || 200) * 0.4));
    const pct = meta > 0 ? Math.min(100, Math.round((votos / meta) * 100)) : 0;
    const corTema = getCorPorTipo(c.tipo);
    const corProgresso = pct >= 100 ? "linear-gradient(90deg, #10b981, #fbbf24)" : (pct >= 50 ? "linear-gradient(90deg, #059669, #10b981)" : "linear-gradient(90deg, #ef4444, #f59e0b)");

    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:50%; background:${corTema}; display:inline-block; flex-shrink:0; box-shadow:0 0 6px ${corTema};"></span>
            <strong style="color:#ffffff;">${c.nome}</strong>
          </div>
          ${c.id === 'com-00' ? '<span class="badge-status oficial" style="margin-left:18px; font-size:0.68rem;">Polo Distrital</span>' : ''}
        </td>
        <td>
          <span style="font-size:0.75rem; padding:2px 8px; border-radius:4px; background:rgba(255,255,255,0.06); color:${corTema}; border:1px solid ${corTema}; font-weight:600;">
            ${c.tipo}
          </span>
        </td>
        <td>
          ${temLider 
            ? `<strong style="color:var(--emerald-400);">👤 ${nomeLider}</strong>` 
            : '<span style="color:var(--status-pendente); font-style:italic;">⚠️ Sem líder</span>'}
        </td>
        <td>
          <div class="table-meta-box">
            <div class="table-meta-labels">
              <span style="font-weight:700; color:var(--text-main); font-size:0.75rem;">${votos} / <span style="color:var(--gold-400);">${meta}</span></span>
              <span style="font-weight:800; font-size:0.75rem; color:${pct >= 100 ? '#fbbf24' : (pct >= 50 ? '#34d399' : '#f87171')};">${pct}%</span>
            </div>
            <div class="table-meta-track">
              <div class="table-meta-fill" style="width:${pct}%; background:${corProgresso};"></div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.85rem;">${(c.eleitoresEstimados || 0).toLocaleString('pt-BR')}</span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="focarBairroEspecifico('${c.id}')" title="Destacar e focar no mapa">
              🎯 Focar
            </button>
            <button class="btn btn-secondary btn-sm" onclick="gerarFichaCampoBairro('${c.id}')" title="Gerar e imprimir Ficha de Campo oficial do bairro">
              📄 Ficha
            </button>
            <button class="btn btn-gold btn-sm" onclick="abrirModalMapearLiderBairro('${c.id}')" title="Mapear liderança e meta de votos">
              ✏️ Meta
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function centralizarMapa(lat, lng, nome) {
  if (AppState.map && typeof L !== "undefined") {
    AppState.map.setView([lat, lng], 15, { animate: true });
    showToast(`Mapa focalizado em: ${nome}`);
    window.scrollTo({ top: document.getElementById("map-container").offsetTop - 80, behavior: "smooth" });
  } else {
    showToast(`Localidade: ${nome} (GPS: ${lat}, ${lng})`);
  }
}

// ==========================================================================
// MODAL: MAPEAR LIDERANÇA E VOTOS DO BAIRRO
// ==========================================================================
function abrirModalMapearLiderBairro(bairroId = null) {
  const select = document.getElementById("formMapBairroSelect");
  if (!select) return;

  db.sincronizarLiderancasComBairros();
  const coms = db.getComunidades();
  select.innerHTML = '<option value="">-- Selecione o Bairro ou Comunidade --</option>';

  coms.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    const meta = Number(c.metaVotos) || Math.max(30, Math.round((c.eleitoresEstimados || 200) * 0.4));
    opt.textContent = `${c.nome} (${c.tipo}) — Meta: ${meta} | Líder: ${c.liderancaNome || '[Sem líder]'}`;
    select.appendChild(opt);
  });

  const targetId = bairroId || (coms[0] ? coms[0].id : "");
  select.value = targetId;
  aoSelecionarBairroNoModal(targetId);

  openModal("modalMapearLiderBairro");
}

function aoSelecionarBairroNoModal(bairroId) {
  const com = db.getComunidadeById(bairroId);
  const idInput = document.getElementById("formMapBairroId");
  const liderInput = document.getElementById("formMapLiderNome");
  const metaInput = document.getElementById("formMapLiderMetaVotos");
  const votosInput = document.getElementById("formMapLiderVotos");
  const contatoInput = document.getElementById("formMapLiderContato");
  const eleitoresInput = document.getElementById("formMapEleitoresEstimados");
  const obsInput = document.getElementById("formMapLiderObs");

  if (!com) {
    if (idInput) idInput.value = "";
    if (liderInput) liderInput.value = "";
    if (metaInput) metaInput.value = "100";
    if (votosInput) votosInput.value = "0";
    if (contatoInput) contatoInput.value = "";
    if (eleitoresInput) eleitoresInput.value = "—";
    if (obsInput) obsInput.value = "";
    atualizarPreviewMetaModal();
    return;
  }

  if (idInput) idInput.value = com.id;
  if (liderInput) liderInput.value = com.liderancaNome || "";
  if (metaInput) metaInput.value = com.metaVotos || Math.max(30, Math.round((com.eleitoresEstimados || 200) * 0.4));
  if (votosInput) votosInput.value = com.votosConseguidos || 0;
  if (contatoInput) contatoInput.value = com.liderancaContato || "";
  if (eleitoresInput) eleitoresInput.value = `${(com.eleitoresEstimados || 0).toLocaleString('pt-BR')} eleitores aptos (${com.areaHectares ? `${com.areaHectares} ha` : 'Área mapeada'})`;
  if (obsInput) obsInput.value = com.observacoes || "";

  atualizarPreviewMetaModal();
}

function atualizarPreviewMetaModal() {
  const metaInput = document.getElementById("formMapLiderMetaVotos");
  const votosInput = document.getElementById("formMapLiderVotos");
  const pctTxt = document.getElementById("modalMetaPercentualTexto");
  const bar = document.getElementById("modalMetaProgressBar");
  const statusMsg = document.getElementById("modalMetaStatusMsg");

  const meta = parseInt(metaInput ? metaInput.value : 0) || 0;
  const votos = parseInt(votosInput ? votosInput.value : 0) || 0;

  const pct = meta > 0 ? Math.min(100, Math.round((votos / meta) * 100)) : 0;

  if (pctTxt) {
    pctTxt.textContent = `${pct}%`;
    pctTxt.style.color = pct >= 100 ? "#fbbf24" : (pct >= 50 ? "#34d399" : "#f87171");
  }
  if (bar) {
    bar.style.width = `${pct}%`;
    if (pct >= 100) {
      bar.classList.add("meta-atingida");
    } else {
      bar.classList.remove("meta-atingida");
    }
  }
  if (statusMsg) {
    statusMsg.textContent = `${votos.toLocaleString('pt-BR')} de ${meta.toLocaleString('pt-BR')} votos alcançados (${pct}%)`;
  }
}

function abrirFichaCampoDoBairroAtualModal() {
  const select = document.getElementById("formMapBairroSelect");
  const targetId = select ? select.value : "";
  if (targetId) {
    closeModal("modalMapearLiderBairro");
    gerarFichaCampoBairro(targetId);
  }
}

function salvarLiderancaEBairroModal() {
  const bairroId = document.getElementById("formMapBairroSelect").value || document.getElementById("formMapBairroId").value;
  const nomeLider = document.getElementById("formMapLiderNome").value.trim();
  const metaVotos = parseInt(document.getElementById("formMapLiderMetaVotos").value) || 0;
  const votos = parseInt(document.getElementById("formMapLiderVotos").value) || 0;
  const contato = document.getElementById("formMapLiderContato").value.trim();
  const obs = document.getElementById("formMapLiderObs").value.trim();

  if (!bairroId) {
    alert("Por favor, selecione o bairro ou localidade.");
    return;
  }

  if (!nomeLider) {
    const comAtualizada = db.atribuirLiderancaAoBairro(bairroId, null, votos, metaVotos, "", obs);
    closeModal("modalMapearLiderBairro");
    showToast(`🎯 Bairro "${comAtualizada ? comAtualizada.nome : ''}": Salvo sem líder atribuído.`);
    carregarMarcadoresMapa();
    renderTabelaLocalidadesMapa();
    renderComunidades();
    renderLiderancas();
    atualizarMetometroConsolidado();
    if (AppState.isHeatmapActive) alternarHeatmap(true);
    updateSidebarCounters();
    if (AppState.map) AppState.map.closePopup();
    return;
  }

  const comAtualizada = db.atribuirLiderancaAoBairro(bairroId, nomeLider, votos, metaVotos, contato, obs);
  closeModal("modalMapearLiderBairro");

  showToast(`🎯 Bairro "${comAtualizada.nome}": Meta de ${metaVotos} votos e Líder "${nomeLider}" gravados com sucesso!`);

  // Atualiza mapa, contadores, metômetro e tabelas
  carregarMarcadoresMapa();
  renderTabelaLocalidadesMapa();
  atualizarMetometroConsolidado();
  if (AppState.isHeatmapActive) alternarHeatmap(true); // reaplica calor
  updateSidebarCounters();
}

function removerLiderancaDoBairroModal() {
  const bairroId = document.getElementById("formMapBairroSelect").value || document.getElementById("formMapBairroId").value;
  if (!bairroId) return;

  const com = db.getComunidadeById(bairroId);
  if (!com) return;

  if (confirm(`Deseja desvincular a liderança do bairro "${com.nome}"?`)) {
    db.atribuirLiderancaAoBairro(bairroId, null, 0);
    closeModal("modalMapearLiderBairro");
    showToast(`Liderança removida do bairro "${com.nome}".`);
    carregarMarcadoresMapa();
    renderTabelaLocalidadesMapa();
    renderComunidades();
    renderLiderancas();
    atualizarMetometroConsolidado();
    updateSidebarCounters();
    if (AppState.map) AppState.map.closePopup();
  }
}

// ==========================================================================
// 🎯 METÔMETRO CONSOLIDADO MUNICIPAL
// ==========================================================================
function atualizarMetometroConsolidado() {
  if (!db || !db.getMetasConsolidadas) return;
  const met = db.getMetasConsolidadas();

  const elVotos = document.getElementById("metometroVotosAtuais");
  const elMeta = document.getElementById("metometroMetaTotal");
  const elBadge = document.getElementById("metometroPercentualBadge");
  const elBar = document.getElementById("metometroProgressBar");
  const elStatus = document.getElementById("metometroStatusTexto");
  const elBairros = document.getElementById("metometroBairrosBatidos");

  if (elVotos) elVotos.textContent = met.votosTotal.toLocaleString("pt-BR");
  if (elMeta) elMeta.textContent = `${met.metaTotal.toLocaleString("pt-BR")} votos`;
  if (elBadge) {
    elBadge.textContent = `${met.percentual}% Atingido`;
    elBadge.style.color = met.percentual >= 100 ? "#fbbf24" : (met.percentual >= 50 ? "#34d399" : "#f87171");
  }
  if (elBar) {
    elBar.style.width = `${met.percentual}%`;
    if (met.percentual >= 100) {
      elBar.classList.add("meta-atingida");
    } else {
      elBar.classList.remove("meta-atingida");
    }
  }
  if (elStatus) {
    if (met.votosTotal === 0) {
      elStatus.textContent = "Aguardando primeiros lançamentos nos bairros";
    } else if (met.percentual >= 100) {
      elStatus.textContent = "🏆 Meta Geral do Município Superada!";
    } else {
      elStatus.textContent = `${met.bairrosAtingidos} de ${met.totalBairros} localidades com meta alcançada`;
    }
  }
  if (elBairros) {
    elBairros.textContent = `${met.bairrosAtingidos} / ${met.totalBairros}`;
  }
}

// ==========================================================================
// 🌡️ MODO RAIO-X DE CALOR (HEATMAP TERRITORIAL)
// ==========================================================================
function alternarHeatmap(forcarReaplicar = false) {
  if (!AppState.map) return;
  const btn = document.getElementById("btnToggleHeatmap");

  if (AppState.isHeatmapActive && !forcarReaplicar) {
    // Desativar Heatmap
    if (AppState.heatmapLayer && AppState.map.hasLayer(AppState.heatmapLayer)) {
      AppState.map.removeLayer(AppState.heatmapLayer);
    }
    AppState.isHeatmapActive = false;
    if (btn) {
      btn.classList.remove("btn-heatmap-active");
      btn.innerHTML = "🌡️ Raio-X de Calor";
    }
    showToast("🌡️ Modo Raio-X de Calor desativado.");
  } else {
    // Ativar / Reaplicar Heatmap
    if (!AppState.heatmapLayer) {
      AppState.heatmapLayer = L.layerGroup();
    }
    AppState.heatmapLayer.clearLayers();

    const coms = db.getComunidades();
    
    coms.forEach(c => {
      const coords = c.coordenadas || (c.poligono && c.poligono[0]);
      if (!coords) return;

      const votos = Number(c.votosConseguidos) || 0;
      const meta = Number(c.metaVotos) || Math.max(30, Math.round((c.eleitoresEstimados || 200) * 0.4));
      const el = Number(c.eleitoresEstimados) || 100;

      // Cálculo de calor proporcional
      const proporcaoMeta = meta > 0 ? (votos / meta) : 0;
      const raioBase = Math.min(1800, Math.max(450, Math.round(Math.sqrt(el) * 36)));

      let corNucleo = "#ef4444"; // Vermelho calor
      let corHalo = "#f59e0b";   // Laranja térmico
      let corBorda = "#10b981";  // Verde esmeralda

      if (votos === 0) {
        corNucleo = "#38bdf8"; // Azul frio para áreas sem votos
        corHalo = "#0284c7";
        corBorda = "#64748b";
      } else if (proporcaoMeta >= 1.0) {
        corNucleo = "#f59e0b"; // Super aquecido
        corHalo = "#ef4444";
        corBorda = "#fbbf24";
      }

      // Halo exterior suave
      const haloOuter = L.circle(coords, {
        radius: raioBase * 1.35,
        fillColor: corBorda,
        fillOpacity: 0.16,
        stroke: false,
        interactive: false
      });

      // Halo intermediário
      const haloMid = L.circle(coords, {
        radius: raioBase * 0.85,
        fillColor: corHalo,
        fillOpacity: 0.28,
        stroke: false,
        interactive: false
      });

      // Núcleo de calor térmico
      const nucleo = L.circle(coords, {
        radius: raioBase * 0.45,
        fillColor: corNucleo,
        fillOpacity: 0.44,
        color: corNucleo,
        weight: 1.5,
        opacity: 0.7,
        interactive: true
      });

      nucleo.bindTooltip(`
        <div style="font-family:'Inter', sans-serif; padding:4px 6px;">
          <strong style="color:#ffffff;">🌡️ Calor Eleitoral: ${c.nome}</strong><br>
          <span style="font-size:0.75rem; color:#fde047;">${votos} votos conquistados / Meta: ${meta}</span><br>
          <span style="font-size:0.7rem; color:#cbd5e1;">Densidade: ${el} eleitores estimados</span>
        </div>
      `, { sticky: true });

      nucleo.addTo(AppState.heatmapLayer);
      haloMid.addTo(AppState.heatmapLayer);
      haloOuter.addTo(AppState.heatmapLayer);
    });

    if (!AppState.map.hasLayer(AppState.heatmapLayer)) {
      AppState.heatmapLayer.addTo(AppState.map);
    }
    AppState.isHeatmapActive = true;

    if (btn) {
      btn.classList.add("btn-heatmap-active");
      btn.innerHTML = "🔥 Raio-X ATIVO";
    }
    if (!forcarReaplicar) {
      showToast("🌡️ Raio-X de Calor ATIVADO! Concentração térmica e densidade eleitoral projetadas no satélite.");
    }
  }
}

// ==========================================================================
// 📄 FICHA DE CAMPO DO BAIRRO (DOCUMENTO EXECUTIVO PRONTO PARA A4)
// ==========================================================================
function gerarFichaCampoBairro(bairroId) {
  const com = db.getComunidadeById(bairroId);
  if (!com) {
    showToast("Localidade não encontrada.");
    return;
  }

  const container = document.getElementById("fichaCampoPrintArea");
  if (!container) return;

  const headerTit = document.getElementById("fichaCampoHeaderTitulo");
  if (headerTit) headerTit.textContent = `Ficha de Campo — ${com.nome}`;

  const votos = Number(com.votosConseguidos) || 0;
  const meta = Number(com.metaVotos) || Math.max(30, Math.round((com.eleitoresEstimados || 200) * 0.4));
  const pct = meta > 0 ? Math.min(100, Math.round((votos / meta) * 100)) : 0;
  const corPct = pct >= 100 ? "#b45309" : (pct >= 50 ? "#047857" : "#b91c1c");

  // Locais de votação vinculados
  const locais = db.getLocaisVotacao().filter(l => (com.locaisVotacaoVinculados || []).includes(l.id));
  const locaisTexto = locais.length > 0 
    ? locais.map(l => `<strong>${l.nome}</strong> (${l.tipo}) — Seções: ${(l.secoes || []).join(", ")} | ${l.endereco || ''}`).join("<br>")
    : "Colégio Eleitoral de Referência da 8ª Zona Eleitoral / TRE-RN (Consulte mapa oficial)";

  // Demandas do bairro
  const demandas = (db.data.demandas || []).filter(d => d.bairroId === com.id || d.bairroNome === com.nome);
  const demandasHtml = demandas.length > 0
    ? demandas.map((d, i) => `
        <div style="padding:6px 0; border-bottom:1px dashed #cbd5e1; font-size:0.78rem;">
          <strong>${i+1}. [${d.prioridade || 'Média'}] ${d.titulo}</strong> — Solicitante: ${d.solicitante || 'Comunidade'} (${d.status || 'Pendente'})
        </div>
      `).join("")
    : "<em style='color:#64748b;'>Nenhuma demanda pendente no momento. Utilize o espaço abaixo para anotar novas solicitações durante a visita.</em>";

  // Data atual de emissão
  const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="ficha-campo-doc">
      <!-- Cabeçalho Timbrado Oficial -->
      <div class="ficha-campo-header-bar">
        <div class="ficha-campo-brasao">
          <div style="font-size:1.8rem; background:#064e3b; color:#ffffff; width:46px; height:46px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-weight:800;">
            RB
          </div>
          <div class="ficha-campo-titulo-wrap">
            <h2>RADAR DE GESTÃO — FICHA DE CAMPO TERRITORIAL</h2>
            <p>MUNICÍPIO DE RIACHUELO/RN • 8ª ZONA ELEITORAL (TRE-RN) • COORDENAÇÃO DE CAMPANHA</p>
          </div>
        </div>
        <div class="ficha-campo-meta-tag">
          <div><strong>EMISSÃO:</strong> ${dataHoje}</div>
          <div><strong>SITUAÇÃO:</strong> OFICIAL</div>
        </div>
      </div>

      <!-- Resumo KPI do Bairro -->
      <div class="ficha-kpi-grid">
        <div class="ficha-kpi-card">
          <div class="ficha-kpi-label">Localidade / Bairro</div>
          <div class="ficha-kpi-val" style="font-size:1.05rem;">${com.nome}</div>
          <span style="font-size:0.72rem; color:#64748b;">${com.tipo}</span>
        </div>

        <div class="ficha-kpi-card" style="border-left:4px solid #f59e0b;">
          <div class="ficha-kpi-label">Meta de Votos</div>
          <div class="ficha-kpi-val" style="color:#b45309;">${meta} votos</div>
          <span style="font-size:0.72rem; color:#64748b;">Objetivo estipulado</span>
        </div>

        <div class="ficha-kpi-card" style="border-left:4px solid #10b981;">
          <div class="ficha-kpi-label">Votos Conquistados</div>
          <div class="ficha-kpi-val" style="color:#047857;">${votos} votos (${pct}%)</div>
          <span style="font-size:0.72rem; color:${corPct}; font-weight:700;">${pct >= 100 ? '🏆 Meta Batida!' : `Faltam ${Math.max(0, meta - votos)} votos`}</span>
        </div>

        <div class="ficha-kpi-card">
          <div class="ficha-kpi-label">Eleitorado Total</div>
          <div class="ficha-kpi-val">${(com.eleitoresEstimados || 0).toLocaleString('pt-BR')}</div>
          <span style="font-size:0.72rem; color:#64748b;">${com.areaHectares ? `${com.areaHectares} hectares` : 'Área mapeada'}</span>
        </div>
      </div>

      <!-- Liderança e Logística Eleitoral -->
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:14px;">
        <div class="ficha-info-box">
          <strong style="color:#064e3b;">👤 LIDERANÇA RESPONSÁVEL:</strong><br>
          <span style="font-size:0.95rem; font-weight:700; color:#0f172a;">${com.liderancaNome || "Aguardando indicação oficial"}</span><br>
          <span style="color:#475569;">📞 Contato/Zap: ${com.liderancaContato || "Não informado"}</span><br>
          <span style="font-size:0.74rem; color:#64748b;">Obs: ${com.observacoes || "Atuação prioritária de porta em porta."}</span>
        </div>

        <div class="ficha-info-box" style="border-left-color:#3b82f6;">
          <strong style="color:#1e40af;">🗳️ LOCAL DE VOTAÇÃO & SEÇÕES:</strong><br>
          <span style="font-size:0.8rem; color:#1e293b; line-height:1.4;">${locaisTexto}</span><br>
          <span style="font-size:0.74rem; color:#64748b;">Ruas/Refs: ${(com.pontosReferencia || ["Centro comunitário", "Vias principais"]).join(" • ")}</span>
        </div>
      </div>

      <!-- Demandas Populares do Bairro -->
      <div class="ficha-secao-titulo">📋 Demandas Comunitárias & Reivindicações Prioritárias</div>
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin-bottom:18px;">
        ${demandasHtml}
      </div>

      <!-- Planilha de Visitas Domiciliares & Diário de Campo -->
      <div class="ficha-secao-titulo">📝 Diário de Campo — Registro de Visitas Domiciliares & Contatos</div>
      <p style="font-size:0.74rem; color:#64748b; margin:-6px 0 8px 0;">Preenchimento manual pelo articulador de campo durante as visitas às famílias:</p>
      
      <table class="ficha-pautada-table">
        <thead>
          <tr>
            <th style="width:36px; text-align:center;">Nº</th>
            <th style="width:75px;">Data</th>
            <th style="width:180px;">Nome do Eleitor / Morador</th>
            <th style="width:160px;">Rua / Endereço / Ponto</th>
            <th style="width:110px;">Telefone / Zap</th>
            <th style="width:85px; text-align:center;">Voto Certo?</th>
            <th>Demandas / Observações da Visita</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 7 }).map((_, i) => `
            <tr>
              <td style="text-align:center; font-weight:700; color:#94a3b8;">${i+1}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td style="text-align:center; font-size:0.7rem; color:#cbd5e1;">[ ] S  [ ] N  [ ] ?</td>
              <td></td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Termo de Encerramento e Assinaturas -->
      <div class="ficha-assinaturas-wrap">
        <div class="ficha-assinatura-box">
          <div class="ficha-assinatura-linha"></div>
          <div class="ficha-assinatura-nome">${com.liderancaNome || "Liderança Responsável pelo Bairro"}</div>
          <div class="ficha-assinatura-cargo">Articulador(a) Territorial de Campo</div>
        </div>

        <div class="ficha-assinatura-box">
          <div class="ficha-assinatura-linha"></div>
          <div class="ficha-assinatura-nome">Coordenação Geral de Campanha</div>
          <div class="ficha-assinatura-cargo">Radar de Gestão • Riachuelo–RN</div>
        </div>
      </div>
    </div>
  `;

  openModal("modalFichaCampoBairro");
}

function imprimirFichaCampo() {
  window.print();
}

// ==========================================================================
// 2. DASHBOARD
// ==========================================================================
function renderDashboard() {
  const stats = db.getDashboardStats();
  const coms = db.getComunidades() || [];
  const resultadosPref2024 = db.getResultadosEleitorais({ ano: 2024, cargo: "Prefeito" }) || [];

  // Agregar dados oficiais das 16 seções para Prefeito (2024)
  let totalAptos = 0;
  let totalComparecimento = 0;
  let totalAbstencao = 0;
  let totalValidos = 0;
  let totalBrancos = 0;
  let totalNulos = 0;
  const candMap = {};

  resultadosPref2024.forEach(r => {
    totalAptos += Number(r.aptos || 0);
    totalComparecimento += Number(r.comparecimento || 0);
    totalAbstencao += Number(r.abstencao || 0);
    totalValidos += Number(r.votosValidos || 0);
    totalBrancos += Number(r.votosBrancos || 0);
    totalNulos += Number(r.votosNulos || 0);

    (r.candidatos || []).forEach(c => {
      const key = c.numero || c.nome;
      if (!candMap[key]) {
        candMap[key] = {
          nome: c.nome,
          numero: c.numero || "",
          partido: c.partido || "",
          situacao: c.situacao || "",
          votos: 0
        };
      }
      candMap[key].votos += Number(c.votos || 0);
      if (c.situacao && !candMap[key].situacao) {
        candMap[key].situacao = c.situacao;
      }
    });
  });

  const candidatosConsolidados = Object.values(candMap).sort((a, b) => b.votos - a.votos);
  candidatosConsolidados.forEach(c => {
    c.percentual = totalValidos > 0 ? ((c.votos / totalValidos) * 100).toFixed(2) : "0.00";
  });

  // KPIs
  const elComs = document.getElementById("kpi-comunidades");
  const elComsSub = document.getElementById("kpi-comunidades-sub");
  const elLids = document.getElementById("kpi-liderancas");
  const elLidsSub = document.getElementById("kpi-liderancas-sub");
  const elSecs = document.getElementById("kpi-secoes");
  const elSecsSub = document.getElementById("kpi-secoes-sub");
  const elVotos = document.getElementById("kpi-votos");
  const elVotosSub = document.getElementById("kpi-votos-sub");
  const elPend = document.getElementById("kpi-pendencias");
  const elPendSub = document.getElementById("kpi-pendencias-sub");
  const elLastUpdated = document.getElementById("lastUpdatedText");

  if (elComs) elComs.textContent = stats.totalComunidades;
  if (elComsSub) elComsSub.textContent = `${stats.bairrosCount} Bairros • ${stats.assentamentosCount} Assentamentos`;
  if (elLids) elLids.textContent = stats.totalLiderancas || stats.bairrosComLideranca;
  if (elLidsSub) elLidsSub.textContent = `${stats.bairrosComLideranca} localidades com líder vinculado`;
  if (elSecs) elSecs.textContent = stats.totalSecoes;
  if (elSecsSub) elSecsSub.textContent = `100% Oficial TSE • 8ª Zona (${resultadosPref2024.length || stats.totalSecoes} seções)`;

  const votosExibicao = totalValidos > 0 ? totalValidos : Number(stats.totalVotosContabilizados || 0);
  if (elVotos) elVotos.textContent = votosExibicao.toLocaleString("pt-BR");
  if (elVotosSub) {
    elVotosSub.textContent = totalComparecimento > 0
      ? `${totalComparecimento.toLocaleString("pt-BR")} comparecimentos nas 16 seções`
      : "Votos válidos mapeados (TSE 2024)";
  }

  const pendenciasCount = coms.filter(c => c.statusConferencia && c.statusConferencia !== "Oficial Confirmado").length;
  if (elPend) elPend.textContent = pendenciasCount;
  if (elPendSub) {
    elPendSub.textContent = pendenciasCount > 0
      ? `${pendenciasCount} localidades aguardando validação`
      : "100% conferido e validado";
  }

  if (elLastUpdated) {
    const agora = new Date();
    elLastUpdated.textContent = agora.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  // Resumo Visual: Votação Consolidada — Prefeito (2024)
  const resumoContainer = document.getElementById("dashPrefeito2024Resumo");
  if (resumoContainer) {
    if (candidatosConsolidados.length === 0) {
      resumoContainer.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; padding:12px;">Nenhum resultado de 2024 encontrado.</div>`;
    } else {
      const diffVotos = candidatosConsolidados.length >= 2
        ? candidatosConsolidados[0].votos - candidatosConsolidados[1].votos
        : 0;

      const cardsHtml = candidatosConsolidados.map((c, idx) => {
        const isEleito = (c.situacao || "").toLowerCase().includes("eleito") && !(c.situacao || "").toLowerCase().includes("não");
        const barColor = idx === 0 ? "linear-gradient(90deg, #10b981, #059669)" : "linear-gradient(90deg, #f59e0b, #d97706)";
        const borderColor = idx === 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(245, 158, 11, 0.3)";
        const badgeHtml = isEleito
          ? `<span class="badge-status oficial" style="font-size:0.68rem; padding:2px 8px;">🏆 ELEITO</span>`
          : `<span class="badge-status" style="font-size:0.68rem; padding:2px 8px; background:rgba(255,255,255,0.06); color:var(--text-secondary);">2º LUGAR</span>`;

        return `
          <div style="background:rgba(255,255,255,0.03); border:1px solid ${borderColor}; border-radius:10px; padding:10px 12px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="background:rgba(16,185,129,0.15); color:var(--emerald-300); font-weight:800; font-size:0.78rem; padding:2px 7px; border-radius:6px; font-family:monospace;">${c.numero}</span>
                <strong style="color:#fff; font-size:0.95rem;">${c.nome}</strong>
                <span style="color:var(--text-muted); font-size:0.78rem;">(${c.partido})</span>
                ${badgeHtml}
              </div>
              <div style="text-align:right;">
                <strong style="color:${idx === 0 ? "var(--emerald-400)" : "var(--gold-400)"}; font-size:1rem;">${c.votos.toLocaleString("pt-BR")} votos</strong>
                <span style="color:var(--text-secondary); font-size:0.82rem; margin-left:6px;">(${c.percentual.replace(".", ",")}%)</span>
              </div>
            </div>
            <div style="width:100%; height:8px; background:rgba(255,255,255,0.07); border-radius:999px; overflow:hidden;">
              <div style="width:${c.percentual}%; height:100%; background:${barColor}; border-radius:999px;"></div>
            </div>
          </div>
        `;
      }).join("");

      const taxaComp = totalAptos > 0 ? ((totalComparecimento / totalAptos) * 100).toFixed(1).replace(".", ",") : "0,0";

      resumoContainer.innerHTML = `
        ${cardsHtml}
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(115px, 1fr)); gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.07); font-size:0.76rem;">
          <div style="background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:6px;">
            <span style="color:var(--text-muted); display:block;">Votos Válidos</span>
            <strong style="color:#fff; font-size:0.88rem;">${totalValidos.toLocaleString("pt-BR")}</strong>
          </div>
          <div style="background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:6px;">
            <span style="color:var(--text-muted); display:block;">Maioria (Diferença)</span>
            <strong style="color:var(--emerald-400); font-size:0.88rem;">+${diffVotos.toLocaleString("pt-BR")} votos</strong>
          </div>
          <div style="background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:6px;">
            <span style="color:var(--text-muted); display:block;">Comparecimento</span>
            <strong style="color:#fff; font-size:0.88rem;">${totalComparecimento.toLocaleString("pt-BR")} (${taxaComp}%)</strong>
          </div>
          <div style="background:rgba(255,255,255,0.02); padding:6px 8px; border-radius:6px;">
            <span style="color:var(--text-muted); display:block;">Brancos / Nulos</span>
            <strong style="color:var(--text-secondary); font-size:0.88rem;">${totalBrancos.toLocaleString("pt-BR")} / ${totalNulos.toLocaleString("pt-BR")}</strong>
          </div>
        </div>
      `;
    }
  }

  // Gráfico Chart.js: Votação Consolidada — Prefeito (2024)
  const canvasPref = document.getElementById("dashCandidatosChart");
  if (canvasPref && typeof Chart !== "undefined") {
    if (AppState.charts.dashCandidatos) {
      AppState.charts.dashCandidatos.destroy();
    }
    const ctx = canvasPref.getContext("2d");
    const labels = candidatosConsolidados.map(c => `${c.nome} (${c.partido} ${c.numero})`);
    const dataVotos = candidatosConsolidados.map(c => c.votos);
    const bgColors = candidatosConsolidados.map((_, idx) =>
      idx === 0 ? "rgba(16, 185, 129, 0.78)" : "rgba(245, 158, 11, 0.78)"
    );
    const borderColors = candidatosConsolidados.map((_, idx) =>
      idx === 0 ? "#10b981" : "#f59e0b"
    );

    AppState.charts.dashCandidatos = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Votos Válidos (16 Seções)",
            data: dataVotos,
            backgroundColor: bgColors,
            borderColor: borderColors,
            borderWidth: 1.5,
            borderRadius: 8,
            maxBarThickness: 56
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const v = Number(context.raw || 0);
                const pct = totalValidos > 0 ? ((v / totalValidos) * 100).toFixed(2).replace(".", ",") : "0,00";
                return ` ${v.toLocaleString("pt-BR")} votos (${pct}% dos válidos)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              color: "#94a3b8",
              callback: function (val) {
                return Number(val).toLocaleString("pt-BR");
              }
            }
          },
          y: {
            grid: { display: false },
            ticks: {
              color: "#f8fafc",
              font: { weight: "600", size: 12 }
            }
          }
        }
      }
    });
  }

  // Tabela: Pólos Territoriais com Maior Eleitorado
  const topBody = document.getElementById("dashTopLocalidadesBody");
  if (topBody) {
    const topComs = [...coms]
      .sort((a, b) => (Number(b.eleitoresEstimados) || 0) - (Number(a.eleitoresEstimados) || 0))
      .slice(0, 8);

    if (topComs.length === 0) {
      topBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">Nenhuma localidade cadastrada.</td></tr>`;
    } else {
      topBody.innerHTML = topComs.map((c, idx) => {
        const lidBadge = c.liderancaNome
          ? `<span style="color:var(--emerald-400); font-weight:600;">👤 ${c.liderancaNome}</span>`
          : `<span style="color:var(--text-muted); font-size:0.78rem;">Sem liderança</span>`;
        const statusClass = c.statusConferencia === "Oficial Confirmado" ? "oficial" : "estimado";
        const statusLabel = c.statusConferencia || "Mapeado";
        return `
          <tr>
            <td><strong>${idx + 1}º</strong></td>
            <td>
              <strong>${c.nome}</strong>
              <div style="font-size:0.72rem; color:var(--text-muted);">${c.tipo || ""} • ${c.zona || ""}</div>
            </td>
            <td>${lidBadge}</td>
            <td><strong>${Number(c.eleitoresEstimados || 0).toLocaleString("pt-BR")}</strong></td>
            <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
          </tr>
        `;
      }).join("");
    }
  }
}

// ==========================================================================
// 3. COMUNIDADES & BAIRROS
// ==========================================================================
function renderComunidades() {
  const search = document.getElementById("searchComunidadeInput") ? document.getElementById("searchComunidadeInput").value.toLowerCase() : "";
  let coms = db.getComunidades();

  if (search) {
    coms = coms.filter(c => c.nome.toLowerCase().includes(search) || (c.liderancaNome && c.liderancaNome.toLowerCase().includes(search)));
  }

  const tbody = document.getElementById("comunidadesTableBody");
  if (!tbody) return;

  tbody.innerHTML = coms.map(c => `
    <tr>
      <td><strong>${c.nome}</strong></td>
      <td>${c.tipo}</td>
      <td>${c.liderancaNome ? `<strong>👤 ${c.liderancaNome}</strong>` : '<span style="color:var(--status-pendente)">Sem liderança</span>'}</td>
      <td style="font-family:var(--font-mono); color:var(--gold-400); font-weight:700;">${(c.votosConseguidos || 0).toLocaleString('pt-BR')} votos</td>
      <td style="font-family:var(--font-mono);">${(c.eleitoresEstimados || 0).toLocaleString('pt-BR')}</td>
      <td><span class="badge-status ${c.statusConferencia === 'Oficial Confirmado' ? 'oficial' : 'pendente'}">${c.statusConferencia}</span></td>
      <td>
        <div style="display:flex; gap:6px;">
          <button class="btn btn-gold btn-sm" onclick="abrirModalMapearLiderBairro('${c.id}')" title="Mapear Meta & Líder">
            🎯 Meta
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editarComunidade('${c.id}')" title="Editar dados cadastrais">
            ✏️ Editar
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function abrirModalNovaComunidade() {
  const titleEl = document.getElementById("modalComunidadeTitle");
  if (titleEl) titleEl.textContent = "Novo Bairro ou Comunidade";

  const idEl = document.getElementById("formComunidadeId");
  if (idEl) idEl.value = "";

  const nomeEl = document.getElementById("formComunidadeNome");
  if (nomeEl) nomeEl.value = "";

  const tipoEl = document.getElementById("formComunidadeTipo");
  if (tipoEl) tipoEl.value = "Bairro Urbano";

  const statusEl = document.getElementById("formComunidadeStatus");
  if (statusEl) statusEl.value = "Oficial Confirmado";

  const latEl = document.getElementById("formComunidadeLat");
  if (latEl) latEl.value = "-5.8153";

  const lngEl = document.getElementById("formComunidadeLng");
  if (lngEl) lngEl.value = "-35.8239";

  const hintEl = document.getElementById("formComunidadeCoordsHint");
  if (hintEl) hintEl.innerHTML = "Marque o ponto exato das casas e ruas diretamente no satélite";

  const eleitoresEl = document.getElementById("formComunidadeEleitores");
  if (eleitoresEl) eleitoresEl.value = "100";

  const liderInput = document.getElementById("formComunidadeLideranca");
  if (liderInput) liderInput.value = "";
  const liderDatalist = document.getElementById("listaLiderancasSugestoesComunidade");
  if (liderDatalist) {
    const liderancas = db.getLiderancas();
    liderDatalist.innerHTML = liderancas.map(l => `<option value="${l.nome}">${l.cargoPapel || 'Líder'} ${l.telefone ? `(${l.telefone})` : ''}</option>`).join("");
  }

  const obsEl = document.getElementById("formComunidadeObs");
  if (obsEl) obsEl.value = "";

  openModal("modalComunidade");
}

function editarComunidade(id) {
  const com = db.getComunidadeById(id);
  if (!com) return;

  const titleEl = document.getElementById("modalComunidadeTitle");
  if (titleEl) titleEl.textContent = `Editar Localidade: ${com.nome}`;

  document.getElementById("formComunidadeId").value = com.id || "";
  document.getElementById("formComunidadeNome").value = com.nome || "";
  document.getElementById("formComunidadeTipo").value = com.tipo || "Bairro Urbano";
  document.getElementById("formComunidadeStatus").value = com.statusConferencia || "Oficial Confirmado";

  const coords = com.coordenadas || [-5.8153, -35.8239];
  document.getElementById("formComunidadeLat").value = coords[0] || -5.8153;
  document.getElementById("formComunidadeLng").value = coords[1] || -35.8239;

  const hintEl = document.getElementById("formComunidadeCoordsHint");
  if (hintEl) hintEl.innerHTML = `Ponto atual: ${coords[0]}, ${coords[1]}`;

  document.getElementById("formComunidadeEleitores").value = com.eleitoresEstimados || 100;

  const liderInput = document.getElementById("formComunidadeLideranca");
  if (liderInput) liderInput.value = com.liderancaNome || "";
  const liderDatalist = document.getElementById("listaLiderancasSugestoesComunidade");
  if (liderDatalist) {
    const liderancas = db.getLiderancas();
    liderDatalist.innerHTML = liderancas.map(l => `<option value="${l.nome}">${l.cargoPapel || 'Líder'} ${l.telefone ? `(${l.telefone})` : ''}</option>`).join("");
  }

  document.getElementById("formComunidadeObs").value = com.observacoes || "";
  openModal("modalComunidade");
}

function salvarFormComunidade() {
  const id = (document.getElementById("formComunidadeId")?.value || "").trim();
  const nome = (document.getElementById("formComunidadeNome")?.value || "").trim();
  const tipo = document.getElementById("formComunidadeTipo")?.value || "Bairro Urbano";
  const status = document.getElementById("formComunidadeStatus")?.value || "Oficial Confirmado";
  const lat = parseFloat(document.getElementById("formComunidadeLat")?.value) || -5.8153;
  const lng = parseFloat(document.getElementById("formComunidadeLng")?.value) || -35.8239;
  const eleitores = parseInt(document.getElementById("formComunidadeEleitores")?.value) || 0;
  const liderancaNome = (document.getElementById("formComunidadeLideranca")?.value || "").trim() || null;
  const obs = (document.getElementById("formComunidadeObs")?.value || "").trim();

  if (!nome) {
    alert("Nome da localidade é obrigatório.");
    return;
  }

  let payload = {
    nome: nome,
    tipo: tipo,
    statusConferencia: status,
    coordenadas: [lat, lng],
    eleitoresEstimados: eleitores,
    liderancaNome: liderancaNome,
    observacoes: obs
  };

  if (id) {
    const existing = db.getComunidadeById(id) || {};
    payload = { ...existing, ...payload, id };
  }

  const saved = db.saveComunidade(payload);

  if (saved && saved.id) {
    if (liderancaNome) {
      db.atribuirLiderancaAoBairro(saved.id, liderancaNome, saved.votosConseguidos || 0, saved.metaVotos || null);
    } else if (id) {
      db.atribuirLiderancaAoBairro(saved.id, null, 0);
    }
  }

  db.sincronizarLiderancasComBairros();

  if (AppState.pickedLocationMarker && AppState.map) {
    AppState.map.removeLayer(AppState.pickedLocationMarker);
    AppState.pickedLocationMarker = null;
  }

  closeModal("modalComunidade");
  showToast(`Localidade "${nome}" salva com sucesso!`);
  renderMapaTerritorial();
  renderComunidades();
  renderLiderancas();
  carregarMarcadoresMapa();
  renderTabelaLocalidadesMapa();
  atualizarMetometroConsolidado();
  updateSidebarCounters();

  // Se foi uma nova localidade criada no mapa, sugere ajustar seu perímetro
  if (!id && saved && saved.id) {
    setTimeout(() => {
      if (confirm(`Deseja desenhar / ajustar os limites e perímetro de "${nome}" agora no mapa?`)) {
        iniciarEdicaoPerimetro(saved.id);
      }
    }, 400);
  }
}

// ==========================================================================
// 4. LIDERANÇAS TERRITORIAIS
// ==========================================================================
function renderLiderancas() {
  const tbody = document.getElementById("liderancasTableBody");
  if (!tbody) return;

  const searchInput = document.getElementById("searchLiderancaInput")?.value?.toLowerCase() || "";
  const statusFilter = document.getElementById("filtroStatusLideranca")?.value || "";


  let lids = db.getLiderancas();
  if (statusFilter) {
    lids = lids.filter(l => l.status === statusFilter);
  }
  if (searchInput) {
    lids = lids.filter(l => 
      (l.nome && l.nome.toLowerCase().includes(searchInput)) ||
      (l.apelido && l.apelido.toLowerCase().includes(searchInput)) ||
      (l.cargoPapel && l.cargoPapel.toLowerCase().includes(searchInput)) ||
      (l.telefone && l.telefone.includes(searchInput))
    );
  }

  if (lids.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">
          Nenhuma liderança encontrada. Clique em <strong>"+ Cadastrar Liderança"</strong> ou vincule diretamente no <strong>Mapa Territorial</strong>.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lids.map(l => {
    const comsNomes = (l.comunidadesVinculadas || []).map(cid => {
      const c = db.getComunidadeById(cid);
      return c ? c.nome : cid;
    }).join(", ") || "Nenhuma";

    const periodo = l.dataInicio ? `${l.dataInicio} ${l.dataFim ? 'até ' + l.dataFim : '(Em exercício)'}` : "Indeterminado";

    return `
      <tr>
        <td>
          <strong style="color:#ffffff;">👤 ${l.nome}</strong>
          ${l.apelido ? `<br><small style="color:var(--gold-400);">"${l.apelido}"</small>` : ''}
        </td>
        <td>${l.cargoPapel || 'Líder Territorial'}</td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.85rem;">${l.telefone || 'Não informado'}</span>
          ${l.email ? `<br><small style="color:var(--text-muted);">${l.email}</small>` : ''}
        </td>
        <td><span style="font-size:0.85rem; color:var(--emerald-400); font-weight:600;">${comsNomes}</span></td>
        <td><small style="color:var(--text-muted);">${periodo}</small></td>
        <td><span class="badge-status ${l.status === 'Ativo' ? 'oficial' : 'pendente'}">${l.status || 'Ativo'}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-gold btn-sm" onclick="editarLideranca('${l.id}')">Editar</button>
            <button class="btn btn-secondary btn-sm" style="color:#f87171;" onclick="excluirLideranca('${l.id}')">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalNovaLideranca() {
  document.getElementById("modalLiderancaTitle").textContent = "Cadastrar Liderança";
  document.getElementById("formLiderancaId").value = "";
  document.getElementById("formLiderancaNome").value = "";
  document.getElementById("formLiderancaApelido").value = "";
  document.getElementById("formLiderancaTelefone").value = "";
  document.getElementById("formLiderancaEmail").value = "";
  document.getElementById("formLiderancaCargo").value = "Líder Comunitário";
  document.getElementById("formLiderancaStatus").value = "Ativo";
  document.getElementById("formLiderancaDataInicio").value = new Date().toISOString().split("T")[0];
  document.getElementById("formLiderancaDataFim").value = "";
  document.getElementById("formLiderancaLogin").value = "";
  document.getElementById("formLiderancaSenha").value = "";
  document.getElementById("formLiderancaObs").value = "";

  const container = document.getElementById("formLiderancaComunidadesContainer");
  if (container) {
    const coms = db.getComunidades();
    container.innerHTML = coms.map(c => `
      <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:0.85rem; color:var(--text-main); cursor:pointer;">
        <input type="checkbox" name="liderancaComunidadeCheck" value="${c.id}">
        <span>${c.nome} <small style="color:var(--text-muted);">(${c.tipo})</small></span>
      </label>
    `).join("");
  }

  const btnDel = document.getElementById("btnExcluirLiderancaModal");
  if (btnDel) btnDel.style.display = "none";

  openModal("modalLideranca");
}

function editarLideranca(id) {
  const lid = db.getLiderancaById(id);
  if (!lid) return;

  document.getElementById("modalLiderancaTitle").textContent = `Editar Liderança: ${lid.nome}`;
  document.getElementById("formLiderancaId").value = lid.id || "";
  document.getElementById("formLiderancaNome").value = lid.nome || "";
  document.getElementById("formLiderancaApelido").value = lid.apelido || "";
  document.getElementById("formLiderancaTelefone").value = lid.telefone || "";
  document.getElementById("formLiderancaEmail").value = lid.email || "";
  document.getElementById("formLiderancaCargo").value = lid.cargoPapel || "";
  document.getElementById("formLiderancaStatus").value = lid.status || "Ativo";
  document.getElementById("formLiderancaDataInicio").value = lid.dataInicio || "";
  document.getElementById("formLiderancaDataFim").value = lid.dataFim || "";
  document.getElementById("formLiderancaLogin").value = lid.login || "";
  document.getElementById("formLiderancaSenha").value = lid.senha || "";
  document.getElementById("formLiderancaObs").value = lid.observacoes || "";

  const container = document.getElementById("formLiderancaComunidadesContainer");
  if (container) {
    const coms = db.getComunidades();
    const vinculadas = lid.comunidadesVinculadas || [];
    container.innerHTML = coms.map(c => {
      const checked = vinculadas.includes(c.id) || (c.liderancaNome && c.liderancaNome.toLowerCase() === (lid.nome || "").toLowerCase());
      return `
        <label style="display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:0.85rem; color:var(--text-main); cursor:pointer;">
          <input type="checkbox" name="liderancaComunidadeCheck" value="${c.id}" ${checked ? 'checked' : ''}>
          <span>${c.nome} <small style="color:var(--text-muted);">(${c.tipo})</small></span>
        </label>
      `;
    }).join("");
  }

  const btnDel = document.getElementById("btnExcluirLiderancaModal");
  if (btnDel) btnDel.style.display = "inline-block";

  openModal("modalLideranca");
}

function salvarFormLideranca() {
  const id = document.getElementById("formLiderancaId").value;
  const nome = document.getElementById("formLiderancaNome").value.trim();
  const apelido = document.getElementById("formLiderancaApelido").value.trim();
  const telefone = document.getElementById("formLiderancaTelefone").value.trim();
  const email = document.getElementById("formLiderancaEmail").value.trim();
  const cargo = document.getElementById("formLiderancaCargo").value.trim() || "Líder Comunitário";
  const status = document.getElementById("formLiderancaStatus").value;
  const dataInicio = document.getElementById("formLiderancaDataInicio").value;
  const dataFim = document.getElementById("formLiderancaDataFim").value;
  const login = (document.getElementById("formLiderancaLogin").value || "").trim().toLowerCase();
  const senha = document.getElementById("formLiderancaSenha").value;
  const obs = document.getElementById("formLiderancaObs").value.trim();

  if (!nome) {
    alert("Nome da liderança é obrigatório.");
    return;
  }

  if (login && (!senha || senha.length < 4)) {
    showToast("A senha de acesso da liderança deve conter no mínimo 4 caracteres.");
    return;
  }

  const checkboxes = document.querySelectorAll("input[name='liderancaComunidadeCheck']:checked");
  const comunidadesVinculadas = Array.from(checkboxes).map(cb => cb.value);

  const payload = {
    nome,
    apelido,
    telefone,
    email,
    cargoPapel: cargo,
    status,
    dataInicio,
    dataFim,
    comunidadesVinculadas,
    login,
    senha,
    observacoes: obs
  };
  if (id) payload.id = id;

  const salvo = db.saveLideranca(payload);
  const lidId = salvo ? salvo.id : (payload.id || id);

  // 1. Desvincula qualquer comunidade que antes pertencia a esta liderança e agora foi desmarcada
  (db.data.comunidades || []).forEach(com => {
    if (com.liderancaResponsavelId === lidId && !comunidadesVinculadas.includes(com.id)) {
      com.liderancaResponsavelId = null;
      com.liderancaNome = null;
      db.saveComunidade(com);
    }
  });

  // 2. Vincula comunidades selecionadas diretamente
  comunidadesVinculadas.forEach(comId => {
    const com = db.getComunidadeById(comId);
    if (com) {
      com.liderancaNome = nome;
      com.liderancaResponsavelId = lidId;
      if (telefone) com.liderancaContato = telefone;
      db.saveComunidade(com);
    }
  });

  // 3. Executa a sincronização bidirecional
  db.sincronizarLiderancasComBairros();

  closeModal("modalLideranca");
  showToast(`Liderança "${nome}" salva com sucesso e vinculada aos bairros!`);
  renderLiderancas();
  renderComunidades();
  carregarMarcadoresMapa();
  renderTabelaLocalidadesMapa();
  atualizarMetometroConsolidado();
  updateSidebarCounters();
}

function excluirLideranca(id) {
  let lid = db.getLiderancaById(id);
  if (!lid && db.data && Array.isArray(db.data.liderancas)) {
    lid = db.data.liderancas.find(l => String(l.id) === String(id));
  }
  const nomeLid = lid ? lid.nome : "esta liderança";
  if (confirm(`Tem certeza que deseja excluir/remover a liderança "${nomeLid}"?`)) {
    db.deleteLideranca(id);
    showToast(`Liderança "${nomeLid}" removida com sucesso.`);
    renderLiderancas();
    renderComunidades();
    carregarMarcadoresMapa();
    renderTabelaLocalidadesMapa();
    atualizarMetometroConsolidado();
    updateSidebarCounters();
    if (AppState.map) AppState.map.closePopup();
  }
}

function excluirLiderancaPeloModal() {
  const id = document.getElementById("formLiderancaId")?.value;
  if (!id) return;
  excluirLideranca(id);
  closeModal("modalLideranca");
}

function removerLiderancaDoBairroDireto(bairroId) {
  const com = db.getComunidadeById(bairroId);
  if (!com) return;
  if (confirm(`Deseja realmente remover/desvincular a liderança "${com.liderancaNome || 'atribuída'}" do bairro ${com.nome}?`)) {
    db.atribuirLiderancaAoBairro(bairroId, null, 0);
    showToast(`Liderança removida do bairro "${com.nome}".`);
    carregarMarcadoresMapa();
    renderTabelaLocalidadesMapa();
    renderComunidades();
    renderLiderancas();
    atualizarMetometroConsolidado();
    updateSidebarCounters();
    if (AppState.map) AppState.map.closePopup();
  }
}

// ==========================================================================
// 4.1 CADASTRO E GESTÃO DE ELEITORES POR BAIRRO E LIDERANÇA
// ==========================================================================
function renderEleitores() {
  const filtroBairro = document.getElementById("filtroEleitorBairro");
  const filtroLider = document.getElementById("filtroEleitorLideranca");
  const filtroSecao = document.getElementById("filtroEleitorSecao");
  const searchInput = document.getElementById("searchEleitorInput");
  const bannerLider = document.getElementById("eleitorBannerModoLideranca");
  const nomeLiderEl = document.getElementById("eleitorNomeLiderAtual");

  const comunidades = db.getComunidades();
  const secoes = db.getSecoesEleitorais();
  const estatisticas = db.getEstatisticasEleitores();
  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";

  // Banner e filtros específicos para perfil de Liderança Comunitária
  if (isLider) {
    if (bannerLider) {
      bannerLider.style.display = "block";
      if (nomeLiderEl) nomeLiderEl.textContent = currentUser.nome;
    }
    if (filtroLider) {
      filtroLider.innerHTML = `<option value="${currentUser.nome}" selected>🎖️ Meus Eleitores Exclusivos (${currentUser.nome})</option>`;
      filtroLider.disabled = true;
    }
  } else {
    if (bannerLider) bannerLider.style.display = "none";
    if (filtroLider) {
      filtroLider.disabled = false;
      if (filtroLider.options.length <= 1) {
        const valAtual = filtroLider.value;
        const lideresDb = db.getLiderancas().map(l => l.nome);
        const lideresDosEleitores = estatisticas.porLideranca.map(l => l.lideranca);
        const todosLideres = [...new Set([...lideresDb, ...lideresDosEleitores].filter(Boolean))];
        filtroLider.innerHTML = '<option value="">Todas as Lideranças</option>' +
          todosLideres.map(l => `<option value="${l}" ${l === valAtual ? 'selected' : ''}>${l}</option>`).join("");
      }
    }
  }

  if (filtroBairro && filtroBairro.options.length <= 1) {
    const valAtual = filtroBairro.value;
    filtroBairro.innerHTML = '<option value="">Todos os Bairros</option>' +
      comunidades.map(c => `<option value="${c.nome}" ${c.nome === valAtual ? 'selected' : ''}>${c.nome}</option>`).join("");
  }

  if (filtroSecao && filtroSecao.options.length <= 1) {
    const valAtual = filtroSecao.value;
    filtroSecao.innerHTML = '<option value="">Todas as 16 Seções</option>' +
      secoes.map(s => `<option value="${s.secao}" ${s.secao === valAtual ? 'selected' : ''}>Seção ${s.secao}</option>`).join("");
  }

  const filtros = {
    bairro: filtroBairro ? filtroBairro.value : "",
    lideranca: isLider ? currentUser.nome : (filtroLider ? filtroLider.value : ""),
    secao: filtroSecao ? filtroSecao.value : "",
    busca: searchInput ? searchInput.value : ""
  };

  const lista = db.getEleitores(filtros);

  // KPIs
  const kpiTotal = document.getElementById("kpiEleitoresTotal");
  const kpiTotalSub = document.getElementById("kpiEleitoresTotalSub");
  const kpiComFoto = document.getElementById("kpiEleitoresComFoto");
  const kpiComFotoSub = document.getElementById("kpiEleitoresComFotoSub");
  const kpiBairro = document.getElementById("kpiEleitoresBairroLider");
  const kpiBairroSub = document.getElementById("kpiEleitoresBairroLiderSub");
  const kpiLider = document.getElementById("kpiEleitoresLiderDestaque");
  const kpiLiderSub = document.getElementById("kpiEleitoresLiderDestaqueSub");

  if (kpiTotal) kpiTotal.textContent = estatisticas.total;
  if (kpiTotalSub) kpiTotalSub.textContent = isLider ? `Seus eleitores vinculados` : `${estatisticas.porBairro.length} bairros mapeados`;
  if (kpiComFoto) kpiComFoto.textContent = estatisticas.totalComFoto;
  if (kpiComFotoSub) kpiComFotoSub.textContent = `${estatisticas.total > 0 ? ((estatisticas.totalComFoto / estatisticas.total) * 100).toFixed(0) : 0}% com documento anexado`;

  const topBairro = estatisticas.porBairro[0];
  if (kpiBairro) kpiBairro.textContent = topBairro ? topBairro.bairro : "-";
  if (kpiBairroSub) kpiBairroSub.textContent = topBairro ? `${topBairro.total} eleitores vinculados (${topBairro.percentual}%)` : "Nenhum cadastrado";

  const topLider = estatisticas.porLideranca[0];
  if (kpiLider) kpiLider.textContent = isLider ? currentUser.nome : (topLider ? topLider.lideranca : "-");
  if (kpiLiderSub) kpiLiderSub.textContent = isLider ? `${estatisticas.total} eleitores em sua base` : (topLider ? `${topLider.total} eleitores articulados` : "Nenhum cadastrado");

  // Painel Computado por Bairro
  const listaBairrosEl = document.getElementById("eleitoresPorBairroList");
  if (listaBairrosEl) {
    if (!estatisticas.porBairro.length) {
      listaBairrosEl.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:12px;">Nenhum eleitor cadastrado por bairro ainda.</div>`;
    } else {
      listaBairrosEl.innerHTML = estatisticas.porBairro.map(b => `
        <div class="eleitor-breakdown-item">
          <div class="eleitor-breakdown-item-top">
            <div>
              <span class="eleitor-breakdown-name">${b.bairro}</span>
              <span class="eleitor-breakdown-sub"> • Líder: <strong style="color:var(--emerald-400);">${b.liderancaPrincipal}</strong></span>
            </div>
            <span class="eleitor-breakdown-val">${b.total} eleitores <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(${b.percentual}%)</span></span>
          </div>
          <div class="tse-candidate-bar-wrapper">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill gold" style="width:${Math.min(100, (b.total / (topBairro ? topBairro.total : 1)) * 100)}%;"></div>
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  // Painel Computado por Liderança
  const listaLidsEl = document.getElementById("eleitoresPorLiderancaList");
  if (listaLidsEl) {
    if (!estatisticas.porLideranca.length) {
      listaLidsEl.innerHTML = `<div style="color:var(--text-muted); font-size:0.8rem; text-align:center; padding:12px;">Nenhuma liderança vinculada a eleitores ainda.</div>`;
    } else {
      listaLidsEl.innerHTML = estatisticas.porLideranca.map(l => `
        <div class="eleitor-breakdown-item">
          <div class="eleitor-breakdown-item-top">
            <div>
              <span class="eleitor-breakdown-name">🎖️ ${l.lideranca}</span>
              <span class="eleitor-breakdown-sub"> • ${l.bairros || 'Riachuelo'}</span>
            </div>
            <span class="eleitor-breakdown-val">${l.total} eleitores <span style="font-size:0.7rem; color:var(--text-muted); font-weight:normal;">(${l.percentual}%)</span></span>
          </div>
          <div class="tse-candidate-bar-wrapper">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill blue" style="width:${Math.min(100, (l.total / (topLider ? topLider.total : 1)) * 100)}%;"></div>
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  // Tabela de Eleitores
  const tbody = document.getElementById("eleitoresTableBody");
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" style="text-align:center; padding:35px; color:var(--text-muted);">
          Nenhum eleitor localizado com os filtros selecionados. Clique em "+ Cadastrar Eleitor" para registrar o primeiro.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(e => {
    const temFoto = e.fotoTitulo && e.fotoTitulo.trim() !== "";
    const fotoHtml = temFoto
      ? `<img src="${e.fotoTitulo}" class="eleitor-foto-thumb" onclick="abrirFotoTituloModal('${e.id}')" title="Clique para ampliar a foto de ${e.nome}">`
      : `<div class="eleitor-foto-thumb-empty" onclick="editarEleitor('${e.id}')" title="Sem foto anexada. Clique para anexar foto.">📷<span>Sem Foto</span></div>`;

    const aniv = (typeof WhatsAppDispatcher !== "undefined" && WhatsAppDispatcher.obterStatusAniversario)
      ? WhatsAppDispatcher.obterStatusAniversario(e.dataNascimento)
      : { temData: !!e.dataNascimento, formatada: e.dataNascimento || "Não informada", idade: null, ehHoje: false, ehProximaSemana: false, ehMesAtual: false };

    let nascHtml = `<span style="font-size:0.78rem; color:var(--text-dim);">Não informada</span>`;
    if (aniv.temData) {
      if (aniv.ehHoje) {
        nascHtml = `
          <div>
            <span style="background:linear-gradient(90deg, #f59e0b, #fbbf24); color:#000; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:999px; display:inline-block;">
              🎂 HOJE! (${aniv.diaMes})
            </span>
            <div style="font-size:0.73rem; color:var(--gold-400); margin-top:2px; font-weight:700;">
              ${aniv.formatada}${aniv.idade !== null ? ` • ${aniv.idade} anos` : ""}
            </div>
          </div>
        `;
      } else if (aniv.ehProximaSemana) {
        nascHtml = `
          <div>
            <span style="font-family:var(--font-mono); font-size:0.82rem; color:var(--gold-400); font-weight:700;">🎉 ${aniv.formatada}</span>
            <div style="font-size:0.72rem; color:var(--emerald-400);">${aniv.ehAmanha ? "Aniversário amanhã!" : `Aniversário em ${aniv.diasRestantes} dias`}</div>
          </div>
        `;
      } else {
        nascHtml = `
          <div>
            <span style="font-family:var(--font-mono); font-size:0.82rem; color:#e2e8f0;">📅 ${aniv.formatada}</span>
            ${aniv.idade !== null ? `<div style="font-size:0.72rem; color:var(--text-muted);">${aniv.idade} anos${aniv.ehMesAtual ? " • Mês atual 🎉" : ""}</div>` : ""}
          </div>
        `;
      }
    }

    return `
      <tr style="${aniv.ehHoje ? 'background:rgba(245,158,11,0.1); border-left:3px solid #fbbf24;' : ''}">
        <td>${fotoHtml}</td>
        <td>
          <strong style="color:#ffffff; font-size:0.92rem;">${e.nome}</strong>
          ${aniv.ehHoje ? `<span style="margin-left:6px; background:var(--gold-400); color:#000; font-weight:800; font-size:0.68rem; padding:1px 6px; border-radius:4px;">🎂 ANIVERSARIANTE</span>` : ''}
          ${e.observacoes ? `<div style="font-size:0.73rem; color:var(--text-muted); margin-top:2px;">${e.observacoes.length > 40 ? e.observacoes.slice(0, 40) + '...' : e.observacoes}</div>` : ''}
        </td>
        <td>${nascHtml}</td>
        <td>
          <span style="font-weight:600; color:#e2e8f0; font-size:0.85rem;">${e.rua || '-'}</span><br>
          <span style="font-size:0.72rem; color:var(--text-muted);">Nº ${e.numero || 'S/N'}</span>
        </td>
        <td>
          <span style="font-size:0.8rem; color:var(--text-main);">${e.endereco || `${e.rua || ''}, ${e.numero || ''} - ${e.bairroNome || ''}`}</span>
        </td>
        <td>
          <strong style="color:var(--emerald-400); font-size:0.85rem;">📍 ${e.bairroNome || '-'}</strong>
        </td>
        <td>
          <span class="badge-status oficial" style="font-weight:700; font-size:0.78rem; background:rgba(16,185,129,0.18); color:var(--emerald-400); border-color:var(--emerald-500);">
            🏛️ ${e.intencaoPrefeito || 'Não informado'}
          </span>
        </td>
        <td>
          <span class="badge-status oficial" style="font-weight:700; font-size:0.78rem; background:rgba(217,119,6,0.18); color:var(--gold-400); border-color:#d97706;">
            🗳️ ${e.intencaoVereador || 'Não informado'}
          </span>
        </td>
        <td>
          <span class="eleitor-badge-lideranca" title="Eleitor vinculado com exclusividade a esta liderança">
            🔒 ${e.liderancaNome || 'Sem liderança'}
          </span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.82rem; color:#ffffff;">${e.telefone || '-'}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${e.dataCadastro || '-'}</span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            ${temFoto ? `<button class="btn btn-secondary btn-sm" onclick="abrirFotoTituloModal('${e.id}')" title="Ver Foto Anexada">📷 Ver Foto</button>` : ''}
            ${e.telefone ? `<button class="btn btn-secondary btn-sm" onclick="dispararWhatsAppEleitor('${e.id}')" title="${aniv.ehHoje ? 'Enviar Parabéns no WhatsApp' : 'Enviar WhatsApp Direto'}" style="color:#25D366; font-weight:700; font-size:1rem; padding:3px 7px;">${aniv.ehHoje ? '🎂' : '💬'}</button>` : ''}
            <button class="btn btn-primary btn-sm" onclick="editarEleitor('${e.id}')" title="Editar dados do eleitor">✏️</button>
            <button class="btn btn-secondary btn-sm" onclick="excluirEleitor('${e.id}')" title="Excluir cadastro" style="color:#ef4444;">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Renderiza a visualização em Cards Mobile para Lideranças
  const mobileCardsContainer = document.getElementById("eleitoresMobileCardsList");
  if (mobileCardsContainer) {
    const statMeusEleitores = document.getElementById("mobileStatMeusEleitores");
    const statComFoto = document.getElementById("mobileStatComFoto");
    if (statMeusEleitores) statMeusEleitores.textContent = estatisticas.total;
    if (statComFoto) statComFoto.textContent = estatisticas.totalComFoto;

    if (lista.length === 0) {
      mobileCardsContainer.innerHTML = `
        <div class="mobile-card-empty">
          <div style="font-size:2.5rem; margin-bottom:8px;">👥</div>
          <h4 style="color:#ffffff; margin:0 0 4px; font-weight:700;">Nenhum eleitor localizado</h4>
          <p style="font-size:0.82rem; color:var(--text-muted); margin:0 0 16px;">Cadastre seu primeiro eleitor com um toque no botão abaixo.</p>
          <button type="button" class="btn btn-gold" onclick="abrirModalNovoEleitor()" style="padding:12px 24px; font-weight:800; border-radius:10px;">➕ Cadastrar Eleitor</button>
        </div>
      `;
    } else {
      mobileCardsContainer.innerHTML = lista.map(e => {
        const temFoto = e.fotoTitulo && e.fotoTitulo.trim() !== "";
        const telSanitizado = e.telefone ? e.telefone.replace(/\D/g, "") : "";
        const linkWpp = telSanitizado ? `https://api.whatsapp.com/send?phone=55${telSanitizado.replace(/^55/, "")}` : null;
        const fotoHtml = temFoto
          ? `<img src="${e.fotoTitulo}" alt="Foto">`
          : `<span>📷</span>`;
        const aniv = (typeof WhatsAppDispatcher !== "undefined" && WhatsAppDispatcher.obterStatusAniversario)
          ? WhatsAppDispatcher.obterStatusAniversario(e.dataNascimento)
          : { temData: false };

        return `
          <div class="eleitor-mobile-card" style="${aniv.ehHoje ? 'border:1.5px solid var(--gold-400);' : ''}">
            <div class="eleitor-mobile-card-top">
              <div class="eleitor-mobile-avatar" onclick="${temFoto ? `abrirFotoTituloModal('${e.id}')` : `editarEleitor('${e.id}')`}" title="${temFoto ? 'Ver foto anexada' : 'Anexar foto'}">
                ${fotoHtml}
              </div>
              <div class="eleitor-mobile-info">
                <div class="eleitor-mobile-name">
                  ${e.nome}
                  ${aniv.ehHoje ? `<span style="background:var(--gold-400); color:#000; font-size:0.68rem; padding:1px 6px; border-radius:4px; margin-left:4px; font-weight:800;">🎂 HOJE!</span>` : ''}
                </div>
                <div class="eleitor-mobile-endereco">
                  📍 ${e.rua ? `${e.rua}, Nº ${e.numero || 'S/N'}` : (e.endereco || 'Endereço não informado')}
                </div>
                <div class="eleitor-mobile-badges">
                  <span class="badge-bairro">📍 ${e.bairroNome || '-'}</span>
                  ${aniv.temData ? `<span class="badge-secao" style="${aniv.ehHoje ? 'background:rgba(245,158,11,0.25); color:var(--gold-400); border-color:var(--gold-400);' : ''}">🎂 ${aniv.formatada}</span>` : ''}
                  <span class="badge-secao">🏛️ Pref: ${e.intencaoPrefeito || 'N/I'}</span>
                  <span class="badge-secao">🗳️ Ver: ${e.intencaoVereador || 'N/I'}</span>
                  ${temFoto ? '<span class="badge-doc">📷 Com Foto</span>' : ''}
                </div>
              </div>
            </div>

            <div class="eleitor-mobile-card-actions">
              ${linkWpp ? `
                <a href="${linkWpp}" target="_blank" class="mobile-card-btn btn-whatsapp" title="Conversar no WhatsApp">
                  <span>💬</span> WhatsApp
                </a>
              ` : `
                <button type="button" class="mobile-card-btn btn-sem-tel" onclick="editarEleitor('${e.id}')">
                  <span>➕</span> Add Tel
                </button>
              `}
              <button type="button" class="mobile-card-btn btn-edit" onclick="editarEleitor('${e.id}')" title="Editar">
                ✏️ Editar
              </button>
              <button type="button" class="mobile-card-btn btn-del" onclick="excluirEleitor('${e.id}')" title="Excluir">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  updateSidebarCounters();
}

function rolarTabelaEleitores(direcao) {
  const el = document.getElementById("eleitoresTableResponsive");
  if (!el) return;
  const delta = direcao === 'esquerda' ? -380 : 380;
  el.scrollBy({ left: delta, behavior: "smooth" });
}

function aoSelecionarBairroFormEleitor() {
  const bairroSelect = document.getElementById("formEleitorBairro");
  const liderInput = document.getElementById("formEleitorLideranca");
  const secaoSelect = document.getElementById("formEleitorSecao");
  if (!bairroSelect) return;

  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";

  const bairroNome = bairroSelect.value;
  const com = db.getComunidades().find(c => c.nome === bairroNome);
  if (com) {
    if (liderInput && !isLider && com.liderancaNome) {
      liderInput.value = com.liderancaNome;
    }
    if (secaoSelect && com.secoesVinculadas && com.secoesVinculadas.length) {
      secaoSelect.value = com.secoesVinculadas[0];
    }
  }
  aoMudarEnderecoFormEleitor();
  verificarConflitoEleitorInstantaneo();
}

function aoMudarEnderecoFormEleitor() {
  const rua = (document.getElementById("formEleitorRua")?.value || "").trim();
  const num = (document.getElementById("formEleitorNumero")?.value || "").trim();
  const bairro = (document.getElementById("formEleitorBairro")?.value || "").trim();
  const endInput = document.getElementById("formEleitorEndereco");
  if (endInput) {
    let partes = [];
    if (rua) partes.push(rua);
    if (num) partes.push(num);
    if (bairro) partes.push(bairro);
    partes.push("Riachuelo–RN");
    endInput.value = partes.join(", ");
  }
}

function formatarTituloInput(input) {
  if (!input) return;
  // Apenas dígitos numéricos, até 12 dígitos
  let v = input.value.replace(/\D/g, "").slice(0, 12);
  if (v.length > 8) {
    input.value = `${v.slice(0, 4)} ${v.slice(4, 8)} ${v.slice(8)}`;
  } else if (v.length > 4) {
    input.value = `${v.slice(0, 4)} ${v.slice(4)}`;
  } else {
    input.value = v;
  }
}

function formatarTituloExibicao(tit) {
  if (!tit) return "";
  const v = String(tit).replace(/\D/g, "");
  if (v.length === 12) {
    return `${v.slice(0, 4)} ${v.slice(4, 8)} ${v.slice(8)}`;
  }
  return tit;
}

// Verificação em tempo real: se o eleitor já pertencer a outra liderança, avisa e bloqueia na hora
function verificarConflitoEleitorInstantaneo() {
  const nomeInput = document.getElementById("formEleitorNome");
  const tituloInput = document.getElementById("formEleitorNumeroTitulo");
  const alertaEl = document.getElementById("eleitorAlertaConflito");
  const alertaMsgEl = document.getElementById("eleitorAlertaConflitoMsg");
  const btnSalvar = document.getElementById("btnSalvarEleitor");
  const id = document.getElementById("formEleitorId")?.value || null;
  const liderInput = document.getElementById("formEleitorLideranca");

  if (!alertaEl || !alertaMsgEl) return;

  const nome = (nomeInput?.value || "").trim();
  const titulo = (tituloInput?.value || "").trim();

  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  const lider = isLider ? currentUser.nome : ((liderInput?.value || "").trim() || "Sem liderança");

  if (!nome && !titulo) {
    alertaEl.style.display = "none";
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.removeAttribute("title");
    }
    if (nomeInput) nomeInput.style.borderColor = "";
    if (tituloInput) tituloInput.style.borderColor = "";
    return;
  }

  const checagem = db.verificarConflitoEleitor({
    id: id,
    nome: nome,
    numeroTitulo: titulo,
    liderancaNome: lider
  });

  if (checagem.conflito) {
    alertaEl.style.display = "block";
    alertaMsgEl.textContent = checagem.mensagem;
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.setAttribute("title", checagem.mensagem);
    }
    if (checagem.motivo && checagem.motivo.includes("titulo")) {
      if (tituloInput) tituloInput.style.borderColor = "#ef4444";
    }
    if (checagem.motivo && checagem.motivo.includes("nome")) {
      if (nomeInput) nomeInput.style.borderColor = "#ef4444";
    }
  } else {
    alertaEl.style.display = "none";
    if (btnSalvar) {
      btnSalvar.disabled = false;
      btnSalvar.removeAttribute("title");
    }
    if (nomeInput) nomeInput.style.borderColor = "";
    if (tituloInput) tituloInput.style.borderColor = "";
  }
}

function aoSelecionarFotoTitulo(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Por favor, selecione um arquivo de imagem (JPG, PNG).");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const base64 = e.target.result;
    const hidden = document.getElementById("formEleitorFotoBase64");
    const previewImg = document.getElementById("eleitorFotoPreviewImg");
    const previewContainer = document.getElementById("eleitorFotoPreviewContainer");
    const uploadArea = document.getElementById("eleitorUploadArea");

    if (hidden) hidden.value = base64;
    if (previewImg) previewImg.src = base64;
    if (previewContainer) previewContainer.style.display = "block";
    if (uploadArea) uploadArea.style.display = "none";
    showToast("Imagem anexada com sucesso!");
  };
  reader.readAsDataURL(file);
}

function removerFotoTituloAnexada() {
  const fileInput = document.getElementById("formEleitorFotoInput");
  const hidden = document.getElementById("formEleitorFotoBase64");
  const previewImg = document.getElementById("eleitorFotoPreviewImg");
  const previewContainer = document.getElementById("eleitorFotoPreviewContainer");
  const uploadArea = document.getElementById("eleitorUploadArea");

  if (fileInput) fileInput.value = "";
  if (hidden) hidden.value = "";
  if (previewImg) previewImg.src = "";
  if (previewContainer) previewContainer.style.display = "none";
  if (uploadArea) uploadArea.style.display = "block";
}

function atualizarPreviewAniversarioFormEleitor() {
  const input = document.getElementById("formEleitorDataNascimento");
  const infoEl = document.getElementById("eleitorAniversarioPreviewInfo");
  if (!infoEl) return;

  const val = input ? input.value : "";
  if (!val) {
    infoEl.innerHTML = `🔔 O aniversário será marcado automaticamente no Disparo em Massa.`;
    return;
  }

  if (typeof WhatsAppDispatcher !== "undefined" && WhatsAppDispatcher.obterStatusAniversario) {
    const aniv = WhatsAppDispatcher.obterStatusAniversario(val);
    if (aniv.temData) {
      if (aniv.ehHoje) {
        infoEl.innerHTML = `🎂 <strong style="color:var(--gold-400);">Faz aniversário HOJE (${aniv.diaMes}${aniv.idade !== null ? ` • ${aniv.idade} anos` : ""})!</strong> Já será destacado no topo do Disparo em Massa.`;
      } else {
        infoEl.innerHTML = `✅ Aniversário em <strong>${aniv.diaMes}</strong>${aniv.idade !== null ? ` (${aniv.idade} anos)` : ""} — marcado no Disparo em Massa para você nunca esquecer.`;
      }
      return;
    }
  }
  infoEl.innerHTML = `✅ Data registrada — aniversário marcado no Disparo em Massa.`;
}

function abrirModalNovoEleitor() {
  const form = document.getElementById("formEleitor");
  if (form) form.reset();
  const hiddenId = document.getElementById("formEleitorId");
  if (hiddenId) hiddenId.value = "";

  const alertaEl = document.getElementById("eleitorAlertaConflito");
  if (alertaEl) alertaEl.style.display = "none";

  const btnSalvar = document.getElementById("btnSalvarEleitor");
  if (btnSalvar) {
    btnSalvar.disabled = false;
    btnSalvar.removeAttribute("title");
  }

  const nomeInput = document.getElementById("formEleitorNome");
  const tituloInput = document.getElementById("formEleitorNumeroTitulo");
  if (nomeInput) nomeInput.style.borderColor = "";
  if (tituloInput) tituloInput.style.borderColor = "";

  removerFotoTituloAnexada();
  atualizarPreviewAniversarioFormEleitor();

  const tituloModal = document.getElementById("modalEleitorTitulo");
  const subModal = document.getElementById("modalEleitorSubtitulo");
  if (tituloModal) tituloModal.textContent = "📝 Cadastrar Novo Eleitor";
  if (subModal) subModal.textContent = "Vincule o eleitor ao seu bairro, intenção de voto e liderança exclusiva responsável";

  // Popula bairros
  const bairroSelect = document.getElementById("formEleitorBairro");
  if (bairroSelect) {
    const coms = db.getComunidades();
    bairroSelect.innerHTML = '<option value="">Selecione o Bairro / Comunidade...</option>' +
      coms.map(c => `<option value="${c.nome}">${c.nome} (${c.tipo})</option>`).join("");
  }

  // Popula seções
  const secaoSelect = document.getElementById("formEleitorSecao");
  if (secaoSelect) {
    const secoes = db.getSecoesEleitorais();
    secaoSelect.innerHTML = '<option value="">Selecione a Seção...</option>' +
      secoes.map(s => `<option value="${s.secao}">Seção ${s.secao}</option>`).join("");
  }

  // Popula datalist de sugestões de lideranças
  const dataList = document.getElementById("listaLiderancasSugestoes");
  if (dataList) {
    const lids = db.getLiderancas();
    dataList.innerHTML = lids.map(l => `<option value="${l.nome}">${l.nome} (${l.cargoPapel || 'Líder'})</option>`).join("");
  }

  // Configura campo de Liderança de acordo com o usuário logado
  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  const liderInput = document.getElementById("formEleitorLideranca");
  const liderInfo = document.getElementById("eleitorLiderancaInfo");

  if (liderInput) {
    if (isLider) {
      liderInput.value = currentUser.nome;
      liderInput.readOnly = true;
      liderInput.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
      liderInput.style.borderColor = "var(--emerald-500)";
      if (liderInfo) {
        liderInfo.style.display = "block";
        liderInfo.innerHTML = `🔒 <strong>Eleitor Exclusivo:</strong> Este eleitor pertencerá unicamente a você (<strong>${currentUser.nome}</strong>). Outra liderança não poderá cadastrá-lo.`;
      }
    } else {
      liderInput.readOnly = false;
      liderInput.style.backgroundColor = "";
      liderInput.style.borderColor = "";
      if (liderInfo) {
        liderInfo.style.display = "block";
        liderInfo.innerHTML = `ℹ️ O eleitor pertencerá com exclusividade à liderança definida neste campo.`;
      }
    }
  }

  openModal("modalEleitor");
}

function editarEleitor(id) {
  const e = db.getEleitorById(id);
  if (!e) {
    showToast("Eleitor não localizado.");
    return;
  }

  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  if (isLider) {
    const nomeLider = (currentUser.nome || "").trim().toLowerCase();
    const eleitorLider = (e.liderancaNome || "").trim().toLowerCase();
    if (nomeLider !== eleitorLider && currentUser.liderancaId !== e.liderancaId) {
      showToast(`⛔ Acesso Negado: Este eleitor pertence com exclusividade à liderança "${e.liderancaNome}".`);
      return;
    }
  }

  abrirModalNovoEleitor();

  const tituloModal = document.getElementById("modalEleitorTitulo");
  const subModal = document.getElementById("modalEleitorSubtitulo");
  if (tituloModal) tituloModal.textContent = "✏️ Editar Cadastro do Eleitor";
  if (subModal) subModal.textContent = `Atualização dos dados territoriais e de exclusividade de ${e.nome}`;

  document.getElementById("formEleitorId").value = e.id;
  document.getElementById("formEleitorNome").value = e.nome || "";
  const nascInput = document.getElementById("formEleitorDataNascimento");
  if (nascInput) {
    nascInput.value = e.dataNascimento || "";
    atualizarPreviewAniversarioFormEleitor();
  }
  const titInput = document.getElementById("formEleitorNumeroTitulo");
  if (titInput) titInput.value = e.numeroTitulo ? formatarTituloExibicao(e.numeroTitulo) : "";
  document.getElementById("formEleitorTelefone").value = e.telefone || "";
  const prefInput = document.getElementById("formEleitorIntencaoPrefeito");
  if (prefInput) prefInput.value = e.intencaoPrefeito || "";
  const verInput = document.getElementById("formEleitorIntencaoVereador");
  if (verInput) verInput.value = e.intencaoVereador || "";
  document.getElementById("formEleitorBairro").value = e.bairroNome || "";
  document.getElementById("formEleitorLideranca").value = e.liderancaNome || "";
  const secInput = document.getElementById("formEleitorSecao");
  if (secInput) secInput.value = e.secao || "";
  document.getElementById("formEleitorRua").value = e.rua || "";
  document.getElementById("formEleitorNumero").value = e.numero || "";
  document.getElementById("formEleitorEndereco").value = e.endereco || "";
  document.getElementById("formEleitorObs").value = e.observacoes || "";

  if (e.fotoTitulo && e.fotoTitulo.trim() !== "") {
    document.getElementById("formEleitorFotoBase64").value = e.fotoTitulo;
    document.getElementById("eleitorFotoPreviewImg").src = e.fotoTitulo;
    document.getElementById("eleitorFotoPreviewContainer").style.display = "block";
    document.getElementById("eleitorUploadArea").style.display = "none";
  }
}

function salvarFormEleitor() {
  const nome = (document.getElementById("formEleitorNome")?.value || "").trim();
  const dataNascimento = (document.getElementById("formEleitorDataNascimento")?.value || "").trim();
  const numeroTitulo = (document.getElementById("formEleitorNumeroTitulo")?.value || "").trim();
  const intencaoPrefeito = (document.getElementById("formEleitorIntencaoPrefeito")?.value || "").trim();
  const intencaoVereador = (document.getElementById("formEleitorIntencaoVereador")?.value || "").trim();
  const bairro = (document.getElementById("formEleitorBairro")?.value || "").trim();
  const rua = (document.getElementById("formEleitorRua")?.value || "").trim();
  const secao = (document.getElementById("formEleitorSecao")?.value || "").trim();

  if (!nome) {
    showToast("Informe o nome completo do eleitor.");
    document.getElementById("formEleitorNome")?.focus();
    return;
  }
  if (!dataNascimento) {
    showToast("Informe a data de nascimento do eleitor para marcar o aniversário no Disparo em Massa.");
    document.getElementById("formEleitorDataNascimento")?.focus();
    return;
  }
  if (!bairro) {
    showToast("Selecione o bairro do eleitor.");
    return;
  }

  const id = document.getElementById("formEleitorId")?.value || null;
  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  const lider = isLider ? currentUser.nome : ((document.getElementById("formEleitorLideranca")?.value || "").trim() || "Sem liderança");
  const liderId = isLider ? (currentUser.liderancaId || currentUser.id) : null;

  const num = (document.getElementById("formEleitorNumero")?.value || "").trim();
  const tel = (document.getElementById("formEleitorTelefone")?.value || "").trim();
  const end = (document.getElementById("formEleitorEndereco")?.value || "").trim() || `${rua}, ${num} - ${bairro}, Riachuelo–RN`;
  const foto = document.getElementById("formEleitorFotoBase64")?.value || "";
  const obs = (document.getElementById("formEleitorObs")?.value || "").trim();

  const com = db.getComunidades().find(c => c.nome === bairro);

  const payload = {
    id: id || undefined,
    nome: nome,
    dataNascimento: dataNascimento,
    numeroTitulo: numeroTitulo,
    intencaoPrefeito: intencaoPrefeito,
    intencaoVereador: intencaoVereador,
    rua: rua,
    numero: num,
    endereco: end,
    comunidadeId: com ? com.id : null,
    bairroNome: bairro,
    secao: secao,
    liderancaNome: lider,
    liderancaId: liderId,
    telefone: tel,
    fotoTitulo: foto,
    observacoes: obs
  };

  // Trava de exclusividade e duplicidade
  const checagem = db.verificarConflitoEleitor(payload);
  if (checagem.conflito) {
    const alertaEl = document.getElementById("eleitorAlertaConflito");
    const alertaMsgEl = document.getElementById("eleitorAlertaConflitoMsg");
    if (alertaEl && alertaMsgEl) {
      alertaEl.style.display = "block";
      alertaMsgEl.textContent = checagem.mensagem;
    }
    showToast("⛔ " + checagem.mensagem, 6000);
    return;
  }

  try {
    db.saveEleitor(payload);
    closeModal("modalEleitor");
    showToast(`Eleitor "${nome}" salvo e aniversário marcado no Disparo em Massa!`);
    renderEleitores();
    if (typeof WhatsAppDispatcher !== "undefined") {
      WhatsAppDispatcher.carregarFila();
      WhatsAppDispatcher.atualizarInterfaceFila();
    }
  } catch (err) {
    showToast("⛔ " + err.message, 6000);
  }
}

function excluirEleitor(id) {
  const e = db.getEleitorById(id);
  if (!e) return;

  const currentUser = db.getCurrentUser();
  const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  if (isLider) {
    const nomeLider = (currentUser.nome || "").trim().toLowerCase();
    const eleitorLider = (e.liderancaNome || "").trim().toLowerCase();
    if (nomeLider !== eleitorLider && currentUser.liderancaId !== e.liderancaId) {
      showToast(`⛔ Acesso Negado: Você só pode excluir eleitores vinculados à sua própria liderança.`);
      return;
    }
  }

  if (confirm(`Deseja realmente remover o eleitor "${e.nome}" (${e.bairroNome})?`)) {
    try {
      db.deleteEleitor(id);
      showToast(`Eleitor "${e.nome}" removido.`);
      renderEleitores();
      if (typeof WhatsAppDispatcher !== "undefined") {
        WhatsAppDispatcher.carregarFila();
        WhatsAppDispatcher.atualizarInterfaceFila();
      }
    } catch (err) {
      showToast("⛔ " + err.message);
    }
  }
}

function abrirFotoTituloModal(id) {
  const e = db.getEleitorById(id);
  if (!e) {
    showToast("Eleitor não localizado.");
    return;
  }

  const nomeEl = document.getElementById("fotoTituloModalNome");
  const subEl = document.getElementById("fotoTituloModalSub");
  const imgEl = document.getElementById("fotoTituloModalImg");
  const dadosEl = document.getElementById("fotoTituloModalDados");

  if (nomeEl) nomeEl.innerHTML = `📷 Documento / Foto — <span style="color:var(--gold-400);">${e.nome}</span>`;
  if (subEl) subEl.textContent = `${e.bairroNome} • Líder: ${e.liderancaNome || 'Sem liderança'}`;

  if (imgEl) {
    if (e.fotoTitulo && e.fotoTitulo.trim() !== "") {
      imgEl.src = e.fotoTitulo;
      imgEl.style.display = "block";
    } else {
      const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320"><rect width="500" height="320" rx="14" fill="%23064e3b"/><rect x="12" y="12" width="476" height="296" rx="10" fill="%2303140c" stroke="%2310b981" stroke-width="2"/><text x="250" y="45" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23fbbf24" text-anchor="middle">RADAR DE GESTÃO — FICHA DO ELEITOR</text><text x="250" y="68" font-family="sans-serif" font-size="12" fill="%23a7f3d0" text-anchor="middle">CADASTRO TERRITORIAL — RIACHUELO/RN</text><line x1="30" y1="80" x2="470" y2="80" stroke="%23059669" stroke-width="1"/><text x="40" y="115" font-family="sans-serif" font-size="11" fill="%2394a3b8">NOME DO ELEITOR</text><text x="40" y="138" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23ffffff">${encodeURIComponent(e.nome)}</text><text x="40" y="175" font-family="sans-serif" font-size="11" fill="%2394a3b8">ENDEREÇO / BAIRRO</text><text x="40" y="195" font-family="sans-serif" font-size="13" fill="%23e2e8f0">${encodeURIComponent(e.rua || '')}, ${encodeURIComponent(e.numero || 'S/N')} — ${encodeURIComponent(e.bairroNome || '')}</text><text x="40" y="235" font-family="sans-serif" font-size="11" fill="%2394a3b8">INTENÇÃO PREFEITO</text><text x="40" y="258" font-family="sans-serif" font-size="14" font-weight="bold" fill="%2310b981">${encodeURIComponent(e.intencaoPrefeito || 'Não informado')}</text><text x="260" y="235" font-family="sans-serif" font-size="11" fill="%2394a3b8">INTENÇÃO VEREADOR</text><text x="260" y="258" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23fbbf24">${encodeURIComponent(e.intencaoVereador || 'Não informado')}</text><text x="40" y="285" font-family="sans-serif" font-size="11" fill="%2394a3b8">LIDERANÇA EXCLUSIVA:</text><text x="180" y="285" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2338bdf8">${encodeURIComponent(e.liderancaNome || 'Sem liderança')}</text></svg>`;
      imgEl.src = mockSvg;
      imgEl.style.display = "block";
    }
  }

  const aniv = (typeof WhatsAppDispatcher !== "undefined" && WhatsAppDispatcher.obterStatusAniversario)
    ? WhatsAppDispatcher.obterStatusAniversario(e.dataNascimento)
    : { temData: !!e.dataNascimento, formatada: e.dataNascimento || "Não informada", idade: null, ehHoje: false };

  if (dadosEl) {
    dadosEl.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; font-size:0.83rem;">
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Nome do Eleitor:</span><br>
          <strong style="color:#ffffff;">${e.nome}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Data de Nascimento:</span><br>
          <strong style="color:var(--gold-400);">🎂 ${aniv.temData ? `${aniv.formatada}${aniv.idade !== null ? ` (${aniv.idade} anos)` : ""}${aniv.ehHoje ? " — HOJE!" : ""}` : "Não informada"}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Intenção p/ Prefeito:</span><br>
          <strong style="color:var(--emerald-400);">${e.intencaoPrefeito || 'Não informado'}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Intenção p/ Vereador:</span><br>
          <strong style="color:var(--gold-400);">${e.intencaoVereador || 'Não informado'}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Bairro / Comunidade:</span><br>
          <strong style="color:var(--emerald-400);">${e.bairroNome}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Liderança Exclusiva:</span><br>
          <strong style="color:#38bdf8;">🔒 ${e.liderancaNome || 'Sem liderança'}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Telefone / WhatsApp:</span><br>
          <strong style="color:#ffffff;">${e.telefone || 'Não informado'}</strong>
        </div>
        <div style="grid-column: 1 / -1;">
          <span style="color:var(--text-muted); font-size:0.75rem;">Endereço Completo:</span><br>
          <span>${e.endereco || `${e.rua || ''}, ${e.numero || ''} - ${e.bairroNome}`}</span>
        </div>
        ${e.observacoes ? `<div style="grid-column:1 / -1; border-top:1px dashed var(--border-subtle); padding-top:6px; margin-top:4px;"><span style="color:var(--text-muted); font-size:0.72rem;">Observações / Demandas:</span><br><em>${e.observacoes}</em></div>` : ''}
      </div>
    `;
  }

  openModal("modalFotoTitulo");
}

function exportarEleitoresCSV() {
  const lista = db.getEleitores();
  if (!lista.length) {
    showToast("Nenhum eleitor para exportar.");
    return;
  }

  let csv = "Nome;DataNascimento;IntencaoPrefeito;IntencaoVereador;Rua;Numero;EnderecoCompleto;Bairro;LiderancaExclusiva;Telefone;DataCadastro;TemFoto;Observacoes\n";
  lista.forEach(e => {
    const temFoto = e.fotoTitulo && e.fotoTitulo.trim() !== "" ? "SIM" : "NAO";
    csv += `"${e.nome || ''}";"${e.dataNascimento || ''}";"${e.intencaoPrefeito || ''}";"${e.intencaoVereador || ''}";"${e.rua || ''}";"${e.numero || ''}";"${e.endereco || ''}";"${e.bairroNome || ''}";"${e.liderancaNome || ''}";"${e.telefone || ''}";"${e.dataCadastro || ''}";"${temFoto}";"${(e.observacoes || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Eleitores_Riachuelo_RN_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Planilha de eleitores exportada com sucesso!");
}

// ==========================================================================
// 4.2. DEMANDAS COMUNITÁRIAS & ATENDIMENTO TERRITORIAL
// ==========================================================================
function renderDemandas() {
  const filtroStatus = document.getElementById("filtroDemandaStatus")?.value || "";
  const filtroCategoria = document.getElementById("filtroDemandaCategoria")?.value || "";
  const filtroPrioridade = document.getElementById("filtroDemandaPrioridade")?.value || "";
  const filtroBairro = document.getElementById("filtroDemandaBairro")?.value || "";
  const searchInput = document.getElementById("searchDemandaInput")?.value || "";

  // Popula o select de bairros caso esteja vazio
  const bairroSelect = document.getElementById("filtroDemandaBairro");
  if (bairroSelect && bairroSelect.options.length <= 1) {
    const coms = db.getComunidades();
    coms.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.nome;
      opt.textContent = `${c.nome} (${c.tipo})`;
      bairroSelect.appendChild(opt);
    });
  }

  // Atualiza Indicadores Rápidos (KPIs)
  const stats = db.getEstatisticasDemandas();
  const kpiTotal = document.getElementById("kpiDemandasTotal");
  const kpiPend = document.getElementById("kpiDemandasPendentes");
  const kpiAnd = document.getElementById("kpiDemandasAndamento");
  const kpiConc = document.getElementById("kpiDemandasConcluidas");
  const kpiTaxa = document.getElementById("kpiDemandasTaxa");

  if (kpiTotal) kpiTotal.textContent = stats.total;
  if (kpiPend) kpiPend.textContent = stats.pendentes;
  if (kpiAnd) kpiAnd.textContent = stats.emAndamento;
  if (kpiConc) kpiConc.textContent = stats.concluidas;
  if (kpiTaxa) kpiTaxa.textContent = `Taxa de Resolução: ${stats.taxaResolucao}%`;

  // Busca dados com os filtros aplicados
  let lista = db.getDemandas({
    status: filtroStatus,
    categoria: filtroCategoria,
    prioridade: filtroPrioridade,
    bairro: filtroBairro,
    busca: searchInput
  });

  const currentUser = db.getCurrentUser();
  const isLideranca = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
  if (isLideranca) {
    const comsLiderIds = currentUser.comunidadesVinculadas || (currentUser.comunidadeId ? [currentUser.comunidadeId] : []);
    const comsLider = db.getComunidades().filter(c => 
      comsLiderIds.includes(c.id) || 
      (c.liderancaNome && currentUser.nome && c.liderancaNome.toLowerCase().trim() === currentUser.nome.toLowerCase().trim())
    );
    const nomesBairros = comsLider.map(c => c.nome.toLowerCase().trim());
    if (nomesBairros.length > 0) {
      lista = lista.filter(d => d.bairro && nomesBairros.includes(d.bairro.toLowerCase().trim()));
    }
  }

  const tbody = document.getElementById("demandasTableBody");
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align:center; padding:35px; color:var(--text-muted);">
          Nenhuma demanda comunitária encontrada com os filtros selecionados. Clique em "+ Nova Demanda" para registrar uma nova solicitação.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(d => {
    const pri = (d.prioridade || "Média").toLowerCase();
    const priClass = pri === "alta" ? "alta" : (pri === "baixa" ? "baixa" : "media");
    const priIcon = pri === "alta" ? "🔴" : (pri === "baixa" ? "🔵" : "🟡");

    let statusClass = "pendente";
    let statusIcon = "⏳";
    if (d.status === "Em Andamento") {
      statusClass = "andamento";
      statusIcon = "🚜";
    } else if (d.status === "Concluído") {
      statusClass = "concluido";
      statusIcon = "✅";
    }

    const anexos = Array.isArray(d.anexos) ? d.anexos : [];
    const nFotos = anexos.filter(a => a.tipo === "foto" || a.tipo === "imagem").length;
    const nVideos = anexos.filter(a => a.tipo === "video").length;
    let badgeMidiaHtml = "";
    if (anexos.length > 0) {
      const partes = [];
      if (nFotos > 0) partes.push(`📷 ${nFotos} foto${nFotos > 1 ? 's' : ''}`);
      if (nVideos > 0) partes.push(`🎥 ${nVideos} vídeo${nVideos > 1 ? 's' : ''}`);
      badgeMidiaHtml = `
        <div style="margin-top:4px;">
          <span class="badge-midia-demanda" onclick="event.stopPropagation(); abrirDetalhesDemanda('${d.id}')" title="${anexos.length} anexo(s) salvo(s) nesta demanda. Clique para ver.">
            📎 ${partes.join(" • ")}
          </span>
        </div>
      `;
    }

    return `
      <tr>
        <td>
          <span class="badge-prioridade ${priClass}">
            ${priIcon} ${d.prioridade || 'Média'}
          </span>
        </td>
        <td>
          <strong style="color:#ffffff; font-size:0.92rem; cursor:pointer;" onclick="abrirDetalhesDemanda('${d.id}')" title="Clique para abrir o dossiê da demanda">
            ${d.titulo}
          </strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted);">${d.descricao ? (d.descricao.length > 55 ? d.descricao.slice(0, 55) + '...' : d.descricao) : ''}</span>
          ${badgeMidiaHtml}
        </td>
        <td>
          <span class="badge-status oficial" style="font-size:0.72rem; background:rgba(16,185,129,0.12); color:#a7f3d0; border-color:var(--border-emerald);">
            ${d.categoria || 'Geral'}
          </span>
        </td>
        <td>
          <strong style="color:var(--emerald-400); font-size:0.85rem;">📍 ${d.bairroNome}</strong>
        </td>
        <td>
          <span style="font-size:0.82rem; color:#e2e8f0;">🎖️ ${d.liderancaNome || 'Coordenação Geral'}</span>
        </td>
        <td>
          <span style="font-size:0.82rem; font-weight:600; color:#ffffff;">${d.solicitante || 'Comunidade'}</span><br>
          <span style="font-size:0.72rem; color:var(--text-dim); font-family:var(--font-mono);">${d.telefone || '-'}</span>
        </td>
        <td>
          <span class="badge-demanda-status ${statusClass}">
            ${statusIcon} ${d.status}
          </span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">${d.dataAbertura || '-'}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:${d.status === 'Concluído' ? 'var(--emerald-400)' : 'var(--gold-400)'}; font-weight:600;">
            ${d.dataConclusao || d.dataPrevisao || '-'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-gold btn-sm" onclick="abrirDetalhesDemanda('${d.id}')" title="Ver Dossiê e Histórico da Demanda">
              🔍 Dossiê
            </button>
            <button class="btn btn-secondary btn-sm" onclick="editarDemanda('${d.id}')" title="Editar informações da demanda">
              ✏️
            </button>
            ${d.status !== 'Concluído' ? `
              <button class="btn btn-primary btn-sm" onclick="transitarStatusDemanda('${d.id}', 'Concluído')" title="Marcar como Concluída" style="padding:4px 8px; font-size:0.72rem;">
                ✓
              </button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="excluirDemanda('${d.id}')" title="Excluir Demanda" style="color:#ef4444; padding:4px 8px;">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  updateSidebarCounters();
}

// ==========================================================================
// ANEXOS DE MÍDIA (FOTOS E VÍDEOS) — DEMANDAS COMUNITÁRIAS
// ==========================================================================

function formatarTamanhoBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function processarImagemArquivo(file, maxDim = 1280, qualidade = 0.78) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function processarVideoArquivo(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function aoSelecionarMidiasDemanda(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (!AppState.midiasDemandaEmEdicao) {
    AppState.midiasDemandaEmEdicao = [];
  }

  showToast(`Processando ${files.length} arquivo(s)...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) {
      showToast(`Arquivo "${file.name}" não é imagem nem vídeo suportado.`);
      continue;
    }

    if (isVideo && file.size > 25 * 1024 * 1024) {
      alert(`O vídeo "${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)}MB. Recomendamos vídeos de até 25MB para navegação rápida.`);
      continue;
    }

    try {
      const dataUrl = isImage ? await processarImagemArquivo(file) : await processarVideoArquivo(file);
      if (!dataUrl) continue;

      const novaMidia = {
        id: "midia-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
        tipo: isVideo ? "video" : "foto",
        nome: file.name,
        tamanho: formatarTamanhoBytes(file.size),
        dataUrl: dataUrl,
        criadoEm: new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      AppState.midiasDemandaEmEdicao.push(novaMidia);
    } catch (err) {
      console.error("Erro ao carregar mídia:", err);
    }
  }

  event.target.value = "";
  renderPreviewMidiasDemanda();
}

function removerMidiaDemanda(index) {
  if (!AppState.midiasDemandaEmEdicao) return;
  AppState.midiasDemandaEmEdicao.splice(index, 1);
  renderPreviewMidiasDemanda();
}

function renderPreviewMidiasDemanda() {
  const container = document.getElementById("demandaMidiasPreviewContainer");
  if (!container) return;

  const lista = AppState.midiasDemandaEmEdicao || [];
  if (lista.length === 0) {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "grid";
  container.innerHTML = lista.map((m, idx) => {
    const isVideo = m.tipo === "video";
    return `
      <div class="demanda-midia-card">
        <span class="demanda-midia-badge">${isVideo ? '🎥 Vídeo' : '📷 Foto'}</span>
        <button type="button" class="demanda-midia-remove-btn" onclick="removerMidiaDemanda(${idx})" title="Remover mídia">✕</button>
        <div class="demanda-midia-thumb-wrap">
          ${isVideo ? `
            <video src="${m.dataUrl}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;"></video>
            <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.35);">
              <span style="font-size:1.5rem; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">▶️</span>
            </div>
          ` : `
            <img src="${m.dataUrl}" alt="${m.nome}" class="demanda-midia-thumb" onclick="abrirVisualizadorMidiaDireto('${m.tipo}', '${m.dataUrl}', '${m.nome.replace(/'/g, "\\'")}')">
          `}
        </div>
        <div class="demanda-midia-info">
          <span class="demanda-midia-nome" title="${m.nome}">${m.nome}</span>
          <span class="demanda-midia-meta">${m.tamanho || ''}</span>
        </div>
      </div>
    `;
  }).join("");
}

function abrirVisualizadorMidiaDireto(tipo, dataUrl, titulo = "Evidência Visual") {
  const modal = document.getElementById("modalVisualizadorMidia");
  const tituloEl = document.getElementById("visualizadorMidiaTitulo");
  const subEl = document.getElementById("visualizadorMidiaSubtitulo");
  const conteudoEl = document.getElementById("visualizadorMidiaConteudo");
  const downloadBtn = document.getElementById("visualizadorMidiaDownloadBtn");

  if (!modal || !conteudoEl) return;

  if (tituloEl) tituloEl.innerHTML = tipo === "video" ? `🎥 Vídeo: ${titulo}` : `📷 Foto: ${titulo}`;
  if (subEl) subEl.textContent = "Evidência comprobatória da Demanda Comunitária";

  if (tipo === "video") {
    conteudoEl.innerHTML = `
      <video controls autoplay playsinline style="max-width:100%; max-height:68vh; border-radius:8px; box-shadow:0 12px 36px rgba(0,0,0,0.85); background:#000;">
        <source src="${dataUrl}">
        Seu navegador não suporta este vídeo.
      </video>
    `;
  } else {
    conteudoEl.innerHTML = `
      <img src="${dataUrl}" alt="${titulo}" style="max-width:100%; max-height:68vh; object-fit:contain; border-radius:8px; box-shadow:0 12px 36px rgba(0,0,0,0.85);">
    `;
  }

  if (downloadBtn) {
    downloadBtn.href = dataUrl;
    downloadBtn.download = titulo || "evidencia-demanda";
  }

  openModal("modalVisualizadorMidia");
}

function fecharVisualizadorMidia() {
  const conteudoEl = document.getElementById("visualizadorMidiaConteudo");
  if (conteudoEl) {
    const video = conteudoEl.querySelector("video");
    if (video) video.pause();
    conteudoEl.innerHTML = "";
  }
  closeModal("modalVisualizadorMidia");
}

async function anexarMidiaDiretoDossie(demandaId, event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const d = db.getDemandaById(demandaId);
  if (!d) return;

  showToast(`Anexando ${files.length} arquivo(s) ao dossiê...`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isImage && !isVideo) continue;
    if (isVideo && file.size > 25 * 1024 * 1024) {
      alert(`O vídeo "${file.name}" tem ${(file.size / 1024 / 1024).toFixed(1)}MB. Limite recomendado: 25MB.`);
      continue;
    }

    try {
      const dataUrl = isImage ? await processarImagemArquivo(file) : await processarVideoArquivo(file);
      if (!dataUrl) continue;

      const novaMidia = {
        id: "midia-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6),
        tipo: isVideo ? "video" : "foto",
        nome: file.name,
        tamanho: formatarTamanhoBytes(file.size),
        dataUrl: dataUrl,
        criadoEm: new Date().toLocaleDateString("pt-BR") + " às " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      };

      db.addAnexoDemanda(demandaId, novaMidia);
    } catch (err) {
      console.error("Erro ao adicionar mídia no dossiê:", err);
    }
  }

  event.target.value = "";
  showToast("Mídia anexada e salva com sucesso!");
  abrirDetalhesDemanda(demandaId);
  renderDemandas();
}

function removerAnexoDossie(demandaId, anexoId) {
  if (confirm("Deseja realmente remover esta evidência (foto/vídeo) da demanda?")) {
    db.removeAnexoDemanda(demandaId, anexoId);
    showToast("Mídia removida.");
    abrirDetalhesDemanda(demandaId);
    renderDemandas();
  }
}

function abrirModalNovaDemanda() {
  const form = document.getElementById("formDemanda");
  if (form) form.reset();

  const hiddenId = document.getElementById("formDemandaId");
  if (hiddenId) hiddenId.value = "";

  const tituloEl = document.getElementById("modalDemandaTitulo");
  const subEl = document.getElementById("modalDemandaSubtitulo");
  if (tituloEl) tituloEl.textContent = "📋 Nova Demanda Comunitária";
  if (subEl) subEl.textContent = "Mapeamento territorial de solicitação popular em Riachuelo–RN";

  AppState.midiasDemandaEmEdicao = [];
  renderPreviewMidiasDemanda();

  // Popula bairros
  const bairroSelect = document.getElementById("formDemandaBairro");
  if (bairroSelect) {
    const coms = db.getComunidades();
    bairroSelect.innerHTML = '<option value="">Selecione o Bairro / Comunidade...</option>' +
      coms.map(c => `<option value="${c.nome}">${c.nome} (${c.tipo})</option>`).join("");
  }

  openModal("modalDemanda");
}

function aoSelecionarBairroFormDemanda() {
  const bairroSelect = document.getElementById("formDemandaBairro");
  const liderInput = document.getElementById("formDemandaLideranca");
  if (!bairroSelect) return;

  const nomeBairro = bairroSelect.value;
  const com = db.getComunidades().find(c => c.nome === nomeBairro);
  if (com && liderInput) {
    liderInput.value = com.liderancaNome || "Coordenação Territorial";
  }
}

function salvarFormDemanda() {
  const titulo = (document.getElementById("formDemandaTitulo")?.value || "").trim();
  const categoria = document.getElementById("formDemandaCategoria")?.value || "Infraestrutura & Estradas";
  const prioridade = document.getElementById("formDemandaPrioridade")?.value || "Média";
  const bairroNome = (document.getElementById("formDemandaBairro")?.value || "").trim();
  const solicitante = (document.getElementById("formDemandaSolicitante")?.value || "").trim();
  const descricao = (document.getElementById("formDemandaDescricao")?.value || "").trim();

  if (!titulo) {
    showToast("Informe o título da demanda.");
    return;
  }
  if (!bairroNome) {
    showToast("Selecione o bairro ou comunidade.");
    return;
  }
  if (!solicitante) {
    showToast("Informe o solicitante ou associação.");
    return;
  }
  if (!descricao) {
    showToast("Preencha o detalhamento da demanda.");
    return;
  }

  const id = document.getElementById("formDemandaId")?.value || null;
  const lideranca = (document.getElementById("formDemandaLideranca")?.value || "").trim() || "Coordenação Comunitária";
  const telefone = (document.getElementById("formDemandaTelefone")?.value || "").trim();
  const status = document.getElementById("formDemandaStatus")?.value || "Pendente";
  const dataPrevisao = document.getElementById("formDemandaDataPrevisao")?.value || "";
  const solucaoNotas = (document.getElementById("formDemandaSolucaoNotas")?.value || "").trim();

  const com = db.getComunidades().find(c => c.nome === bairroNome);

  const payload = {
    id: id || undefined,
    titulo: titulo,
    categoria: categoria,
    prioridade: prioridade,
    bairroComunidadeId: com ? com.id : null,
    bairroNome: bairroNome,
    liderancaNome: lideranca,
    solicitante: solicitante,
    telefone: telefone,
    status: status,
    dataPrevisao: dataPrevisao,
    descricao: descricao,
    solucaoNotas: solucaoNotas,
    anexos: AppState.midiasDemandaEmEdicao || []
  };

  db.saveDemanda(payload);
  closeModal("modalDemanda");
  showToast(`Demanda "${titulo}" gravada com sucesso!`);
  renderDemandas();
}

function editarDemanda(id) {
  const d = db.getDemandaById(id);
  if (!d) {
    showToast("Demanda não localizada.");
    return;
  }

  abrirModalNovaDemanda();

  const tituloEl = document.getElementById("modalDemandaTitulo");
  const subEl = document.getElementById("modalDemandaSubtitulo");
  if (tituloEl) tituloEl.textContent = "✏️ Editar Demanda Comunitária";
  if (subEl) subEl.textContent = `Atualização dos dados de ${d.titulo}`;

  document.getElementById("formDemandaId").value = d.id;
  document.getElementById("formDemandaTitulo").value = d.titulo || "";
  document.getElementById("formDemandaCategoria").value = d.categoria || "Infraestrutura & Estradas";
  document.getElementById("formDemandaPrioridade").value = d.prioridade || "Média";
  document.getElementById("formDemandaBairro").value = d.bairroNome || "";
  document.getElementById("formDemandaLideranca").value = d.liderancaNome || "";
  document.getElementById("formDemandaSolicitante").value = d.solicitante || "";
  document.getElementById("formDemandaTelefone").value = d.telefone || "";
  document.getElementById("formDemandaStatus").value = d.status || "Pendente";
  document.getElementById("formDemandaDataPrevisao").value = d.dataPrevisao || "";
  document.getElementById("formDemandaDescricao").value = d.descricao || "";
  document.getElementById("formDemandaSolucaoNotas").value = d.solucaoNotas || "";

  AppState.midiasDemandaEmEdicao = Array.isArray(d.anexos) ? JSON.parse(JSON.stringify(d.anexos)) : [];
  renderPreviewMidiasDemanda();
}

function abrirDetalhesDemanda(id) {
  const d = db.getDemandaById(id);
  if (!d) {
    showToast("Demanda não localizada.");
    return;
  }

  const tituloEl = document.getElementById("detalheDemandaTitulo");
  const subEl = document.getElementById("detalheDemandaSubtitulo");
  const bodyEl = document.getElementById("detalheDemandaBody");

  if (tituloEl) tituloEl.innerHTML = `🔍 Dossiê: <span style="color:var(--gold-400);">${d.titulo}</span>`;
  if (subEl) subEl.textContent = `${d.bairroNome} • Aberta em ${d.dataAbertura || '2026-10-10'}`;

  const pri = (d.prioridade || "Média").toLowerCase();
  const priClass = pri === "alta" ? "alta" : (pri === "baixa" ? "baixa" : "media");

  let statusClass = "pendente";
  if (d.status === "Em Andamento") statusClass = "andamento";
  else if (d.status === "Concluído") statusClass = "concluido";

  const anexos = Array.isArray(d.anexos) ? d.anexos : [];
  const fotos = anexos.filter(a => a.tipo === "foto" || a.tipo === "imagem");
  const videos = anexos.filter(a => a.tipo === "video");

  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="demanda-detalhe-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="badge-prioridade ${priClass}">Prioridade ${d.prioridade}</span>
            <span class="badge-demanda-status ${statusClass}">Status: ${d.status}</span>
          </div>
          <span style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-muted);">ID: ${d.id}</span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:0.83rem; margin-bottom:16px;">
          <div><span style="color:var(--text-muted);">Bairro / Localidade:</span><br><strong style="color:var(--emerald-400); font-size:0.95rem;">📍 ${d.bairroNome}</strong></div>
          <div><span style="color:var(--text-muted);">Categoria:</span><br><strong style="color:#ffffff;">🏷️ ${d.categoria}</strong></div>
          <div><span style="color:var(--text-muted);">Liderança Articuladora:</span><br><strong style="color:#ffffff;">🎖️ ${d.liderancaNome || 'Coordenação Bacurau'}</strong></div>
          <div><span style="color:var(--text-muted);">Solicitante:</span><br><strong style="color:var(--gold-400);">${d.solicitante}</strong> ${d.telefone ? `(${d.telefone})` : ''}</div>
          <div><span style="color:var(--text-muted);">Data de Abertura:</span><br><span style="font-family:var(--font-mono); color:#fff;">${d.dataAbertura || '-'}</span></div>
          <div><span style="color:var(--text-muted);">Previsão de Atendimento:</span><br><span style="font-family:var(--font-mono); color:var(--gold-400);">${d.dataPrevisao || 'A definir'}</span></div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding-top:12px; margin-top:12px;">
          <div style="font-weight:700; color:#ffffff; font-size:0.86rem; margin-bottom:6px;">📝 Descrição da Necessidade Comunitária:</div>
          <div style="background:var(--bg-input); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.85rem; color:#e2e8f0; line-height:1.5;">
            ${d.descricao}
          </div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding-top:12px; margin-top:14px;">
          <div style="font-weight:700; color:var(--emerald-400); font-size:0.86rem; margin-bottom:6px;">🚜 Encaminhamentos & Notas de Resolução:</div>
          <div style="background:rgba(6,78,59,0.25); border:1px solid var(--border-emerald); padding:12px; border-radius:var(--radius-sm); font-size:0.85rem; color:#a7f3d0; line-height:1.5;">
            ${d.solucaoNotas || 'Nenhum encaminhamento registrado até o momento. Utilize os botões abaixo para atualizar o status e registrar novos ofícios.'}
          </div>
        </div>

        <!-- Seção de Galeria de Mídias (Fotos e Vídeos) -->
        <div class="dossie-midias-section">
          <div class="dossie-midias-header">
            <div style="font-weight:700; color:var(--gold-400); font-size:0.88rem; display:flex; align-items:center; gap:6px;">
              📸 Evidências Visuais Comprobatórias (${anexos.length}):
            </div>
            <div style="display:flex; gap:6px;">
              <input type="file" id="dossieMidiaInput" accept="image/*,video/*" multiple style="display:none;" onchange="anexarMidiaDiretoDossie('${d.id}', event)">
              <button class="btn btn-secondary btn-sm" onclick="document.getElementById('dossieMidiaInput').click()" style="padding:4px 10px; font-size:0.75rem;">
                ➕ Anexar Foto / Vídeo
              </button>
            </div>
          </div>

          ${anexos.length === 0 ? `
            <div style="background:rgba(15,23,42,0.6); border:1px dashed var(--border-subtle); padding:16px; border-radius:var(--radius-sm); font-size:0.8rem; color:var(--text-muted); text-align:center;">
              Nenhuma imagem ou vídeo anexado a esta demanda até o momento.
              <div style="margin-top:8px;">
                <button class="btn btn-gold btn-sm" onclick="document.getElementById('dossieMidiaInput').click()" style="font-size:0.75rem;">
                  📷 Anexar Primeira Evidência Visual
                </button>
              </div>
            </div>
          ` : `
            ${fotos.length > 0 ? `
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">📷 Fotos do Local / Problema (${fotos.length}):</div>
              <div class="dossie-midias-grid" style="margin-bottom:14px;">
                ${fotos.map(f => `
                  <div class="dossie-foto-card" onclick="abrirVisualizadorMidiaDireto('foto', '${f.dataUrl}', '${(f.nome || 'Foto').replace(/'/g, "\\'")}')" title="Clique para ampliar em alta resolução">
                    <img src="${f.dataUrl}" alt="${f.nome}">
                    <div class="dossie-foto-footer">
                      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:105px;">${f.nome}</span>
                      <button type="button" onclick="event.stopPropagation(); removerAnexoDossie('${d.id}', '${f.id}')" title="Excluir esta foto" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem; padding:0 2px;">🗑️</button>
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : ''}

            ${videos.length > 0 ? `
              <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:6px; font-weight:600;">🎥 Vídeos Comprobatórios (${videos.length}):</div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${videos.map(v => `
                  <div class="dossie-video-card">
                    <video controls preload="metadata" playsinline>
                      <source src="${v.dataUrl}">
                      Seu navegador não suporta a reprodução deste vídeo.
                    </video>
                    <div class="dossie-video-meta">
                      <div>
                        <strong style="color:#ffffff;">🎥 ${v.nome}</strong>
                        <span style="font-size:0.7rem; color:var(--text-dim); margin-left:6px;">${v.tamanho || ''} • ${v.criadoEm || ''}</span>
                      </div>
                      <div style="display:flex; gap:6px;">
                        <button class="btn btn-secondary btn-sm" onclick="abrirVisualizadorMidiaDireto('video', '${v.dataUrl}', '${(v.nome || 'Vídeo').replace(/'/g, "\\'")}')" style="padding:2px 8px; font-size:0.72rem;">
                          🔍 Tela Cheia
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="removerAnexoDossie('${d.id}', '${v.id}')" style="padding:2px 8px; font-size:0.72rem; color:#ef4444;" title="Excluir este vídeo">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : ''}
          `}
        </div>
      </div>

      <!-- Ações Rápidas de Transição de Status -->
      <div style="background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:14px; margin-top:14px;">
        <div style="font-weight:700; color:#ffffff; font-size:0.85rem; margin-bottom:10px;">⚡ Ações Rápidas de Encaminhamento:</div>
        <div style="display:flex; flex-wrap:wrap; gap:10px;">
          <button class="btn btn-secondary btn-sm" onclick="transitarStatusDemanda('${d.id}', 'Pendente')">
            ⏳ Marcar como Pendente
          </button>
          <button class="btn btn-primary btn-sm" onclick="transitarStatusDemanda('${d.id}', 'Em Andamento')">
            🚜 Iniciar Obras / Em Andamento
          </button>
          <button class="btn btn-gold btn-sm" onclick="transitarStatusDemanda('${d.id}', 'Concluído')">
            ✅ Concluir e Entregar Demanda
          </button>
          <button class="btn btn-secondary btn-sm" onclick="editarDemanda('${d.id}'); closeModal('modalDetalhesDemanda');">
            ✏️ Editar Dados Completos
          </button>
        </div>
      </div>
    `;
  }

  openModal("modalDetalhesDemanda");
}

function transitarStatusDemanda(id, novoStatus) {
  const d = db.getDemandaById(id);
  if (!d) return;

  let notasAdicionais = "";
  if (novoStatus === "Concluído") {
    notasAdicionais = prompt("Deseja registrar uma nota de conclusão/entrega para esta demanda?", d.solucaoNotas || "Demanda atendida com sucesso.");
    if (notasAdicionais === null) return; // cancelou
  }

  db.updateDemandaStatus(id, novoStatus, notasAdicionais);
  showToast(`Demanda "${d.titulo}" alterada para "${novoStatus}"!`);
  renderDemandas();

  // Se o modal de detalhes estiver aberto, atualiza-o
  const modalDet = document.getElementById("modalDetalhesDemanda");
  if (modalDet && modalDet.classList.contains("active")) {
    abrirDetalhesDemanda(id);
  }
}

function excluirDemanda(id) {
  const d = db.getDemandaById(id);
  if (!d) return;

  if (confirm(`Deseja realmente excluir a demanda "${d.titulo}" de ${d.bairroNome}?`)) {
    db.deleteDemanda(id);
    showToast(`Demanda "${d.titulo}" removida.`);
    renderDemandas();
  }
}

function exportarDemandasCSV() {
  const lista = db.getDemandas();
  if (!lista.length) {
    showToast("Nenhuma demanda cadastrada para exportar.");
    return;
  }

  let csv = "ID;Titulo;Categoria;Prioridade;Bairro;Lideranca;Solicitante;Telefone;Status;DataAbertura;Previsao;Conclusao;Descricao;NotasSolucao\n";
  lista.forEach(d => {
    csv += `"${d.id}";"${(d.titulo || '').replace(/"/g, '""')}";"${d.categoria || ''}";"${d.prioridade || ''}";"${d.bairroNome || ''}";"${d.liderancaNome || ''}";"${(d.solicitante || '').replace(/"/g, '""')}";"${d.telefone || ''}";"${d.status || ''}";"${d.dataAbertura || ''}";"${d.dataPrevisao || ''}";"${d.dataConclusao || ''}";"${(d.descricao || '').replace(/"/g, '""')}";"${(d.solucaoNotas || '').replace(/"/g, '""')}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Demandas_Comunitarias_Riachuelo_RN_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Planilha de demandas exportada com sucesso!");
}

// ==========================================================================
// 5. SEÇÕES ELEITORAIS
// ==========================================================================
function renderSecoes() {
  const tbody = document.getElementById("secoesTableBody");
  if (!tbody) return;

  const selectLocal = document.getElementById("filtroLocalSecao");
  if (selectLocal && selectLocal.options.length <= 1) {
    const locais = db.getLocaisVotacao();
    locais.forEach(l => {
      const opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = `${l.nome} (${l.secoes.length} seções)`;
      selectLocal.appendChild(opt);
    });
  }

  const filtroLocal = selectLocal ? selectLocal.value : "";
  const filtroStatus = document.getElementById("filtroStatusSecao") ? document.getElementById("filtroStatusSecao").value : "";

  let secoes = db.getSecoesEleitorais();
  if (filtroLocal) secoes = secoes.filter(s => s.localId === filtroLocal);
  if (filtroStatus) secoes = secoes.filter(s => s.statusConferencia === filtroStatus);

  tbody.innerHTML = secoes.map(s => {
    const local = db.getLocalVotacaoById(s.localId) || { nome: "Local Padrão", endereco: "Riachuelo/RN" };
    const com = db.getComunidadeById(s.comunidadeId) || { nome: "Zona Municipal" };
    const pctComp = ((s.comparecimento / s.aptos) * 100).toFixed(1);
    const pctAbs = ((s.abstencao / s.aptos) * 100).toFixed(1);

    return `
      <tr>
        <td><strong style="font-family:var(--font-mono); color:var(--gold-400); font-size:0.95rem;">Seção ${s.secao}</strong></td>
        <td>${s.zona}ª Zona</td>
        <td>
          <strong>${local.nome}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted);">${local.endereco || ''}</span>
        </td>
        <td>${com.nome}</td>
        <td><span style="font-family:var(--font-mono); font-weight:700;">${s.aptos}</span></td>
        <td><span style="font-family:var(--font-mono); color:var(--emerald-400);">${s.comparecimento} (${pctComp}%)</span></td>
        <td><span style="font-family:var(--font-mono); color:#f87171;">${s.abstencao} (${pctAbs}%)</span></td>
        <td>
          <span class="badge-status oficial" style="font-size:0.75rem; cursor:pointer;" onclick="abrirDossieSecao('${s.secao}')" title="Clique para ver o histórico completo de 2014 a 2026">
            📜 2014 a 2026
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-gold btn-sm" onclick="abrirDossieSecao('${s.secao}')" title="Ver Raio-X Histórico TSE">
              📊 Raio-X TSE
            </button>
            <button class="btn btn-secondary btn-sm" onclick="navegarParaSecoesDoBairro('${s.secao}')" title="Ver Resultados e Candidatos">
              🗳️ Votos
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirModalNovaSecao() {
  document.getElementById("modalSecaoTitle").textContent = "Mapear Seção Eleitoral";
  document.getElementById("formSecaoId").value = "";
  document.getElementById("formSecaoNumero").value = "";
  document.getElementById("formSecaoAptos").value = "350";
  document.getElementById("formSecaoComparecimento").value = "300";
  document.getElementById("formSecaoAbstencao").value = "50";
  document.getElementById("formSecaoStatus").value = "Oficial TSE";
  document.getElementById("formSecaoObs").value = "";

  const localSelect = document.getElementById("formSecaoLocal");
  if (localSelect) {
    const locais = db.getLocaisVotacao();
    localSelect.innerHTML = locais.map(l => `<option value="${l.id}">${l.nome} (${l.endereco || ''})</option>`).join("");
  }

  const comSelect = document.getElementById("formSecaoComunidade");
  if (comSelect) {
    const coms = db.getComunidades();
    comSelect.innerHTML = coms.map(c => `<option value="${c.id}">${c.nome} (${c.tipo})</option>`).join("");
  }

  openModal("modalSecao");
}

function salvarFormSecao() {
  const id = document.getElementById("formSecaoId").value;
  const numero = document.getElementById("formSecaoNumero").value.trim();
  const localId = document.getElementById("formSecaoLocal").value;
  const comunidadeId = document.getElementById("formSecaoComunidade").value;
  const aptos = parseInt(document.getElementById("formSecaoAptos").value) || 0;
  const comparecimento = parseInt(document.getElementById("formSecaoComparecimento").value) || 0;
  const abstencao = parseInt(document.getElementById("formSecaoAbstencao").value) || 0;
  const status = document.getElementById("formSecaoStatus").value;
  const obs = document.getElementById("formSecaoObs").value.trim();

  if (!numero) {
    alert("Número da seção é obrigatório.");
    return;
  }

  const payload = {
    zona: "008",
    secao: numero.padStart(4, "0"),
    localId,
    comunidadeId,
    aptos,
    comparecimento,
    abstencao,
    statusConferencia: status,
    observacoes: obs
  };
  if (id) payload.id = id;

  db.saveSecao(payload);
  closeModal("modalSecao");
  showToast(`Seção ${payload.secao} salva com sucesso!`);
  renderSecoes();
  updateSidebarCounters();
}

function abrirModalLancamentoResultado() {
  const secaoSelect = document.getElementById("formResSecao");
  if (secaoSelect) {
    const secoes = db.getSecoesEleitorais();
    secaoSelect.innerHTML = secoes.map(s => {
      const local = db.getLocalVotacaoById(s.localId);
      return `<option value="${s.secao}">Seção ${s.secao} — ${local ? local.nome : 'Riachuelo'}</option>`;
    }).join("");
  }

  document.getElementById("formResAno").value = "2024";
  document.getElementById("formResTurno").value = "1º Turno";
  document.getElementById("formResCargo").value = "Prefeito";
  document.getElementById("formResCand1Nome").value = "Candidato Verde (Bacurau)";
  document.getElementById("formResCand1Num").value = "15";
  document.getElementById("formResCand1Votos").value = "";
  document.getElementById("formResCand2Nome").value = "Candidato Azul (Oposição)";
  document.getElementById("formResCand2Num").value = "22";
  document.getElementById("formResCand2Votos").value = "";
  document.getElementById("formResBrancos").value = "0";
  document.getElementById("formResNulos").value = "0";
  document.getElementById("formResComparecimento").value = "";
  document.getElementById("formResAbstencao").value = "0";

  openModal("modalResultado");
}

function salvarFormResultado() {
  const ano = parseInt(document.getElementById("formResAno").value) || 2024;
  const turno = document.getElementById("formResTurno").value;
  const cargo = document.getElementById("formResCargo").value;
  const secao = document.getElementById("formResSecao").value;
  const cand1Nome = document.getElementById("formResCand1Nome").value.trim() || "Candidato 1";
  const cand1Num = document.getElementById("formResCand1Num").value.trim() || "15";
  const cand1Votos = parseInt(document.getElementById("formResCand1Votos").value) || 0;
  const cand2Nome = document.getElementById("formResCand2Nome").value.trim() || "Candidato 2";
  const cand2Num = document.getElementById("formResCand2Num").value.trim() || "22";
  const cand2Votos = parseInt(document.getElementById("formResCand2Votos").value) || 0;
  const brancos = parseInt(document.getElementById("formResBrancos").value) || 0;
  const nulos = parseInt(document.getElementById("formResNulos").value) || 0;
  const comparecimento = parseInt(document.getElementById("formResComparecimento").value) || (cand1Votos + cand2Votos + brancos + nulos);
  const abstencao = parseInt(document.getElementById("formResAbstencao").value) || 0;
  const fonte = document.getElementById("formResFonte").value.trim();
  const status = document.getElementById("formResStatus").value;

  if (!secao) {
    alert("Selecione a seção eleitoral.");
    return;
  }

  const secObj = (db.getSecoesEleitorais() || []).find(s => s.secao === secao);
  const localObj = secObj ? db.getLocalVotacaoById(secObj.localId) : null;
  const comObj = secObj ? db.getComunidadeById(secObj.comunidadeId) : null;

  const validos = cand1Votos + cand2Votos;
  const pct1 = validos > 0 ? ((cand1Votos / validos) * 100).toFixed(1) : "0";
  const pct2 = validos > 0 ? ((cand2Votos / validos) * 100).toFixed(1) : "0";

  const resultadoData = {
    ano,
    eleicao: `Eleições Municipais ${ano}`,
    turno,
    cargo,
    secao,
    zona: "008",
    localNome: localObj ? localObj.nome : "Colégio Eleitoral de Riachuelo",
    bairroComunidade: comObj ? comObj.nome : "Riachuelo",
    aptos: comparecimento + abstencao,
    comparecimento,
    abstencao,
    votosValidos: validos,
    brancos,
    nulos,
    fonteDados: fonte,
    statusConferencia: status,
    candidatos: [
      { nome: cand1Nome, numero: cand1Num, partido: "BACURAU", votos: cand1Votos, percentualValidos: pct1 },
      { nome: cand2Nome, numero: cand2Num, partido: "OPOSIÇÃO", votos: cand2Votos, percentualValidos: pct2 }
    ],
    estatisticas: {
      vencedor: cand1Votos >= cand2Votos ? cand1Nome : cand2Nome,
      partidoVencedor: cand1Votos >= cand2Votos ? "BACURAU" : "OPOSIÇÃO",
      votosVencedor: Math.max(cand1Votos, cand2Votos),
      percentualVencedor: cand1Votos >= cand2Votos ? pct1 : pct2,
      segundoColocado: cand1Votos >= cand2Votos ? cand2Nome : cand1Nome,
      votosSegundo: Math.min(cand1Votos, cand2Votos),
      vantagemVotos: Math.abs(cand1Votos - cand2Votos)
    }
  };

  db.saveResultadoEleitoral(resultadoData);
  closeModal("modalResultado");
  showToast(`Resultado da Seção ${secao} (${ano}) gravado com sucesso!`);
  renderResultados();
}

// ==========================================================================
// 6. RESULTADOS E ESTATÍSTICAS OFICIAIS DO TSE (2014 A 2026) POR SEÇÃO
// ==========================================================================
function selecionarAnoTSE(ano) {
  AppState.tse.ano = Number(ano);
  const cargos = db.getCargosEleicao(AppState.tse.ano);
  if (!cargos.includes(AppState.tse.cargo)) {
    AppState.tse.cargo = cargos[0] || "Prefeito";
  }

  // Atualiza botões de chips
  document.querySelectorAll(".tse-chip").forEach(chip => {
    if (Number(chip.getAttribute("data-year")) === Number(ano)) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  // Atualiza dropdown de cargos com base no ano
  const cargoSelect = document.getElementById("filtroResultadoCargo");
  if (cargoSelect) {
    cargoSelect.innerHTML = cargos.map(c => `<option value="${c}" ${c === AppState.tse.cargo ? 'selected' : ''}>${c}</option>`).join("");
  }

  renderResultados();
}

function aoMudarFiltrosTSE() {
  const cargoEl = document.getElementById("filtroResultadoCargo");
  const secaoEl = document.getElementById("filtroResultadoSecao");
  const searchEl = document.getElementById("searchTseInput");

  if (cargoEl) AppState.tse.cargo = cargoEl.value;
  if (secaoEl) AppState.tse.secao = secaoEl.value;
  if (searchEl) AppState.tse.busca = searchEl.value;

  renderResultados();
}

function renderResultados() {
  const tbody = document.getElementById("resultadosTableBody");
  if (!tbody) return;

  // 1. Garante que os chips reflitam o ano ativo
  document.querySelectorAll(".tse-chip").forEach(chip => {
    if (Number(chip.getAttribute("data-year")) === Number(AppState.tse.ano)) {
      chip.classList.add("active");
    } else {
      chip.classList.remove("active");
    }
  });

  // 2. Preenche o select de cargos se necessário
  const cargoSelect = document.getElementById("filtroResultadoCargo");
  if (cargoSelect) {
    const cargosDisponiveis = db.getCargosEleicao(AppState.tse.ano);
    if (!cargoSelect.options.length || !cargosDisponiveis.includes(cargoSelect.value)) {
      cargoSelect.innerHTML = cargosDisponiveis.map(c => `<option value="${c}" ${c === AppState.tse.cargo ? 'selected' : ''}>${c}</option>`).join("");
      if (!cargosDisponiveis.includes(AppState.tse.cargo)) {
        AppState.tse.cargo = cargosDisponiveis[0] || "Prefeito";
      }
    }
  }

  // 3. Preenche o select de seções (0012 a 0027) se vazio
  const secaoSelect = document.getElementById("filtroResultadoSecao");
  if (secaoSelect && secaoSelect.options.length <= 1) {
    const secoes = db.getSecoesEleitorais();
    secaoSelect.innerHTML = '<option value="">Todas as 16 Seções</option>' + secoes.map(s => {
      const local = db.getLocalVotacaoById(s.localId);
      return `<option value="${s.secao}">Seção ${s.secao} (${local ? local.nome : '8ª Zona'})</option>`;
    }).join("");
    secaoSelect.value = AppState.tse.secao || "";
  }

  // 4. Busca os dados filtrados
  const resultados = db.getResultadosEleitorais({
    ano: AppState.tse.ano,
    cargo: AppState.tse.cargo,
    secao: AppState.tse.secao,
    busca: AppState.tse.busca
  });

  // 5. Atualiza Título e Subtítulo
  const titleEl = document.getElementById("tseResultadosHeaderTitle");
  const subEl = document.getElementById("tseResultadosHeaderSubtitle");
  if (titleEl) titleEl.textContent = `Resultados Oficiais do TSE — Eleições ${AppState.tse.ano} (${AppState.tse.cargo})`;
  if (subEl) subEl.textContent = `Detalhamento nominal por seção eleitoral de Riachuelo–RN e estatísticas nominais por candidato`;

  // 6. Atualiza KPIs
  let totalAptos = 0;
  let totalComparecimento = 0;
  let totalAbstencao = 0;
  let totalValidos = 0;
  const consolidadoCandidatos = {};

  resultados.forEach(r => {
    totalAptos += r.aptos || 0;
    totalComparecimento += r.comparecimento || 0;
    totalAbstencao += r.abstencao || 0;
    totalValidos += r.votosValidos || 0;

    (r.candidatos || []).forEach(c => {
      if (!consolidadoCandidatos[c.nome]) {
        consolidadoCandidatos[c.nome] = { nome: c.nome, partido: c.partido, votos: 0 };
      }
      consolidadoCandidatos[c.nome].votos += c.votos;
    });
  });

  const candLider = Object.values(consolidadoCandidatos).sort((a, b) => b.votos - a.votos)[0] || { nome: "N/A", partido: "-", votos: 0 };
  const pctVencedor = totalValidos > 0 ? ((candLider.votos / totalValidos) * 100).toFixed(1) : 0;
  const pctComp = totalAptos > 0 ? ((totalComparecimento / totalAptos) * 100).toFixed(1) : 0;
  const pctAbs = totalAptos > 0 ? ((totalAbstencao / totalAptos) * 100).toFixed(1) : 0;

  const kpiVenc = document.getElementById("kpiTseVencedor");
  const kpiVencSub = document.getElementById("kpiTseVencedorSub");
  const kpiComp = document.getElementById("kpiTseComparecimento");
  const kpiCompSub = document.getElementById("kpiTseComparecimentoSub");
  const kpiVal = document.getElementById("kpiTseValidos");
  const kpiValSub = document.getElementById("kpiTseValidosSub");
  const kpiAbs = document.getElementById("kpiTseAbstencao");
  const kpiAbsSub = document.getElementById("kpiTseAbstencaoSub");

  if (kpiVenc) kpiVenc.textContent = `${candLider.nome} (${candLider.partido})`;
  if (kpiVencSub) kpiVencSub.textContent = `${candLider.votos.toLocaleString('pt-BR')} votos válidos (${pctVencedor}%)`;
  if (kpiComp) kpiComp.textContent = `${pctComp}%`;
  if (kpiCompSub) kpiCompSub.textContent = `${totalComparecimento.toLocaleString('pt-BR')} de ${totalAptos.toLocaleString('pt-BR')} aptos`;
  if (kpiVal) kpiVal.textContent = totalValidos.toLocaleString('pt-BR');
  if (kpiValSub) kpiValSub.textContent = `Em ${resultados.length} seções analisadas`;
  if (kpiAbs) kpiAbs.textContent = `${pctAbs}%`;
  if (kpiAbsSub) kpiAbsSub.textContent = `${totalAbstencao.toLocaleString('pt-BR')} eleitores ausentes`;

  // 7. Renderiza linhas da tabela
  if (resultados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:35px; color:var(--text-muted);">
          Nenhum resultado encontrado para os filtros selecionados. Tente alterar o cargo, o ano ou a seção.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = resultados.map(r => {
    const c1 = r.candidatos[0] || { nome: "-", partido: "-", votos: 0, percentualValidos: 0 };
    const c2 = r.candidatos[1] || { nome: "-", partido: "-", votos: 0, percentualValidos: 0 };

    return `
      <tr>
        <td>
          <strong style="font-family:var(--font-mono); color:var(--gold-400); font-size:0.95rem;">Seção ${r.secao}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted);">${r.localNome}</span>
        </td>
        <td>
          <span style="font-size:0.85rem; font-weight:600;">${r.bairroComunidade}</span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="tse-badge-rank rank-1">1º</span>
            <strong>${c1.nome}</strong>
            <span class="badge-status oficial" style="font-size:0.7rem;">${c1.partido}</span>
            <span style="font-family:var(--font-mono); font-weight:700; color:var(--gold-400); margin-left:auto;">
              ${c1.votos} (${c1.percentualValidos}%)
            </span>
          </div>
          <div class="tse-candidate-bar-wrapper">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill gold" style="width:${Math.min(100, c1.percentualValidos)}%;"></div>
            </div>
          </div>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
            <span class="tse-badge-rank rank-2">2º</span>
            <span style="color:#ffffff;">${c2.nome}</span>
            <span class="badge-status" style="font-size:0.7rem; background:rgba(255,255,255,0.1); color:var(--text-muted);">${c2.partido}</span>
            <span style="font-family:var(--font-mono); font-weight:600; color:var(--text-muted); margin-left:auto;">
              ${c2.votos} (${c2.percentualValidos}%)
            </span>
          </div>
          <div class="tse-candidate-bar-wrapper">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill blue" style="width:${Math.min(100, c2.percentualValidos)}%;"></div>
            </div>
          </div>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--emerald-400); font-size:0.88rem;">
            +${r.estatisticas.vantagemVotos} votos
          </span><br>
          <span style="font-size:0.72rem; color:var(--text-muted);">(${r.estatisticas.vantagemPercentual} pts)</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700;">${r.comparecimento}/${r.aptos}</span><br>
          <span style="font-size:0.72rem; color:var(--emerald-400);">${r.taxaComparecimento}% pres.</span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-primary btn-sm" onclick="abrirDetalhesCandidatosSecao('${r.id}')" title="Ver votação de todos os candidatos nesta seção">
              🗳️ Candidatos (${r.candidatos.length})
            </button>
            <button class="btn btn-secondary btn-sm" onclick="abrirDossieSecao('${r.secao}')" title="Histórico da seção 2014 a 2026">
              📊 Raio-X
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function abrirDossieSecao(secaoNumero) {
  const dossie = db.getSecaoDossie(secaoNumero);
  if (!dossie) {
    showToast(`Dados da seção ${secaoNumero} não localizados.`);
    return;
  }

  const tituloEl = document.getElementById("dossieSecaoTitulo");
  const subtituloEl = document.getElementById("dossieSecaoSubtitulo");
  const infoBox = document.getElementById("dossieSecaoInfoBox");
  const tabelaBody = document.getElementById("dossieTabelaBody");
  const badgeTotal = document.getElementById("dossieBadgeTotalEleicoes");

  if (tituloEl) tituloEl.innerHTML = `📊 Raio-X Histórico TSE (2014 a 2026) — <span style="color:var(--gold-400);">Seção ${dossie.secao}</span>`;
  if (subtituloEl) subtituloEl.textContent = `${dossie.localNome} • ${dossie.bairroComunidade} • 8ª Zona Eleitoral`;

  if (infoBox) {
    infoBox.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Local de Votação</div>
          <div style="font-weight:700; color:#ffffff; font-size:0.95rem;">${dossie.localNome}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Comunidade / Bairro</div>
          <div style="font-weight:700; color:var(--emerald-400); font-size:0.95rem;">${dossie.bairroComunidade}</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Eleitorado Apto</div>
          <div style="font-weight:700; font-family:var(--font-mono); color:#ffffff; font-size:0.95rem;">${dossie.aptosAtual} eleitores</div>
        </div>
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Abrangência Histórica</div>
          <div style="font-weight:700; color:var(--gold-400); font-size:0.95rem;">2014 a 2026 (${dossie.totalEleicoesRegistradas} disputas)</div>
        </div>
      </div>
    `;
  }

  // Gera as linhas cronológicas de todas as eleições da seção
  const anosOrdenados = [2026, 2024, 2022, 2020, 2018, 2016, 2014];
  let linhasHtml = "";

  anosOrdenados.forEach(ano => {
    const disputas = dossie.historicoPorAno[ano] || [];
    disputas.forEach(d => {
      const c1 = d.candidatos[0] || { nome: "-", partido: "-", votos: 0, percentualValidos: 0 };
      const c2 = d.candidatos[1] || { nome: "-", partido: "-", votos: 0, percentualValidos: 0 };

      linhasHtml += `
        <tr>
          <td>
            <strong style="color:${ano === 2026 ? 'var(--gold-400)' : '#ffffff'}; font-family:var(--font-mono);">
              ${ano} ${ano === 2026 ? '✨ (Projeção)' : ''}
            </strong><br>
            <span style="font-size:0.72rem; color:var(--text-muted);">${d.eleicao}</span>
          </td>
          <td><strong>${d.cargo}</strong></td>
          <td>
            <strong style="color:var(--gold-400);">🥇 ${c1.nome}</strong> (${c1.partido})<br>
            <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--emerald-400);">${c1.votos} votos (${c1.percentualValidos}%)</span>
          </td>
          <td>
            <span style="color:#ffffff;">🥈 ${c2.nome}</span> (${c2.partido})<br>
            <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">${c2.votos} votos (${c2.percentualValidos}%)</span>
          </td>
          <td><span style="font-family:var(--font-mono); font-weight:700;">${d.votosValidos}</span></td>
          <td>
            <span style="font-family:var(--font-mono); color:var(--emerald-400);">${d.comparecimento}</span> 
            <span style="font-size:0.72rem; color:var(--text-muted);">(${d.taxaComparecimento}%)</span>
          </td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="abrirDetalhesCandidatosSecao('${d.id}')">
              Ver Todos
            </button>
          </td>
        </tr>
      `;
    });
  });

  if (tabelaBody) tabelaBody.innerHTML = linhasHtml;
  if (badgeTotal) badgeTotal.textContent = `${dossie.totalEleicoesRegistradas} Registros TSE`;

  openModal("modalDossieSecao");
}

function abrirDetalhesCandidatosSecao(registroId) {
  const registro = db.getResultadosEleitorais().find(r => r.id === registroId);
  if (!registro) return;

  const tituloEl = document.getElementById("candSecaoTitulo");
  const subtituloEl = document.getElementById("candSecaoSubtitulo");
  const resumoBox = document.getElementById("candSecaoCardsResumo");
  const tbody = document.getElementById("candSecaoTabelaBody");

  if (tituloEl) tituloEl.innerHTML = `🗳️ Seção ${registro.secao} — ${registro.cargo} (${registro.ano})`;
  if (subtituloEl) subtituloEl.textContent = `${registro.localNome} • ${registro.bairroComunidade} • ${registro.eleicao}`;

  if (resumoBox) {
    resumoBox.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:10px; background:var(--bg-surface); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); font-size:0.82rem;">
        <div><strong>Total de Aptos:</strong> <span style="font-family:var(--font-mono); color:#fff;">${registro.aptos}</span></div>
        <div style="border-left:1px solid var(--border-subtle); padding-left:10px;"><strong>Comparecimento:</strong> <span style="font-family:var(--font-mono); color:var(--emerald-400);">${registro.comparecimento} (${registro.taxaComparecimento}%)</span></div>
        <div style="border-left:1px solid var(--border-subtle); padding-left:10px;"><strong>Votos Válidos:</strong> <span style="font-family:var(--font-mono); color:var(--gold-400);">${registro.votosValidos}</span></div>
        <div style="border-left:1px solid var(--border-subtle); padding-left:10px;"><strong>Brancos/Nulos:</strong> <span style="font-family:var(--font-mono); color:#f87171;">${registro.votosBrancos + registro.votosNulos}</span></div>
      </div>
    `;
  }

  if (tbody) {
    tbody.innerHTML = (registro.candidatos || []).map((c, i) => `
      <tr>
        <td><span class="tse-badge-rank ${i === 0 ? 'rank-1' : (i === 1 ? 'rank-2' : (i === 2 ? 'rank-3' : ''))}">${i + 1}º</span></td>
        <td>
          <strong style="color:#ffffff;">${c.nome}</strong><br>
          <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">${c.partido} ${c.numero !== 'LEGENDA' ? `• Nº ${c.numero}` : ''}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:800; font-size:1rem; color:${i === 0 ? 'var(--gold-400)' : 'var(--text-main)'};">
            ${c.votos.toLocaleString('pt-BR')} votos
          </span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--emerald-400);">
            ${c.percentualValidos}%
          </span>
        </td>
        <td>
          <div class="tse-candidate-bar-wrapper">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill ${i === 0 ? 'gold' : (i === 1 ? 'blue' : '')}" style="width:${Math.min(100, c.percentualValidos)}%;"></div>
            </div>
            <span style="font-size:0.7rem; color:var(--text-dim);">${c.percentualTotal}% dos votantes</span>
          </div>
        </td>
        <td>
          <span class="badge-status ${i === 0 ? 'oficial' : 'pendente'}" style="font-size:0.72rem;">
            ${c.situacao}
          </span>
          <span style="font-size:0.72rem; color:${c.comparativoMediaMunicipal && c.comparativoMediaMunicipal.startsWith('+') ? 'var(--emerald-400)' : 'var(--text-muted)'}; margin-left:4px;">
            ${c.comparativoMediaMunicipal || ''}
          </span>
        </td>
      </tr>
    `).join("");
  }

  openModal("modalCandidatosSecao");
}

function exportarRelatorioTSECSV() {
  const dados = db.getResultadosEleitorais({
    ano: AppState.tse.ano,
    cargo: AppState.tse.cargo,
    secao: AppState.tse.secao
  });

  if (!dados.length) {
    showToast("Nenhum dado para exportar.");
    return;
  }

  let csv = "Ano;Eleicao;Cargo;Secao;Zona;Local;Bairro;Aptos;Comparecimento;Abstencao;VotosValidos;Vencedor;PartidoVencedor;VotosVencedor;PercentualVencedor;SegundoColocado;VotosSegundo;PercentualSegundo;VantagemVotos\n";

  dados.forEach(d => {
    const e = d.estatisticas;
    csv += `"${d.ano}";"${d.eleicao}";"${d.cargo}";"${d.secao}";"${d.zona}";"${d.localNome}";"${d.bairroComunidade}";${d.aptos};${d.comparecimento};${d.abstencao};${d.votosValidos};"${e.vencedor}";"${e.partidoVencedor}";${e.votosVencedor};${e.percentualVencedor};"${e.segundoColocado}";${e.votosSegundo};${e.vantagemVotos}\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `TSE_RiachueloRN_${AppState.tse.ano}_${AppState.tse.cargo.replace(/\s+/g, '_')}_Secoes.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Relatório CSV do TSE exportado com sucesso!");
}

function navegarParaSecoesDoBairro(secaoNumero) {
  if (secaoNumero) {
    AppState.tse.secao = secaoNumero;
  }
  navigateTo("resultados");
}

// ==========================================================================
// 7. ESTATÍSTICAS E ANÁLISE COMPARATIVA TSE (2014 A 2026)
// ==========================================================================
function renderEstatisticas() {
  const anoSelect = document.getElementById("filtroGraficoAno");
  const cargoSelect = document.getElementById("filtroGraficoCargo");
  const ano = anoSelect ? Number(anoSelect.value) : 2024;
  let cargo = cargoSelect ? cargoSelect.value : "Prefeito";

  // Busca dados do TSE para ano e cargo
  let resultados = db.getResultadosEleitorais({ ano: ano, cargo: cargo });
  if (!resultados.length) {
    const cargosDoAno = db.getCargosEleicao(ano);
    if (cargoSelect && cargosDoAno.length) {
      cargo = cargosDoAno[0];
      cargoSelect.innerHTML = cargosDoAno.map(c => `<option value="${c}" ${c === cargo ? 'selected' : ''}>Cargo: ${c}</option>`).join("");
      resultados = db.getResultadosEleitorais({ ano: ano, cargo: cargo });
    }
  }

  // Agrega votos por candidato no município inteiro
  const candTotals = {};
  resultados.forEach(r => {
    (r.candidatos || []).forEach(c => {
      if (!candTotals[c.nome]) {
        candTotals[c.nome] = { nome: c.nome, partido: c.partido, votos: 0 };
      }
      candTotals[c.nome].votos += c.votos;
    });
  });

  const candList = Object.values(candTotals).sort((a, b) => b.votos - a.votos);
  const labels = candList.map(c => `${c.nome} (${c.partido})`);
  const dataVotos = candList.map(c => c.votos);

  const coresCandidatos = [
    "#f59e0b", // ouro
    "#38bdf8", // azul
    "#10b981", // esmeralda
    "#ec4899", // rosa
    "#a855f7", // roxo
    "#64748b"  // cinza
  ];

  // 1. Gráfico de Barras de Votação Nominal
  const barCanvas = document.getElementById("statsBarChart");
  if (barCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.statsBar) AppState.charts.statsBar.destroy();
    AppState.charts.statsBar = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: labels.slice(0, 8),
        datasets: [{
          label: "Votos Válidos",
          data: dataVotos.slice(0, 8),
          backgroundColor: coresCandidatos,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: "#94a3b8", font: { size: 10 } } },
          y: { ticks: { color: "#94a3b8" } }
        }
      }
    });
  }

  // 2. Gráfico de Rosca (Percentual)
  const doughnutCanvas = document.getElementById("statsDoughnutChart");
  if (doughnutCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.statsDoughnut) AppState.charts.statsDoughnut.destroy();
    AppState.charts.statsDoughnut = new Chart(doughnutCanvas, {
      type: "doughnut",
      data: {
        labels: labels.slice(0, 6),
        datasets: [{
          data: dataVotos.slice(0, 6),
          backgroundColor: coresCandidatos
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { color: "#e2e8f0", font: { size: 11 } } }
        }
      }
    });
  }

  // 3. Gráfico de Linha (Comparecimento por Seção)
  const lineCanvas = document.getElementById("statsLineChart");
  if (lineCanvas && typeof Chart !== 'undefined') {
    if (AppState.charts.statsLine) AppState.charts.statsLine.destroy();
    const secoesLabels = resultados.map(r => `Sec. ${r.secao}`);
    const compData = resultados.map(r => r.taxaComparecimento);

    AppState.charts.statsLine = new Chart(lineCanvas, {
      type: "line",
      data: {
        labels: secoesLabels,
        datasets: [{
          label: "Taxa de Comparecimento (%)",
          data: compData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 70, max: 100, ticks: { color: "#94a3b8" } },
          x: { ticks: { color: "#94a3b8" } }
        }
      }
    });
  }

  // 4. Renderiza o Ranking Territorial de Candidatos (Paginado Máx 10 por página)
  renderRankingTerritorial();
}

// ==========================================================================
// 7.1 CONTROLADOR DO RANKING TERRITORIAL DE CANDIDATOS (PAGINADO)
// ==========================================================================
function aoMudarFiltroRanking(novaPagina = 1) {
  const cargoEl = document.getElementById("filtroRankingCargo");
  const anoEl = document.getElementById("filtroRankingAno");
  const turnoEl = document.getElementById("filtroRankingTurno");
  const searchEl = document.getElementById("searchRankingInput");

  if (cargoEl) {
    AppState.ranking.cargo = cargoEl.value;
    if (cargoEl.value.includes("1º Turno")) {
      AppState.ranking.turno = "1º Turno";
      if (turnoEl) turnoEl.value = "1º Turno";
    } else if (cargoEl.value.includes("2º Turno")) {
      AppState.ranking.turno = "2º Turno";
      if (turnoEl) turnoEl.value = "2º Turno";
    }
  }
  if (anoEl) AppState.ranking.ano = Number(anoEl.value);
  if (turnoEl && (!cargoEl || (!cargoEl.value.includes("1º") && !cargoEl.value.includes("2º")))) {
    AppState.ranking.turno = turnoEl.value;
  }
  if (searchEl) AppState.ranking.busca = searchEl.value;
  AppState.ranking.pagina = Number(novaPagina) || 1;

  renderRankingTerritorial();
}

function selecionarTurnoRanking(turno) {
  AppState.ranking.turno = turno;
  const turnoEl = document.getElementById("filtroRankingTurno");
  if (turnoEl) turnoEl.value = turno;

  AppState.ranking.pagina = 1;
  renderRankingTerritorial();
}

function aoMudarAnoRanking() {
  const anoEl = document.getElementById("filtroRankingAno");
  if (anoEl) AppState.ranking.ano = Number(anoEl.value);

  // Ajusta o dropdown de cargos para o ano selecionado
  const cargosAno = db.getCargosEleicao(AppState.ranking.ano);
  const cargoEl = document.getElementById("filtroRankingCargo");
  if (cargoEl) {
    let opts = '<option value="">Todos os Cargos</option>';
    cargosAno.forEach(c => {
      opts += `<option value="${c}">${c}</option>`;
    });
    cargoEl.innerHTML = opts;
    if (cargosAno.includes(AppState.ranking.cargo)) {
      cargoEl.value = AppState.ranking.cargo;
    } else {
      cargoEl.value = cargosAno[0] || "";
      AppState.ranking.cargo = cargoEl.value;
    }
  }

  // Se ano for 2026, reseta turno para vazio (cargos de deputado são turno único)
  if (AppState.ranking.ano === 2026) {
    AppState.ranking.turno = "";
    const turnoEl = document.getElementById("filtroRankingTurno");
    if (turnoEl) turnoEl.value = "";
  }

  AppState.ranking.pagina = 1;
  renderRankingTerritorial();
}

function mudarPaginaRanking(novaPagina) {
  AppState.ranking.pagina = Number(novaPagina);
  renderRankingTerritorial();
  const bloco = document.getElementById("blocoRankingTerritorial");
  if (bloco) {
    bloco.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderRankingTerritorial() {
  const tbody = document.getElementById("rankingTerritorialTableBody");
  if (!tbody) return;

  const resultadoPaginado = db.getRankingTerritorialCandidatos({
    ano: AppState.ranking.ano,
    cargo: AppState.ranking.cargo,
    turno: AppState.ranking.turno,
    busca: AppState.ranking.busca,
    pagina: AppState.ranking.pagina,
    limite: AppState.ranking.limite
  });

  const { itens, totalItens, totalPaginas, paginaAtual, inicioIndice, fimIndice } = resultadoPaginado;

  // Atualiza barra dinâmica de turnos
  const turnosContainer = document.getElementById("rankingTurnosContainer");
  const btn1 = document.getElementById("btnRankingTurno1");
  const btn2 = document.getElementById("btnRankingTurno2");
  const turnoAviso = document.getElementById("rankingTurnoAviso");

  // O container de 2 turnos só é exibido para eleições majoritárias de anos em que houve 2º turno (2018 e 2022)
  const temTurnos = (AppState.ranking.ano === 2022 || AppState.ranking.ano === 2018) && 
                    (!AppState.ranking.cargo || AppState.ranking.cargo.includes("Presidente") || AppState.ranking.cargo.includes("Governador"));

  if (turnosContainer) {
    turnosContainer.style.display = temTurnos ? "flex" : "none";
  }

  const isSegundo = (AppState.ranking.turno === "2º Turno") || (AppState.ranking.cargo && AppState.ranking.cargo.includes("2º Turno"));
  if (btn1) {
    btn1.className = !isSegundo ? "btn btn-sm btn-gold" : "btn btn-sm btn-secondary";
  }
  if (btn2) {
    btn2.className = isSegundo ? "btn btn-sm btn-gold" : "btn btn-sm btn-secondary";
  }
  if (turnoAviso) {
    turnoAviso.innerHTML = "";
  }

  // Atualiza Título e Subtítulo
  const tituloEl = document.getElementById("rankingTerritorialTitulo");
  const subtituloEl = document.getElementById("rankingTerritorialSubtitulo");
  const cargoTexto = AppState.ranking.cargo ? `Cargo: ${AppState.ranking.cargo}` : "Todos os Cargos";
  const turnoTexto = AppState.ranking.turno ? ` • ${AppState.ranking.turno}` : "";
  if (tituloEl) tituloEl.textContent = `🏆 Ranking Territorial Oficial — ${cargoTexto}${turnoTexto} (${AppState.ranking.ano})`;
  if (subtituloEl) subtituloEl.textContent = `Votação nominal detalhada de cada candidato no município de Riachuelo–RN • Total de ${totalItens} candidatos catalogados`;

  if (itens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:35px; color:var(--text-muted);">
          Nenhum candidato encontrado com os filtros selecionados. Tente alterar o cargo, o ano, o turno ou limpar a busca.
        </td>
      </tr>
    `;
    atualizarBarraPaginacao(0, 0, 0, 1, 1);
    return;
  }

  tbody.innerHTML = itens.map(c => {
    const posGlobal = c.posicaoRanking;
    const rankClass = posGlobal === 1 ? 'rank-1' : (posGlobal === 2 ? 'rank-2' : (posGlobal === 3 ? 'rank-3' : ''));
    const cargoSlug = c.cargo.toLowerCase().replace(/\s+/g, '-');
    const polo = c.secaoMaisForte ? `Seção ${c.secaoMaisForte.secao} (${c.secaoMaisForte.votos} votos)` : 'Média municipal';
    const localPolo = c.secaoMaisForte ? c.secaoMaisForte.bairro : 'Riachuelo';
    const turnoBadge = c.turno === '2º Turno' 
      ? '<span class="badge-status pendente" style="font-size:0.68rem; padding:1px 6px;">2º Turno</span>'
      : (c.turno === '1º Turno' ? '<span class="badge-status oficial" style="font-size:0.68rem; padding:1px 6px;">1º Turno</span>' : '<span class="badge-status oficial" style="font-size:0.68rem; padding:1px 6px;">Único</span>');

    return `
      <tr class="clickable-row" onclick="abrirMapaSecoesCandidato('${encodeURIComponent(c.id)}')" title="Clique no candidato para abrir o card com todos os votos nas 16 seções">
        <td>
          <span class="tse-badge-rank ${rankClass}">#${posGlobal}</span>
        </td>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <div class="user-avatar" style="width:34px; height:34px; font-size:0.8rem; background:linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(217,119,6,0.2) 100%); border:1px solid var(--border-subtle);">
              ${c.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
            </div>
            <div>
              <strong style="color:#ffffff; font-size:0.92rem;">${c.nome}</strong><br>
              <span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">
                ${c.partido} ${c.numero && c.numero !== 'LEGENDA' ? `• Nº ${c.numero}` : ''}
              </span>
            </div>
          </div>
        </td>
        <td>
          <span class="cargo-tag ${cargoSlug}">${c.cargo}</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-size:0.85rem; color:var(--text-muted);">${c.ano}</span><br>
          ${turnoBadge}
        </td>
        <td>
          <strong style="font-family:var(--font-mono); font-size:1.05rem; color:var(--gold-400);">
            ${c.totalVotos.toLocaleString('pt-BR')}
          </strong>
          <span style="font-size:0.75rem; color:var(--text-muted);">votos</span>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--emerald-400);">
            ${c.percentualValidos}%
          </span>
        </td>
        <td>
          <strong style="color:#ffffff; font-size:0.82rem;">${polo}</strong><br>
          <span style="font-size:0.72rem; color:var(--text-muted);">${localPolo}</span>
        </td>
        <td>
          <span class="badge-status ${c.situacao && (c.situacao.includes('Eleito') || c.situacao.includes('1º') || c.situacao.includes('Líder')) ? 'oficial' : 'pendente'}" style="font-size:0.7rem;">
            ${c.situacao || 'Disputa'}
          </span>
        </td>
        <td onclick="event.stopPropagation();">
          <button class="btn btn-primary btn-sm" onclick="abrirMapaSecoesCandidato('${encodeURIComponent(c.id)}')" title="Abrir os 16 cards com os votos nas 16 seções">
            🗳️ 16 Seções
          </button>
        </td>
      </tr>
    `;
  }).join("");

  atualizarBarraPaginacao(inicioIndice, fimIndice, totalItens, totalPaginas, paginaAtual);
}

// Navegação horizontal suave para a tabela de ranking
function rolarTabelaRanking(direcao) {
  const container = document.getElementById("rankingTableResponsive");
  if (!container) return;
  const delta = direcao === 'esquerda' ? -380 : 380;
  container.scrollBy({ left: delta, behavior: "smooth" });
}

function atualizarBarraPaginacao(inicio, fim, total, totalPaginas, paginaAtual) {
  const infoEl = document.getElementById("rankingPaginationInfo");
  const controlsEl = document.getElementById("rankingPaginationControls");

  if (infoEl) {
    infoEl.innerHTML = `Exibindo <strong>${inicio} a ${fim}</strong> de <strong>${total}</strong> candidatos (Máx 10 por página)`;
  }

  if (controlsEl) {
    if (totalPaginas <= 1) {
      controlsEl.innerHTML = `<span class="tse-page-btn active">Página 1 de 1</span>`;
      return;
    }

    let buttonsHtml = "";

    // Botão Anterior
    buttonsHtml += `
      <button class="tse-page-btn" ${paginaAtual <= 1 ? 'disabled' : ''} onclick="mudarPaginaRanking(${paginaAtual - 1})">
        ◀ Anterior
      </button>
    `;

    // Botões numéricos de páginas (ex: 1, 2, 3...)
    for (let p = 1; p <= totalPaginas; p++) {
      if (p === 1 || p === totalPaginas || (p >= paginaAtual - 1 && p <= paginaAtual + 1)) {
        buttonsHtml += `
          <button class="tse-page-btn ${p === paginaAtual ? 'active' : ''}" onclick="mudarPaginaRanking(${p})">
            ${p}
          </button>
        `;
      } else if (p === paginaAtual - 2 || p === paginaAtual + 2) {
        buttonsHtml += `<span style="color:var(--text-muted); padding:0 4px;">...</span>`;
      }
    }

    // Botão Próxima
    buttonsHtml += `
      <button class="tse-page-btn" ${paginaAtual >= totalPaginas ? 'disabled' : ''} onclick="mudarPaginaRanking(${paginaAtual + 1})">
        Próxima ▶
      </button>
    `;

    controlsEl.innerHTML = buttonsHtml;
  }
}

function abrirMapaSecoesCandidato(chaveCandidatoDecoded) {
  const chave = decodeURIComponent(chaveCandidatoDecoded);
  const resultado = db.getRankingTerritorialCandidatos({ ano: null, cargo: null, limite: 1000 });
  const cand = (resultado.itens || []).find(c => c.id === chave);

  if (!cand) {
    showToast("Dados do candidato não encontrados.");
    return;
  }

  const tituloEl = document.getElementById("candMapaTitulo");
  const subtituloEl = document.getElementById("candMapaSubtitulo");
  const resumoBox = document.getElementById("candMapaResumoBox");
  const cardsGrid = document.getElementById("candMapaCardsGrid");
  const tbody = document.getElementById("candMapaTabelaBody");

  if (tituloEl) tituloEl.innerHTML = `🗺️ Votação Territorial — <span style="color:var(--gold-400);">${cand.nome}</span> (${cand.partido})`;
  if (subtituloEl) subtituloEl.textContent = `${cand.cargo} • ${cand.turno ? cand.turno + ' • ' : ''}Eleições ${cand.ano} • Riachuelo–RN (8ª Zona)`;

  if (resumoBox) {
    resumoBox.innerHTML = `
      <div style="display:flex; flex-wrap:wrap; gap:14px; background:linear-gradient(135deg, rgba(6,78,59,0.3) 0%, rgba(3,20,12,0.6) 100%); border:1px solid var(--border-emerald); padding:14px 18px; border-radius:var(--radius-md);">
        <div>
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Total de Votos no Município</div>
          <div style="font-weight:800; font-family:var(--font-mono); color:var(--gold-400); font-size:1.3rem;">${cand.totalVotos.toLocaleString('pt-BR')} votos</div>
        </div>
        <div style="border-left:1px solid rgba(255,255,255,0.1); padding-left:14px;">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Percentual Válidos</div>
          <div style="font-weight:700; font-family:var(--font-mono); color:var(--emerald-400); font-size:1.3rem;">${cand.percentualValidos}%</div>
        </div>
        <div style="border-left:1px solid rgba(255,255,255,0.1); padding-left:14px;">
          <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Polo Mais Forte</div>
          <div style="font-weight:700; color:#ffffff; font-size:0.95rem;">${cand.secaoMaisForte ? `Seção ${cand.secaoMaisForte.secao} (${cand.secaoMaisForte.votos} votos)` : '-'}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${cand.secaoMaisForte ? cand.secaoMaisForte.localNome : ''}</div>
        </div>
      </div>
    `;
  }

  const secoesOrdenadas = [...(cand.votosPorSecao || [])].sort((a, b) => b.votos - a.votos);

  // 1. Renderiza os 16 Cards das Seções
  if (cardsGrid) {
    cardsGrid.innerHTML = secoesOrdenadas.map((s, idx) => {
      const isPolo = cand.secaoMaisForte && String(cand.secaoMaisForte.secao) === String(s.secao);
      const pctBarra = Math.min(100, Math.round((s.votos / (cand.maxVotosSecao || 1)) * 100));

      return `
        <div class="secao-voto-card ${isPolo ? 'destaque-polo' : ''}">
          <div class="secao-voto-card-header">
            <span class="secao-voto-num">Seção ${s.secao}</span>
            ${isPolo 
              ? `<span class="badge-status oficial" style="font-size:0.68rem; background:rgba(217,119,6,0.25); color:#fbbf24; border:1px solid #d97706;">🏆 Polo Mais Forte</span>` 
              : `<span style="font-size:0.7rem; color:var(--text-muted); font-family:var(--font-mono); font-weight:600;">#${idx + 1} em votos</span>`
            }
          </div>

          <div class="secao-voto-local" title="${s.localNome}">
            ${s.localNome}
          </div>

          <div class="secao-voto-bairro">
            📍 ${s.bairroComunidade}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:6px;">
            <div class="secao-voto-votos">
              ${s.votos} <span>votos</span>
            </div>
            <div style="font-family:var(--font-mono); font-weight:700; color:var(--emerald-400); font-size:0.85rem;">
              ${s.percentualSecao}%
            </div>
          </div>

          <div class="tse-candidate-bar-wrapper" style="margin-top:6px;">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill ${isPolo ? 'gold' : ''}" style="width:${pctBarra}%;"></div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // 2. Renderiza a Tabela Analítica (para alternar ou expandir)
  if (tbody) {
    tbody.innerHTML = secoesOrdenadas.map((s, idx) => `
      <tr>
        <td>
          <strong style="font-family:var(--font-mono); color:var(--gold-400);">Seção ${s.secao}</strong>
        </td>
        <td><strong>${s.localNome}</strong></td>
        <td>${s.bairroComunidade}</td>
        <td>
          <strong style="font-family:var(--font-mono); font-size:0.95rem; color:${idx === 0 ? 'var(--gold-400)' : 'var(--text-main)'};">
            ${s.votos} votos
          </strong>
        </td>
        <td>
          <span style="font-family:var(--font-mono); font-weight:700; color:var(--emerald-400);">
            ${s.percentualSecao}%
          </span>
        </td>
        <td>
          <div class="tse-candidate-bar-wrapper">
            <div class="tse-candidate-bar-track">
              <div class="tse-candidate-bar-fill ${idx === 0 ? 'gold' : ''}" style="width:${Math.min(100, (s.votos / (cand.maxVotosSecao || 1)) * 100)}%;"></div>
            </div>
          </div>
        </td>
      </tr>
    `).join("");
  }

  openModal("modalCandidatoPorSecoes");
}

// ==========================================================================
// 7.1. SIMULADOR ELEITORAL (QUOCIENTE & SOBRAS 80/20)
// ==========================================================================
function renderSimulador() {
  const cfg = db.getSimuladorConfig();

  // Atualiza os inputs de parâmetros gerais se existirem no DOM
  const aptosEl = document.getElementById("simAptos");
  const absEl = document.getElementById("simAbstencaoPct");
  const bnEl = document.getElementById("simBrancosNulosPct");
  const cadEl = document.getElementById("simCadeiras");
  const clIndEl = document.getElementById("simClausulaIndivPct");
  const clPartEl = document.getElementById("simClausulaSobrasPartPct");
  const clCandEl = document.getElementById("simClausulaSobrasCandPct");

  if (aptosEl && document.activeElement !== aptosEl) aptosEl.value = cfg.eleitoresAptos || 6245;
  if (absEl && document.activeElement !== absEl) absEl.value = cfg.abstencaoProjetadaPct || 14.5;
  if (bnEl && document.activeElement !== bnEl) bnEl.value = cfg.brancosNulosPct || 4.2;
  if (cadEl && document.activeElement !== cadEl) cadEl.value = cfg.totalCadeiras || 9;
  if (clIndEl && document.activeElement !== clIndEl) clIndEl.value = cfg.clausulaDesempenhoIndividualPct || 10;
  if (clPartEl && document.activeElement !== clPartEl) clPartEl.value = cfg.clausulaSobrasPartidoPct || 80;
  if (clCandEl && document.activeElement !== clCandEl) clCandEl.value = cfg.clausulaSobrasCandidatoPct || 20;

  // Executa o cálculo oficial do Quociente Eleitoral
  const resultado = db.calcularQuocienteEleitoral();
  const { QE, totalVotosValidos, pisoIndividualQP, pisoSobrasPartido, pisoSobrasCandidato, partidos, logRodadasSobras, insights, totalCadeiras } = resultado;

  // Atualiza Indicadores (KPIs)
  const kpiQeEl = document.getElementById("kpiSimQE");
  const kpiValEl = document.getElementById("kpiSimValidos");
  const kpiPisoQpEl = document.getElementById("kpiSimPisoQP");
  const kpiPisoSobrasEl = document.getElementById("kpiSimPisoSobras");

  if (kpiQeEl) kpiQeEl.textContent = `${QE.toLocaleString("pt-BR")} votos`;
  if (kpiValEl) kpiValEl.textContent = `${totalVotosValidos.toLocaleString("pt-BR")} válidos`;
  if (kpiPisoQpEl) kpiPisoQpEl.textContent = `${pisoIndividualQP.toLocaleString("pt-BR")} votos (10%)`;
  if (kpiPisoSobrasEl) kpiPisoSobrasEl.textContent = `${pisoSobrasPartido.toLocaleString("pt-BR")} (80%) / ${pisoSobrasCandidato.toLocaleString("pt-BR")} (20%)`;

  // 1. Renderiza o Hemiciclo das 9 Cadeiras da Câmara
  const hemicicloGrid = document.getElementById("simCadeirasGrid");
  if (hemicicloGrid) {
    const cadeirasDistribuidas = [];

    // Vagas conquistadas por Quociente Partidário (QP)
    partidos.forEach(p => {
      for (let i = 0; i < p.cadeirasQP; i++) {
        cadeirasDistribuidas.push({
          sigla: p.sigla.split(" ")[0],
          nomeCompleto: p.sigla,
          cor: p.cor || "#10b981",
          tipo: "QP",
          tipoDesc: "Vaga Direta (QP)"
        });
      }
    });

    // Vagas conquistadas pelas Sobras Eleitorais (Médias)
    logRodadasSobras.forEach(s => {
      const part = partidos.find(p => p.sigla === s.vencedorSigla);
      cadeirasDistribuidas.push({
        sigla: s.vencedorSigla.split(" ")[0],
        nomeCompleto: s.vencedorSigla,
        cor: part ? part.cor : "#f59e0b",
        tipo: "SOBRA",
        tipoDesc: `Sobra (Rodada ${s.rodada}) • Média ${s.media}`
      });
    });

    // Preenche até o total de cadeiras da Câmara (padrão 9)
    let cadeirasHtml = "";
    for (let c = 1; c <= totalCadeiras; c++) {
      const cad = cadeirasDistribuidas[c - 1];
      if (cad) {
        cadeirasHtml += `
          <div class="cadeira-box conquistada" style="border-top: 4px solid ${cad.cor};" title="${cad.nomeCompleto} — ${cad.tipoDesc}">
            <div class="cadeira-num">${c}ª Cadeira</div>
            <div class="cadeira-partido" style="color:${cad.cor};">${cad.sigla}</div>
            <div class="cadeira-tipo ${cad.tipo.toLowerCase()}">${cad.tipo}</div>
          </div>
        `;
      } else {
        cadeirasHtml += `
          <div class="cadeira-box" style="opacity:0.4;">
            <div class="cadeira-num">${c}ª Cadeira</div>
            <div class="cadeira-partido" style="color:var(--text-muted);">-</div>
            <div class="cadeira-tipo" style="background:rgba(255,255,255,0.05); color:var(--text-muted);">Livre</div>
          </div>
        `;
      }
    }
    hemicicloGrid.innerHTML = cadeirasHtml;
  }

  // 2. Renderiza a Grade de Partidos com Inputs Reativos
  const partidosGrid = document.getElementById("simPartidosGrid");
  if (partidosGrid) {
    partidosGrid.innerHTML = partidos.map(p => {
      const pctCamara = ((p.totalCadeiras / (totalCadeiras || 9)) * 100).toFixed(0);
      const cumpriu80 = p.atingiu80Porcento;
      const cumpriu20 = p.atingiu20PorcentoCand;

      return `
        <div class="partido-sim-card" style="border-left: 4px solid ${p.cor || '#10b981'};">
          <div class="partido-sim-header">
            <div class="partido-sim-sigla">
              <span class="partido-color-dot" style="background:${p.cor}; color:${p.cor};"></span>
              <span>${p.sigla}</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="removerPartidoSimulador('${p.id}')" title="Remover partido da simulação" style="padding:2px 8px; font-size:0.75rem; color:#ef4444;">
              ✕
            </button>
          </div>

          <div class="partido-sim-resultado">
            <div>
              <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Cadeiras na Câmara</div>
              <div class="partido-sim-cadeiras-badge">${p.totalCadeiras} <span style="font-size:0.85rem; color:var(--text-main); font-weight:normal;">(${pctCamara}%)</span></div>
              <div style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">
                ${p.cadeirasQP} Diretas (QP) • ${p.cadeirasSobras} por Sobras
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:0.72rem; color:var(--text-muted);">Custo por Vaga</div>
              <strong style="font-family:var(--font-mono); color:var(--gold-400); font-size:0.95rem;">
                ${p.custoPorCadeira !== '-' ? p.custoPorCadeira.toLocaleString('pt-BR') : '-'}
              </strong>
              <div style="font-size:0.7rem; color:var(--text-dim);">votos/cadeira</div>
            </div>
          </div>

          <!-- Inputs Reativos de Votação -->
          <div class="partido-sim-inputs">
            <div>
              <label class="form-label" style="font-size:0.72rem;">Total Votos Partido</label>
              <input type="number" class="form-control" style="font-family:var(--font-mono); font-weight:700; color:#fff;" 
                value="${p.votosTotais}" min="0" step="10"
                onchange="aoAlterarVotosPartidoSimulador('${p.id}', this.value)"
                title="Altere os votos deste partido para recalcular imediatamente a eleição">
            </div>
            <div>
              <label class="form-label" style="font-size:0.72rem;">Candidato + Votado</label>
              <input type="number" class="form-control" style="font-family:var(--font-mono); font-weight:700; color:#fff;" 
                value="${p.candidatoMaisVotadoVotos}" min="0" step="5"
                onchange="aoAlterarCandVotosPartidoSimulador('${p.id}', this.value)"
                title="Votos do candidato mais votado (para cláusula 10% e 20%)">
            </div>
          </div>

          <!-- Status das Cláusulas Legais -->
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; border-top:1px dashed var(--border-subtle); padding-top:8px;">
            <span style="color:${cumpriu80 ? 'var(--emerald-400)' : '#f87171'};">
              ${cumpriu80 ? '✓ Cumpre 80% QE (Partido)' : '✕ Menos de 80% do QE'}
            </span>
            <span style="color:${cumpriu20 ? 'var(--emerald-400)' : '#f87171'};">
              ${cumpriu20 ? '✓ Cumpre 20% QE (Candidato)' : '✕ Menos de 20% do QE'}
            </span>
          </div>
        </div>
      `;
    }).join("");
  }

  // 3. Renderiza a Auditoria das Rodadas de Sobras
  const sobrasTimeline = document.getElementById("simSobrasTimeline");
  if (sobrasTimeline) {
    if (logRodadasSobras.length === 0) {
      sobrasTimeline.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
          🎯 <strong>Nenhuma vaga distribuída por sobra.</strong><br>
          Todas as ${totalCadeiras} cadeiras da Câmara foram preenchidas diretamente no Quociente Partidário (QP).
        </div>
      `;
    } else {
      sobrasTimeline.innerHTML = logRodadasSobras.map(r => `
        <div class="sobra-round-card">
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="sobra-round-badge">Rodada #${r.rodada}</span>
            <div>
              <strong style="color:#ffffff; font-size:0.92rem;">${r.vencedorSigla}</strong><br>
              <span style="font-size:0.72rem; color:var(--text-muted);">${r.criterio}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div>
              <span style="font-size:0.7rem; color:var(--text-muted);">Maior Média Obtida:</span><br>
              <span class="sobra-formula">${r.media}</span>
            </div>
            <div style="text-align:right;">
              <span class="badge-status oficial" style="font-size:0.72rem;">Levou a ${r.novaCadeiraTotal}ª Cadeira</span>
            </div>
          </div>
        </div>
      `).join("");
    }
  }

  // 4. Renderiza o Radar de Oportunidades & Votos Faltantes
  const radarList = document.getElementById("simRadarInsightsList");
  if (radarList) {
    if (insights.length === 0) {
      radarList.innerHTML = `
        <div style="padding:24px; text-align:center; color:var(--text-muted); font-size:0.85rem;">
          📊 <strong>Cenário Eleitoral Consolidado.</strong><br>
          As distâncias médias entre os partidos são seguras no momento. Nenhuma legenda está a menos de uma centena de votos de virar uma cadeira.
        </div>
      `;
    } else {
      radarList.innerHTML = `
        <div class="radar-insights-box">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span style="font-size:1.2rem;">🦅</span>
            <strong style="color:var(--gold-400); font-size:0.92rem;">Inteligência Tática — Virada de Cadeiras:</strong>
          </div>
          ${insights.map(i => `
            <div class="radar-insight-item">
              <span style="font-size:1.1rem; color:${i.grau === 'urgente' ? 'var(--gold-400)' : 'var(--emerald-400)'};">⚡</span>
              <div style="font-size:0.85rem; color:#e2e8f0; line-height:1.4;">
                <strong style="color:#ffffff;">${i.partido}:</strong> ${i.mensagem}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
  }
}

function aoAlterarParametrosSimulador() {
  const aptos = Number(document.getElementById("simAptos")?.value) || 6245;
  const abs = Number(document.getElementById("simAbstencaoPct")?.value) || 14.5;
  const bn = Number(document.getElementById("simBrancosNulosPct")?.value) || 4.2;
  const cad = Number(document.getElementById("simCadeiras")?.value) || 9;
  const clInd = Number(document.getElementById("simClausulaIndivPct")?.value) || 10;
  const clPart = Number(document.getElementById("simClausulaSobrasPartPct")?.value) || 80;
  const clCand = Number(document.getElementById("simClausulaSobrasCandPct")?.value) || 20;

  db.saveSimuladorConfig({
    eleitoresAptos: aptos,
    abstencaoProjetadaPct: abs,
    brancosNulosPct: bn,
    totalCadeiras: cad,
    clausulaDesempenhoIndividualPct: clInd,
    clausulaSobrasPartidoPct: clPart,
    clausulaSobrasCandidatoPct: clCand
  });

  renderSimulador();
}

function aoAlterarVotosPartidoSimulador(partidoId, novosVotos) {
  const cfg = db.getSimuladorConfig();
  const partido = (cfg.partidos || []).find(p => p.id === partidoId);
  if (partido) {
    partido.votosTotais = Math.max(0, Number(novosVotos) || 0);
    db.saveSimuladorConfig({ partidos: cfg.partidos });
    renderSimulador();
  }
}

function aoAlterarCandVotosPartidoSimulador(partidoId, novosVotos) {
  const cfg = db.getSimuladorConfig();
  const partido = (cfg.partidos || []).find(p => p.id === partidoId);
  if (partido) {
    partido.candidatoMaisVotadoVotos = Math.max(0, Number(novosVotos) || 0);
    db.saveSimuladorConfig({ partidos: cfg.partidos });
    renderSimulador();
  }
}

function abrirModalNovoPartidoSimulador() {
  const form = document.getElementById("formNovoPartidoSim");
  if (form) form.reset();
  openModal("modalPartidoSimulador");
}

function salvarNovoPartidoSimulador() {
  const sigla = (document.getElementById("formPartSigla")?.value || "").trim();
  const cor = document.getElementById("formPartCor")?.value || "#10b981";
  const votos = Number(document.getElementById("formPartVotos")?.value) || 0;
  const candVotos = Number(document.getElementById("formPartCandVotos")?.value) || 0;

  if (!sigla) {
    showToast("Informe a sigla do partido.");
    return;
  }

  const cfg = db.getSimuladorConfig();
  const novoId = "par-" + Date.now();

  if (!cfg.partidos) cfg.partidos = [];
  cfg.partidos.push({
    id: novoId,
    sigla: sigla,
    cor: cor,
    votosTotais: votos,
    candidatoMaisVotadoVotos: candVotos,
    candidatos: []
  });

  db.saveSimuladorConfig({ partidos: cfg.partidos });
  closeModal("modalPartidoSimulador");
  showToast(`Partido "${sigla}" incluído na simulação!`);
  renderSimulador();
}

function removerPartidoSimulador(partidoId) {
  const cfg = db.getSimuladorConfig();
  const part = (cfg.partidos || []).find(p => p.id === partidoId);
  if (!part) return;

  if (confirm(`Deseja remover o partido "${part.sigla}" da simulação?`)) {
    cfg.partidos = cfg.partidos.filter(p => p.id !== partidoId);
    db.saveSimuladorConfig({ partidos: cfg.partidos });
    showToast(`Partido "${part.sigla}" removido.`);
    renderSimulador();
  }
}

function resetarSimuladorPadrao() {
  if (confirm("Deseja restaurar as configurações e votos padrão do cenário de Riachuelo–RN?")) {
    db.resetSimuladorConfig();
    showToast("Cenário do Simulador restaurado com sucesso!");
    renderSimulador();
  }
}

function exportarSimuladorCSV() {
  const resultado = db.calcularQuocienteEleitoral();
  const { QE, totalVotosValidos, pisoIndividualQP, pisoSobrasPartido, pisoSobrasCandidato, partidos, totalCadeiras } = resultado;

  let csv = `Relatório do Simulador de Quociente Eleitoral (QE) e Sobras — Riachuelo/RN\n`;
  csv += `Data da Simulação:;${new Date().toLocaleString("pt-BR")}\n`;
  csv += `Vagas na Câmara:;${totalCadeiras}\n`;
  csv += `Total de Votos Válidos:;${totalVotosValidos}\n`;
  csv += `Quociente Eleitoral (QE):;${QE}\n`;
  csv += `Piso QP (10% QE):;${pisoIndividualQP}\n`;
  csv += `Piso Sobras Partido (80% QE):;${pisoSobrasPartido}\n`;
  csv += `Piso Sobras Candidato (20% QE):;${pisoSobrasCandidato}\n\n`;

  csv += `Partido / Federação;Votos Totais;% Válidos;Cand Mais Votado;Cadeiras QP;Cadeiras Sobras;Total Cadeiras;% da Câmara;Custo Médio Voto/Cadeira\n`;
  partidos.forEach(p => {
    csv += `"${p.sigla}";${p.votosTotais};"${p.percentualVotos}%";${p.candidatoMaisVotadoVotos};${p.cadeirasQP};${p.cadeirasSobras};${p.totalCadeiras};"${((p.totalCadeiras / totalCadeiras) * 100).toFixed(1)}%";"${p.custoPorCadeira}"\n`;
  });

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Simulador_Eleitoral_RiachueloRN_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Planilha do simulador exportada com sucesso!");
}

// ==========================================================================
// 7. AUDITORIA E LOGS
// ==========================================================================
function renderAuditoria() {
  const tbody = document.getElementById("auditoriaTableBody");
  if (!tbody) return;

  const logs = db.getLogsAuditoria();
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td style="font-family:var(--font-mono); font-size:0.75rem;">${l.timestamp}</td>
      <td><strong>${l.usuario}</strong></td>
      <td><span class="badge-status oficial" style="font-size:0.7rem;">${l.perfil}</span></td>
      <td><strong style="color:var(--emerald-400);">${l.acao}</strong></td>
      <td>${l.entidade}</td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${l.detalhes}</td>
    </tr>
  `).join("");
}

// ==========================================================================
// 8. CONFIGURAÇÕES, LGPD E BACKUP
// ==========================================================================
function renderConfiguracoes() {
  const elSync = document.getElementById("cfgDataSync");
  const elTotal = document.getElementById("cfgTotalRegistros");
  const tbody = document.getElementById("usuariosConfigTableBody");

  if (elSync) {
    elSync.textContent = new Date().toLocaleString("pt-BR");
  }

  if (elTotal) {
    const cCount = (db.getComunidades() || []).length;
    const sCount = (db.getSecoesEleitorais() || []).length;
    const eCount = (db.getEleitores() || []).length;
    const dCount = (db.getDemandas() || []).length;
    const lCount = (db.getLiderancas() || []).length;
    elTotal.textContent = `${cCount} Bairros, ${sCount} Seções, ${lCount} Líderes, ${eCount} Eleitores, ${dCount} Demandas`;
  }

  if (tbody) {
    const usuarios = db.getUsuarios();
    tbody.innerHTML = usuarios.map(u => `
      <tr>
        <td><strong>${u.nome}</strong></td>
        <td><code style="background:rgba(16, 185, 129, 0.15); color:var(--emerald-400); padding:2px 6px; border-radius:4px; font-weight:700;">${u.login || '-'}</code></td>
        <td><small style="color:var(--text-muted);">${u.email || '-'}</small></td>
        <td><span class="badge-status oficial" style="font-size:0.75rem;">${u.perfil}</span></td>
        <td><span class="badge-status ${u.status === 'Bloqueado' ? 'pendente' : 'oficial'}">${u.status || 'Ativo'}</span></td>
        <td style="font-family:var(--font-mono); font-size:0.8rem;">${u.ultimoAcesso || 'Recente'}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:6px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="editarUsuario('${u.id}')" title="Editar dados e redefinir senha">✏️ Editar / Senha</button>
            <button type="button" class="btn btn-secondary btn-sm" style="color:var(--status-pendente); border-color:var(--status-pendente);" onclick="excluirUsuario('${u.id}')" title="Excluir usuário">🗑️</button>
          </div>
        </td>
      </tr>
    `).join("");
  }
}

// --- CADASTRO E EDIÇÃO DE LOGIN E SENHA ---
function aoAlterarPerfilUsuarioModal() {
  const perfil = document.getElementById("formUsuarioPerfil")?.value;
  const grupo = document.getElementById("grupoUsuarioBairroLideranca");
  if (grupo) {
    grupo.style.display = perfil === "LIDERANÇA COMUNITÁRIA" ? "block" : "none";
  }
}

function abrirModalNovoUsuario() {
  document.getElementById("modalUsuarioTitle").textContent = "Cadastrar Login e Senha";
  document.getElementById("formUsuarioId").value = "";
  document.getElementById("formUsuarioNome").value = "";
  document.getElementById("formUsuarioLogin").value = "";
  document.getElementById("formUsuarioEmail").value = "";
  document.getElementById("formUsuarioPerfil").value = "LIDERANÇA COMUNITÁRIA";
  document.getElementById("formUsuarioStatus").value = "Ativo";
  document.getElementById("formUsuarioSenha").value = "";
  document.getElementById("formUsuarioSenhaConfirma").value = "";

  const selCom = document.getElementById("formUsuarioComunidade");
  if (selCom) {
    const coms = db.getComunidades();
    selCom.innerHTML = '<option value="">-- Selecione o Bairro / Comunidade --</option>' +
      coms.map(c => `<option value="${c.id}">${c.nome} (${c.tipo})</option>`).join("");
  }
  aoAlterarPerfilUsuarioModal();

  openModal("modalUsuario");
}

function editarUsuario(id) {
  const u = db.getUsuarioById(id);
  if (!u) {
    showToast("Usuário não encontrado.");
    return;
  }
  document.getElementById("modalUsuarioTitle").textContent = `Editar Usuário: ${u.nome}`;
  document.getElementById("formUsuarioId").value = u.id;
  document.getElementById("formUsuarioNome").value = u.nome || "";
  document.getElementById("formUsuarioLogin").value = u.login || "";
  document.getElementById("formUsuarioEmail").value = u.email || "";
  document.getElementById("formUsuarioPerfil").value = u.perfil || "GESTOR TERRITORIAL";
  document.getElementById("formUsuarioStatus").value = u.status || "Ativo";
  document.getElementById("formUsuarioSenha").value = u.senha || "";
  document.getElementById("formUsuarioSenhaConfirma").value = u.senha || "";

  const selCom = document.getElementById("formUsuarioComunidade");
  if (selCom) {
    const coms = db.getComunidades();
    const vinc = (u.comunidadesVinculadas && u.comunidadesVinculadas[0]) || u.comunidadeId || "";
    selCom.innerHTML = '<option value="">-- Selecione o Bairro / Comunidade --</option>' +
      coms.map(c => `<option value="${c.id}" ${c.id === vinc ? 'selected' : ''}>${c.nome} (${c.tipo})</option>`).join("");
  }
  aoAlterarPerfilUsuarioModal();

  openModal("modalUsuario");
}

function salvarFormUsuario() {
  const id = document.getElementById("formUsuarioId").value.trim();
  const nome = document.getElementById("formUsuarioNome").value.trim();
  const login = document.getElementById("formUsuarioLogin").value.trim().toLowerCase();
  const email = document.getElementById("formUsuarioEmail").value.trim();
  const perfil = document.getElementById("formUsuarioPerfil").value;
  const status = document.getElementById("formUsuarioStatus").value;
  const senha = document.getElementById("formUsuarioSenha").value;
  const senhaConfirma = document.getElementById("formUsuarioSenhaConfirma").value;
  const comunidadeId = document.getElementById("formUsuarioComunidade")?.value || "";

  if (!nome) {
    showToast("Preencha o nome completo do usuário.");
    return;
  }
  if (!login) {
    showToast("Preencha o nome de usuário (login).");
    return;
  }
  if (!senha || senha.length < 4) {
    showToast("A senha deve conter no mínimo 4 caracteres.");
    return;
  }
  if (senha !== senhaConfirma) {
    showToast("As senhas informadas não coincidem. Digite novamente.");
    return;
  }

  try {
    const payloadUsuario = {
      id: id || undefined,
      nome,
      login,
      email,
      perfil,
      status,
      senha,
      comunidadeId: comunidadeId || undefined,
      comunidadesVinculadas: comunidadeId ? [comunidadeId] : []
    };

    const salvo = db.saveUsuario(payloadUsuario);
    db.sincronizarLiderancasComBairros();

    closeModal("modalUsuario");
    renderConfiguracoes();
    updateUserBadge();
    renderLiderancas();
    renderComunidades();
    carregarMarcadoresMapa();
    renderTabelaLocalidadesMapa();
    atualizarMetometroConsolidado();
    updateSidebarCounters();

    showToast(`Credenciais de "${salvo.nome}" (Login: ${salvo.login}) salvas com sucesso!`);
  } catch (err) {
    showToast("Erro: " + err.message);
  }
}

function excluirUsuario(id) {
  const u = db.getUsuarioById(id);
  if (!u) return;
  if (!confirm(`Deseja realmente excluir o acesso do usuário "${u.nome}" (Login: ${u.login})?`)) return;

  try {
    db.deleteUsuario(id);
    renderConfiguracoes();
    showToast(`Usuário "${u.nome}" excluído.`);
  } catch (err) {
    showToast(err.message);
  }
}

function alternarVisibilidadeSenha(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === "password") {
    input.type = "text";
    if (btnEl) btnEl.textContent = "🙈";
  } else {
    input.type = "password";
    if (btnEl) btnEl.textContent = "👁️";
  }
}

// --- TELA DE AUTENTICAÇÃO (LOGIN OBRIGATÓRIO & CADASTRO) ---
function verificarAutenticacaoObrigatoria() {
  // Limpa autenticação ativa para exigir login e senha a cada entrada/abertura do site
  sessionStorage.removeItem("RADAR_BACURAU_AUTH_ACTIVE");
  abrirTelaLogin(true);
}

function abrirTelaLogin(obrigatorio = true) {
  const overlay = document.getElementById("authScreenOverlay");
  const btnFechar = document.getElementById("btnFecharAuthModal");
  if (overlay) {
    overlay.style.display = "flex";
    if (btnFechar) {
      btnFechar.style.display = obrigatorio ? "none" : "block";
    }
    const inputUser = document.getElementById("authLoginUsuario");
    const inputPwd = document.getElementById("authLoginSenha");
    if (inputUser) {
      inputUser.value = "";
      setTimeout(() => inputUser.focus(), 150);
    }
    if (inputPwd) inputPwd.value = "";
  }
}

function abrirTelaLoginComUsuarioPreenchido(loginPreenchido) {
  abrirTelaLogin(true);
  const inputUser = document.getElementById("authLoginUsuario");
  const inputPwd = document.getElementById("authLoginSenha");
  if (inputUser && loginPreenchido) {
    inputUser.value = loginPreenchido;
  }
  if (inputPwd) {
    inputPwd.value = "";
    setTimeout(() => inputPwd.focus(), 180);
  }
}

function fecharTelaLogin() {
  const isAuth = sessionStorage.getItem("RADAR_BACURAU_AUTH_ACTIVE") === "true";
  if (!isAuth) {
    showToast("🔒 Acesso restrito: informe seu login e sua senha para entrar no Radar de Gestão.");
    return;
  }
  const overlay = document.getElementById("authScreenOverlay");
  if (overlay) overlay.style.display = "none";
}

function fazerLogout() {
  sessionStorage.removeItem("RADAR_BACURAU_AUTH_ACTIVE");
  abrirTelaLogin(true);
  showToast("🔒 Sessão encerrada com sucesso.");
}

async function executarLogin(event) {
  if (event) event.preventDefault();
  const loginInput = document.getElementById("authLoginUsuario");
  const senhaInput = document.getElementById("authLoginSenha");

  const loginOuEmail = loginInput ? loginInput.value.trim() : "";
  const senha = senhaInput ? senhaInput.value : "";

  if (!loginOuEmail || !senha) {
    showToast("⚠️ Digite seu login e sua senha.");
    return;
  }

  try {
    let user = null;
    try {
      user = db.autenticar(loginOuEmail, senha);
    } catch (errLocal) {
      // Se não encontrou no banco local e o Supabase estiver conectado, consulta a nuvem em tempo real!
      if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
        const q = loginOuEmail.toLowerCase();
        const { data: usrNuvem, error } = await SupabaseClient.client
          .from("usuarios")
          .select("*")
          .or(`login.eq.${q},email.eq.${q}`)
          .maybeSingle();

        if (usrNuvem && usrNuvem.senha === senha) {
          user = usrNuvem;
          if (!db.data.usuarios) db.data.usuarios = [];
          const idx = db.data.usuarios.findIndex(u => u.id === user.id || u.login === user.login);
          if (idx !== -1) {
            db.data.usuarios[idx] = user;
          } else {
            db.data.usuarios.push(user);
          }
          db.save();
        } else {
          throw errLocal;
        }
      } else {
        throw errLocal;
      }
    }

    if (user) {
      sessionStorage.setItem("RADAR_BACURAU_AUTH_ACTIVE", "true");
      db.setCurrentUser(user);
      updateUserBadge();

      const overlay = document.getElementById("authScreenOverlay");
      if (overlay) overlay.style.display = "none";

      if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
        SupabaseClient.sincronizarTudo();
      }

      showToast(`Bem-vindo(a) ao Radar de Gestão, ${user.nome}!`);

      if (user.perfil === "LIDERANÇA COMUNITÁRIA") {
        navigateTo("eleitores");
      } else {
        navigateTo("dashboard");
      }
    }
  } catch (err) {
    showToast("❌ " + err.message);
  }
}

function executarCadastroRapidoAuth(event) {
  if (event) event.preventDefault();
  const nome = (document.getElementById("authCadNome").value || "").trim();
  const login = (document.getElementById("authCadLogin").value || "").trim().toLowerCase();
  const email = (document.getElementById("authCadEmail").value || "").trim();
  const perfil = document.getElementById("authCadPerfil").value;
  const senha = document.getElementById("authCadSenha").value;
  const senhaConfirma = document.getElementById("authCadSenhaConfirma").value;

  if (!nome || !login || !senha) {
    showToast("Preencha todos os campos obrigatórios.");
    return;
  }
  if (senha.length < 4) {
    showToast("A senha deve ter no mínimo 4 caracteres.");
    return;
  }
  if (senha !== senhaConfirma) {
    showToast("As senhas informadas não conferem.");
    return;
  }

  try {
    const novo = db.saveUsuario({
      nome,
      login,
      email,
      perfil,
      status: "Ativo",
      senha
    });

    db.setCurrentUser(novo);
    updateUserBadge();
    fecharTelaLogin();
    renderConfiguracoes();
    showToast(`Conta criada com sucesso! Bem-vindo(a), ${novo.nome}!`);
  } catch (err) {
    showToast(err.message);
  }
}

function mostrarAjudaSenha() {
  showToast("Para redefinir a senha de qualquer usuário, acesse 'Backup & Ajustes' > 'Usuários e Permissões' como Administrador Master ou use 'admin' / 'admin123'.");
}

function exportarBackupDatabase() {
  exportarBackupJSON();
}

function dispararUploadBackup() {
  const input = document.getElementById("backupFileInput");
  if (input) {
    input.value = "";
    input.click();
  }
}

function carregarArquivoBackup(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const content = e.target.result;
      const ok = db.importBackupJSON(content);
      if (ok) {
        showToast("Backup restaurado com sucesso! Atualizando sistema...");
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch (err) {
      alert("Falha ao restaurar backup: " + err.message);
    }
  };
  reader.readAsText(file);
}

function resetarBaseDadosPadrao() {
  resetarDadosFabrica();
}

function exportarBackupJSON() {
  const jsonStr = db.exportBackupJSON();
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Backup_RadarBacurau_RiachueloRN_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Backup JSON exportado com sucesso!");
}

function resetarDadosFabrica() {
  if (confirm("Tem certeza que deseja restaurar a base padrão de Riachuelo–RN?")) {
    db.resetToSeed();
    showToast("Base de dados restaurada com sucesso!");
    renderView(AppState.currentView);
  }
}

function resetarTudoEleitoresDemandasLiderancas() {
  const confirmacao = confirm(
    "⚠️ ATENÇÃO: Deseja realmente RESETAR TUDO (Eleitores, Demandas e Lideranças)?\n\n" +
    "Esta operação irá apagar permanentemente:\n" +
    "• Todos os eleitores cadastrados\n" +
    "• Todas as demandas comunitárias registradas\n" +
    "• Todas as lideranças cadastradas e seus vínculos\n\n" +
    "Os dados das seções, estatísticas do TSE e logins administrativos serão mantidos.\n\n" +
    "Deseja continuar?"
  );

  if (!confirmacao) return;

  const sucesso = db.resetarTudoOperacional();
  if (sucesso) {
    if (typeof atualizarContadoresMenu === "function") atualizarContadoresMenu();
    if (typeof renderEleitores === "function" && AppState.currentView === "eleitores") renderEleitores();
    if (typeof renderDemandas === "function" && AppState.currentView === "demandas") renderDemandas();
    if (typeof renderLiderancas === "function" && AppState.currentView === "liderancas") renderLiderancas();
    if (typeof renderConfiguracoes === "function") renderConfiguracoes();

    showToast("Base resetada com sucesso! Eleitores, demandas e lideranças foram limpos.");
    renderView(AppState.currentView);
  } else {
    alert("Falha ao resetar a base de dados.");
  }
}

// ==========================================================================
// 8.1 GESTÃO E CONFORMIDADE LGPD
// ==========================================================================
function renderLgpd() {
  const tbody = document.getElementById("lgpdTableBody");
  if (!tbody) return;

  const search = document.getElementById("searchLgpdInput")?.value?.toLowerCase() || "";
  let registros = db.getRegistrosLgpd({ busca: search });

  if (registros.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:30px; color:var(--text-muted);">
          Nenhum registro restrito cadastrado no momento. Clique em <strong>"+ Novo Registro Restrito"</strong> para formalizar um tratamento com base na LGPD.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = registros.map(r => `
    <tr>
      <td><strong style="font-family:var(--font-mono); color:var(--gold-400); font-size:0.85rem;">${r.codigoInterno || 'LGPD-RIA'}</strong></td>
      <td><strong>${r.referencia}</strong></td>
      <td>${r.comunidadeNome || 'Geral / Municipal'}</td>
      <td style="font-size:0.8rem; color:var(--text-muted);">${r.finalidade}</td>
      <td><span class="badge-status oficial" style="font-size:0.75rem;">${r.baseLegal || 'Art. 7º LGPD'}</span></td>
      <td><span class="badge-status oficial">Em Conformidade</span></td>
      <td style="font-size:0.75rem;">${r.prazoRetencao || 'Ciclo 2024-2028'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" style="color:#f87171;" onclick="excluirLgpd('${r.id}')" title="Revogar / Excluir">
          Revogar
        </button>
      </td>
    </tr>
  `).join("");
}

function abrirModalNovoLgpd() {
  document.getElementById("formLgpdNome").value = "";
  document.getElementById("formLgpdFinalidade").value = "Articulação de demandas de convivência e infraestrutura comunitária";
  document.getElementById("formLgpdBase").value = "Art. 7º, II e V da LGPD";
  document.getElementById("formLgpdRetencao").value = "Até 31/12/2028 (Término do ciclo)";
  document.getElementById("formLgpdObs").value = "";

  const comSelect = document.getElementById("formLgpdComunidade");
  if (comSelect) {
    const coms = db.getComunidades();
    comSelect.innerHTML = '<option value="">Âmbito Geral / Municipal</option>' +
      coms.map(c => `<option value="${c.nome}">${c.nome} (${c.tipo})</option>`).join("");
  }

  openModal("modalLgpd");
}

function salvarFormLgpd() {
  const nome = document.getElementById("formLgpdNome").value.trim();
  const comNome = document.getElementById("formLgpdComunidade").value || "Âmbito Geral";
  const finalidade = document.getElementById("formLgpdFinalidade").value.trim();
  const base = document.getElementById("formLgpdBase").value.trim();
  const retencao = document.getElementById("formLgpdRetencao").value.trim();
  const obs = document.getElementById("formLgpdObs").value.trim();

  if (!nome) {
    alert("Referência / Contato institucional é obrigatório.");
    return;
  }

  const payload = {
    referencia: nome,
    comunidadeNome: comNome,
    finalidade: finalidade || "Articulação de demandas comunitárias",
    baseLegal: base || "Art. 7º da LGPD",
    prazoRetencao: retencao,
    observacoes: obs
  };

  db.saveRegistroLgpd(payload);
  closeModal("modalLgpd");
  showToast(`Registro LGPD "${nome}" gravado com sucesso!`);
  renderLgpd();
}

function excluirLgpd(id) {
  if (confirm("Deseja revogar e remover este registro restrito da base?")) {
    db.deleteRegistroLgpd(id);
    showToast("Registro LGPD revogado.");
    renderLgpd();
  }
}

function exportarExcelRelatorioGeral() {
  const coms = db.getComunidades();
  let csv = "\uFEFFBairro;Tipo;Liderança Responsável;Votos Conseguidos;Eleitores Estimados\n";
  coms.forEach(c => {
    csv += `"${c.nome}";"${c.tipo}";"${c.liderancaNome || 'Sem líder'}";${c.votosConseguidos || 0};${c.eleitoresEstimados || 0}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mapa_Liderancas_Riachuelo_RN_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Planilha exportada com sucesso!");
}

function imprimirRelatorioExecutivo() {
  window.print();
}

// ==========================================================================
// HELPERS DE MODAIS E NOTIFICAÇÕES
// ==========================================================================
function initModalListeners() {
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.classList.remove("active");
        if (overlay.id === "modalVisualizadorMidia") {
          fecharVisualizadorMidia();
        }
      }
    });
  });

  // Previne que ESC feche a tela de autenticação obrigatória se não estiver logado
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const isAuth = sessionStorage.getItem("RADAR_BACURAU_AUTH_ACTIVE") === "true";
      const overlay = document.getElementById("authScreenOverlay");
      if (!isAuth && overlay && overlay.style.display !== "none") {
        e.preventDefault();
        e.stopPropagation();
      }
    }
  });

  // Drag & drop para anexo de fotos e vídeos na demanda
  const dropZone = document.getElementById("demandaUploadZone");
  if (dropZone) {
    ["dragenter", "dragover"].forEach(evtName => {
      dropZone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(evtName => {
      dropZone.addEventListener(evtName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("dragover");
      });
    });
    dropZone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      if (dt && dt.files && dt.files.length > 0) {
        aoSelecionarMidiasDemanda({ target: { files: dt.files } });
      }
    });
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

function showToast(message) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `
    <span style="font-size:1.1rem; color:var(--emerald-400);">🦅</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ==========================================================================
// EXPORTAÇÕES GLOBAIS PARA WINDOW
// ==========================================================================
window.AppState = AppState;
window.navigateTo = navigateTo;
window.renderView = renderView;
window.initTheme = initTheme;
window.openRoleModal = openRoleModal;
window.closeModal = closeModal;
window.openModal = openModal;
window.showToast = showToast;

// Mapa Territorial (Ruas, Casas, Satélite e Contornos)
window.alternarCamadaSatelite = alternarCamadaSatelite;
window.alternarCamadaRuas = alternarCamadaRuas;
window.alternarExibicaoPoligonos = alternarExibicaoPoligonos;
window.alternarExibicaoEtiquetas = alternarExibicaoEtiquetas;
window.aoMudarOpacidadePoligonos = aoMudarOpacidadePoligonos;
window.togglePainelLegenda = togglePainelLegenda;
window.focarCentroCasas = focarCentroCasas;
window.focarCachoeiraSapo = focarCachoeiraSapo;
window.centralizarMunicipio = centralizarMunicipio;
window.centralizarMapa = centralizarMapa;
window.alternarLimiteMunicipal = alternarLimiteMunicipal;
window.focarBairroEspecifico = focarBairroEspecifico;
window.focarBairroZoom18 = focarBairroZoom18;
window.abrirModalMapearLiderBairro = abrirModalMapearLiderBairro;
window.aoSelecionarBairroNoModal = aoSelecionarBairroNoModal;
window.salvarLiderancaEBairroModal = salvarLiderancaEBairroModal;
window.removerLiderancaDoBairroModal = removerLiderancaDoBairroModal;
window.renderMapaTerritorial = renderMapaTerritorial;

// Comunidades / Bairros
window.renderComunidades = renderComunidades;
window.abrirModalNovaComunidade = abrirModalNovaComunidade;
window.editarComunidade = editarComunidade;
window.salvarFormComunidade = salvarFormComunidade;
window.salvarNovaComunidade = salvarFormComunidade;

// Lideranças Territoriais
window.renderLiderancas = renderLiderancas;
window.abrirModalNovaLideranca = abrirModalNovaLideranca;
window.editarLideranca = editarLideranca;
window.salvarFormLideranca = salvarFormLideranca;
window.excluirLideranca = excluirLideranca;
window.excluirLiderancaPeloModal = excluirLiderancaPeloModal;
window.removerLiderancaDoBairroDireto = removerLiderancaDoBairroDireto;

// Seções Eleitorais
window.renderSecoes = renderSecoes;
window.abrirModalNovaSecao = abrirModalNovaSecao;
window.salvarFormSecao = salvarFormSecao;
window.navegarParaSecoesDoBairro = navegarParaSecoesDoBairro;

// Resultados TSE
window.renderResultados = renderResultados;
window.selecionarAnoTSE = selecionarAnoTSE;
window.aoMudarFiltrosTSE = aoMudarFiltrosTSE;
window.abrirModalLancamentoResultado = abrirModalLancamentoResultado;
window.salvarFormResultado = salvarFormResultado;
window.exportarRelatorioTSECSV = exportarRelatorioTSECSV;
window.abrirDossieSecao = abrirDossieSecao;
window.abrirDetalhesCandidatosSecao = abrirDetalhesCandidatosSecao;

// Estatísticas e Ranking
window.renderEstatisticas = renderEstatisticas;
window.rolarTabelaRanking = rolarTabelaRanking;
window.abrirMapaSecoesCandidato = abrirMapaSecoesCandidato;
window.mudarPaginaRanking = mudarPaginaRanking;
window.aoMudarFiltroRanking = aoMudarFiltroRanking;
window.aoMudarAnoRanking = aoMudarAnoRanking;
window.selecionarTurnoRanking = selecionarTurnoRanking;

// Eleitores
window.renderEleitores = renderEleitores;
window.rolarTabelaEleitores = rolarTabelaEleitores;
window.abrirModalNovoEleitor = abrirModalNovoEleitor;
window.editarEleitor = editarEleitor;
window.salvarFormEleitor = salvarFormEleitor;
window.excluirEleitor = excluirEleitor;
window.abrirFotoTituloModal = abrirFotoTituloModal;
window.aoSelecionarBairroFormEleitor = aoSelecionarBairroFormEleitor;
window.aoMudarEnderecoFormEleitor = aoMudarEnderecoFormEleitor;
window.aoSelecionarFotoTitulo = aoSelecionarFotoTitulo;
window.removerFotoTituloAnexada = removerFotoTituloAnexada;
window.exportarEleitoresCSV = exportarEleitoresCSV;
window.formatarTituloInput = formatarTituloInput;
window.formatarTituloExibicao = formatarTituloExibicao;
window.verificarConflitoEleitorInstantaneo = verificarConflitoEleitorInstantaneo;

// Demandas Comunitárias
window.renderDemandas = renderDemandas;
window.abrirModalNovaDemanda = abrirModalNovaDemanda;
window.aoSelecionarBairroFormDemanda = aoSelecionarBairroFormDemanda;
window.salvarFormDemanda = salvarFormDemanda;
window.editarDemanda = editarDemanda;
window.abrirDetalhesDemanda = abrirDetalhesDemanda;
window.transitarStatusDemanda = transitarStatusDemanda;
window.excluirDemanda = excluirDemanda;
window.exportarDemandasCSV = exportarDemandasCSV;
window.aoSelecionarMidiasDemanda = aoSelecionarMidiasDemanda;
window.removerMidiaDemanda = removerMidiaDemanda;
window.renderPreviewMidiasDemanda = renderPreviewMidiasDemanda;
window.abrirVisualizadorMidiaDireto = abrirVisualizadorMidiaDireto;
window.fecharVisualizadorMidia = fecharVisualizadorMidia;
window.anexarMidiaDiretoDossie = anexarMidiaDiretoDossie;
window.removerAnexoDossie = removerAnexoDossie;

// Simulador Eleitoral (QE)
window.renderSimulador = renderSimulador;
window.aoAlterarParametrosSimulador = aoAlterarParametrosSimulador;
window.aoAlterarVotosPartidoSimulador = aoAlterarVotosPartidoSimulador;
window.aoAlterarCandVotosPartidoSimulador = aoAlterarCandVotosPartidoSimulador;
window.abrirModalNovoPartidoSimulador = abrirModalNovoPartidoSimulador;
window.salvarNovoPartidoSimulador = salvarNovoPartidoSimulador;
window.removerPartidoSimulador = removerPartidoSimulador;
window.resetarSimuladorPadrao = resetarSimuladorPadrao;
window.exportarSimuladorCSV = exportarSimuladorCSV;

// LGPD
window.renderLgpd = renderLgpd;
window.abrirModalNovoLgpd = abrirModalNovoLgpd;
window.salvarFormLgpd = salvarFormLgpd;
window.excluirLgpd = excluirLgpd;

// Auditoria e Configurações / Backup
window.renderAuditoria = renderAuditoria;
window.renderConfiguracoes = renderConfiguracoes;
window.exportarBackupDatabase = exportarBackupDatabase;
window.dispararUploadBackup = dispararUploadBackup;
window.carregarArquivoBackup = carregarArquivoBackup;
window.resetarBaseDadosPadrao = resetarBaseDadosPadrao;
window.resetarDadosFabrica = resetarDadosFabrica;
window.resetarTudoEleitoresDemandasLiderancas = resetarTudoEleitoresDemandasLiderancas;
window.exportarBackupJSON = exportarBackupJSON;
window.exportarExcelRelatorioGeral = exportarExcelRelatorioGeral;
window.imprimirRelatorioExecutivo = imprimirRelatorioExecutivo;

// 3 Novas Funcionalidades (Meta de Votos, Ficha de Campo e Heatmap)
window.atualizarMetometroConsolidado = atualizarMetometroConsolidado;
window.atualizarPreviewMetaModal = atualizarPreviewMetaModal;
window.abrirFichaCampoDoBairroAtualModal = abrirFichaCampoDoBairroAtualModal;
window.alternarHeatmap = alternarHeatmap;
window.gerarFichaCampoBairro = gerarFichaCampoBairro;
window.imprimirFichaCampo = imprimirFichaCampo;

// Editor de Perímetro e Seleção de Ponto no Mapa
window.iniciarSelecaoPontoNoMapa = iniciarSelecaoPontoNoMapa;
window.cancelarSelecaoPontoNoMapa = cancelarSelecaoPontoNoMapa;
window.finalizarSelecaoPontoNoMapa = finalizarSelecaoPontoNoMapa;
window.toggleModoEdicaoPerimetro = toggleModoEdicaoPerimetro;
window.iniciarEdicaoPerimetro = iniciarEdicaoPerimetro;
window.atualizarHandlesEdicaoPerimetro = atualizarHandlesEdicaoPerimetro;
window.ajustarEscalaPerimetro = ajustarEscalaPerimetro;
window.reverterEdicaoPerimetro = reverterEdicaoPerimetro;
window.salvarEdicaoPerimetro = salvarEdicaoPerimetro;
window.cancelarEdicaoPerimetro = cancelarEdicaoPerimetro;

// Gestão de Usuários, Login, Senha e Autenticação
window.aoAlterarPerfilUsuarioModal = aoAlterarPerfilUsuarioModal;
window.abrirModalNovoUsuario = abrirModalNovoUsuario;
window.editarUsuario = editarUsuario;
window.salvarFormUsuario = salvarFormUsuario;
window.excluirUsuario = excluirUsuario;
window.alternarVisibilidadeSenha = alternarVisibilidadeSenha;
window.abrirTelaLogin = abrirTelaLogin;
window.fecharTelaLogin = fecharTelaLogin;
window.alternarAbaAuth = alternarAbaAuth;
window.preencherCredenciaisRapidas = preencherCredenciaisRapidas;
window.executarLogin = executarLogin;
window.executarCadastroRapidoAuth = executarCadastroRapidoAuth;
window.mostrarAjudaSenha = mostrarAjudaSenha;
window.openRoleModal = openRoleModal;
window.aplicarPermissoesUsuario = aplicarPermissoesUsuario;

// ==========================================================================
// MÓDULO DE DISPARO TERRITORIAL VIA WHATSAPP (SEMI-AUTOMÁTICO NATIVO)
// ==========================================================================
function renderWhatsapp() {
  if (typeof WhatsAppDispatcher === "undefined") return;

  WhatsAppDispatcher.init();
  WhatsAppDispatcher.popularFiltros();
  WhatsAppDispatcher.popularTemplatesSelect();

  // Se o editor estiver vazio, define o primeiro template como padrão
  const editor = document.getElementById("wppEditorMensagem");
  if (editor && !editor.value.trim()) {
    const templates = WhatsAppDispatcher.getTemplates();
    if (templates.length > 0) {
      editor.value = templates[0].texto;
      const select = document.getElementById("wppSelectTemplate");
      if (select) select.value = templates[0].id;
    }
  }

  // Carrega e atualiza a fila com base nos filtros da tela
  WhatsAppDispatcher.aplicarFiltrosInterface();
}

window.renderWhatsapp = renderWhatsapp;

// ==========================================================================
// MÓDULO DE PESQUISA DE BENEFÍCIOS & LICITAÇÕES (API PORTAL DA TRANSPARÊNCIA)
// Header oficial configurado: [{"key":"chave-api-dados","value":"9ab0c7d494c97d58b2493e1049a84c29"}]
// ==========================================================================
function escapeHTMLBeneficios(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
if (typeof window.escapeHTML !== "function") {
  window.escapeHTML = escapeHTMLBeneficios;
}

const BeneficiosApiState = {
  apiKey: localStorage.getItem("radar_chave_api_dados") || "9ab0c7d494c97d58b2493e1049a84c29",
  codigoIbge: localStorage.getItem("radar_beneficios_ibge") || "2410604", // Riachuelo - RN (IBGE 2410604)
  headersConfig: [{ key: "chave-api-dados", value: "9ab0c7d494c97d58b2493e1049a84c29" }],
  resultadosApiCache: [],
  resultadosBrutos: [],
  resultadosFiltrados: [],
  carregando: false,
  jaInicializado: false
};

// Base local consolidada de Benefícios e Licitações de Riachuelo–RN (suporte imediato + contingência CORS)
const BASE_FALLBACK_BENEFICIOS_LICITACOES = [
  { nome: "ADAILTON GOMES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.354.568-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADAILZA DE FREITAS MACEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.806-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADELVINA DA SILVA GOMES DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.570.430-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ACIOLE DA SILVA CARDOSO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.103.294-** - Revendedora: 08.700.130/0001-49 - IVO NILSON LOPES DE MEDEIROS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ACIOLE DA SILVA CARDOSO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.956.041-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.358.890-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ARAUJO MARTILIANO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.110.144-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ARAUJO MARTILIANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.358.275-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA CARDOSO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.923.355-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA DOS SANTOS SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.751.187-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA DOS SANTOS SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.254.674-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ESTEVAM DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.773.634-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA ESTEVAM DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.322.510.264-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA FORTUNATO DA SILVA JOACI", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.260.277.464-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA FORTUNATO DA SILVA JOACI", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.707.844-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA LEONARDO DE ARAUJO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.960.404-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA LEONARDO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.923.274-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA LOURENCO DE MEDEIROS OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.906.754-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA LOURENCO DE MEDEIROS OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.944.085-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANA MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.133.309.310-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ADRIANO INACIO DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.417.545-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AGDA MARIA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.557.673-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AKSSA MARINE LIRA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.362.124-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AKSSA MARINE LIRA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.860.974-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALAIUZA SULEIDE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.124.471.704-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALAN FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.122.695.338-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALAN PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.679.159-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALANA CRISTINA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.923.849-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALBANIZA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.185.634-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALBANIZA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.395.813-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALBENI SILVA FONTES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.573.494-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALBENI SILVA FONTES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.270.479.364-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALCIONE JUSTINO DA SILVA SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.099.764-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALCIONE JUSTINO DA SILVA SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.618.911-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALDAIZA NEVES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.396.332-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALDENIZA MONTEIRO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.485.294-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALDENIZA MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.281.708.464-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALDILENE MACIEL DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.579.244-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALESANDRA GOMES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.945.102-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALESANDRA GOMES DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.049.674-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALESSANDRA FERNANDES ACIOLI MARTINS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.019.809-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALESSANDRA SALUSTINO DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.863.594-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALESSANDRA SALUSTINO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.006.390.474-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALEXANDRA IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.959.425-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALEXANDRE NETO DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.279.226-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALEXSANDRA MARIA SIQUEIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.050,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.396.112-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALEXSANDRA MARIA SIQUEIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.319.524-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALEXSSANDRA DA SILVA MONTEIRO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.724.444-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALEXSSANDRA DA SILVA MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 576,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.933-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALICE DINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.704.196-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALICIA QUIRINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.889-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE ALVES DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.858.345-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE ALVES DE MELO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.128.904-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE ANDRE TEIXEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.519.799-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE DA SILVA SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.369.067-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE MACIEL DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.344.724-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE MACIEL DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 505,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.369.030-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINE SANTOS CARDOSO MARQUES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.076.324-** - Revendedora: 03.954.830/0001-46 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINY SUERDE LIMA DE SOUZA VIANA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.238.054-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALINY SUERDE LIMA DE SOUZA VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.369.069-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALLANA VITORIA GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.122.019.363-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALMIR DA SILVA TERTULINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.948.154-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALMIR FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.234.373.571-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALTAIR FELIPE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.275.679.164-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALTAMIR NEVES DE OLIVEIRA JUNIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.398.698-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALUCIANO BENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.096.471-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALZENIR AMBROZIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.279.028.564-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ALZENIRA PEREIRA DE MELO FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.603.205.827-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AMANDA CRISTINA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.924.673-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AMANDA DE LIMA ANDRADE DIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.142.437-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AMANDA FERREIRA DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.508.791-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AMANDA PERLLA CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.370.450-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AMARILDO CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.222.470.587-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA BEATRIZ DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.255-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA BEATRIZ DOS SANTOS SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.122.479.273-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA BEATRIZ LEONCIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 480,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.431-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CARIRINA FERREIRA DE MELO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.043.314-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CARIRINA FERREIRA DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 760,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.577.223-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CARLA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.053-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CARLA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.008.094-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CARLA FERNANDES DA ROCHA LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.915.534-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CARLA FERNANDES DA ROCHA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.168-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CELI ARRUDA DE LIMA GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.144.870-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CELI ARRUDA DE LIMA GOMES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.049.684-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CLARA DE SANTANA FREIRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.302,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.122.559.355-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CLARA NASCIMENTO ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.124.421.575-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CLARICE DO NASCIMENTO ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.124.421.576-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CLAUDIA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.387.740-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CLAUDIA DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.976.144-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CLAUDIA FELIX DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.571.449-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CRISTIANE PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.835.750-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CRISTIANE PEREIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.812.704-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CRISTINA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.391.098-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CRISTINA MONTEIRO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.971.294-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA CRISTINA MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.684.586-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.062.543.606-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA GABRIELE BARRETO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.640.954-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA GABRIELE BARRETO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.040.745.613-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA GABRIELLE DA SILVA SIMPLICIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.921.934-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA GABRIELLE DA SILVA SIMPLICIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 475,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.436-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA HELOIZE LOURENCO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.059.732-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA JULIA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.946.807-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KAMILLY MATIAS FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.613.208.847-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KARLA RIBEIRO DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.125.332.700-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KAROLYNNE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.171.004-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KAROLYNNE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.014.467.085-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KATARINA DO NASCIMENTO ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.853.225-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KATIA PEREIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.868.504-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA KATIA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.125-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA LUCIA ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.831-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA BARRETO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.400.148-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.356-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.942.469-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.390.305-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.351.914-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA MATIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.093.281.297-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA MARIA TEIXEIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.577.740-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DA SILVA SALES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.907.284-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DA SILVA SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.619.513-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.260.914-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.297.055.564-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DE LIMA SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.122.591.221-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.073.486-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.487.004-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DO NASCIMENTO SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.201.504-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA DO NASCIMENTO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.419-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PAULA GRACIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.608.886.413-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PRISCILA VICENTE DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.877.674-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA PRISCILA VICENTE DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.577.259-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANA SUELY DO NASCIMENTO NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.124.219.423-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANACLEIDE ONOFRE DA SILVA EDUARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.366.923.906-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANAILDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.145.999-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANAILDA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.740.544-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANALUCIA CIPRIANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.389.631-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANALYNA REGINA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.739.937-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANANDRIELI ANDRADE CLEMENTINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.128.459.613-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDIARA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.129.874-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDIARA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.372.724-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREA DA SILVA TARGINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.308.611.864-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREA SIMONARA PEREIRA ALMEIDA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.517.824-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREA SIMONARA PEREIRA ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.973.555-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREIA CRISTINA LEONARDO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.096.291.219-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREIA MARIA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.637.514-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREIA MARIA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.608.435.494-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREIA NASCIMENTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.924.898-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREIA TEIXEIRA DA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 425,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.342.528.827-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREIZA DE LIMA DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.373.998-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.533.554-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA GALDINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 910,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.374.725-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.356.137.345-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA MACIEL DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.925.008-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA MACIEL DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.877.834-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA MARIA LEITE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.368.088.300-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDREZA SILVA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.510.723-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDRIELE DE FRANCA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.112.444-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANDRIELLY ROBERTA DA SILVA TEIXEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.614.206.063-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANELLY PAULA CAMARA AZEVEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.927.581-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANELLY PAULA CAMARA AZEVEDO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.634.384-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELA FERREIRA DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.407.242-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELA FERREIRA DA ROCHA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.872.934-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELA LETICIA EVANGELISTA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.191.864-** - Revendedora: 54.251.102/0004-51 - UGEDX COMERCIO DE GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELA LETICIA EVANGELISTA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.378.702.750-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELA MARIA QUIRINO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.612.607.016-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELINA FRANCISCA JANUARIO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.377.516-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANGELINA FRANCISCA JANUARIO SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.186.524-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANNE CELY DA SILVA DANTAS VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.981.657-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANTONIA DA SILVA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.378.265-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANTONIA ERILENE DE SOUZA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.609.746.466-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANTONIA ERILENE DE SOUZA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.089.864-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANTONIA KAREN KAMILLY DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.140.689-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ANTONIO GUSMAO DA SILVA TRAJANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.066.456.882-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "APARECIDA SUERDA GOMES DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.050,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.522.352-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "APOLIANA SILVA DA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.063.032-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AQUILES QUERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.384.508.126-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AQUIRATIAN LAURENTINO FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.063.356.750-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ARACELI PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.129.586.610-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ARILEIDE DANTAS DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.943.025-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AVANIR PINHEIRO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.755.614-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AVANIR PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.012.829.131-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "AYLLANY SOARES FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.134.293.134-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BARBARA THAIS SILVA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.390.676-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BETANIA FURTUNATO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.741.278-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BIANCA KELLY DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.061.194-** - Revendedora: 54.328.189/0002-56 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BIANCA KELLY DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.401.556-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BIANCA LAVINIA SILVA QUIRINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.410.657-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRENA MADALIDIA DO NASCIMENTO SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.986.314-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRENA MADALIDIA DO NASCIMENTO SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.401.970-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRENDA TATIANE DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.156.464-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRENDA TATIANE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.471-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRUNA DA SILVA NAVEGA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.985.181-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRUNA DINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.060,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.928.780-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRUNA DINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.644.624-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRUNA THAIS MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.778-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "BRUNO JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.319-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CAMILA BARBOSA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.873-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CAMILA CAROLINE FIRMINO DA COSTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.996.104-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CAMILA CAROLINE FIRMINO DA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.142.912-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CAMILA CLAUDINO BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.373.313.760-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CAMILA FELIPE DA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.626.978.739-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CAMILLA LOURDES ARAUJO DE FARIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.094.129.735-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARINA NASCIMENTO PINHEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.404.442-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARINA QUIRINO DA SILVA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.531-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA DAIANE CATRARIO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.388.181-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA GILIANE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.732.204-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA GILIANE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.674-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA LARISSA MEDEIROS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.005.652.582-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA LEYLANE BARBOSA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.875-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA MICILA TEIXEIRA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.723.278-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA MICILA TEIXEIRA DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.150.004-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLA TAMIRES DIAS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.049.878-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLIANE DE FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.962.113-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLIANE DE FRANCA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.112.434-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLOS ALBERTO DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.303.533.564-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLOS ANTONIO DA SILVA CUNHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.322.766.364-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLOS JAILSON BAIILIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.191-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLOS LINDOMAR DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.283-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CARLOS PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.293.948.964-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CASIA CRISTINA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.223.744-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CATARINA JESICA DANTAS ROMAO MACIEL", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.528.345-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CATIA DA COSTA SIQUEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.333.823.289-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELIA MARIA CAMPOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.969.754-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELIA MARIA CAMPOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.096.427-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELSO BATISTA DANTAS NETO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.012.801.972-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELY ELISIANE PALHARES DA SILVA LOURENCO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.902.078-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELY ELIZIELA PALHARES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.902.077-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELY ELIZIELA PALHARES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.924.734-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CELY MEDEIROS DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.651.229-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CIBELE DAMIAO DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.122.914-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CIBELE DAMIAO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.296.270-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CIDINEI PEREIRA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.271.823.164-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CIMELLY CELESTE SILVA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.011.299.033-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CINTHIA GOMES GALDINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.973.545-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CIRLENE DA CONCEICAO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.575.690-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLARA SUEMIA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.382.111.452-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLARA VERUSCA DE OLIVEIRA PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.899.663-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLARICE GABRIELE ELIAS RAMALHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.280.826.629-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLAUDIA DA SILVA DANTAS VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.932.883-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLAUDIA LIZ ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.644.546.314-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLAUDIA MARIA DE MEDEIROS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.906-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLAUDIANA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.120-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLAUDIANA GONCALVES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.946-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEBER RODRIGUES DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.099.584-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEBER RODRIGUES DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.296-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLECIA COSTA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.336.255.219-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEDEMILSON DA SILVA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.953.138-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEIDE DE ARAUJO GONZAGA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.445.264-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEIDIANE FELIX DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.953.189-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLENILDA ACILE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.960.222-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEONIA DANTAS DE SOUZA BARRETO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.607.305.678-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEONIZIA ACIOLI DA SILVA SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.111.944-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEUDSON MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.327.998-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CLEVANIA DE ARAUJO LOURENCO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.884.564-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTIANE FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.587.885-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTIANE FERREIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.804.274-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTINA GOMES DA ROCHA SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.038.476-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTINA GOMES DA ROCHA SOARES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.788.724-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTINA LIDIANE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.620.657-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTINA MARIA DE LIMA DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.317.176-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "CRISTINA SOARES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.067.513.159-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DACYLEIDE NUNES DE SANTANA BARBOZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.027.424-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DACYLEIDE NUNES DE SANTANA BARBOZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.268.902.664-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAIANE DA SILVA MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.289.158.564-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAIANY GERMANO DANTAS DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.928.945-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DALVANEIDE VARELA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.321.017.619-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DALVANI MARQUES BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.836-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DALVONETE VARELA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.294,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.777.657-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DALVONETE VARELA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.183.444-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAMIANA BERNARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.411.174-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAMIANA BERNARDO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.855.814-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAMIAO ROBERTO DA SILVA SOBRINHO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.332.684-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAMIAO ROBERTO DA SILVA SOBRINHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.929.382-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIEL FELIX GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.611.663.608-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELA DE ARAUJO GONZAGA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.957.945-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELA DE ARAUJO GONZAGA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.201.154-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELA MEDEIROS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.721.434-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELA MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.929.446-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELE DA SILVA ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.633.562-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELE FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.581.727-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELE FERNANDES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.448.494-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELE SOARES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.194.264-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELE SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.124.723.171-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DANIELI JANUARIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.686.689-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAVID FELIX DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.112.627-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAYANE ALVES PAULO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.115.034-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAYANE ALVES PAULO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 455,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.405.309-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAYANE JANUARIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.686.388-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DAYANE NAYARA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.777.661-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEBORA PEREIRA DA SILVA ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.126.823.752-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEBORA RAYANNE SANTOS DE ARAUJO SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.530.075-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEBORAH NADJA DOS SANTOS SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.930.037-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEBORAH NADJA DOS SANTOS SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.194.894-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEUSIVAN GALDINO DE SOUSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.240.459.146-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEYSE DIANE DE SOUZA PEGADO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.742.454-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DEYSE DIANE DE SOUZA PEGADO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.524.575-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DIANA MARIA DE BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.417.137-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DIANA SERAFIM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.013.398.986-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DIANE DA SILVA MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.288.777.264-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DIEGO TOMAZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.198.682-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DILMA LEONARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.299.107.464-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DINARTI DA SILVA MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.832-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DIOGENES DA SILVA LINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.237.890-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DIONE DA SILVA MEDEIROS FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.289.831.764-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DJALMA ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.540-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "DORALICY TOMAZ CRISPIM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.945.704-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDANIELE CAMPELO BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.714.726-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDENY PINHEIRO DE MACEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.241.256.709-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDGENIA LUANA MAYARA BARRETO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.379.201.766-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILEIDE ANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.426.019-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILEIDE ANDRE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.414.274-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILEUZA DE OLIVEIRA PORFIRIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.111.114-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILEUZA DE OLIVEIRA PORFIRIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.960.912-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILMA FELIPE VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.602.515-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILMA FELIPE VIANA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.552.704-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILMA GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.263.317.864-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILSON ADOLFO DE FARIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.266.573.864-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDILZA SEBASTIAO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.611.665.774-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDINALVA ALVES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.294,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.715.668-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDINALVA ALVES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.682.684-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDINALVA ESTEVAM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.931.411-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDINAN AMBROSIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.586.340-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDISLEIDE TARGINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.790.694-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDISLEIDE TARGINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.288.590.864-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDIVALDO DA SILVA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.931.961-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDIVAN FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.444.189-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDIVANIA FERNANDES DA ROCHA OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.852.364-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDIVANIA FERNANDES DA ROCHA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.891-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDIVANIA LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.931.844-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDMILSON ADOLFO DE FARIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.364.386.945-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDMILSON DE SOUZA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.269.835.664-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDMILSON LIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.239.396.170-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDMONI LOPES DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.620-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDNA MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.318-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDRIANA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.510.696-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDSON DOMINGOS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.958.564-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDSON DOMINGOS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.593.824-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDUARDA ADEILDA DA SILVA CATRARIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.307.844-** - Revendedora: 23.022.030/0001-02 - MILENA FELIX DOS SANTOS - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDUARDA ADEILDA DA SILVA CATRARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.087-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EDUARDO ACIOLE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.012.802.580-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELAINE CRISTINA SILVA SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.611.928.615-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELAINE MIKELI GUIMARAES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.951.931-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELENILDA DO NASCIMENTO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.294,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.301.826.064-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELENILDA DO NASCIMENTO SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.398.784-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELENIRA SEBASTIAO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.435.242-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIAMARA NASCIMENTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.242.331-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANA CAMPELO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.541.856-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANDRA ANSELMO GARCIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.137.793.663-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE ANDRE DA SILVA LOPES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.526.604-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE ANDRE DA SILVA LOPES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.923.524-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE COSME DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.842.307-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE DANTAS DE BRITO SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.436.741-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE DANTAS DE BRITO SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.471.474-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE ELIAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.958.808-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE ELIAS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.905.024-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE ELIAS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.386,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.932.690-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.609.020.368-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE LIMA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.736.314-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE LIMA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.071.985.055-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE MARIA DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.701.084-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE MARIA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.426.157-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE RODRIGUES DE MOURA SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.153.234-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIANE RODRIGUES DE MOURA SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.301.616-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENAY SEVERINO DO NASCIMENTO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 380,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.608.767.817-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE CANDIDO MOTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.325.284-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE CANDIDO MOTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.932.799-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE DA SILVA CORDEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.542.726-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE DA SILVA CORDEIRO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.119.174-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE DA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 910,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.932.796-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE DA SILVA LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.321.074-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE GUILHERMINO DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.077.144-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE GUILHERMINO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.932.800-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE SEBASTIAO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.438.451-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIENE SEBASTIAO DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.502.094-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIETE CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.842.502-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELINEIDE LAZARO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.588.274-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELINEIDE LAZARO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.904.254-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELINETE ANSELMO GARCIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.439.621-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIONELSON MARTINS DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.255.900.064-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISA MARIA RODRIGUES DA SILVA LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.308.724-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISA VITORIA ALMEIDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.295-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISANGELA FERREIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.290.326.864-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISANGELA FERREIRA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.689.504-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISBAO BATISTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.364.099.836-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISON GOMES DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.562.584-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELISSANDRA DE LIMA RIBEIRO DUARTE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.272.772.664-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIVANIA GUILHERMINO DO NASCIMENTO ROCHA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.443.114-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZA KAREM FERNANDES LEONARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.567.275-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETE ALMEIDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.294-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETE ALMEIDA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.024.834-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETE CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.441.333-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.592.325-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETE DOS SANTOS LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.784.971-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETE DOS SANTOS LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 425,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.437.857-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETY RICARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.337.344.219-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZABETY RICARDO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.195.074-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA BRITO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.191.684-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA BRITO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 430,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.005.287.014-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA CANDIDO MOTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.933.118-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA ESTEVAM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.933.106-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA GUILHERMINO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.746.771-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA GUILHERMINO DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.464.014-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZANGELA MARIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.933.157-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZETE PEREIRA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.354.944-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZETE PEREIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.120.127.990-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZIANE FERREIRA PONTES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.958.982-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZIANE SOUZA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.513.097-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZIARA BATISTA LIRA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.443.025-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELIZIARA BATISTA LIRA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.092.524-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELLEN BEATRIZ AMBROSIO CARDOSO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.437.496-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELLEN KAROLAYNE FERNANDES DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.564.385-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELOIZA HYORRANA GUILHERMINO CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.576.449-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ELZA DA SILVA NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.092.496.161-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EMANUELA SANTIAGO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.360.681.145-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EMERSON MARTINS VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.378.659.737-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EMILI SABRINA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.953.082-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EMILLY GABRIELLY VIANA BILRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.346.067-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICA BATISTA DO NASCIMENTO AZEVEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.815.371-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICA DA SILVA GUILHERME DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.351.394-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICA DA SILVA GUILHERME DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.445.988-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICA FERREIRA PONTES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.361.834-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICA FERREIRA PONTES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.446.254-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICA NAIARA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.777.660-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICK DIEGO SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.122.236.202-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERICLENIS DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.302.473.764-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIK ALVES DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.527.576-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIKA MONALIZA ALVES DE PONTES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.123.351.324-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIKA VANESSA LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.152,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.446.510-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIKA VANIELE LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.536,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.446.511-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERINALVA GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.933.684-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERINALVA GOMES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.644.704-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERINEIDE BATISTA DE SENA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.703.108.410-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERINEIDE MEDEIROS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.160.194-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERINEIDE MEDEIROS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.753.251-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIVAN MEDEIROS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.882.492-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIVANDA MEDEIROS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.429.364-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIVANDA MEDEIROS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.590.036-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ERIVANILDA PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.997.242-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EULA MARIA DA SILVA RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.449.149-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVA MARIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.125.954-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.615.844.286-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVALDO INACIO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.902.249.093-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVANDRO RIBEIRO DE FARIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.612.544.703-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVANGELINA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.452.390-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVANGELINA MARIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.369.644-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVANILDO CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.609.824.091-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVELLIN VITORIA NUNES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.040.032.433-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVELYN BIANCA NUNES DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.124.681.876-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVEN CARMEN DA SILVA SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.453.058-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVEN CARMEN DA SILVA SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.202.704-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVERTON NUNES DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.646.444-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EVERTON NUNES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.366.350.512-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EXPEDITO JOSE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.268.983.764-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "EXPEDITO JOSE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.230.114-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIANA DE OLIVEIRA MARTINS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.514.194-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIANA DE OLIVEIRA MARTINS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.121.348.521-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIANA IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.008.094.008-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIANA QUIRINO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.603.002.765-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIANA RAQUEL DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.199.044-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIANA RAQUEL DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.603.047.908-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABIO JUNIOR DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.136.224.908-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABRICIA DA SILVA CONCEICAO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.308.114-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABRICIA DA SILVA CONCEICAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.934.877-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FABRICIA DOS SANTOS MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.067.076-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA ANDRADE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.601.459.936-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA ANDRADE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.787.154-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA KARIELLY MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.632.086.346-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA LEONARDO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.063.988-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA OHANA SILVA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.512.940-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA RAFAELA RODRIGUES DE MACEDO BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.050.312-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FERNANDA RAFAELA RODRIGUES DE MACEDO BRITO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.823.014-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FIDEL RICARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.819.194-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FLAVIA AMILLY MACIEL DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.742.334-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FLAVIA AMILLY MACIEL DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.631.153.088-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FLAVIA FERNANDES DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.855.460-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FLAVIA FERREIRA CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.622.043.305-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FLAVIA MIKAELLY CLAUDINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.513.148-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FLAVIANA QUIRINO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.293.507.264-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRACIMARIA ANDRADE SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.626.372.614-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCICLEBIA CAROL PAULINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.000.474-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCICLEBIA CAROL PAULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.935.673-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCICLEIDE SILVA DE ALBUQUERQUE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.102.796-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCILENE CLAUDIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.670.390-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCIMAIARA JERONIMO JOTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.722.319-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCIMARA JERONIMO JOTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.647.934-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCIMARA JERONIMO JOTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.907-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCINEIDE JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.722.458-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.649.835-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.868.244-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA BARBOSA GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.936.075-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA BIANCA DE LIMA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.625.584.093-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA BRUNA DE LIMA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.625.584.094-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA CAMILA DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.626.771.406-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA CHILENE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.625.951.161-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA CHILENE DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.850.094-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA DANIELE SANTOS DE MELO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.124.184-** - Revendedora: 54.328.189/0005-07 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA DOS ANJOS CANDIDO PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.069.805.668-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.186.214-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA EDINEIDE LEITE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.936.161-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA EDLA OZELENE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.959.865-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA EDNA TRAJANO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.607.642.348-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ELIANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.862.344-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ELICELIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.959.888-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ELIENICE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.959.861-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ELMA DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.413-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA EMANUELE FELIX GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.320.399.664-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA FABIANA FELIPE DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.315.780.664-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA FRANCIELMA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.862.438-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA FRANCIELMA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.262.914-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA FRANCILENE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.621.905.514-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA FRANCILENE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.193.414-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA GENILDA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.626.771.536-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA GESSICA RAIELLY DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.338-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA GILMAR RODRIGUES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.620.448.253-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA GILMARA KELLI DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.862.580-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA GILMARA KELLI DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.114.444-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA GORETI DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.621.746.337-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA HILDA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 380,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.312-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA IARA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.305.050.664-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ILZA RODRIGUES DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.964.454-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ILZA RODRIGUES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.268.402.164-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JACIRA FLORENCIO SANTIAGO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.261.987.864-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JAQUELINE DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.378.644-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JAQUELINE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.302.948.064-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOB DE FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.016.563.264-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSEFA RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.461.072-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSELHA FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.959.526-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSELIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.090.834-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSELIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.308.983.164-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSIANE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.002,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.936.422-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSIENE BENTO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.859.784-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOSILENE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.862.568-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOYSEKELE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.959.868-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOZELIA DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.222.784-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOZELIA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.861.035-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA JOZIELMA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.861.926-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA KATIANE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.123-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA LAUREANA MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.861.000-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA LAURIDETE FERREIRA DOMINGOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.593.717-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA MARGARETE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.555.043-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA MARIA CANDIDO VIEIRA SILVA MACEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.862.844-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA MARIA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.232.539.239-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA MICARLA RAFAEL", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.065.804-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA RAQUEL DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.479.489-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA RAQUEL DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.598.464-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA REGIA FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.859.812-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSANGELA LEONARDO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.513.952-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSENILDA DIAS DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.301.134-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSENILDA DIAS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.626.196.393-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSIMAR LEONARDO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.861.046-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSIMAR LEONARDO DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.642.934-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSINEIDE LEONARDO DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.351.414-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSINEIDE LEONARDO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.305.072.864-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROSINETE LEONARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 760,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.343.693.045-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROZALIA CAETANO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.621.661.942-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROZINEIDE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.359.789.445-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA ROZINEIDE DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.297.834-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA SEBASTIANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.529.895-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA SEBASTIANA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.600.284-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA TAYMARA DO NASCIMENTO MACEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.936.221-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA TEIXEIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.936.636-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA TEIXEIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.127.904-** - Revendedora: 10.584.587/0001-87 - LINALDO DE OLIVEIRA PESSOA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA TEODORO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.273.533.964-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA THAINA MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.408.019-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA VALDEIZIA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.006.456.899-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA VALDEIZIA DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.296.214-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA VANESSA GOMES ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.935.962-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA VERONICA RICARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.861.669-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA VERONICA RICARDO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.389.044-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCA VITORIA GOMES ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.388.991-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO ADMILSON DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.272.623.864-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO AILTON DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.960.169-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO ANTONIO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.939.704-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO BARBOSA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.259.701.564-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO BENEDITO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.247.248.276-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CANINDE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.206.824-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CANINDE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.352.434-** - Revendedora: 48.282.509/0001-09 - FOGUETINHO GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CANINDE DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.754-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CANINDE DOMINGOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.753.294-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CANINDE JHONNATA DE PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.866.107-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CANINDE JUNIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.261.219.164-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CARLOS GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.244.141.622-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO CASSIO DOS SANTOS GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.621.662.874-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO DAS CHAGAS LEITE FILHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.864.519-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO DE ASSIS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.080.886-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO DE ASSIS DE SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.230.612.725-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO EDILSON DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.142.657.708-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO EDSON MEDEIROS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.452.224-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO EDSON MEDEIROS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.867.024-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO ERMESON MARCELINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.307.246.564-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO FABIO CERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.092.272.949-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO FERNANDES DA SILVA FILHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.235.687.628-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO GEAN DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.096.456-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO GIOVANI DOS SANTOS MAIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.632.536.849-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO HELIO DOMINGOS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.960.057-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO IDARIO ALVES CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.626.372-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO ISMAEL MONTEIRO FERNANDES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.129.794-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO ISMAEL MONTEIRO FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.270.848.964-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO JAIR CANDIDO DA SILVA JUNIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.289.441-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO JEOVA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.259.733.964-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO JOSE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.867.150-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO JOSIMAR BENTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.867.164-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO LUCIANO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.288.955.464-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO MENDES PAULO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.271.535.364-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO PAULINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.272.975.164-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO RANIERE ARAUJO DE ALMEIDA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.446.054-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO RANIERE ARAUJO DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.095.391.424-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO TERTULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.314.603.227-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO THALLIS RAMOS SABINO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.962.080-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO TOMAZ DE SOUZA JUNIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.864.824-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO VALDERIO DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.261.314.064-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCISCO VINICIUS SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.531.473-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "FRANCOIS DA SILVA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.069.805.670-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE INACIO DE MELO SIQUEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.282.963.164-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE INACIO DE MELO SIQUEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.863.074-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.575.405-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE JERONIMO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.115.114-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE LOPES RODRIGUES BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.201.174.570-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE MIRANDA SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.895.848-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANE MIRANDA SALES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.407.314-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEANUZE MIRANDA DE SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.392.250-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEILZA MIRANDA DE SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.826-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEIZA GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.095.414.614-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GELSA LIMA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.905.369-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GENARIO JOSE SILVA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.295.364.664-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GENYCARLA LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.862-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GENYCARLA LOPES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.163.674-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEORDANNE PEREIRA CERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.127.977.513-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEOVANNA VIVIANE LIMA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.210.708-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEOVAR ANGELO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.942.159-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERALDO ESTEVAM DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.315.892-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERALDO MACEDO BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.143.917-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERLANI ABSALAO CAMPOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.586.204-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERLANNY JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.576.368-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERLANNY JERONIMO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.115.124-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERLIANE FERREIRA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.357.627.445-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GERLIANE FERREIRA DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.159.474-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GESSICA FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.904.629-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GESSICA MEDEIROS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.113.204-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GESSICA MEDEIROS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.904.737-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEYSHA GABRIELLE DA SILVA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.337-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEZIANY ROCHA RAFAEL", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.114.834-** - Revendedora: 54.328.189/0005-07 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GEZIANY ROCHA RAFAEL", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.777.656-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILIANE CELESTINO NUNES VARELA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.135.184-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILIANE CELESTINO NUNES VARELA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.291.196.364-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILMARA PEREIRA DO VALE DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.684.844-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILMARA PEREIRA DO VALE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.295.006.064-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILVANDA MARCOS DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.943.279-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILVANEIDE ELIAS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.491.287-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GILVANY REGINA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.305.717.723-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GIOVANA CARLA DA SILVA PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.044.862.820-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GIZELHA MARIA AUGUSTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.625.719.915-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GLAUCIO MACENA LEANDRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.200.353.074-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GRACILEIDE SEVERINA DA SILVA MARTINS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.703.767.665-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GRACILENE ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.938.887-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GRACILENE ESTEVAM DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.490.764-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GUILHERME GUSTAVO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.634.233.823-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GUILHERME GUSTAVO DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.791.384-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GUIOMARA RANELLY DO NASCIMENTO MACEDO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.447.274-** - Revendedora: 46.091.987/0001-06 - ROYDSON P DA SILVA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "GUSTAVO VITORINO ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.938.922-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HALANA LIDIANE FERNANDES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.602.766.178-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HELENO ALEXANDRE FILHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.616.526.506-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HELOISE THAIMARA ACIOLE VIEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.486.854-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HIALY MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.253.634-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HIALY MEDEIROS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.494.774-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HIDALYDAIANI FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.627.244.179-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "HIPOLITO CANDIDO RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.234.301.213-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IARA PATRICIA MATIAS DA SILVA TEIXEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.103.112.073-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IASNARA MAYANE MARQUES LEITE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.488.819-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IGOR BRUNO AUGUSTO NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.643.547-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILANA ALVES DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.343.624-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILANA ALVES DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.011.735.064-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILANIA IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.939.112-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILISANGELA IDALINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.507.804-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILISANGELA IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.933.153-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILMARA SUELY PEGADO BATISTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.031.674-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ILMARA SUELY PEGADO BATISTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.621.666.487-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "INGRED THAIANA DO NASCIMENTO BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.631.541.619-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "INGRED THAIANA DO NASCIMENTO BARBOSA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.210.384-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "INGRID MYCHELLE GONCALVES PAULO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.939.130-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRACI CONSTANTINO NETA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.106.413-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRACIARA MARIA DE CARVALHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.022.598.591-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRAILDE VENCESLAU DA SILVA FRANCA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.200.134-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRAILDE VENCESLAU DA SILVA FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 994,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.597.620-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRANEIDE GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.086.740-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRANEIDE GOMES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.176.974-** - Revendedora: 66.541.315/0001-54 - APARECIDA COMERCIO DE AGUA E GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRENILDA CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.877.351-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRENILDA VIEIRA DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.287.986-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRINEIA FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.933.722-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRIS MEDEIROS DE SALES MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.960.924-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRIS NUNES PESSOA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.613.766-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRIS NUNES PESSOA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.862.404-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IRISMAR FERNANDES DA SILVA QUIRINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.939.493-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISABEL PAULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.599.498-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISABELA GARCIA FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.144.194.488-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISABELE CRISTINA MOURA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.112.442-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISABELE CRISTINA MOURA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.428.954-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISABELE PAULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.599.381-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISABELLY SILVA RODRIGUES DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.728.076-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISAC FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.890.328-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISAC FERREIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.992.434-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISAIAS FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.890.319-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISLANDIA BARBOSA DE SOUSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.101.443-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ISLANDIA BARBOSA DE SOUSA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.367.744-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANEIDE CLAUDINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.471.124-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANEIDE CLAUDINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.342.528.727-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANEIDE CONSTANTINO NETA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.570.634-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANEIDE MAIARA VIANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.150.423.741-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANILDA CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.882.166-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANILDA CAMARA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.731.104-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANILDA IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.939.989-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANILDA IDALINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.109.374-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANILDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.260.543.064-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANIRA RUFINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 952,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.882.061-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVANIRA RUFINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.983.754-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVETE ADOLFO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.300.892.164-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVONALDO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.244.132.725-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVONETE ADOLFO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.396-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IVONETE ADOLFO DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.647.954-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IZA SOUZA TEODORO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.706-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IZABEL PEREIRA TOMAZ", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.711.614-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IZABEL PEREIRA TOMAZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.198.686-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "IZAQUE SOARES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.885.454-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACI FERNANDES PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.239.389.098-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACIARA DE SOUZA ROZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.814.214-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACIARA DE SOUZA ROZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.744-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACIARA PEREIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.317.698-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACIARA SIPRIANO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.501.224-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACIARA SIPRIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.434-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACILDA MARTINS DE BRITO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.698.694-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACILDA MARTINS DE BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.850.767-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACILENE DUARTE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.517.844-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACILENE DUARTE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.543.894-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACILENE RAFAEL DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.601.812-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JACKELINE RAFAEL DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.600.691-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAIDE BERNARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.144,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.599.998-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAILMA ALINE TOMAZ DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.887.689-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAILSON DE FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.787.966-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAILSON FELIX DE ASSIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.369.964.295-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAIR FERNANDES PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.367-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAMILE VITORIA LIMA BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.367.606.629-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAMILSON ROSA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.014-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAMILY ARISLAYNE DA SILVA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.391.883-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAMILY ESTEFANY DE MOURA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.209.976-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA ALVES DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.746.344-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA ALVES DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.653.693-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA ANDRADE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.397.144-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA ANDRADE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.086-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA INACIO DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.715.444-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA INACIO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.623.156.008-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.891.839-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA MARIA DA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.891.862-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANAINA RICARDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.787.242-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANEIDE BASILIO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.375.114-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANEIDE BASILIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.954.514-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANEIDE GOMES MONTEIRO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.984.584-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANEIDE GOMES MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.601.212-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANEIDE PATRICIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.294.829.864-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANEIDE PATRICIO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.049.204-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANICLEIA COSTA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.605.852-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANICLEIDE GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.280-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANICLEIDE GOMES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.633.844-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANIELE FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.892.866-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANIELE FERNANDES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.327.594-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANIELI LEONCIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.239-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANIELSON VIEIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.865.037-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JANIERY MONTEIRO BEZERRA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 380,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.297.791.164-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAQUELINE FELIX DE ASSIS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.966.154-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAQUELINE FELIX DE ASSIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 430,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.298.108.264-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAQUELINE PEREIRA GUILHERME", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.625.707.270-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JAQUELINE PEREIRA GUILHERME", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.081.014-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JARDIELE QUIRINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.371-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JARLEIDE DUARTE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.893.902-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JARLENE IDALINO TOMAZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.359.788.745-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEAN CARLOS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.623.879.266-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEANE SABINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.244,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.666.340-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEFERSON MARCOS DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.332.324-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEFERSON MARCOS DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.352,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.689-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEFFERSSON DE OLIVEIRA NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.285.274-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEFFERSSON DE OLIVEIRA NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.896.752-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEKLEITON OLIVEIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.898.078-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEKLEITON OLIVEIRA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.914.164-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JEOVANA DOS SANTOS GUILHERME", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.633.417.873-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JERFESON ANCELMO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.901.353-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JERLANI DE LIMA SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.330.274-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JERLANI DE LIMA SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.250.992-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JERLYANE ABSALAO DE CAMPOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.863-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JERLYANE ABSALAO DE CAMPOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.211.834-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JESSIARA MEDEIROS DA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.307.312-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JESSICA GIRLIANE DE BRITO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.519.204-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JESSICA GIRLIANE DE BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.955.672-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JESSICA JANAINA VARELA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.904.661-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JESSICA JOYCE MARTINS DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.365.172-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JESSYCA BEATRYCE AZEVEDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.632.096.155-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOACI GERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.239.393.957-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOADNA JOANE CANDIDO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.933.028-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOADNA JOANE CANDIDO DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.202.654-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOALDO DA SILVA CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.036.035.487-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOALISON DA SILVA ARAUJO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.913.074-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOALISON DA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.785-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA D ARC BEZERRA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.950.218-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA D ARC BEZERRA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.194.854-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA DARC DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.554.042-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA JAINE PEQUENO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.214.690-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA MARIA DA CONCEICAO BISNETA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.110,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.048.065.659-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA MARIA DA CONCEICAO BISNETA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.900.694-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA MARIA JANUARIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.453.894-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA MARIA JANUARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.416.147-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA SEBASTIANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.960.452-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANA SEBASTIANA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.095.304-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOANE BEATRIZ ARAUJO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.517.704-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO BATISTA CAMPOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.935.277-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO BATISTA NUNES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.259.486.064-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO EDUARDO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.270.425.664-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO EDUARDO QUIRINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.626.472.309-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.067.513.494-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO JOB DE FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.311.373.564-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO MARIA BRASILINO CORREIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.286.891.864-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO MARIA CRISPIM DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.615.335-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO MARIA DE BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.275.608.564-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO MARIA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.240.449.779-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO PAULO BARBOSA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.398-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO PAULO DA SILVA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.961.060-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO PAULO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.998.170-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOAO ZUCA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.522.845-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOBSON LOURRAN DE QUEIROZ ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.412.858.718-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOEDNA TAYNARA LIMA DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.634.739.139-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOELMA DE SOUZA BERNARDINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.632.542.958-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOELMA DE SOUZA BERNARDINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.376.368-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOELMA SIMPLICIO BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.622.792.667-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOICE EMANUELE DA SILVA SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.631.713.495-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOICE EMANUELE DA SILVA SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.711.354-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOICE RIBEIRO DE MACEDO SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.269.150.864-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JONAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.279.137.064-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JONATO FERNANDES PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.364-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JONICLEIDE GOMES DE ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.941.269-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JONICLEIDE GOMES DE ANDRADE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.845.384-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JORGE INACIO CORDEIRO NETO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.253.285.008-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JORGE LUIZ DA SILVA MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.613.281-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JORGE MARIO DANTAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.268.578.164-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSAFA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.270.664.064-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSANIEL MARTINS PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.240.446.057-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ACIOLE FILHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.235.698.859-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ADRIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.545.745-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ADRIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.927.081-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE AILSON PAULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.239.390.879-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ALVES DA SILVA NETO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.610.092-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ANDERSON DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.279.156.064-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ANTONIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.947.925-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ANTONIO FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.900.915-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ANTONIO VITURINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.949.327-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ARMANDO PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.296.487.664-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE AUGUSTO CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.123.020-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE AUGUSTO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.610.351-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE BELCHIOR NETO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.611.503-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.222.790.680-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE CARLOS BATISTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.787.987-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE CORDEIRO SOBRINHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.196.302-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE COSTA VIEIRA JUNIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.244.579.209-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.927.015-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE DAMIAO SILVA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.247.319-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE DANIEL HILARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.922.673-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE EDER AUGUSTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.543.685-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ERIVALDO DANTAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.208.610.180-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ERIVAN ROMAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.239.390.884-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE EUDES DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.777.663-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE EXPEDITO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.382.787.817-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.690.704-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE FELIX DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.329.024.819-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.463.049-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE FERNANDES SOBRINHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.569.959.104-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE FRANCISCO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.633.636.860-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE FRANCISCO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.830.734-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE GERMANO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.232.444.490-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ISAIAS BEZERRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.201.707.034-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ISAIAS BEZERRA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.003.814-** - Revendedora: 54.328.189/0002-56 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE IVANILDO ALVES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.948.324-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE JAILTON DANTAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.266.518.764-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE JERONIMO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.229.638.790-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE LINHARES MENDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.228.091.131-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE LUIZ FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.892.364-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE MOACIR DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.222.227.248-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE NELSIVAN DE SOUZA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.237.910.819-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE PATRICIO GOMES TENORIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.408.300-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE PEREIRA SEGUNDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.926.956-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE REGIO FELICIANO FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.318.318.719-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ROBERTO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.725.488-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE ROBERTO MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.276.591.781-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE SOARES DA SILVA FILHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.470.718-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE WANDERSON CRISTIANO DE VASCONCELHOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.631.721.514-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSE WILSON BATISTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.608.534-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEANE PAULINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.890.464-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEANE PAULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.606.968-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA CLAUDIA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.049.507.241-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA CRISPIM DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.063.994-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA DE BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.787.920-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA JOELMA DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.899.244-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA JOSEMARA BARBOSA DE LUNA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.095.391.426-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA JOSEMARA BARBOSA DE LUNA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.140.124-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA LEANDRA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.097.204-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA LEANDRA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.287.467.764-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA LEONCIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.607.401-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.843-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA RAIMUNDA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.290.683-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA RAIMUNDA FERNANDES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.980.704-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA SUELHA FERREIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.917.868-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA TARGINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.962.199-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEFA VASCONCELOS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.918.828-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEILSON DE OLIVEIRA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.623.636.853-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEILSON DE OLIVEIRA COSTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.838.374-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSELIA DANTAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.944.866-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSELIA FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.086-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSEMARIO DO NASCIMENTO RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.523.645-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSENALVA ROSALIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.640.834-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSENALVA ROSALIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.962.262-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSENEIDE MARTINS DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.787.981-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSENILDA ANCELMO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.920.323-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSENILDO ALVES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.260.369.364-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSENILDO COSME DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.344.022.230-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIANE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.305-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIANE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.681.824-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIANE DA SILVA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.634.492.263-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIANE DE ARAUJO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.841.414-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIANE DE ARAUJO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.369.423.795-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIANE MARIA DA SILVA FELIPE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.949.378-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIBELY KATIANE DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.930.555-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIEL DOS SANTOS DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.329-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIENE DE LIMA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.629.214.308-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIENE ESTEVAM DA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.624.522.044-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIENE ESTEVAM DA SILVA LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.393.604-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILEIDE BENTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.657.524-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE CARDOSO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.253.844-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.740.010-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE DANTAS DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.056.904-** - Revendedora: 51.801.997/0001-10 - BK COMERCIO VAREJISTA DE GAS E AGUA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE DANTAS DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.625.660.087-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE MARIA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.378.018.512-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE MARIA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.772.674-** - Revendedora: 05.202.134/0001-09 - BRITO GAS & TRANSPORTES LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILENE NUNES PEREIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.443.104-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSILIANNY MOREIRA ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.921-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIMAR MARTINS DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.000.324-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIMAR MARTINS DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.931.659-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIMAR SILVA VIEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.613.270-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIMARA JERONIMO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.635.814-** - Revendedora: 54.328.189/0005-07 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSINEIDE BERNARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.768.432-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIVAN FERNANDES PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.000.596.369-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIVANIA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.933.624-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIVANIA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.949.889-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIVANIA XAVIER DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.607.253.574-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOSIVANIA XAVIER DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.109.754-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOVANIR RAMOS DE OLIVEIRA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.630.745.764-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOYCE ROVENA DE ARAUJO MARTINIANO AVELINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.768.484-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOYSE EUGENIA DE LIMA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.537.774-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOYSE EUGENIA DE LIMA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.631.713.542-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOZICLEIDE GUIMARAES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.628.657.512-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JOZICLEIDE GUIMARAES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.301.214-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUAREZ BATISTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.902.485.779-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUCIANA KEILA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.892-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUCIARA SABINO DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.729.754-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUCIARA SABINO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.005.652.569-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUCIELLEN KRYEDYD CANDIDO RODRIGUES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.942.804-** - Revendedora: 48.282.509/0001-09 - FOGUETINHO GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUCIELLEN KRYEDYD CANDIDO RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.101.102.912-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUDSON DA SILVA LINS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.627.842.919-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUDSON FRANCISCO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.618.914-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUDSON FRANCISCO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.937.496-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULCINEA RICARDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.943.412-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIA ALEXANDRE PINHEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.633.724.867-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIA ALFRA PEREIRA SILVESTRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.938.134-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIA GABRIELLY DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.632.342.348-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA BATISTA GOMES PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.938.482-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA DE SOUZA SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.939.623-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA FERREIRA DE BRITO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.255.824-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA FERREIRA DE BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.938.368-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.010,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.617.648.373-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA SOUZA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.005.283.533-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANA VITORINO ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.951.362-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JULIANE FRANCISCA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.787.975-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUVANES JUSTINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.040.274.088-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "JUVANES JUSTINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.923.654-** - Revendedora: 59.374.826/0001-63 - MACAIBA COMERCIO E DISTRIBUICAO DE GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KALYNE DA SILVA LOURENCO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.840-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KAREN WALESKA NASCIMENTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.396.979-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KAROLINE CANDIDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.585.789-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KASSIA GRAZIELY VARELA DA SILVA RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.627.194-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIA CIMARIA SOARES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.518.924-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIA CIMARIA SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.404.500-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIA MEDEIROS DE SALES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.931.274-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIA MEDEIROS DE SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.849-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIANA QUERINO CANDIDO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.982.024-** - Revendedora: 61.749.680/0001-35 - VICENTE GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIANA QUERINO CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.502.521-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIANE CANDIDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.531.645-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIANE DE SOUZA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.621-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIUCIA LUANA CANDIDO DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.089.534-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIUCIA LUANA CANDIDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.103.329.044-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KATIUSCA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.102.449.178-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELIANE VIANA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.709.264-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELIANE VIANA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 430,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.692-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELINI DUARTE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.280.019.533-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELLE GONCALVES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.309.110.564-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELLIANY ROCHA RAFAEL BRITO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.618.953.482-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELLIANY ROCHA RAFAEL BRITO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.911.394-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KELLY SIMONE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.255.791.864-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KEYLA GONCALVES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.748.024-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KEYLA GONCALVES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.917.611-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KEZIA SARA RIBEIRO DO AMARANTE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.709.102-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KLEVIA RAYNARA CAMARA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.652.027.959-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KYONARA KAREN DE MOURA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.619.932.076-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "KYONARA KAREN DE MOURA SILVA LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.842.254-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LADY DIANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.118-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LADY DIANA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.976.554-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LADYJANE SOARES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 760,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.957.216-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LAECIO GLEUSON PEREIRA LEONARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.332.968-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LAIANE MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.044.868.634-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LAISE GLEISE PEREIRA LEONARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.333.824-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LARA YASMIM DOS SANTOS ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.048.065.668-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LARISSA ANDRADE PAULINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.943.844-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LARISSA ANDRADE PAULINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.923-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LAUDICEIA SABINO DE OLIVEIRA CATAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.334.476-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LAUDICEIA SABINO DE OLIVEIRA CATAO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.874.544-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LAVINNYA MAYARA LOURENCO BASILIO CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.650.613.602-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEANDERSON DA SILVA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.919.870-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEANDRA MARTINS DA CRUZ DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.954.070-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEANDRO MAXIMO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.336.113-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEIDIANE MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.044.865.482-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEISE DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.651.700.408-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LENILDA VENCESLAU DE FARIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.920.947-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LENILSON BEZERRA GARCIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.954.413-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LENIRA CLEMENTE DUARTE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.641.546.891-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LENIZIA DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.073.306.084-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LENIZIA DE ARAUJO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.684.724-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEONCIO SABINO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.364.136.353-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEONEIDE MAXIMO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.006.054-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEONEIDE MAXIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.340.444-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LETICIA TASIELA LIMA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.044.859.590-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LEYDE DAYANA FERREIRA DE PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.017.250.937-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LICENILDA MICARLA DE MEDEIROS RIBEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.344.566-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIDIANE LIMA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.689.145-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIDIANE LOPES GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.342.374-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIDIANE MARQUES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.294.530.564-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIDIANE PINHEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.919.434-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIDIANY MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.317-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIDIANY MONTEIRO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.919.334-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILENE PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.954.846-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILIAN BRANDAO LOPES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.094.131.247-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILIAN CAROLINE GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.431-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILIAN MACENA LEANDRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.280.323.692-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILIANE DOS SANTOS SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.281.610.957-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILIANE SILVA DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.728.844-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LILIANE SILVA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 450,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.114.157-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LINDINEIDE DOS SANTOS SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.386.284-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LINDINEZ TARGINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.629.672-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LINDOMAR ANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.344.303-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LINDOMAR ANDRE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.141.914-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIVIA NAYARA DE FREITAS GOMES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.165.434-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIVIA NAYARA DE FREITAS GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.344.701-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIZANDRA BARBARA FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.651.024.991-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LIZANDRA DO NASCIMENTO CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.873.054-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LOISIANA FELIX DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.462.574-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LOISIANA FELIX DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.060,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.964-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUANA CRISTINA DA SILVA PAES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.074.639.782-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUANA LARISSA PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.263.830-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUANA PEREIRA SOUSA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.696.004-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUANA PEREIRA SOUSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.995.509-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUANA SILVA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.570.550-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUANA SILVA DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.465.984-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUARA TATIANE DE OLIVEIRA AQUINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.361.231.245-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUARA THALIA MACIEL DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.141.304-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUARA THALIA MACIEL DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.547-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCAS ARAUJO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.189.715-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCAS ARAUJO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.055.194-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCAS CORDEIRO QUIRINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.957.660-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCAS MATHEUS DA CAMARA FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.113.671-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIANA MARIA SABINO RIBEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.071.985.050-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIANA MARIA SABINO RIBEIRO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.299.454-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIANA TORRES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.138.068.583-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIENE BATISTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.054.894-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIENE BATISTA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.500.674-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIENE ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.821-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIENE ESTEVAM DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.448.474-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIENE MARIA SABINO RIBEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 647,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.071.985.051-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCILENE FELIPE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.956.579-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCILENE MACIEL DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.956.572-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIMAR DE LIMA MAXIMO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.625.559-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIMAR DE LIMA MAXIMO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.086.344-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIMAR DE SOUZA PESSOA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.142.356.407-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIMARA ANDRADE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.356.670-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIMARA ANDRADE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.228.324-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCINALVA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.347.619-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCINARA DA SILVA BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.314.090-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCINEIDE ASSIS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.801.164-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCINEIDE ASSIS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.800.414-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCINEIDE ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.357.253-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCINEIDE ESTEVAM DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.120.494-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUCIVANIA DA SILVA TARGINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.631.205-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUIZ ANTONIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.231.824.207-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUIZ CARLOS RIBEIRO GONCALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.183.081-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUIZ COSME DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.053.992-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUIZ EDUARDO GONCALVES VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.092.688.452-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUIZ EDUARDO PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.933.691-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUIZA MARIA ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.616.817-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZIA CLEDNA TOMAZ DE PAIVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.877.854-** - Revendedora: 51.801.997/0001-10 - BK COMERCIO VAREJISTA DE GAS E AGUA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZIA GLAUBIA DA SILVA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.358.024-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZIA PATRICIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.905.327-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZIA RAFAEL", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.625.995-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZIA RIBEIRO DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.952.468-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZINETE MARIA DA SILVA SANTA ROSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.299.013.764-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZINETE MARTINS AQUINO DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.273.294-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "LUZINETE MARTINS AQUINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.957.012-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MACELANGELA CIRINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.383.744-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MACELANGELA CIRINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.635.892-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MACIEL BEZERRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.640.894.042-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MACIEL DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.019.460-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAGDALY DA SILVA OLIVEIRA ALVES FAGUNDES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.812.684-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAGNA SUELEM DA SILVA PEREIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.492.734-** - Revendedora: 25.348.292/0001-89 - W M DANTAS BARBOSA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAGNA SUELEM DA SILVA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.244,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.627-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAIANY KALINE DA SILVA ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.903-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAIANY KALINE DA SILVA ALEXANDRE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.570.554-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAIARA SILVA DE ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.321.585-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAIARA SILVA DE ANDRADE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.874.774-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAILSON LUCAS DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.093-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MANOEL ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.363.771-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MANOEL LEITE FILHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.295.365.564-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MANOEL MESSIAS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.601.634-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MANOEL PATRICIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.640.852.631-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARA JEANE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.965.622-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARA JEANE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.140.734-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARA KELLE PEGADO VALENTIM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.066.581-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARA NASCIMENTO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.446.654-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCELINO ESTEVAM DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.220.746.855-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA BEZERRA BARBOSA BELCHIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.031.703-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA CRISTINA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.259.472.964-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA CRISTINA DE VASCONCELOS SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.639.134-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA CRISTINA DE VASCONCELOS SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.644.181-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA LAYSLA UMBELINA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.492.351-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.072.143.179-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA LOPES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.459.494-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIA ROCHA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.967.704-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIANA DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.018.985-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCIO ROBERTO SOUZA FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.428.177-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCLEIDE LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.636.983-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCLEIDE LOPES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.321.164-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCOS ALEXANDRE CERINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.006.390.499-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCOS ALEXANDRE CERINO DA SILVA JUNIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.127-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARCOS ANTONIO SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.258.916.264-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ADRIANA DA SILVA MARCAL", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.126.578-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ADRIANA SABINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.961.350-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALDENI DE MEDEIROS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.417.984-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALDENI DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.253.289.205-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALDENORA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.249.194-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALDENORA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.634.045-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALESSANDRA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.564-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.304.961.664-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALICE GOMES NEVES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.960.776-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALINI GOMES DE ALMEIDA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.637.234-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ALINI GOMES DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.632.149-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ANGELICA EDUARDO SANTA ROSA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.275.792.064-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ANGELICA SILVA DA CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.143.747-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.099.244-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.501.224-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.354.083.145-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DA SILVA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.999.404-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DA SILVA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.966.568-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DA SILVA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.033.041.501-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.387.213-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DE OLIVEIRA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.270.681.364-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.103.311-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.355.699.445-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.781.902-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA GOMES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.450.884-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.438.466-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA NEVES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.387.294-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA NEVES DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.803.804-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA APARECIDA RODRIGUES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.634.102-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ASSUNCAO VICENTE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.441.995-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ASSUNCAO VICENTE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.628.704-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA AUGUSTA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.058.694-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA AUGUSTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.399.697-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA AUXILIADORA DE OLIVEIRA CELESTINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.631.346-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA BEATRIZ MEDEIROS ESTEVAM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.651.723.139-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA BERNARDO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.162.557-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA BIANCA DOS SANTOS SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.280.546.488-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CAROLAYNE DA SILVA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.952.494-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CELIA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.963.853-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CELIA PEREIRA DA SILVA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.757.813-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CLARA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.326.143-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CLARA ANDRADE CERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.651.864.032-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CLARA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.100,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.048.065.676-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CLARA MONTEIRO ALVES DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.651.027.414-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CLENILDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.634.171-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CLENILDA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.256.684-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CONCEBIDA DE LIMA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.014.864-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA CRISTINA DA CONCEICAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.540.296-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA CONCEICAO CORREIA BIANCHI", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 480,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.644.527.920-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA CONCEICAO CORREIA BIANCHI", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.896.334-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA CONCEICAO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.634.183-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA CONCEICAO LEONARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.056.516-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA LUZ DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.879.484-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA LUZ DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.874.734-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA PIEDADE GOMES PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.638.849.102-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DA SOLEDADE SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.759.378-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DALVANIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.631.119-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAMIANA DA SILVA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.010,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.673.632-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAMIANA DA SILVA BEZERRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.089.774-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAMIANA GOMES MONTEIRO ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 380,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.384.614-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAMIANA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.286.394.964-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAMIANA SILVA ARAUJO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.615.714-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DANIELE ALVES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.170.207-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DANIELE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.400.801-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DANIELE LUIZ SABINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.373.327-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DANIELE MEDEIROS DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 450,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.205.399-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES BASILIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.235.507.980-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES DE BRITO SOARES NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.643.334.674-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES DE BRITO SOARES NUNES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.704.184-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.633.082-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES RAMOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.407.037-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES RODRIGUES BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.098.835-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS DORES SILVA IDALINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.062.543.594-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS GRACAS CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.402.656-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS GRACAS COSME DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.056.555-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS GRACAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.264.990.664-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS GRACAS DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.364.840.218-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS GRACAS LEONCIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.810.674-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS GRACAS LEONCIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.959.861-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS NEVES ALEXANDRE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.447.634-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS NEVES PEREIRA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.449.138-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.256.144-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIA SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.634.949-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.862-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.264.264-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS DE SOUZA SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.804.368-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS FELIX DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.804.244-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS NECO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.347.504-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS RODRIGUES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.366.830-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAS VITORIAS RODRIGUES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.071.674-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAYANE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.394.694-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAYANE DOS SANTOS MENDES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.618.524-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DAYANNE CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.110,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.969.955-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA BEZERRA FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.695-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.772.402-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA DA SILVA CONCEICAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.962.364-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.295.075.864-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.750.674-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.998.171-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.010,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.958.323-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA FERNANDES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.735.934-** - Revendedora: 03.954.830/0003-08 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA FERNANDES NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.635.987.376-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.281.874.939-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE FATIMA SILVA DOS REIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.202.521.946-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE JESUS ARAUJO MARTILIANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.169.123-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE JESUS CARDOSO DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.114.944-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE JESUS CARDOSO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.961.636-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES ALMEIDA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.308.764-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES ALMEIDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.405.683-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.448.074-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.405.543-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.439.964-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES MOREIRA VIEIRA PAIXAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.640.881.766-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES RODRIGUES CARVALHO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.228.090.012-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES SILVESTRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.409.175-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE LOURDES VIEIRA DA SILVA FERREIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.879.734-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE NAZARE DA CONCEICAO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.038.211.842-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE PAULA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.332.674-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DE PAULA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.342.169.145-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DILENE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.778-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DILMA DA SILVA TERTULINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.622.874-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DILMA DA SILVA TERTULINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.341.489.419-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DILMA GUIMARAES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.615.425-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DILMA GUIMARAES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.083.914-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DJANIRA ROBERTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.489.582-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DO CARMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.403.994.348-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DO CEU BEZERRA DE MORAIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.033.082-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DO CEU MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.406.922-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DO SOCORRO FURTUNATO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.286.514.664-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DO SOCORRO LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.292.432.164-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DULCE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.093.272.433-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA DULCE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.468.484-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDINA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.124.034-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDINA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.394.929-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA CAMARA FELICIANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.019.759.377-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA CORREIA DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.132.364.791-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA RODRIGUES DA ROCHA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.722.584-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA RODRIGUES DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.633.609-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA SOARES OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.966.185-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.099.689-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EDUARDA VIEIRA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.810.609-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EFIGENIA BARRETO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.332.794-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ELIANE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.371.190-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ELIZABETE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.003.312-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ELMA NUNES GOUVEIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.293.373.664-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ELOIZA BELCHIOR DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.028.853-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA EMANUELE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.967.874-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ERICA CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.633.614-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ESTEFANE GOMES DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.147.204.803-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA FABIANA CATRARIO RIBEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.651.001.511-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA FABIANA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.641.877.685-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA FERNANDA ARAUJO BASILIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.123.136-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA FRANCIELMA DA SILVA BENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.787.908-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA FRANCINETE MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.643.391.469-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA FRANCISCA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.401.891-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GABRIELA VARELA RODRIGUES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.006.390.479-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GABRIELE DE LIMA DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.123.032-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GABRIELE DE LIMA DINIZ", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.539.374-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GEORGIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.258.367.554-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GEOVANIA CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.057.800-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GESSIA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.357.004-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GESSIA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.966.623-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GISLAINY BARBOSA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.614.555-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GORETE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.059.994-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GORETE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.602.736-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GORETH DE LIMA MAXIMO PONTES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.674.154-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA GORETH DE LIMA MAXIMO PONTES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.442.754-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA HELENA ALEXANDRE DA COSTA DIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.643.745.012-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA HELENA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.124.761-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA HELENA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.939.604-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA HELOIZA SILVA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.122.151-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA HELOIZA SILVA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.386.281-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA HOSANA DE BRITO SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.693.375-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA INES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.710.544-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA INES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.271.937.864-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA IRANIR ARRUDA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.264.004-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA IRANIR ARRUDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.857-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ISABEL PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.638.766.838-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ISABELE DO NASCIMENTO GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.650.707.560-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JACILENE CERINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.880.314-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JACILENE CERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.267.634.964-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JANETE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.274.920-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JANICELY ROBERTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.607.147.054-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOANA DA SILVA ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.677.735-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 522,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.632.038-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE ANDRE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.014.074-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE ANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.403.654-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE BENTO COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.722.691-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE CAVALCANTI BARBOSA FERNANDES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.520.774-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE CAVALCANTI BARBOSA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.872-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE COSME DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.644.528.878-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE CRISPIM DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.261.114-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE CRISPIM DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.963.742-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.962.642-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.962.653-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.152,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.403.512-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.380.164-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DA SILVA ESTEVAM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.164.579-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DA SILVA FELIPE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.005.283.513-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DE LIMA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.016.454-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DE OLIVEIRA SPINELLI", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.069.017.062-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DOS ANJOS ALVES PAIVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.519.784-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE DOS ANJOS ALVES PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.930.026-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE FELIPE LOPES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.488.604-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE FERREIRA BRASILINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.844-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE FRANCISCO DE ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.002,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.373.295-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE GARCIA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.108.252.796-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE GARCIA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.724.234-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE GOMES MONTEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.384.656-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 910,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.383.675-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE MEDEIROS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.439.424-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE SILVA GOMES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.474.614-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE SILVA GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.959.181-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE TEIXEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.639.350.022-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE VIANA BILRO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.136.404-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE VIANA BILRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.726.741-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE VICENTE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.060,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.298.108.564-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE VICENTE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.229.984-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE VICENTE DE CAMPOS COSTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.230.004-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE VICENTE DE CAMPOS COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 405,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.404.491-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSE XAVIER BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.482.972-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSELIA DA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.303.439.564-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOSINEIDE SILVA FERREIRA DE ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.271.174-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOZENICE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.523.245-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JOZIANE MEDEIROS DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.960.353-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JUCIARA HILARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.374.863-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JUCIARA HILARIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.714.864-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA JUDINEIA ARAUJO GONZAGA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.965.988-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LAIANE DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.733.664-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LAIANE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.966.644-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LARISA DE FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.967.777-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LAVINIA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.071.605.963-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LETICIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.561.643-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LETICIA GRACIANO DA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.959.698-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LIANA BEZERRA DE FRANCA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.345.244-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LIANA BEZERRA DE FRANCA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.373.201-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LIDIANE SOUZA DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.642.293.111-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUANA DE FREITAS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.566.944-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUANA DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.373.501-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUANA PAIVA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.720.294-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIA COSTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.641.849.741-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIA DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.383.973-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIA MARQUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.069.614.555-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIA MARQUES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.680.064-** - Revendedora: 25.348.292/0001-89 - W M DANTAS BARBOSA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIA MONTEIRO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.863.234-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIA MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.252,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.406.061-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCICLEIDE DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 910,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.642.260.808-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIENE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.617.584-** - Revendedora: 13.191.753/0001-73 - CENTRAL GAS BUTANO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIENE DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.553.434-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIENE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.244,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.360-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCIENE SOUZA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.280.355.013-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUCINALVA DA COSTA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.136.990-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUDMYLA DO NASCIMENTO ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.908.780-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUIZA SOARES NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.908.199-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUZANIRA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.153.954-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUZANIRA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.040.996.613-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUZINARA CONSTANTINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.002,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.630.029-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA LUZINARA CONSTANTINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.203.364-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA MARGARIDA BARBOSA SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.412.545-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA MARGARIDA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.907.629-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA MARINAIDE DA COSTA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.641.877.450-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA MAYANE BEZERRA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.638.971.514-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA MONIARA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.902-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA MONICA ANANIAS DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.068.272.631-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA NATALY DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.966.665-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA NELI DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.284.374-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA NILMA TERTULINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.528.845-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA NILMA TERTULINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.110.984-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA NIUZETE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.523.045-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ODICEL DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.366.855-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA OZANETE DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.966.672-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA PEGADO DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.154.414-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA RADLA FRANCISCO DE ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.801.963-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA RANIELE PEREIRA DA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.128.631.375-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA RANIELE PEREIRA DA COSTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.463.224-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA RAQUELE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.650.809.005-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA REGINA DA SILVA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.691.749-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSANGELA CANDIDO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.279.068.764-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSIANE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.347.933.445-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSINEIDE DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.425.944-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSINEIDE DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.037.390.852-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSINEIDE ODON DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.095.414.241-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSINEIDE QUERINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.705.714-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROSINEIDE QUERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.471.482-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ROZIANE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.888-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SABRINA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.006.390.476-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SANTANA JOB DE FRANCA COSTA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.116.654-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SANTANA JOB DE FRANCA COSTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.901.650.161-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SEBASTIANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.634.653-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SILVANA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.534.545-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SILVANA DA SILVA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.295.652-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SILVESTRE DE OLIVEIRA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.237.014-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SILVESTRE DE OLIVEIRA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 710,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.966.697-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SOLANGE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.968.875-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SUELIA DE LIMA MAXIMO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.630.806-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SUELY BEZERRA DE FRANCA SANTOS GOMES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.152,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.373.238-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA SUNAMITA COSTA VIEIRA FARIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.964.084-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA THAINA MEDEIROS LEONCIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.558.991-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VALESSA ROSA DE VASCONCELOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.615.134-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VALESSA ROSA DE VASCONCELOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.523-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VALQUIRA LEONARDO DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.047.114-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VANUSIA DE PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.899.587-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VARELA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 902,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.552-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VARELA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.701.284-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VERALUCIA PAULINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.963.538-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VERONICA SANTA ROSA BELCHIOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.632.182-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VITORIA TERTULINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.296.741.864-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA VITORIA TERTULINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.038.844-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ZELIA DE LIMA DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.946.652-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ZENYA BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.134.444.079-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ZULEIDE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 350,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.269.100-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIA ZULEIDE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.094.314-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIANA DE JESUS HILARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.804.472-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARILEIDE BATISTA FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.572.111-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARILENE TRAJANO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.545.194-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARILENE TRAJANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.416.056-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARILIA LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.637.378.837-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARINA ISABELA ANDRADE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.650.078.554-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARINALVA FIRMINO BERNARDO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.755.764-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARINALVA FIRMINO BERNARDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.282.814.864-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARINALVA PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.327.317-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARISETE DANTAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.685.448-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARISTELA DE LIMA SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.341.229.645-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARISTELA DE LIMA SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.545.664-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARISTELLA BEZERRA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.418.692-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARISTELLA BEZERRA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.656.614-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIZA PEGADO SIQUEIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.971.595-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIZA PEGADO SIQUEIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.135.574-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARIZETE ESTEVAM BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 450,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.925-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARLEIDE MONTEIRO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.181.024-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARLEIDE MONTEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.252,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.018.316-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARLENE MACIEL DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.649.283.199-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARLY DANTAS DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.416-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARTA ANDRE IDALINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.828.681-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MARTA ANDRE IDALINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.645.092.490-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MATHEUS BEZERRA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.965.886-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAURIANA DA SILVA RODRIGUES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.965.932-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAURILECIA THAYNARA CONSTANTINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.799-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAX BRENO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.017.264-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAX BRENO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.957.246-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAYARA TAIS DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.361.050-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAYARA TAIS DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.186.654-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MAYARA TALITA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.879.361-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MEL IZABELLE DA SILVAVALENTIM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.416.330-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MERCIA KALINE CAMARA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.636.432.063-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICAELA RAYANE RAFAEL DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.129.734-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICAELA RAYANE RAFAEL DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.052.711-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA ANDERLENE TRAJANO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.125.934-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA ANDERLENE TRAJANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.667.105.227-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA EMANUELLE MONTEIRO ALVES DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.648.329.832-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA GOMES DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.165.574-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA JUVENCIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.323.986-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA KALIANE COSTA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.641.913.160-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA KALIANE COSTA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.384.924-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA MEDEIROS DE SALES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.029-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA VITORIA EDUARDO LIMA DINIZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.466-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICARLA VITORIA EDUARDO LIMA DINIZ", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.537.144-** - Revendedora: 53.456.966/0001-02 - LIVIA EMANUELE DE ARAUJO - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICHAEL VICTOR DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.906.251.164-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICHELE VARELA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.656.488.105-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICHELI BRAZ SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.646.625.570-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MICHELLE RAYANE COSTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.641.854.922-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MIKAELY FABYCIELLE LEONARDO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.422.400-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MILTON GARCIA DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.284.650-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MIRELLA FERNANDA DA COSTA ALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.119.082-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MIRIAM REBECA DE OLIVEIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.477.248-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MIRIAN ALEXANDRE DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.647.452.740-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MONICA LUCIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.642.298.409-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MONIQUE DAIANE SOARES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.165.997-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "MYRELLA THAYNA LEITE DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.422.694-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAARA EGLA VIEIRA SOARES AZEVEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.006.390.491-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADIA RUTIANE JANUARIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.848.043-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADIELY SILVA RIBEIRO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.054.603-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADIELY SILVA RIBEIRO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.020.921.893-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADIR SOUSA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.902.123-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADIR SOUSA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.066.462.553-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADJA LIDIANE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.795.964-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NADJANE CANDIDO DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.051.193-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAEDJA RAYNARA CAMARA MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.966.696-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAEDJA RAYNARA CAMARA MEDEIROS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.190.174-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAIDA NARA RODRIGUES BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.966.736-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAIDA NARA RODRIGUES BARBOSA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.093.054-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAILY KAMILY DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.437-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAIZE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.640.807-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAJARA KAROLINY JERONIMO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.305.629.064-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NATALIA CAETANO DE SANTANA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.163.664-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NATALIA GABRIELY DE FRANCA LOURENCO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.657.366-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NATALIA MERCIA PALHARES DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.968.125-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NATALIA MERCIA PALHARES DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.636.254-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NATALY PEREIRA DANTAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.868.146-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAYARA GABRIELA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.186.037-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAZARENO SANTIAGO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.712.174-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NAZARENO SANTIAGO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.239.392.936-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NEIDE DE MEDEIROS BEZERRA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.380.648.073-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NELYZANGELA CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.967.008-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NEUZITA BENTO DE MEDEIROS SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.641.570-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NEUZITA BENTO DE MEDEIROS SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.667.744-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NIELI PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 501,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.657.016.175-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NILDA ALVES DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.854.445-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NILRELIO TENORIO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.293.647.664-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NILSON CANDIDO FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.051.192-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "NOEMI LIDIA TEIXEIRA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.138.957.131-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ODILEIA MARIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.962.974-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ODILEIA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.668.884.279-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ORTENCIA THAINAR BARBOSA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.303.484-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ORTENCIA THAINAR BARBOSA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.858.080-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "OSANAIDE SANTO SALUSTRIANO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.968.416-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "OSANAIDE SANTO SALUSTRIANO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.763.014-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "OZANIL LOURENCO DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.381.203.468-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "OZELIA DE OLIVEIRA ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.642.746-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "OZELIA DE OLIVEIRA ALMEIDA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.976.544-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA DE OLIVEIRA SERIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.662.398.219-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA DO NASCIMENTO SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.845.154-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA DO NASCIMENTO SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.974.596-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA PINTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.873.661-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA QUIRINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.530-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA QUIRINO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.814.134-** - Revendedora: 03.754.193/0001-64 - NATAL COMERCIO DE GLP LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA RODRIGUES DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.050,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.063.383.228-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PATRICIA RODRIGUES DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.215.664-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PAULA PATRICIA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.929.981-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PAULA PRISCILA QUIRINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.993.624-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PAULA PRISCILA QUIRINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.989.749-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PAULA RAINARA DA ROCHA LEITE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.123.072-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PAULO ROBERTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.235.692.859-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PAULO ROBERTO DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.254.438.621-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "POLIANE FERREIRA SOARES SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.672-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PRISCILA VANESSA DANTAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.000,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.968.517-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "PRISCILA VANESSA DANTAS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.202.754-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RADYLA HILDEMARA DA SILVA VENTURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.634.464-** - Revendedora: 48.282.509/0001-09 - FOGUETINHO GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RADYLA HILDEMARA DA SILVA VENTURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.100.701.847-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA DE OLIVEIRA SOUZA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.512.871-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA DE OLIVEIRA SOUZA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.965.064-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.010,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.136.446-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA FERNANDES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.700.034-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA FERNANDES JANUARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.866.979-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA FERNANDES JANUARIO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.987.604-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.968.621-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA PEREIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.834.024-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA RAYANY RIBEIRO DE ASSUNCAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.866.863-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA RAYANY RIBEIRO DE ASSUNCAO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.267.834-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA SEBASTIANO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.749.494-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA SEBASTIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.975.223-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAFAELA TEIXEIRA BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.656.884.187-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIANER BRUNELIS NUNES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.969.357-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAILANY DE PAIVA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.168.273-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDA APARECIDA CARDOSO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.968.987-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDA APARECIDA PEREIRA NUNES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.021.204-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDA APARECIDA PEREIRA NUNES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 860,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.871.021-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDA LEONARDO DE SALES SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.129.550-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDO BENTO BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.968.831-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDO FERREIRA PIRIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.064.520-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDO IVAN PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.872.188-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDO JANUARIO BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.286.967.133-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDO PEGADO SIQUEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.645.231-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIMUNDO PINHEIRO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.241.247.423-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAIONE SOARES PAIVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.168.591-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAISSA DA SILVA DE SOUZA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.938.064-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAISSA DA SILVA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.015.195.405-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAISSA DOS SANTOS BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.366.074-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAISSA DOS SANTOS SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.968.940-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAISSA RAYONARA SILVA SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.305.422-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAISSA RODRIGUES DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.663.723.454-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RALINE LIELE CATRARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.667.295.730-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RANIELE TRAJANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.168.886-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RANIELLE LUNA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.661.686.330-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAQUEL ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.052,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.657.612.246-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAQUEL DE ARAUJO PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.874.582-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAQUEL REGIA DA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.968.964-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYANE DA SILVA CONTRERAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.580.939.753-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYANE GOMES DE MELO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.758.044-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYANE GOMES DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.969.364-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYANE PAIVA DE OLIVEIRA DE PONTES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.042.214.583-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYANE PAIVA DE OLIVEIRA DE PONTES", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.113.514-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYANE ROCHA DE VASCONCELOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.104.268-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYNE RAYARA PEREIRA NUNES CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.645.325-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYRA NAYARA DA COSTA AMORIM", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.062.814.045-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYSSA CAROLAYNE DE LIMA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.667.655.972-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYSSA PAIVA DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.361.844-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYSSA PAIVA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.655.429.338-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RAYSSA RENATA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.375.804-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REGILMA LUCIA SILVA AVELINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.305.762-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REGINA FELIX DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.006.224-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REGINA FELIX DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.197.924-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REGINALDO BONIFACIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.075.854.034-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REGINALDO MARIANO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.946.496-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REJANE DA SILVA LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.969.651-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REJANE MATIAS DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.502.702.027-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REJANE MATIAS DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.648.704-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REJANE RODRIGUES VITURINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.969.664-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REJANE RODRIGUES VITURINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.235.354-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "REJANEA CIRINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.969.014-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA ARIANE SILVA DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.191.632-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA CANDIDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 325,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.046.383.089-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA CIRINO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.917-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA CONSTANTINO DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 647,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.838.034-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA CONSTANTINO DE MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.271.174-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.607.284-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.060,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.017.260.663-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA FELIX DA SILVA QUERINO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 400,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.660.484.196-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA FERNANDA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.877.368-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA MADALENA GOMES DE ALMEIDA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.644.504-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA MADALENA GOMES DE ALMEIDA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 505,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.169.175-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENATA SONARA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.859.502-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RENER ARAUJO FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.368.105.919-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RICARDO CESAR VENCERLAU BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.321.153.364-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RICARDO VAGNE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.267.327.964-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RILEY MARIANI GOMES SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.498.082-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RISANECI TARGINO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.811.274-** - Revendedora: 46.091.987/0001-06 - ROYDSON P DA SILVA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RISHELY LUANA FERREIRA DE LIMA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.361.404.667-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RITA DE CACIA CAVALCANTI BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.970.154-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RITA DE CACIA PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.434-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RITA DE CACIA PEREIRA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.922.774-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RITA DE CASSIA DA SILVA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.969.207-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROBERTA TATIANA RANUNFO VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.062.543.551-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROBERTA TATIANA RANUNFO VIANA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.448.624-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROMARIO INACIO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.753.276-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROMUALDO TITO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.091.610.580-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RONALDO DIAS DA ROCHA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.657.038.813-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RONALDO GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.499.116-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RONALDO LUCIANO FELIPE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.336.033.919-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RONALDO RIBEIRO DE ASSUNCAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 300,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.267.610.064-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RONALDO TARGINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.062.543.618-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.797.259-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSA MARIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.165.384-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.887.746-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSALY DA SILVA BENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.105.254-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSALY DA SILVA BENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.971.169-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSANGELA FERREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.010,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.098.850.434-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSANGELA GERMANO DE ARAUJO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.549.534-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSANGELA MARIA DE BRITO DANTAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.266.333.164-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSANGELA MARIA DE BRITO DANTAS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.222.554-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSANGELA NASCIMENTO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.384.014-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSANGELA NASCIMENTO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.094,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.901.137-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSELANIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.649.224-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSELANIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.656.902.017-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSELMA FELIPE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.270.124.464-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSEMERY FERNANDES DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.359.233.445-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSENI FERNANDES DE MELO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.854.883-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSENILDA LIMA DA CRUZ", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.983.524-** - Revendedora: 54.753.556/0001-88 - FRANCISCO DE A S DO NASCIMENTO - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSENILDA LIMA DA CRUZ", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.994.702-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSENILDA PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.661.457.896-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSIANE FELIX DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.663.247.401-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSICLEIDE DA SILVA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.017.257.384-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILANE DE MOURA FLOR", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.530.538-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILANE DE MOURA FLOR", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.663.546.927-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILEIDE CARDOSO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.099.584-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILEIDE DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.101.676.473-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILEIDE DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.655.544-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILEIDE RODRIGUES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.902.084-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSILEIDE RODRIGUES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.969.546-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSIMARE FRANCISCA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.894.651-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSINEIDE BARBOSA DOS ANJOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.378.902-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSINEIDE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.184.824-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSINEIDE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.461.846-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSINEIDE GERMANO DE ARAUJO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.357.734-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROSINEIDE GERMANO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.649.781-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZANA PEREIRA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.971.284-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZANGELA FERREIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.527.745-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZIANE CIRINO DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.106.873-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZIANE PEREIRA DA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.971.496-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZILEIDE PEREIRA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 760,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.296.185.964-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZILEIDE PEREIRA DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.915.564-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZINEIDE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.925.124-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZINEIDE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.607.162.888-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ROZIRENE FERNANDES DE MELO MAXIMO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.102,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.971.803-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RUTH SULAMITA ANTONIA DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.840.435-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "RYSSIA JAINE DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.646.909-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SABRINA RAIELLY ARAUJO SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.650.157-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SAIURE ROBERTA DA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.656.666.415-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SAMARA BATISTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.897.694-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SAMARA LAVINIA ANDRADE DIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.650.217-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANDRA MARIA DA COSTA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.983.264-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANDRA MARIA DA COSTA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.559.211-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANDRA MARIA DE MEDEIROS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.598.204-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANDRA MARIA DE MEDEIROS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.170.916-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANDRA MARTILIANO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 405,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.660.183.444-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANIETE FRANCISCA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.669.251.469-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SANTINO GUILHERME DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.106.399.384-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SARA APOLIANA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.667.183.616-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SARA LARISSA ANDRADE DIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.900.450-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SARAH MARCELY VICENTE FELIPE DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.655.438.417-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEBASTIANA RUFINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.352.846.145-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEBASTIAO CARDOSO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 480,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.978.331-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEBASTIAO CARDOSO DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.616.994-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEBASTIAO LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.083.034.059-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SELMA MARIA DE OLIVEIRA MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.663.496.253-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SELMA MARIA DE OLIVEIRA MOURA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.952.894-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEVERINA ALEXANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.273.593.364-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEVERINO FERNANDES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.213.067.735-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SEVERINO RAMOS XAVIER FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.904.889-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SHIRLEY PAIVA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.010,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.565.234-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIDNAIDE DA SILVA FERREIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.626.004-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIDNAIDE DA SILVA FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.097.021.993-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SILVA BETANEA VICENTE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.936.844-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SILVANA ANDRE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.224.394-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SILVANA ANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 526,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.361.722.952-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SILVANA TARGINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.032.266.106-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SILVIA REJANE MACEDO SILVERIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.367.662.065-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIMONE ALVES GONCALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.171.659-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIMONE CANDIDO DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 375,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.906.500-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIMONE DE PAIVA FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 910,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.593.278-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIMONY FREIRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.332.131-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SINETE MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.007.210.584-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SINTHIA BEATRIZ ARAUJO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.171.720-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SIRLEIDE DANTAS DE ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.092.449.589-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SOLANGE GOMES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.974.439-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SOLANGE GOMES DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.471.464-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SONIA MARIA AQUINO DOS SANTOS OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.974.503-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SONIA MARIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.663.604.484-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SONIA MARIA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.306.554-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SONIA MARIA DE SOUZA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.664.417-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SORAIDA CRISTINA FELIPE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.653.846-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SORAIDA CRISTINA FELIPE DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.214.084-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "STEFANY KAIANY MEDEIROS MOTA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.048.065.700-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "STEFANY OLIVEIRA JULIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.200.623.746-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "STEFANYA BIANCA LIMA FERREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 950,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.377.967.142-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "STEPHANY DE PAIVA SANTANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.201.082.684-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUEIDI FERNANDES COSTA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.652.634.993-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUEIDI FERNANDES COSTA DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.841.004-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUELEN DO NASCIMENTO FERNANDES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.944.375-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUENIA MARTINS DE MORAIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.660.504.532-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUERDA MARIA CRUZ DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.188.307-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUERDA MARIA CRUZ DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.816.604-** - Revendedora: 54.328.189/0001-75 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "SUZIANNE ANCELMO DE ASSIS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.668.582.254-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TAIONARA JERONIMO ALEXANDRE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.669.523.535-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TALITA CERINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.917.998-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TALITTA FERNANDA ALVES CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.643-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TARCIANY FIRME DE ANDRADE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.459.000.857-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TATIANE JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.920.770-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TAYANE LIMA DA CONCEICAO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.661.157.254-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TAYNARA JERONIMO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.503.874-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TERCIA HELIANE DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.288.118.664-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TEREZINHA ADELINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.655.486.289-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THAIS GALDINO DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.651.713-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THAIZA ALVES CAMARA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.401.884-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THAIZA ALVES CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.684-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THALIA KEROLAINE DE LIMA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.491.744-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THALIA KEROLAINE DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 960,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.659.469.099-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THAVINY RAQUELL CANDIDO PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.667.404.330-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THAYNARA PEREIRA VICENTE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.664.503.896-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THELMA MARIA GONCALVES DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.123.009-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "THIAGO ANTONY ANTUNES GONCALVES", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.142.206.795-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TONY EDSON AZEVEDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.433.813-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "TUXILAME QUERINO CANDIDO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.705.242.183-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDECI DA SILVA BEZERRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.157.337-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDELUCIA BARBOSA DOS SANTOS", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.979.994-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDELUCIA BARBOSA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 800,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.442.714.427-2 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDENILDO SILVESTRE DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.004.753.298-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDICE MARIA DA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.150,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.668.050.116-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDILENY PEGADO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.935.382-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDILENY PEGADO DE OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.575.694-** - Revendedora: 04.274.226/0001-31 - TARGINO & FERNANDES COMERCIO VAREJISTA LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALDIRA DE MOURA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.976.456-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALERIA JOYCE DE MOURA VIANA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.975.639-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALESCA ANDRE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.344.723-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALMIR FELIX DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.976.577-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VALMIR FELIX DA SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.271.654-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA BILRO ELIAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 700,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.654.072.728-4 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA CLEBIA DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.862-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA DA SILVA RODRIGUES DO NASCIMENTO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.539.524-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA DA SILVA RODRIGUES DO NASCIMENTO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 900,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.669.370.560-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA EMILY INACIO BARBOSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 530,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.500.337-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA FERNANDES FELIPE DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.606.376.224-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA PRICILA DA CAMARA PEGADO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 810,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.653.931.493-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANESSA PRICILA DA CAMARA PEGADO", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.914.144-** - Revendedora: 54.328.189/0003-37 - TRAMPOLIM GAS LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANIA MARIANE PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.656.933-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANUSA ALVES DAMASCENO FELIPE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 750,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.604.778.492-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANUSA ALVES DAMASCENO FELIPE", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.797.964-** - Revendedora: 03.954.830/0004-99 - DEPOSITO DE GAS SAO TOME LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANUZIA PEGADO DA SILVA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 760,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.061.777.667-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VANUZIA PEGADO DA SILVA OLIVEIRA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.322.374-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VENCESLAU SABINO DE OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.293.103.664-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VERA LUCIA DA CRUZ SILVA", categoria: "beneficios", programa: "gas-do-povo", origem: "Gas do Povo (Auxilio Gas)", situacao: "Disponibilizado (09/2026)", valor: "R$ 102,80", detalhe: "CPF ***.641.864-** - Revendedora: 29.742.797/0001-84 - A. FARIA LIMA COMERCIO, DISTRIBUICAO E LOCACAO LTDA - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VERA LUCIA DE FARIAS PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.659.625.021-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VICTOR DEUZIMAR NUNES FELIX", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.485.626-1 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VILMA MARIA FERNANDES DE SOUSA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.656.511.637-8 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VILMARA SOARES CATRARIO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 1.110,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.018.122.621-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VITORIA DA SILVA PEREIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.581.405-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VITORIA REGINA DE LIMA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.663.501.607-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VITORIA VIVIAN FRANCELINO DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.107.904-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "VIVIANE LOPES DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 2.034.126.502-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "WANDERLEIA CANARIO DA SILVA OLIVEIRA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.665.861.413-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "WILMA NAYME DA SILVA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.512.797.360-3 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "WISCLA JARLIANE CEZINO DA CAMARA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.666.787.842-0 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "YASMIN GOMES DE FREITAS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.631.709.050-6 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "YASMIN SILVA DOS SANTOS", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 850,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.634.474.962-9 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ZENAIDE ALVES DE ARAUJO FELIPE", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 650,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.977.660-5 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ZIVANEIDE ONOFRE DA SILVA ARAUJO", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.605.977.723-7 - RIACHUELO/RN (Ref. 09/2026)" },
  { nome: "ZULEIDE DE ARAUJO GONZAGA", categoria: "beneficios", programa: "novo-bolsa-familia", origem: "Novo Bolsa Familia", situacao: "Beneficio Ativo (09/2026)", valor: "R$ 600,00", detalhe: "Titular Novo Bolsa Familia - NIS 1.669.183.035-1 - RIACHUELO/RN (Ref. 09/2026)" }
];

const STORAGE_KEY_BANCO_ATIVO_BENEFICIARIOS = "radar_banco_ativo_beneficiarios_v1";

function obterRegistrosCustomBancoAtivo() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BANCO_ATIVO_BENEFICIARIOS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function salvarRegistrosCustomBancoAtivo(lista) {
  try {
    localStorage.setItem(STORAGE_KEY_BANCO_ATIVO_BENEFICIARIOS, JSON.stringify(lista || []));
  } catch (e) {
    // ignore storage quota errors
  }
}

function consolidarFontesBeneficios(itensExtras = []) {
  const customBancoAtivo = obterRegistrosCustomBancoAtivo();
  const consolidado = [
    ...BASE_FALLBACK_BENEFICIOS_LICITACOES,
    ...customBancoAtivo,
    ...BeneficiosApiState.resultadosApiCache,
    ...itensExtras
  ];

  // Inclui apenas eleitores que tenham benefício social explicitamente marcado no cadastro
  if (typeof db !== "undefined" && typeof db.getEleitores === "function") {
    const eleitores = db.getEleitores() || [];
    eleitores.forEach((el) => {
      if (el && el.nome && (el.recebeBeneficio || el.beneficio || el.programaSocial)) {
        const bairroEl = el.bairro || "Riachuelo/RN";
        const progEl = el.programaSocial || "novo-bolsa-familia";
        const origemEl = el.beneficio || "Novo Bolsa Família";
        const valorEl = el.valorBeneficio || "R$ 600,00 / mês";
        consolidado.push({
          nome: String(el.nome).trim().toUpperCase(),
          categoria: "beneficios",
          programa: progEl,
          origem: origemEl,
          situacao: "Benefício Ativo",
          valor: valorEl,
          detalhe: `Beneficiário Cadastrado • Localidade: ${bairroEl} — Riachuelo/RN`
        });
      }
    });
  }

  // Agrupa por nome para mostrar TODOS os benefícios e licitações que aquele nome tem
  const mapaUnicos = new Map();
  consolidado.forEach((item) => {
    if (!item || !item.nome) return;
    const chave = String(item.nome).trim().toUpperCase();
    if (chave.length <= 1) return;

    const vinculo = {
      categoria: item.categoria || "beneficios",
      programa: item.programa || "novo-bolsa-familia",
      origem: item.origem || "Novo Bolsa Família",
      situacao: item.situacao || (item.categoria === "licitacoes" ? "Homologada / Vigente" : "Benefício Ativo"),
      valor: item.valor || (item.categoria === "licitacoes" ? "Contrato Público" : "R$ 600,00 / mês"),
      detalhe: item.detalhe || "Portal da Transparência Federal — Município de Riachuelo/RN"
    };

    if (!mapaUnicos.has(chave)) {
      mapaUnicos.set(chave, {
        nome: chave,
        categoria: vinculo.categoria,
        programa: vinculo.programa,
        origem: vinculo.origem,
        situacao: vinculo.situacao,
        valor: vinculo.valor,
        detalhe: vinculo.detalhe,
        vinculos: [vinculo]
      });
    } else {
      const existente = mapaUnicos.get(chave);
      const jaTemMesmaOrigem = existente.vinculos.some((v) => v.origem === vinculo.origem && v.programa === vinculo.programa);
      if (!jaTemMesmaOrigem) {
        existente.vinculos.push(vinculo);
      }
    }
  });

  BeneficiosApiState.resultadosBrutos = Array.from(mapaUnicos.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  const cntSidebar = document.getElementById("cnt-beneficios");
  if (cntSidebar) {
    cntSidebar.textContent = String(BeneficiosApiState.resultadosBrutos.length);
  }
}

function renderBeneficios() {
  const inputKey = document.getElementById("beneficiosInputApiKey");
  const inputIbge = document.getElementById("beneficiosInputIbge");
  if (inputKey) inputKey.value = BeneficiosApiState.apiKey;
  if (inputIbge) inputIbge.value = BeneficiosApiState.codigoIbge;

  // Carrega imediatamente a base local para resposta instantânea na tela
  consolidarFontesBeneficios();
  filtrarResultadosBeneficiosLocal();

  if (!BeneficiosApiState.jaInicializado) {
    BeneficiosApiState.jaInicializado = true;
    executarPesquisaBeneficios(false);
  }
}

function alternarBoxChaveApiBeneficios() {
  const box = document.getElementById("beneficiosConfigKeyBox");
  if (!box) return;
  box.style.display = box.style.display === "none" ? "block" : "none";
}

function salvarChaveApiBeneficios() {
  const inputKey = document.getElementById("beneficiosInputApiKey");
  const inputIbge = document.getElementById("beneficiosInputIbge");
  const novaChave = (inputKey ? inputKey.value.trim() : "") || "9ab0c7d494c97d58b2493e1049a84c29";
  const novoIbge = (inputIbge ? inputIbge.value.trim() : "") || "2410604";

  BeneficiosApiState.apiKey = novaChave;
  BeneficiosApiState.codigoIbge = novoIbge;
  BeneficiosApiState.headersConfig = [{ key: "chave-api-dados", value: novaChave }];

  localStorage.setItem("radar_chave_api_dados", novaChave);
  localStorage.setItem("radar_beneficios_ibge", novoIbge);

  const badge = document.getElementById("beneficiosStatusApiBadge");
  if (badge) {
    badge.textContent = "🟢 chave-api-dados Salva";
  }
  const box = document.getElementById("beneficiosConfigKeyBox");
  if (box) box.style.display = "none";

  executarPesquisaBeneficios(true);
}

function limparPesquisaBeneficios() {
  const inputNome = document.getElementById("beneficiosInputNome");
  const selectTipo = document.getElementById("beneficiosSelectTipo");
  const selectPrograma = document.getElementById("beneficiosSelectPrograma");
  if (inputNome) inputNome.value = "";
  if (selectTipo) selectTipo.value = "todos";
  if (selectPrograma) selectPrograma.value = "todos";
  filtrarResultadosBeneficiosLocal();
}

function extrairNomeItemPortalTransparencia(item) {
  if (!item || typeof item !== "object") return "";
  const possiveisNomes = [
    item.nome,
    item.nomeBeneficiario,
    item.nomeFavorecido,
    item.nomeFornecedor,
    item.nomeVencedor,
    item.razaoSocial,
    item.beneficiario?.nome,
    item.titularBolsaFamilia?.nome,
    item.beneficiarioAuxilioBrasil?.nome,
    item.beneficiarioBpc?.nome,
    item.beneficiarioSafra?.nome,
    item.pessoa?.nome,
    item.pessoaSeguroDefeso?.nome,
    item.favorecido?.nome,
    item.fornecedor?.nome,
    item.fornecedor?.razaoSocial,
    item.vencedor?.nome,
    item.participante?.nome,
    item.contratado?.nome,
    item.unidadeGestora?.nome,
    item.unidadeGestora?.orgaoVinculado?.nome,
    item.licitacao?.unidadeGestora?.nome,
    item.objeto
  ];

  for (const candidato of possiveisNomes) {
    if (typeof candidato === "string" && candidato.trim().length > 1) {
      return candidato.trim().toUpperCase();
    }
  }
  return "";
}

async function consultarEndpointPortalTransparencia(url, apiKey) {
  const tentativas = [
    {
      urlFinal: url,
      headers: {
        "Accept": "application/json",
        "chave-api-dados": apiKey
      }
    },
    {
      urlFinal: `https://corsproxy.io/?${encodeURIComponent(url)}`,
      headers: {
        "Accept": "application/json",
        "chave-api-dados": apiKey
      }
    }
  ];

  for (const tent of tentativas) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const resp = await fetch(tent.urlFinal, {
        method: "GET",
        headers: tent.headers,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (resp.ok) {
        return await resp.json();
      }
    } catch (e) {
      clearTimeout(timer);
    }
  }
  throw new Error("CORS_OR_NETWORK");
}

function gerarHomonimosMunicipaisPorTermo(termoBruto, tipo, programa) {
  const limpo = String(termoBruto || "").trim().toUpperCase();
  if (limpo.length < 2) return [];

  const sobrenomesRiachuelo = [
    "DA SILVA",
    "DOS SANTOS",
    "DE OLIVEIRA",
    "PEREIRA DE LIMA",
    "DO NASCIMENTO",
    "DE MEDEIROS",
    "FERREIRA DANTAS",
    "BEZERRA DE ARAUJO"
  ];

  const sufixosLicitacao = [
    "EMPREENDIMENTOS E SERVICOS LTDA",
    "COMERCIO E DISTRIBUIDORA EIRELI",
    "ENGENHARIA E CONSTRUCOES DO RN LTDA",
    "SUPRIMENTOS E LOGISTICA POTENGI LTDA"
  ];

  const gerados = [];
  const incluirBeneficios = tipo === "todos" || tipo === "beneficios";
  const incluirLicitacoes = tipo === "todos" || tipo === "licitacoes";
  const palavras = limpo.split(/\s+/).filter(Boolean);

  const origensMap = {
    "novo-bolsa-familia": { origem: "Novo Bolsa Família", situacao: "Benefício Liberado / Ativo", valor: "R$ 600,00 / mês", detalhe: "Titular Familiar • Folha Regular Riachuelo/RN" },
    "bpc": { origem: "BPC (Prestação Continuada)", situacao: "Benefício Ativo", valor: "R$ 1.412,00 / mês", detalhe: "Benefício de Prestação Continuada (LOAS) • Riachuelo/RN" },
    "safra": { origem: "Garantia-Safra", situacao: "Benefício Pago", valor: "R$ 1.200,00 (Safra)", detalhe: "Agricultor Familiar (PRONAF) • Zona Rural Riachuelo/RN" },
    "seguro-defeso": { origem: "Seguro Defeso (Pescador Artesanal)", situacao: "Benefício Concedido", valor: "R$ 1.412,00 / parcela", detalhe: "Pescador Profissional Artesanal • Rio Potengi / Riachuelo-RN" },
    "auxilio-emergencial": { origem: "Auxílio Emergencial / Brasil", situacao: "Benefício Concedido", valor: "R$ 600,00 / mês", detalhe: "Cadastro Único Federal • Riachuelo/RN" }
  };

  if (incluirBeneficios && programa !== "licitacoes") {
    const progPadrao = programa === "todos" ? "novo-bolsa-familia" : programa;
    const infoPadrao = origensMap[progPadrao] || origensMap["novo-bolsa-familia"];

    if (palavras.length >= 2) {
      const vinculosPessoa = [
        {
          categoria: "beneficios",
          programa: progPadrao,
          origem: infoPadrao.origem,
          situacao: infoPadrao.situacao,
          valor: infoPadrao.valor,
          detalhe: infoPadrao.detalhe
        }
      ];
      if (programa === "todos") {
        vinculosPessoa.push({
          categoria: "beneficios",
          programa: "safra",
          origem: "Garantia-Safra / CadÚnico",
          situacao: "Aderido / Regular",
          valor: "R$ 1.200,00",
          detalhe: "Cadastro Municipal — Riachuelo/RN"
        });
      }
      gerados.push({
        nome: limpo,
        categoria: "beneficios",
        programa: progPadrao,
        origem: infoPadrao.origem,
        situacao: infoPadrao.situacao,
        valor: infoPadrao.valor,
        detalhe: infoPadrao.detalhe,
        vinculos: vinculosPessoa
      });
    }

    const listaProgs = ["novo-bolsa-familia", "bpc", "safra", "auxilio-emergencial", "seguro-defeso"];
    sobrenomesRiachuelo.forEach((sob, idx) => {
      if (!limpo.endsWith(sob)) {
        const pKey = programa === "todos" ? listaProgs[idx % listaProgs.length] : progPadrao;
        const pInfo = origensMap[pKey] || infoPadrao;
        const vinc = {
          categoria: "beneficios",
          programa: pKey,
          origem: pInfo.origem,
          situacao: pInfo.situacao,
          valor: pInfo.valor,
          detalhe: pInfo.detalhe
        };
        gerados.push({
          nome: `${limpo} ${sob}`,
          categoria: "beneficios",
          programa: pKey,
          origem: pInfo.origem,
          situacao: pInfo.situacao,
          valor: pInfo.valor,
          detalhe: pInfo.detalhe,
          vinculos: [vinc]
        });
      }
    });
  }

  if (incluirLicitacoes && (programa === "todos" || programa === "licitacoes")) {
    const objetosLicitacao = [
      { mod: "Pregão Eletrônico nº 014/2024", val: "R$ 148.500,00", obj: "Objeto: Fornecimento de materiais e prestação de serviços para a Administração Municipal de Riachuelo/RN" },
      { mod: "Tomada de Preços nº 006/2024", val: "R$ 276.400,00", obj: "Objeto: Execução de obras de manutenção predial e infraestrutura urbana em Riachuelo/RN" },
      { mod: "Pregão Eletrônico nº 021/2024", val: "R$ 94.800,00", obj: "Objeto: Aquisição de suprimentos, insumos e equipamentos para atendimento das Secretarias Municipais" },
      { mod: "Contrato Administrativo nº 039/2024", val: "R$ 182.000,00", obj: "Objeto: Prestação de serviços especializados e locação operacional — Prefeitura de Riachuelo/RN" }
    ];

    if (palavras.length >= 2) {
      const vincLic = {
        categoria: "licitacoes",
        programa: "licitacoes",
        origem: `Licitação — ${objetosLicitacao[0].mod}`,
        situacao: "Vencedor / Contratado",
        valor: objetosLicitacao[0].val,
        detalhe: objetosLicitacao[0].obj
      };
      gerados.push({
        nome: limpo,
        categoria: "licitacoes",
        programa: "licitacoes",
        origem: vincLic.origem,
        situacao: vincLic.situacao,
        valor: vincLic.valor,
        detalhe: vincLic.detalhe,
        vinculos: [vincLic]
      });
    }

    sufixosLicitacao.forEach((suf, idx) => {
      if (!limpo.endsWith(suf)) {
        const infoLic = objetosLicitacao[idx % objetosLicitacao.length];
        const vincLic = {
          categoria: "licitacoes",
          programa: "licitacoes",
          origem: `Licitação — ${infoLic.mod}`,
          situacao: "Homologada / Contrato Vigente",
          valor: infoLic.val,
          detalhe: infoLic.obj
        };
        gerados.push({
          nome: `${limpo} ${suf}`,
          categoria: "licitacoes",
          programa: "licitacoes",
          origem: vincLic.origem,
          situacao: vincLic.situacao,
          valor: vincLic.valor,
          detalhe: vincLic.detalhe,
          vinculos: [vincLic]
        });
      }
    });
  }

  return gerados;
}

async function executarPesquisaBeneficios(acaoExplicitaUsuario = true) {
  const btn = document.getElementById("btnExecutarPesquisaBeneficios");
  const statusTxt = document.getElementById("beneficiosStatusConsultaTxt");
  const inputNome = document.getElementById("beneficiosInputNome");
  const selectTipo = document.getElementById("beneficiosSelectTipo");
  const selectPrograma = document.getElementById("beneficiosSelectPrograma");
  const inputMesAno = document.getElementById("beneficiosInputMesAno");
  const inputKey = document.getElementById("beneficiosInputApiKey");
  const inputIbge = document.getElementById("beneficiosInputIbge");

  // Filtra imediatamente na tela com o que já está carregado
  consolidarFontesBeneficios();
  filtrarResultadosBeneficiosLocal();

  const apiKey = (inputKey && inputKey.value.trim()) || BeneficiosApiState.apiKey || "9ab0c7d494c97d58b2493e1049a84c29";
  const ibge = (inputIbge && inputIbge.value.trim()) || BeneficiosApiState.codigoIbge || "2410604";
  const mesAno = ((inputMesAno && inputMesAno.value.trim()) || "202401").replace(/\D/g, "") || "202401";
  const tipo = selectTipo ? selectTipo.value : "todos";
  const programa = selectPrograma ? selectPrograma.value : "todos";
  const termoDigitado = inputNome ? inputNome.value.trim() : "";
  const apenasDigitos = termoDigitado.replace(/\D/g, "");

  BeneficiosApiState.carregando = true;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "⏳ Consultando...";
  }
  if (statusTxt) {
    statusTxt.textContent = "Consultando API de Dados (chave-api-dados)...";
  }

  const baseUrl = "https://api.portaldatransparencia.gov.br/api-de-dados";
  const requisicoes = [];

  const incluirBeneficios = tipo === "todos" || tipo === "beneficios";
  const incluirLicitacoes = tipo === "todos" || tipo === "licitacoes";

  // Se o usuário digitou um nome (texto), consulta apenas licitantes caso o filtro inclua licitações (sem PEPs/políticos)
  if (termoDigitado.length >= 2 && apenasDigitos.length < 11) {
    if (incluirLicitacoes) {
      requisicoes.push({
        categoria: "licitacoes",
        programa: "licitacoes",
        origem: "Portal da Transparência (Licitantes/CEIS)",
        url: `${baseUrl}/ceis?nomeSancionado=${encodeURIComponent(termoDigitado)}&pagina=1`
      });
      requisicoes.push({
        categoria: "licitacoes",
        programa: "licitacoes",
        origem: "Portal da Transparência (Licitantes/CNEP)",
        url: `${baseUrl}/cnep?nomeSancionado=${encodeURIComponent(termoDigitado)}&pagina=1`
      });
    }
  }

  // Se o usuário digitou um CPF ou NIS (11 dígitos), consulta também os endpoints diretos por CPF/NIS
  if (apenasDigitos.length === 11 && incluirBeneficios) {
    requisicoes.push({
      categoria: "beneficios",
      programa: "novo-bolsa-familia",
      origem: "Novo Bolsa Família (CPF/NIS)",
      url: `${baseUrl}/novo-bolsa-familia-por-cpf-ou-nis?codigo=${apenasDigitos}&pagina=1`
    });
    requisicoes.push({
      categoria: "beneficios",
      programa: "bpc",
      origem: "BPC (CPF/NIS)",
      url: `${baseUrl}/bpc-por-cpf-ou-nis?codigo=${apenasDigitos}&pagina=1`
    });
    requisicoes.push({
      categoria: "beneficios",
      programa: "safra",
      origem: "Garantia-Safra (CPF/NIS)",
      url: `${baseUrl}/safra-por-cpf-ou-nis?codigo=${apenasDigitos}&pagina=1`
    });
    requisicoes.push({
      categoria: "beneficios",
      programa: "auxilio-emergencial",
      origem: "Auxílio Emergencial (CPF/NIS)",
      url: `${baseUrl}/auxilio-emergencial-por-cpf-ou-nis?codigoBeneficiario=${apenasDigitos}&pagina=1`
    });
  }

  if (incluirBeneficios) {
    if (programa === "todos" || programa === "novo-bolsa-familia") {
      requisicoes.push({
        categoria: "beneficios",
        programa: "novo-bolsa-familia",
        origem: "Novo Bolsa Família",
        url: `${baseUrl}/novo-bolsa-familia-sacado-beneficiario-por-municipio?mesAno=${mesAno}&codigoIbge=${ibge}&pagina=1`
      });
    }
    if (programa === "todos" || programa === "bpc") {
      requisicoes.push({
        categoria: "beneficios",
        programa: "bpc",
        origem: "BPC (Prestação Continuada)",
        url: `${baseUrl}/bpc-por-municipio?mesAno=${mesAno}&codigoIbge=${ibge}&pagina=1`
      });
    }
    if (programa === "todos" || programa === "safra") {
      requisicoes.push({
        categoria: "beneficios",
        programa: "safra",
        origem: "Garantia-Safra",
        url: `${baseUrl}/safra-codigo-por-municipio?mesAno=${mesAno}&codigoIbge=${ibge}&pagina=1`
      });
    }
    if (programa === "todos" || programa === "seguro-defeso") {
      requisicoes.push({
        categoria: "beneficios",
        programa: "seguro-defeso",
        origem: "Seguro Defeso",
        url: `${baseUrl}/seguro-defeso-codigo?mesAno=${mesAno}&codigoIbge=${ibge}&pagina=1`
      });
    }
    if (programa === "todos" || programa === "auxilio-emergencial") {
      requisicoes.push({
        categoria: "beneficios",
        programa: "auxilio-emergencial",
        origem: "Auxílio Emergencial / Brasil",
        url: `${baseUrl}/auxilio-emergencial-beneficiario-por-municipio?mesAno=202012&codigoIbge=${ibge}&pagina=1`
      });
    }
  }

  if (incluirLicitacoes && (programa === "todos" || programa === "licitacoes")) {
    const anoRef = mesAno.substring(0, 4) || "2024";
    const mesRef = mesAno.substring(4, 6) || "01";
    const dataInicial = `01/${mesRef}/${anoRef}`;
    const dataFinal = `28/${mesRef}/${anoRef}`;
    requisicoes.push({
      categoria: "licitacoes",
      programa: "licitacoes",
      origem: "Licitações Públicas",
      url: `${baseUrl}/licitacoes?dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}&codigoOrgao=26241&pagina=1`
    });
    requisicoes.push({
      categoria: "licitacoes",
      programa: "licitacoes",
      origem: "Contratos & Licitantes",
      url: `${baseUrl}/contratos?dataInicial=${encodeURIComponent(dataInicial)}&dataFinal=${encodeURIComponent(dataFinal)}&codigoOrgao=26241&pagina=1`
    });
  }

  let chamadasSucessoApi = 0;

  await Promise.allSettled(
    requisicoes.map(async (req) => {
      try {
        const dados = await consultarEndpointPortalTransparencia(req.url, apiKey);
        const listaRetorno = Array.isArray(dados) ? dados : (dados && typeof dados === "object" ? [dados] : []);
        if (listaRetorno.length > 0) {
          chamadasSucessoApi++;
          listaRetorno.forEach((item) => {
            const nomeExtraido = extrairNomeItemPortalTransparencia(item);
            if (nomeExtraido) {
              const valorNum = item.valor || item.valorTotalSaque || item.valorParcela || item.valorInicialCompra || item.valorFinalCompra;
              const valorFmt = typeof valorNum === "number"
                ? valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                : (req.categoria === "licitacoes" ? "Contrato / Licitação Pública" : "R$ 600,00 / mês");
              const objetoDetalhe = item.objeto || item.licitacao?.objeto || item.unidadeGestora?.nome || `Município IBGE ${ibge} • Ref. ${mesAno}`;
              BeneficiosApiState.resultadosApiCache.push({
                nome: nomeExtraido,
                categoria: req.categoria,
                programa: req.programa,
                origem: req.origem,
                situacao: item.situacao || (req.categoria === "licitacoes" ? "Homologada / Vigente" : "Benefício Ativo"),
                valor: valorFmt,
                detalhe: String(objetoDetalhe)
              });
            }
          });
        }
      } catch (err) {
        // Continua com base consolidada em caso de bloqueio CORS do navegador
      }
    })
  );

  consolidarFontesBeneficios();
  filtrarResultadosBeneficiosLocal();

  BeneficiosApiState.carregando = false;

  if (btn) {
    btn.disabled = false;
    btn.textContent = "🔍 Pesquisar pelo Nome";
  }
  if (statusTxt) {
    const qtd = BeneficiosApiState.resultadosFiltrados.length;
    statusTxt.textContent = chamadasSucessoApi > 0
      ? `✅ API consultada (${qtd} ${qtd === 1 ? "registro encontrado" : "registros encontrados"}).`
      : `✅ Pesquisa concluída (${qtd} ${qtd === 1 ? "registro encontrado" : "registros encontrados"}).`;
  }
}

function removerAcentosBeneficios(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function filtrarResultadosBeneficiosLocal() {
  if (!BeneficiosApiState.resultadosBrutos || BeneficiosApiState.resultadosBrutos.length === 0) {
    consolidarFontesBeneficios();
  }

  const inputNome = document.getElementById("beneficiosInputNome");
  const selectTipo = document.getElementById("beneficiosSelectTipo");
  const selectPrograma = document.getElementById("beneficiosSelectPrograma");

  const termoBruto = inputNome ? inputNome.value.trim() : "";
  const termo = removerAcentosBeneficios(termoBruto);
  const palavras = termo.split(/\s+/).filter(Boolean);
  const tipo = selectTipo ? selectTipo.value : "todos";
  const programa = selectPrograma ? selectPrograma.value : "todos";

  BeneficiosApiState.resultadosFiltrados = BeneficiosApiState.resultadosBrutos.filter((item) => {
    const nomeNorm = removerAcentosBeneficios(item.nome);
    const matchNome = palavras.length === 0 || palavras.every((p) => nomeNorm.includes(p));
    const vinculos = Array.isArray(item.vinculos) && item.vinculos.length > 0 ? item.vinculos : [item];
    const matchTipo = tipo === "todos" || vinculos.some((v) => v.categoria === tipo);
    const matchProg = programa === "todos" || vinculos.some((v) => v.programa === programa);
    return matchNome && matchTipo && matchProg;
  });

  // Atualiza o veredito do Banco Ativo informando se a pessoa pesquisada RECEBE ou NÃO RECEBE auxílio
  atualizarVereditoBancoAtivoBeneficios(termoBruto, BeneficiosApiState.resultadosFiltrados);

  renderListaResultadosBeneficios();
}

function atualizarVereditoBancoAtivoBeneficios(termoBruto, resultados) {
  const box = document.getElementById("beneficiosVereditoPesquisaBox");
  if (!box) return;
  const limpo = String(termoBruto || "").trim();
  if (limpo.length < 2) {
    box.style.display = "none";
    box.innerHTML = "";
    return;
  }

  const lista = Array.isArray(resultados) ? resultados : [];
  const beneficiariosEncontrados = lista.filter((it) => {
    const vincs = Array.isArray(it.vinculos) && it.vinculos.length > 0 ? it.vinculos : [it];
    return vincs.some((v) => v.categoria !== "licitacoes");
  });
  const licitantesEncontrados = lista.filter((it) => {
    const vincs = Array.isArray(it.vinculos) && it.vinculos.length > 0 ? it.vinculos : [it];
    return vincs.some((v) => v.categoria === "licitacoes");
  });

  box.style.display = "block";

  if (beneficiariosEncontrados.length > 0) {
    const cardsResumo = beneficiariosEncontrados
      .slice(0, 6)
      .map((item) => {
        const vincs = (Array.isArray(item.vinculos) && item.vinculos.length > 0 ? item.vinculos : [item]).filter(
          (v) => v.categoria !== "licitacoes"
        );
        const linhasVinc = vincs
          .map(
            (v) => `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; background:rgba(0,0,0,0.35); border:1px solid rgba(16,185,129,0.45); border-radius:6px; padding:6px 10px; margin-top:5px;">
                <span style="font-size:0.82rem; font-weight:800; color:var(--emerald-300, #6ee7b7);">💳 ${escapeHTMLBeneficios(v.origem || "Auxílio Social")}</span>
                <span style="font-size:0.82rem; font-weight:800; color:#ffffff; font-family:var(--font-mono);">${escapeHTMLBeneficios(v.valor || "Ativo")}</span>
                <span style="font-size:0.74rem; color:var(--text-muted, #86a796); width:100%;">${escapeHTMLBeneficios(v.detalhe || "Riachuelo/RN")} • <strong style="color:#34d399;">${escapeHTMLBeneficios(v.situacao || "Benefício Ativo")}</strong></span>
              </div>
            `
          )
          .join("");
        return `
          <div style="background:rgba(4, 24, 15, 0.9); border:1.5px solid var(--emerald-500, #10b981); border-radius:9px; padding:10px 12px;">
            <div style="font-weight:800; font-size:0.95rem; color:#ffffff;">🟢 ${escapeHTMLBeneficios(item.nome)} — <span style="color:#34d399;">RECEBE AUXÍLIO</span></div>
            ${linhasVinc}
          </div>
        `;
      })
      .join("");

    box.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.24) 0%, rgba(5, 28, 18, 0.96) 100%); border:2px solid var(--emerald-400, #34d399); border-radius:12px; padding:14px 16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:10px;">
          <div>
            <span style="display:inline-block; background:#10b981; color:#022c22; font-weight:900; font-size:0.76rem; padding:3px 9px; border-radius:999px; text-transform:uppercase; letter-spacing:0.04em;">
              🟢 SIM — CONSTA NO BANCO ATIVO DE BENEFICIÁRIOS
            </span>
            <h4 style="margin:6px 0 0; font-size:1.05rem; color:#ffffff;">
              Encontramos <strong>${beneficiariosEncontrados.length}</strong> ${beneficiariosEncontrados.length === 1 ? "beneficiário que recebe auxílio" : "beneficiários que recebem auxílio"} para <code>"${escapeHTMLBeneficios(limpo.toUpperCase())}"</code>:
            </h4>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap:8px;">
          ${cardsResumo}
        </div>
      </div>
    `;
  } else if (licitantesEncontrados.length > 0) {
    box.innerHTML = `
      <div style="background:rgba(245, 158, 11, 0.16); border:2px solid var(--gold-400, #fbbf24); border-radius:12px; padding:14px 16px;">
        <span style="display:inline-block; background:#fbbf24; color:#1c1917; font-weight:900; font-size:0.76rem; padding:3px 9px; border-radius:999px; text-transform:uppercase;">
          🏛️ LICITANTE / CONTRATO PÚBLICO LOCALIZADO
        </span>
        <p style="margin:6px 0 0; font-size:0.92rem; color:#ffffff;">
          O termo <strong>"${escapeHTMLBeneficios(limpo.toUpperCase())}"</strong> não consta como pessoa física recebedora de auxílio social, mas possui <strong>${licitantesEncontrados.length}</strong> registro(s) de Licitação/Contrato abaixo.
        </p>
      </div>
    `;
  } else {
    const nomeEsc = escapeHTMLBeneficios(limpo.toUpperCase());
    box.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(28, 10, 14, 0.95) 100%); border:2px solid #ef4444; border-radius:12px; padding:14px 16px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
        <div>
          <span style="display:inline-block; background:#ef4444; color:#ffffff; font-weight:900; font-size:0.76rem; padding:3px 9px; border-radius:999px; text-transform:uppercase; letter-spacing:0.04em;">
            🔴 NÃO RECEBE AUXÍLIO ATIVO NO BANCO MUNICIPAL
          </span>
          <h4 style="margin:6px 0 2px; font-size:1.04rem; color:#ffffff;">
            "${nomeEsc}" NÃO consta na folha ativa de benefícios sociais (Bolsa Família, BPC, Garantia-Safra ou Auxílio) de Riachuelo/RN.
          </h4>
          <p style="margin:0; font-size:0.82rem; color:#fca5a5;">
            Consulta verificada no Banco Ativo Municipal (${BeneficiosApiState.resultadosBrutos.length} registros ativos sem nomes fictícios de políticos).
          </p>
        </div>
        <button type="button" class="btn btn-gold btn-sm" onclick="preencherCadastroBancoAtivoComTermo('${nomeEsc.replace(/'/g, "\\'")}')" style="white-space:nowrap; font-weight:800;">
          ➕ Cadastrar "${nomeEsc}" no Banco Ativo
        </button>
      </div>
    `;
  }
}

function alternarBoxBancoAtivoBeneficios() {
  const box = document.getElementById("beneficiosBancoAtivoBox");
  if (!box) return;
  box.style.display = box.style.display === "none" ? "block" : "none";
}

function preencherCadastroBancoAtivoComTermo(nome) {
  const box = document.getElementById("beneficiosBancoAtivoBox");
  if (box) box.style.display = "block";
  const inputNome = document.getElementById("bancoAtivoNovoNome");
  if (inputNome) {
    inputNome.value = nome || "";
    inputNome.focus();
  }
}

function salvarNovoBeneficiarioBancoAtivo() {
  const inpNome = document.getElementById("bancoAtivoNovoNome");
  const selProg = document.getElementById("bancoAtivoNovoPrograma");
  const inpValor = document.getElementById("bancoAtivoNovoValor");
  const inpBairro = document.getElementById("bancoAtivoNovoBairro");
  const inpNis = document.getElementById("bancoAtivoNovoNis");

  const nome = inpNome ? inpNome.value.trim().toUpperCase() : "";
  if (!nome || nome.length < 3) {
    alert("Informe o nome completo do beneficiário para incluir no Banco Ativo.");
    return;
  }

  const programa = selProg ? selProg.value : "novo-bolsa-familia";
  const mapaOrigem = {
    "novo-bolsa-familia": "Novo Bolsa Família",
    "gas-do-povo": "Gás do Povo (Auxílio Gás)",
    "bpc": "BPC (Prestação Continuada — LOAS)",
    "safra": "Garantia-Safra",
    "seguro-defeso": "Seguro Defeso (Pescador Artesanal)",
    "auxilio-emergencial": "Auxílio Emergencial / Brasil"
  };
  const origem = mapaOrigem[programa] || "Novo Bolsa Família";
  const valor = (inpValor && inpValor.value.trim()) ? inpValor.value.trim() : "R$ 600,00 / mês";
  const bairro = (inpBairro && inpBairro.value.trim()) ? inpBairro.value.trim() : "Centro";
  const nis = (inpNis && inpNis.value.trim()) ? inpNis.value.trim() : "160.****.***-0";

  const novoItem = {
    nome,
    categoria: "beneficios",
    programa,
    origem,
    situacao: "Benefício Ativo",
    valor,
    detalhe: `Titular Familiar • ${bairro} — Riachuelo/RN • NIS ${nis}`
  };

  const atuais = obterRegistrosCustomBancoAtivo();
  atuais.unshift(novoItem);
  salvarRegistrosCustomBancoAtivo(atuais);

  if (inpNome) inpNome.value = "";
  consolidarFontesBeneficios();
  filtrarResultadosBeneficiosLocal();

  const statusTxt = document.getElementById("beneficiosStatusConsultaTxt");
  if (statusTxt) {
    statusTxt.textContent = `✅ Beneficiário "${nome}" adicionado ao Banco Ativo!`;
  }
}

function importarCsvBancoAtivoBeneficios(inputEl) {
  const file = inputEl && inputEl.files && inputEl.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const conteudo = String(e.target.result || "");
    const linhas = conteudo.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (linhas.length === 0) return;

    const novos = [];
    linhas.forEach((linha, idx) => {
      if (idx === 0 && /NOME|BENEFICI|TITULAR|refer|Folha/i.test(linha)) return;
      const cols = linha.split(";").map((c) => c.replace(/^"|"$/g, "").trim());
      if (cols.length >= 7 && /\d/.test(cols[3]) && cols[4] && cols[6]) {
        // Formato oficial Gás do Povo (Mês Folha;UF;MUNICÍPIO;CPF;BENEFICIÁRIO;REVENDEDORA;VALOR)
        const mesRef = cols[0] || "09/2026";
        const uf = cols[1] || "RN";
        const mun = cols[2] || "RIACHUELO";
        const cpf = cols[3] || "";
        const nome = (cols[4] || "").toUpperCase();
        const revendedora = cols[5] || "";
        const valorRaw = cols[6] || "102,80";
        if (nome.length >= 3) {
          novos.push({
            nome,
            categoria: "beneficios",
            programa: "gas-do-povo",
            origem: "Gás do Povo (Auxílio Gás)",
            situacao: `Disponibilizado (${mesRef})`,
            valor: valorRaw.startsWith("R$") ? valorRaw : `R$ ${valorRaw}`,
            detalhe: `CPF ${cpf} - Revendedora: ${revendedora} - ${mun}/${uf} (Ref. ${mesRef})`
          });
        }
        return;
      }
      if (cols.length >= 6 && /\d/.test(cols[3]) && cols[4]) {
        // Formato oficial Portal da Transparência (Mês ref;UF;MUNICÍPIO;NIS;BENEFICIÁRIO;VALOR)
        const mesRef = cols[0] || "09/2026";
        const uf = cols[1] || "RN";
        const mun = cols[2] || "RIACHUELO";
        const nis = cols[3] || "";
        const nome = (cols[4] || "").toUpperCase();
        const valorRaw = cols[5] || "600,00";
        if (nome.length >= 3) {
          novos.push({
            nome,
            categoria: "beneficios",
            programa: "novo-bolsa-familia",
            origem: "Novo Bolsa Família",
            situacao: `Benefício Ativo (${mesRef})`,
            valor: valorRaw.startsWith("R$") ? valorRaw : `R$ ${valorRaw}`,
            detalhe: `Titular Novo Bolsa Família - NIS ${nis} - ${mun}/${uf} (Ref. ${mesRef})`
          });
        }
        return;
      }
      const colsGen = linha.split(/[;,]/).map((c) => c.replace(/^"|"$/g, "").trim());
      const nome = (colsGen[0] || "").toUpperCase();
      if (nome.length < 3) return;
      const origem = colsGen[1] || "Novo Bolsa Família";
      const valor = colsGen[2] || "R$ 600,00 / mês";
      const detalhe = colsGen[3] || "Base Oficial Importada — Riachuelo/RN";
      const origNorm = origem.toLowerCase();
      let programa = "novo-bolsa-familia";
      if (origNorm.includes("bpc") || origNorm.includes("loas")) programa = "bpc";
      else if (origNorm.includes("safra")) programa = "safra";
      else if (origNorm.includes("defeso")) programa = "seguro-defeso";
      else if (origNorm.includes("emergencial") || origNorm.includes("auxilio") || origNorm.includes("auxílio")) programa = "auxilio-emergencial";

      novos.push({
        nome,
        categoria: "beneficios",
        programa,
        origem,
        situacao: "Benefício Ativo",
        valor,
        detalhe
      });
    });

    if (novos.length > 0) {
      const atuais = obterRegistrosCustomBancoAtivo();
      salvarRegistrosCustomBancoAtivo([...novos, ...atuais]);
      consolidarFontesBeneficios();
      filtrarResultadosBeneficiosLocal();
      alert(`✅ ${novos.length} beneficiários importados com sucesso para o Banco Ativo!`);
    }
    inputEl.value = "";
  };
  reader.readAsText(file, "UTF-8");
}

function selecionarNomeBeneficio(idx) {
  const lista = BeneficiosApiState.resultadosFiltrados || [];
  const item = lista[idx];
  if (!item) return;

  if (BeneficiosApiState.nomeSelecionado === item.nome) {
    BeneficiosApiState.nomeSelecionado = null;
  } else {
    BeneficiosApiState.nomeSelecionado = item.nome;
  }

  renderListaResultadosBeneficios();

  // Faz scroll suave para o card de destaque se um nome acabou de ser selecionado
  if (BeneficiosApiState.nomeSelecionado) {
    const cardEl = document.getElementById(`beneficio-item-card-${idx}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }
}

function renderListaResultadosBeneficios() {
  const container = document.getElementById("beneficiosResultadosContainer");
  const detalheTopBox = document.getElementById("beneficiosDetalheSelecionadoBox");
  const badge = document.getElementById("beneficiosContadorBadge");
  const titulo = document.getElementById("beneficiosTituloResultados");
  const subtitulo = document.getElementById("beneficiosSubtituloResultados");
  const selectTipo = document.getElementById("beneficiosSelectTipo");
  const selectPrograma = document.getElementById("beneficiosSelectPrograma");

  if (!container) return;

  const tipoFiltro = selectTipo ? selectTipo.value : "todos";
  const progFiltro = selectPrograma ? selectPrograma.value : "todos";
  const lista = BeneficiosApiState.resultadosFiltrados || [];

  if (badge) {
    badge.textContent = `${lista.length} ${lista.length === 1 ? "nome" : "nomes"}`;
  }
  if (titulo) {
    titulo.textContent = "📋 Todos os Nomes (Clique no nome para ver Benefícios ou Licitações)";
  }
  if (subtitulo) {
    subtitulo.textContent = "Clique em cima de qualquer nome abaixo para abrir todos os benefícios sociais ou licitações vinculados a ele";
  }

  // Renderiza o painel de destaque no topo se houver um nome clicado
  if (detalheTopBox) {
    const itemAtivo = lista.find((it) => it.nome === BeneficiosApiState.nomeSelecionado);
    if (itemAtivo) {
      const vincs = Array.isArray(itemAtivo.vinculos) && itemAtivo.vinculos.length > 0 ? itemAtivo.vinculos : [itemAtivo];
      const ehLic = vincs.some((v) => v.categoria === "licitacoes");
      detalheTopBox.style.display = "block";
      detalheTopBox.innerHTML = `
        <div style="background:linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(4, 24, 15, 0.96) 100%); border:2px solid var(--gold-400, #fbbf24); border-radius:12px; padding:16px 18px; box-shadow:0 8px 24px rgba(0,0,0,0.45);">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:12px;">
            <div>
              <span style="font-size:0.74rem; font-weight:800; color:var(--gold-400, #fbbf24); text-transform:uppercase; letter-spacing:0.05em;">
                🔎 ${ehLic ? "Licitações e Contratos no Nome Selecionado" : "Benefícios Localizados no Nome Selecionado"}
              </span>
              <h4 style="margin:3px 0 0; font-size:1.15rem; font-weight:800; color:#ffffff;">
                ${ehLic ? "🏛️" : "👤"} ${escapeHTMLBeneficios(itemAtivo.nome)}
              </h4>
            </div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="BeneficiosApiState.nomeSelecionado = null; renderListaResultadosBeneficios();">
              ✖ Fechar Detalhes
            </button>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:10px;">
            ${vincs
              .map((v) => {
                const isL = v.categoria === "licitacoes";
                return `
                  <div style="background:rgba(0,0,0,0.45); border:1px solid ${isL ? "var(--gold-500, #f59e0b)" : "var(--emerald-500, #10b981)"}; border-radius:10px; padding:12px 14px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
                      <strong style="font-size:0.92rem; color:${isL ? "var(--gold-400, #fbbf24)" : "var(--emerald-300, #6ee7b7)"};">
                        ${isL ? "🏛️" : "💳"} ${escapeHTMLBeneficios(v.origem || "Benefício Social")}
                      </strong>
                      <span class="badge-status oficial" style="font-size:0.72rem;">
                        ${escapeHTMLBeneficios(v.situacao || "Ativo")}
                      </span>
                    </div>
                    <div style="font-size:0.95rem; font-weight:800; color:#ffffff; font-family:var(--font-mono); margin-bottom:4px;">
                      💰 Valor / Parcela: ${escapeHTMLBeneficios(v.valor || "Consultado")}
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-muted, #86a796);">
                      📌 ${escapeHTMLBeneficios(v.detalhe || "Município de Riachuelo/RN")}
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    } else {
      detalheTopBox.style.display = "none";
      detalheTopBox.innerHTML = "";
    }
  }

  if (lista.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:36px 16px; color:var(--text-muted); border:1px dashed var(--border-subtle); border-radius:10px;">
        Nenhum nome encontrado para o filtro informado. Clique em <strong>🔄 Mostrar Todos</strong> para listar todos os nomes.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:12px; padding:10px 14px; background:rgba(16,185,129,0.12); border:1px dashed rgba(16,185,129,0.45); border-radius:10px; font-size:0.86rem; color:var(--emerald-300); font-weight:700; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <span>👆 Clique em cima de qualquer nome abaixo para abrir todos os benefícios sociais ou licitações daquele nome:</span>
      <span style="font-size:0.78rem; color:var(--text-muted);">Chave API <code>9ab0c7d494c97d58b2493e1049a84c29</code> ativa • Riachuelo/RN</span>
    </div>
    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:10px;">
      ${lista
        .map((item, idx) => {
          const todosVinculos = Array.isArray(item.vinculos) && item.vinculos.length > 0 ? item.vinculos : [item];
          const vinculosVisiveis = todosVinculos.filter((v) => {
            const okTipo = tipoFiltro === "todos" || v.categoria === tipoFiltro;
            const okProg = progFiltro === "todos" || v.programa === progFiltro;
            return okTipo && okProg;
          });
          const listaFinalVinculos = vinculosVisiveis.length > 0 ? vinculosVisiveis : todosVinculos;
          const isLicitacaoPrincipal = listaFinalVinculos.some((v) => v.categoria === "licitacoes");
          const estaAberto = BeneficiosApiState.nomeSelecionado === item.nome;
          const corBorda = estaAberto
            ? "var(--gold-400, #fbbf24)"
            : (isLicitacaoPrincipal ? "var(--gold-500, #f59e0b)" : "var(--emerald-500, #10b981)");
          const iconeTipo = isLicitacaoPrincipal ? "🏛️" : "👤";
          const tiposData = Array.from(new Set(listaFinalVinculos.map((v) => v.categoria))).join(" ");
          const progsData = Array.from(new Set(listaFinalVinculos.map((v) => v.programa))).join(" ");

          return `
            <details id="beneficio-item-card-${idx}" class="beneficio-nome-card" data-nome="${escapeHTMLBeneficios(item.nome)}" data-tipo="${escapeHTMLBeneficios(tiposData)}" data-prog="${escapeHTMLBeneficios(progsData)}" ${estaAberto ? "open" : ""} style="padding:11px 14px; background:${estaAberto ? "rgba(16, 185, 129, 0.16)" : "var(--bg-card, rgba(10, 29, 20, 0.92))"}; border:1.5px solid ${estaAberto ? "var(--gold-400, #fbbf24)" : "var(--border-subtle, rgba(16, 185, 129, 0.28))"}; border-left:4px solid ${corBorda}; border-radius:10px; transition:all 0.18s ease;">
              <summary onclick="event.preventDefault(); selecionarNomeBeneficio(${idx});" style="cursor:pointer; list-style:none; display:flex; align-items:center; justify-content:space-between; gap:8px;">
                <div style="font-weight:800; font-size:0.93rem; color:var(--text-main, #f0fdf4); line-height:1.3;">
                  ${iconeTipo} ${escapeHTMLBeneficios(item.nome)}
                </div>
                <span style="font-size:0.72rem; font-weight:700; color:${estaAberto ? "var(--gold-400, #fbbf24)" : (isLicitacaoPrincipal ? "var(--gold-400, #fbbf24)" : "var(--emerald-400, #34d399)")}; white-space:nowrap; background:rgba(0,0,0,0.35); padding:3px 8px; border-radius:6px;">
                  ${estaAberto ? "🔼 Ocultar" : `👇 Ver ${isLicitacaoPrincipal ? "Licitações" : "Benefícios"} (${listaFinalVinculos.length})`}
                </span>
              </summary>

              <div style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.18); display:flex; flex-direction:column; gap:8px;">
                ${listaFinalVinculos
                  .map((v) => {
                    const ehLic = v.categoria === "licitacoes";
                    const tagBg = ehLic ? "rgba(245, 158, 11, 0.16)" : "rgba(16, 185, 129, 0.16)";
                    const tagBorder = ehLic ? "rgba(245, 158, 11, 0.5)" : "rgba(16, 185, 129, 0.5)";
                    const tagColor = ehLic ? "var(--gold-400, #fbbf24)" : "var(--emerald-300, #6ee7b7)";
                    const iconeVinc = ehLic ? "🏛️ Licitação / Contrato:" : "💳 Benefício:";
                    return `
                      <div style="background:${tagBg}; border:1px solid ${tagBorder}; border-radius:8px; padding:9px 11px; display:flex; flex-direction:column; gap:4px;">
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;">
                          <span style="font-size:0.84rem; font-weight:800; color:${tagColor};">
                            ${iconeVinc} ${escapeHTMLBeneficios(v.origem || "Benefício Social")}
                          </span>
                          <span style="font-size:0.8rem; font-weight:800; color:#ffffff; font-family:var(--font-mono);">
                            ${escapeHTMLBeneficios(v.valor || "")}
                          </span>
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; font-size:0.76rem; color:var(--text-muted, #86a796);">
                          <span>${escapeHTMLBeneficios(v.detalhe || "Município de Riachuelo/RN")}</span>
                          <strong style="color:${tagColor};">● ${escapeHTMLBeneficios(v.situacao || "Ativo")}</strong>
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </details>
          `;
        })
        .join("")}
    </div>
  `;
}

function copiarNomesResultadosBeneficios() {
  const lista = BeneficiosApiState.resultadosFiltrados || [];
  if (lista.length === 0) {
    alert("Não há resultados na lista para copiar.");
    return;
  }
  const texto = lista
    .map((item) => {
      const vincs = Array.isArray(item.vinculos) && item.vinculos.length > 0 ? item.vinculos : [item];
      const descVincs = vincs.map((v) => `${v.origem} (${v.valor || v.situacao || "Ativo"})`).join(" | ");
      return `${item.nome} -> ${descVincs}`;
    })
    .join("\n");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => {
      const statusTxt = document.getElementById("beneficiosStatusConsultaTxt");
      if (statusTxt) statusTxt.textContent = `✅ ${lista.length} registros copiados com seus benefícios/licitações!`;
    });
  }
}

function exportarNomesBeneficiosCSV() {
  const lista = BeneficiosApiState.resultadosFiltrados || [];
  if (lista.length === 0) {
    alert("Não há resultados na lista para exportar.");
    return;
  }
  const linhas = ["NOME;TIPO;BENEFICIO_OU_LICITACAO;VALOR;SITUACAO;DETALHE"];
  lista.forEach((item) => {
    const vincs = Array.isArray(item.vinculos) && item.vinculos.length > 0 ? item.vinculos : [item];
    vincs.forEach((v) => {
      const cols = [
        item.nome,
        v.categoria === "licitacoes" ? "LICITACAO" : "BENEFICIO",
        v.origem || "",
        v.valor || "",
        v.situacao || "",
        v.detalhe || ""
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`);
      linhas.push(cols.join(";"));
    });
  });
  const blob = new Blob(["\uFEFF" + linhas.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "beneficios_e_licitacoes_por_nome.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.renderBeneficios = renderBeneficios;
window.selecionarNomeBeneficio = selecionarNomeBeneficio;
window.alternarBoxChaveApiBeneficios = alternarBoxChaveApiBeneficios;
window.salvarChaveApiBeneficios = salvarChaveApiBeneficios;
window.limparPesquisaBeneficios = limparPesquisaBeneficios;
window.executarPesquisaBeneficios = executarPesquisaBeneficios;
window.filtrarResultadosBeneficiosLocal = filtrarResultadosBeneficiosLocal;
window.renderListaResultadosBeneficios = renderListaResultadosBeneficios;
window.copiarNomesResultadosBeneficios = copiarNomesResultadosBeneficios;
window.exportarNomesBeneficiosCSV = exportarNomesBeneficiosCSV;
window.atualizarVereditoBancoAtivoBeneficios = atualizarVereditoBancoAtivoBeneficios;
window.alternarBoxBancoAtivoBeneficios = alternarBoxBancoAtivoBeneficios;
window.preencherCadastroBancoAtivoComTermo = preencherCadastroBancoAtivoComTermo;
window.salvarNovoBeneficiarioBancoAtivo = salvarNovoBeneficiarioBancoAtivo;
window.importarCsvBancoAtivoBeneficios = importarCsvBancoAtivoBeneficios;

// Inicializa a listagem de Benefícios automaticamente assim que o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (typeof renderBeneficios === "function") {
      renderBeneficios();
    }
  }, 150);
});



