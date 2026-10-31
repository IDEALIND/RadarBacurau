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
    const viewsPermitidas = ["mapa", "eleitores", "demandas", "whatsapp", "estatisticas"];
    if (!viewsPermitidas.includes(viewId)) {
      showToast("🔒 Acesso restrito: seu perfil de Liderança possui acesso ao Cadastro de Eleitores, Mapa Territorial, Demandas e WhatsApp.");
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
    const viewsPermitidas = ["eleitores", "whatsapp", "demandas", "mapa"];
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
      const lidVinculada = (db.data.liderancas || []).find(l => 
        (com.liderancaResponsavelId && l.id === com.liderancaResponsavelId) ||
        (Array.isArray(l.comunidadesVinculadas) && l.comunidadesVinculadas.includes(com.id))
      );
      if (lidVinculada && lidVinculada.nome) {
        com.liderancaNome = lidVinculada.nome;
        com.liderancaResponsavelId = lidVinculada.id;
        nomeLider = lidVinculada.nome;
        temLider = true;
      }
    }

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
    if (!nomeLider) {
      const lid = (db.data.liderancas || []).find(l => Array.isArray(l.comunidadesVinculadas) && l.comunidadesVinculadas.includes(c.id));
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
    alert("Por favor, informe o nome da liderança que cuidará deste bairro.");
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
    atualizarMetometroConsolidado();
    updateSidebarCounters();
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
            <h2>RADAR BACURAU — FICHA DE CAMPO TERRITORIAL</h2>
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
          <div class="ficha-assinatura-cargo">Radar Bacurau • Riachuelo–RN</div>
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

  const elComs = document.getElementById("kpi-comunidades");
  const elComsSub = document.getElementById("kpi-comunidades-sub");
  const elLids = document.getElementById("kpi-liderancas");
  const elLidsSub = document.getElementById("kpi-liderancas-sub");
  const elSecs = document.getElementById("kpi-secoes");
  const elVotos = document.getElementById("kpi-votos");

  if (elComs) elComs.textContent = stats.totalComunidades;
  if (elComsSub) elComsSub.textContent = `${stats.bairrosCount} Bairros • ${stats.assentamentosCount} Assentamentos`;
  if (elLids) elLids.textContent = stats.bairrosComLideranca;
  if (elLidsSub) elLidsSub.textContent = `${stats.bairrosComLideranca} Bairros com líder`;
  if (elSecs) elSecs.textContent = stats.totalSecoes;
  if (elVotos) elVotos.textContent = Number(stats.totalVotosContabilizados).toLocaleString("pt-BR");
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

  // Sincroniza lideranças criadas via comunidades caso não existam em db.data.liderancas
  const coms = db.getComunidades();
  coms.forEach(c => {
    if (c.liderancaNome) {
      const existe = (db.data.liderancas || []).some(l => l.nome && l.nome.toLowerCase() === c.liderancaNome.toLowerCase());
      if (!existe) {
        db.saveLideranca({
          nome: c.liderancaNome,
          apelido: "",
          telefone: c.liderancaContato || "",
          cargoPapel: "Líder de Bairro",
          status: "Ativo",
          dataInicio: new Date().toISOString().split("T")[0],
          comunidadesVinculadas: [c.id],
          observacoes: ""
        });
      }
    }
  });

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
  const lid = db.getLiderancaById(id);
  if (!lid) return;
  if (confirm(`Tem certeza que deseja excluir/remover a liderança "${lid.nome}"?`)) {
    db.deleteLideranca(id);
    showToast(`Liderança "${lid.nome}" removida com sucesso.`);
    renderLiderancas();
    renderComunidades();
    carregarMarcadoresMapa();
    updateSidebarCounters();
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
        <td colspan="10" style="text-align:center; padding:35px; color:var(--text-muted);">
          Nenhum eleitor localizado com os filtros selecionados. Clique em "+ Cadastrar Eleitor" para registrar o primeiro.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(e => {
    const temFoto = e.fotoTitulo && e.fotoTitulo.trim() !== "";
    const fotoHtml = temFoto
      ? `<img src="${e.fotoTitulo}" class="eleitor-foto-thumb" onclick="abrirFotoTituloModal('${e.id}')" title="Clique para ampliar o título de ${e.nome}">`
      : `<div class="eleitor-foto-thumb-empty" onclick="editarEleitor('${e.id}')" title="Sem foto anexada. Clique para anexar foto do título.">📷<span>Sem Foto</span></div>`;

    const tituloExibicao = e.numeroTitulo ? formatarTituloExibicao(e.numeroTitulo) : "Não informado";

    return `
      <tr>
        <td>${fotoHtml}</td>
        <td>
          <strong style="color:#ffffff; font-size:0.92rem;">${e.nome}</strong><br>
          <span style="font-family:var(--font-mono); color:var(--gold-400); font-size:0.77rem; display:inline-block; margin-top:2px;">🪪 Título: <strong>${tituloExibicao}</strong></span>
          ${e.observacoes ? `<div style="font-size:0.73rem; color:var(--text-muted); margin-top:2px;">${e.observacoes.length > 40 ? e.observacoes.slice(0, 40) + '...' : e.observacoes}</div>` : ''}
        </td>
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
          <span class="badge-status oficial" style="font-family:var(--font-mono); font-weight:800; font-size:0.78rem; background:rgba(217,119,6,0.18); color:var(--gold-400); border-color:#d97706;">
            Seção ${e.secao || '-'}
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
            ${temFoto ? `<button class="btn btn-secondary btn-sm" onclick="abrirFotoTituloModal('${e.id}')" title="Ver Foto do Título">📷 Ver Título</button>` : ''}
            ${e.telefone ? `<button class="btn btn-secondary btn-sm" onclick="dispararWhatsAppEleitor('${e.id}')" title="Enviar WhatsApp Direto" style="color:#25D366; font-weight:700; font-size:1rem; padding:3px 7px;">💬</button>` : ''}
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
          ? `<img src="${e.fotoTitulo}" alt="Foto Título">`
          : `<span>📷</span>`;

        return `
          <div class="eleitor-mobile-card">
            <div class="eleitor-mobile-card-top">
              <div class="eleitor-mobile-avatar" onclick="${temFoto ? `abrirFotoTituloModal('${e.id}')` : `editarEleitor('${e.id}')`}" title="${temFoto ? 'Ver foto do título' : 'Anexar foto'}">
                ${fotoHtml}
              </div>
              <div class="eleitor-mobile-info">
                <div class="eleitor-mobile-name">${e.nome}</div>
                <div class="eleitor-mobile-endereco">
                  📍 ${e.rua ? `${e.rua}, Nº ${e.numero || 'S/N'}` : (e.endereco || 'Endereço não informado')}
                </div>
                <div class="eleitor-mobile-badges">
                  <span class="badge-bairro">📍 ${e.bairroNome || '-'}</span>
                  <span class="badge-secao">Seção ${e.secao || '-'}</span>
                  ${temFoto ? '<span class="badge-doc">🪪 Título Foto</span>' : ''}
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

  const tituloModal = document.getElementById("modalEleitorTitulo");
  const subModal = document.getElementById("modalEleitorSubtitulo");
  if (tituloModal) tituloModal.textContent = "📝 Cadastrar Novo Eleitor";
  if (subModal) subModal.textContent = "Vincule o eleitor ao seu bairro, seção e liderança exclusiva responsável";

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
  const titInput = document.getElementById("formEleitorNumeroTitulo");
  if (titInput) titInput.value = e.numeroTitulo ? formatarTituloExibicao(e.numeroTitulo) : "";
  document.getElementById("formEleitorTelefone").value = e.telefone || "";
  document.getElementById("formEleitorBairro").value = e.bairroNome || "";
  document.getElementById("formEleitorLideranca").value = e.liderancaNome || "";
  document.getElementById("formEleitorSecao").value = e.secao || "";
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
  const numeroTitulo = (document.getElementById("formEleitorNumeroTitulo")?.value || "").trim();
  const bairro = (document.getElementById("formEleitorBairro")?.value || "").trim();
  const rua = (document.getElementById("formEleitorRua")?.value || "").trim();
  const secao = (document.getElementById("formEleitorSecao")?.value || "").trim();

  if (!nome) {
    showToast("Informe o nome completo do eleitor.");
    document.getElementById("formEleitorNome")?.focus();
    return;
  }
  if (!numeroTitulo) {
    showToast("Informe o número do Título de Eleitor.");
    document.getElementById("formEleitorNumeroTitulo")?.focus();
    return;
  }
  if (!bairro) {
    showToast("Selecione o bairro do eleitor.");
    return;
  }
  if (!secao) {
    showToast("Selecione a seção eleitoral.");
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
    numeroTitulo: numeroTitulo,
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
    showToast(`Eleitor "${nome}" salvo com exclusividade para ${lider}!`);
    renderEleitores();
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

  const titFormatado = e.numeroTitulo ? formatarTituloExibicao(e.numeroTitulo) : "Não informado";

  if (nomeEl) nomeEl.innerHTML = `📷 Título de Eleitor — <span style="color:var(--gold-400);">${e.nome}</span>`;
  if (subEl) subEl.textContent = `${e.bairroNome} • Seção ${e.secao} • 8ª Zona Eleitoral • Líder: ${e.liderancaNome || 'Sem liderança'}`;

  if (imgEl) {
    if (e.fotoTitulo && e.fotoTitulo.trim() !== "") {
      imgEl.src = e.fotoTitulo;
      imgEl.style.display = "block";
    } else {
      const mockSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320"><rect width="500" height="320" rx="14" fill="%23064e3b"/><rect x="12" y="12" width="476" height="296" rx="10" fill="%2303140c" stroke="%2310b981" stroke-width="2"/><text x="250" y="45" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23fbbf24" text-anchor="middle">JUSTIÇA ELEITORAL — REPÚBLICA FEDERATIVA DO BRASIL</text><text x="250" y="68" font-family="sans-serif" font-size="12" fill="%23a7f3d0" text-anchor="middle">TÍTULO ELEITORAL • 8ª ZONA ELEITORAL — RIACHUELO/RN</text><line x1="30" y1="80" x2="470" y2="80" stroke="%23059669" stroke-width="1"/><text x="40" y="105" font-family="sans-serif" font-size="11" fill="%2394a3b8">NÚMERO DO TÍTULO</text><text x="40" y="128" font-family="monospace" font-size="16" font-weight="bold" fill="%23fbbf24">${titFormatado}</text><text x="40" y="155" font-family="sans-serif" font-size="11" fill="%2394a3b8">NOME DO ELEITOR</text><text x="40" y="178" font-family="sans-serif" font-size="16" font-weight="bold" fill="%23ffffff">${encodeURIComponent(e.nome)}</text><text x="40" y="210" font-family="sans-serif" font-size="11" fill="%2394a3b8">ENDEREÇO / BAIRRO</text><text x="40" y="230" font-family="sans-serif" font-size="13" fill="%23e2e8f0">${encodeURIComponent(e.rua || '')}, ${encodeURIComponent(e.numero || 'S/N')} — ${encodeURIComponent(e.bairroNome || '')}</text><text x="40" y="265" font-family="sans-serif" font-size="11" fill="%2394a3b8">SEÇÃO</text><text x="40" y="292" font-family="monospace" font-size="20" font-weight="bold" fill="%23fbbf24">${e.secao}</text><text x="160" y="265" font-family="sans-serif" font-size="11" fill="%2394a3b8">ZONA</text><text x="160" y="292" font-family="monospace" font-size="20" font-weight="bold" fill="%2310b981">008</text><text x="260" y="265" font-family="sans-serif" font-size="11" fill="%2394a3b8">LIDERANÇA EXCLUSIVA</text><text x="260" y="290" font-family="sans-serif" font-size="12" font-weight="bold" fill="%2338bdf8">${encodeURIComponent(e.liderancaNome || 'Sem liderança')}</text></svg>`;
      imgEl.src = mockSvg;
      imgEl.style.display = "block";
    }
  }

  if (dadosEl) {
    dadosEl.innerHTML = `
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; font-size:0.83rem;">
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Nome do Eleitor:</span><br>
          <strong style="color:#ffffff;">${e.nome}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Número do Título:</span><br>
          <strong style="color:var(--gold-400); font-family:var(--font-mono);">${titFormatado}</strong>
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
        <div>
          <span style="color:var(--text-muted); font-size:0.75rem;">Seção Eleitoral:</span><br>
          <strong style="color:var(--gold-400);">Seção ${e.secao || '-'} (8ª Zona)</strong>
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

  let csv = "Nome;NumeroTitulo;Rua;Numero;EnderecoCompleto;Bairro;Secao;LiderancaExclusiva;Telefone;DataCadastro;TemFotoTitulo;Observacoes\n";
  lista.forEach(e => {
    const temFoto = e.fotoTitulo && e.fotoTitulo.trim() !== "" ? "SIM" : "NAO";
    csv += `"${e.nome || ''}";"${e.numeroTitulo || ''}";"${e.rua || ''}";"${e.numero || ''}";"${e.endereco || ''}";"${e.bairroNome || ''}";"${e.secao || ''}";"${e.liderancaNome || ''}";"${e.telefone || ''}";"${e.dataCadastro || ''}";"${temFoto}";"${(e.observacoes || '').replace(/"/g, '""')}"\n`;
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
    showToast("🔒 Acesso restrito: informe seu login e sua senha para entrar no Radar Bacurau.");
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

      showToast(`Bem-vindo(a) ao Radar Bacurau, ${user.nome}!`);

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


