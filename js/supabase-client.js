/**
 * RADAR BACURAU — Cliente de Sincronização em Nuvem (Supabase Realtime)
 * Permite que lideranças cadastrem eleitores pelo celular e o administrador
 * veja tudo centralizado em tempo real no computador.
 */

const SupabaseClient = {
  STORAGE_CONFIG_KEY: "RADAR_BACURAU_SUPABASE_CONFIG_V1",
  client: null,
  isSyncing: false,
  realtimeChannel: null,

  getConfig() {
    try {
      const saved = localStorage.getItem(this.STORAGE_CONFIG_KEY);
      return saved ? JSON.parse(saved) : { url: "", anonKey: "", enabled: false };
    } catch (e) {
      return { url: "", anonKey: "", enabled: false };
    }
  },

  saveConfig(url, anonKey, enabled = true) {
    const config = {
      url: (url || "").trim(),
      anonKey: (anonKey || "").trim(),
      enabled: Boolean(enabled && url && anonKey)
    };
    localStorage.setItem(this.STORAGE_CONFIG_KEY, JSON.stringify(config));
    this.init();
    return config;
  },

  init() {
    const config = this.getConfig();
    if (config.enabled && config.url && config.anonKey) {
      if (typeof supabase !== "undefined" && supabase.createClient) {
        try {
          this.client = supabase.createClient(config.url, config.anonKey);
          this.atualizarBadgeStatus(true);
          this.iniciarEscutaRealtime();
          // Puxa dados da nuvem na inicialização
          this.sincronizarTudo();
          console.log("☁️ [Supabase] Conectado e sincronizando em tempo real!");
          return true;
        } catch (e) {
          console.error("Falha ao inicializar Supabase:", e);
          this.atualizarBadgeStatus(false, "Erro ao conectar");
          return false;
        }
      } else {
        console.warn("SDK do Supabase ainda não carregado.");
      }
    } else {
      this.client = null;
      this.atualizarBadgeStatus(false, "Modo Local");
    }
    return false;
  },

  isConnected() {
    return Boolean(this.client && this.getConfig().enabled);
  },

  atualizarBadgeStatus(online, textoStatus = null) {
    const badges = document.querySelectorAll(".supabase-status-indicator");
    badges.forEach(b => {
      if (online) {
        b.className = "supabase-status-indicator online";
        b.innerHTML = `🟢 <span>Nuvem Sincronizada (Tempo Real)</span>`;
        b.title = "Conectado ao Supabase: Dados compartilhados entre celulares e computadores";
      } else {
        b.className = "supabase-status-indicator offline";
        b.innerHTML = `⚪ <span>${textoStatus || "Banco Local (Offline)"}</span>`;
        b.title = "Operando apenas no navegador atual. Configure o Supabase para sincronizar em múltiplos aparelhos.";
      }
    });

    const statusConfig = document.getElementById("supabaseConfigStatusMsg");
    if (statusConfig) {
      if (online) {
        statusConfig.innerHTML = `<span style="color:#25D366; font-weight:700;">🟢 Conectado ao Supabase com sucesso! Sincronização em tempo real ativa.</span>`;
      } else {
        statusConfig.innerHTML = `<span style="color:var(--text-muted);">⚪ Operando no modo local. Insira suas credenciais abaixo para ativar a nuvem.</span>`;
      }
    }
  },

  async testarConexao(url, anonKey) {
    if (typeof supabase === "undefined" || !supabase.createClient) {
      return { ok: false, error: "Biblioteca Supabase não carregada." };
    }
    try {
      const testClient = supabase.createClient(url, anonKey);
      // Tenta uma consulta rápida na tabela de eleitores ou lideranças
      const { data, error } = await testClient.from("eleitores").select("id").limit(1);
      if (error && error.code !== "PGRST116") {
        // Se a tabela não existir, ainda assim a conexão funcionou, avisa sobre as tabelas
        if (error.message && error.message.includes("does not exist")) {
          return { ok: true, avisos: "Conectou, mas as tabelas precisam ser criadas no painel do Supabase com o script SQL fornecido." };
        }
        return { ok: false, error: error.message };
      }
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // Sincronização Completa (Puxa tudo da Nuvem para o banco local)
  async sincronizarTudo() {
    if (!this.isConnected() || this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. Puxar Eleitores da Nuvem
      const { data: eleitoresNuvem, error: errEleitores } = await this.client.from("eleitores").select("*");
      if (!errEleitores && Array.isArray(eleitoresNuvem) && eleitoresNuvem.length > 0) {
        // Faz merge com os locais (preservando fotos e datas mais recentes)
        if (!db.data.eleitores) db.data.eleitores = [];
        eleitoresNuvem.forEach(eNuvem => {
          const idx = db.data.eleitores.findIndex(el => el.id === eNuvem.id);
          if (idx !== -1) {
            db.data.eleitores[idx] = { ...db.data.eleitores[idx], ...eNuvem };
          } else {
            db.data.eleitores.push(eNuvem);
          }
        });
      }

      // 2. Puxar Lideranças da Nuvem
      const { data: lidsNuvem, error: errLids } = await this.client.from("liderancas").select("*");
      if (!errLids && Array.isArray(lidsNuvem) && lidsNuvem.length > 0) {
        if (!db.data.liderancas) db.data.liderancas = [];
        lidsNuvem.forEach(lNuvem => {
          const idx = db.data.liderancas.findIndex(l => l.id === lNuvem.id);
          if (idx !== -1) {
            db.data.liderancas[idx] = { ...db.data.liderancas[idx], ...lNuvem };
          } else {
            db.data.liderancas.push(lNuvem);
          }
        });
      }

      // 3. Puxar Demandas da Nuvem
      const { data: demNuvem, error: errDem } = await this.client.from("demandas").select("*");
      if (!errDem && Array.isArray(demNuvem) && demNuvem.length > 0) {
        if (!db.data.demandas) db.data.demandas = [];
        demNuvem.forEach(dNuvem => {
          const idx = db.data.demandas.findIndex(d => d.id === dNuvem.id);
          if (idx !== -1) {
            db.data.demandas[idx] = { ...db.data.demandas[idx], ...dNuvem };
          } else {
            db.data.demandas.push(dNuvem);
          }
        });
      }

      db.save();
      if (typeof updateSidebarCounters === "function") updateSidebarCounters();
      
      // Re-renderiza a tela atual se necessário
      if (typeof AppState !== "undefined" && AppState.currentView) {
        if (AppState.currentView === "eleitores" && typeof renderEleitores === "function") renderEleitores();
        if (AppState.currentView === "liderancas" && typeof renderLiderancas === "function") renderLiderancas();
        if (AppState.currentView === "demandas" && typeof renderDemandas === "function") renderDemandas();
        if (AppState.currentView === "whatsapp" && typeof WhatsAppDispatcher !== "undefined") {
          WhatsAppDispatcher.aplicarFiltrosInterface();
        }
      }
      console.log("☁️ [Supabase] Sincronização concluída com sucesso!");
    } catch (e) {
      console.warn("Aviso na sincronização Supabase:", e);
    } finally {
      this.isSyncing = false;
    }
  },

  // Enviar Dados Locais para a Nuvem (Subida inicial em massa)
  async enviarTodosDadosLocaisParaNuvem() {
    if (!this.isConnected()) {
      if (typeof showToast === "function") showToast("Supabase não está conectado.");
      return;
    }

    try {
      const eleitores = db.getEleitores() || [];
      const liderancas = db.getLiderancas() || [];
      const demandas = db.getDemandas() || [];

      if (eleitores.length > 0) {
        await this.client.from("eleitores").upsert(eleitores);
      }
      if (liderancas.length > 0) {
        await this.client.from("liderancas").upsert(liderancas);
      }
      if (demandas.length > 0) {
        await this.client.from("demandas").upsert(demandas);
      }

      if (typeof showToast === "function") {
        showToast("☁️ Todos os dados locais foram enviados com sucesso para o Supabase!");
      }
    } catch (e) {
      console.error("Erro ao subir dados locais para nuvem:", e);
      if (typeof showToast === "function") showToast("Erro ao subir dados: " + e.message);
    }
  },

  // Escuta Realtime (quando alguém no celular salvar algo, atualiza aqui na hora)
  iniciarEscutaRealtime() {
    if (!this.isConnected()) return;

    try {
      if (this.realtimeChannel) {
        this.client.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = this.client
        .channel("radar-bacurau-realtime")
        .on("postgres_changes", { event: "*", schema: "public", table: "eleitores" }, payload => {
          console.log("⚡ [Realtime] Mudança em Eleitores recebida do celular/nuvem:", payload);
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const idx = (db.data.eleitores || []).findIndex(e => e.id === payload.new.id);
            if (idx !== -1) {
              db.data.eleitores[idx] = payload.new;
            } else {
              if (!db.data.eleitores) db.data.eleitores = [];
              db.data.eleitores.unshift(payload.new);
            }
          } else if (payload.eventType === "DELETE") {
            db.data.eleitores = (db.data.eleitores || []).filter(e => e.id !== payload.old.id);
          }
          db.save();
          if (typeof renderEleitores === "function" && AppState.currentView === "eleitores") renderEleitores();
          if (typeof WhatsAppDispatcher !== "undefined" && AppState.currentView === "whatsapp") WhatsAppDispatcher.aplicarFiltrosInterface();
          if (typeof showToast === "function") showToast(`⚡ Novo eleitor sincronizado em tempo real da equipe!`);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "liderancas" }, payload => {
          console.log("⚡ [Realtime] Mudança em Lideranças recebida da nuvem:", payload);
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const idx = (db.data.liderancas || []).findIndex(l => l.id === payload.new.id);
            if (idx !== -1) {
              db.data.liderancas[idx] = payload.new;
            } else {
              if (!db.data.liderancas) db.data.liderancas = [];
              db.data.liderancas.unshift(payload.new);
            }
          } else if (payload.eventType === "DELETE") {
            db.data.liderancas = (db.data.liderancas || []).filter(l => l.id !== payload.old.id);
          }
          db.save();
          if (typeof renderLiderancas === "function" && AppState.currentView === "liderancas") renderLiderancas();
        })
        .subscribe();
    } catch (e) {
      console.warn("Realtime não disponível ou tabelas sem replicação:", e);
    }
  },

  // Métodos de Envio Individual
  async salvarEleitorNuvem(eleitor) {
    if (!this.isConnected() || !eleitor) return;
    try {
      await this.client.from("eleitores").upsert([eleitor]);
    } catch (e) {
      console.error("Erro ao salvar eleitor no Supabase:", e);
    }
  },

  async excluirEleitorNuvem(eleitorId) {
    if (!this.isConnected() || !eleitorId) return;
    try {
      await this.client.from("eleitores").delete().eq("id", eleitorId);
    } catch (e) {
      console.error("Erro ao excluir eleitor no Supabase:", e);
    }
  },

  async salvarLiderancaNuvem(lideranca) {
    if (!this.isConnected() || !lideranca) return;
    try {
      await this.client.from("liderancas").upsert([lideranca]);
    } catch (e) {
      console.error("Erro ao salvar liderança no Supabase:", e);
    }
  },

  async excluirLiderancaNuvem(liderancaId) {
    if (!this.isConnected() || !liderancaId) return;
    try {
      await this.client.from("liderancas").delete().eq("id", liderancaId);
    } catch (e) {
      console.error("Erro ao excluir liderança no Supabase:", e);
    }
  },

  async salvarDemandaNuvem(demanda) {
    if (!this.isConnected() || !demanda) return;
    try {
      await this.client.from("demandas").upsert([demanda]);
    } catch (e) {
      console.error("Erro ao salvar demanda no Supabase:", e);
    }
  },

  async excluirDemandaNuvem(demandaId) {
    if (!this.isConnected() || !demandaId) return;
    try {
      await this.client.from("demandas").delete().eq("id", demandaId);
    } catch (e) {
      console.error("Erro ao excluir demanda no Supabase:", e);
    }
  }
};

// Funções de Interface do Painel de Configurações
async function salvarConfiguracaoSupabase() {
  const url = document.getElementById("cfgSupabaseUrl")?.value || "";
  const key = document.getElementById("cfgSupabaseKey")?.value || "";

  if (!url || !key) {
    if (typeof showToast === "function") showToast("⚠️ Preencha a Project URL e a Anon Key do Supabase.");
    return;
  }

  const btnSalvar = document.getElementById("btnSalvarCfgSupabase");
  if (btnSalvar) {
    btnSalvar.disabled = true;
    btnSalvar.textContent = "Testando conexão...";
  }

  const teste = await SupabaseClient.testarConexao(url, key);
  if (btnSalvar) {
    btnSalvar.disabled = false;
    btnSalvar.textContent = "Salvar e Conectar Supabase";
  }

  if (teste.ok) {
    SupabaseClient.saveConfig(url, key, true);
    if (typeof showToast === "function") {
      showToast("🎉 Supabase conectado com sucesso! Sincronização em tempo real ativada.");
    }
    if (teste.avisos && typeof showToast === "function") {
      setTimeout(() => showToast("💡 Dica: " + teste.avisos), 1500);
    }
  } else {
    if (typeof showToast === "function") {
      showToast("❌ Erro ao conectar ao Supabase: " + teste.error);
    }
  }
}

function desconectarSupabase() {
  if (confirm("Deseja desconectar o Supabase e voltar para o banco local apenas neste navegador?")) {
    SupabaseClient.saveConfig("", "", false);
    if (typeof showToast === "function") showToast("Supabase desconectado. Operando no modo local.");
  }
}

// Inicializa automaticamente quando o script carregar
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    SupabaseClient.init();
    // Preenche campos na tela de configuração se já existirem
    const cfg = SupabaseClient.getConfig();
    const inputUrl = document.getElementById("cfgSupabaseUrl");
    const inputKey = document.getElementById("cfgSupabaseKey");
    if (inputUrl && cfg.url) inputUrl.value = cfg.url;
    if (inputKey && cfg.anonKey) inputKey.value = cfg.anonKey;
  }, 300);
});
