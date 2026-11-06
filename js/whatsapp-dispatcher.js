/**
 * RADAR BACURAU — Módulo de Disparo Territorial via WhatsApp (Semi-automático nativo)
 * Zero custo, sem necessidade de servidores externos e com proteção anti-bloqueio (Modo Humanizado).
 */

const WhatsAppDispatcher = {
  STORAGE_HISTORY_KEY: "RADAR_BACURAU_WPP_HISTORY_V1",
  STORAGE_TEMPLATES_KEY: "RADAR_BACURAU_WPP_TEMPLATES_V1",

  // Estado da sessão de disparo
  state: {
    queue: [],
    currentIndex: 0,
    isExecuting: false,
    autoCountdown: 0,
    countdownInterval: null,
    delaySeconds: 5,
    autoAdvance: true,
    filtros: {
      bairro: "",
      lideranca: "",
      secao: "",
      aniversario: "",
      apenasNaoContatados: false,
      busca: ""
    }
  },

  // Templates padrões de mensagem
  defaultTemplates: [
    {
      id: "tpl-aniversario",
      nome: "🎂 Feliz Aniversário (Parabéns ao Eleitor)",
      texto: "{saudacao} {primeiro_nome}! 🎂🎉 Passando aqui em nome de {lideranca} e de toda a nossa equipe de Riachuelo para desejar um Feliz Aniversário! Que Deus abençoe grandemente sua vida, sua saúde e toda a sua família aí em {bairro}. Conte sempre com a gente! Um forte abraço! 👏🥳"
    },
    {
      id: "tpl-secao",
      nome: "🗳️ Lembrete de Seção e Votação",
      texto: "{saudacao} {primeiro_nome}, tudo bem? Passando para lembrar que estamos sempre à disposição da comunidade de {bairro} em Riachuelo. Qualquer dúvida ou demanda, conte conosco!"
    },
    {
      id: "tpl-bairro",
      nome: "🏘️ Aviso Comunitário do Bairro",
      texto: "Olá {primeiro_nome}! Temos acompanhado de perto as demandas da comunidade de {bairro}. A equipe da liderança {lideranca} continua atuando por melhorias para você e sua família na {rua}."
    },
    {
      id: "tpl-lideranca",
      nome: "🤝 Articulação e Contato da Liderança",
      texto: "Oi {primeiro_nome}, como vai? Aqui é da equipe de {lideranca}. Estamos em contato com os amigos de Riachuelo para ouvir sugestões e manter nossa comunidade sempre unida e informada."
    },
    {
      id: "tpl-agradecimento",
      nome: "⭐ Agradecimento & Apoio",
      texto: "{saudacao} {primeiro_nome}! Muito obrigado por fazer parte da nossa caminhada por Riachuelo. Seu apoio é fundamental para o futuro do nosso município!"
    }
  ],

  init() {
    this.ensureDefaultTemplates();
  },

  ensureDefaultTemplates() {
    const salvo = localStorage.getItem(this.STORAGE_TEMPLATES_KEY);
    if (!salvo) {
      localStorage.setItem(this.STORAGE_TEMPLATES_KEY, JSON.stringify(this.defaultTemplates));
      return;
    }
    try {
      const list = JSON.parse(salvo);
      if (Array.isArray(list) && !list.some(t => t.id === "tpl-aniversario")) {
        list.unshift(this.defaultTemplates[0]);
        localStorage.setItem(this.STORAGE_TEMPLATES_KEY, JSON.stringify(list));
      }
    } catch (e) {
      localStorage.setItem(this.STORAGE_TEMPLATES_KEY, JSON.stringify(this.defaultTemplates));
    }
  },

  // Utilitário de Data de Nascimento e Cálculo de Aniversário
  obterStatusAniversario(rawData) {
    if (!rawData || !String(rawData).trim()) {
      return {
        temData: false,
        formatada: "Não informada",
        diaMes: "-",
        idade: null,
        ehHoje: false,
        ehAmanha: false,
        ehProximaSemana: false,
        ehMesAtual: false,
        diasRestantes: 999
      };
    }

    const str = String(rawData).trim();
    let ano = null, mes = null, dia = null;

    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const partes = str.slice(0, 10).split("-");
      ano = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      dia = parseInt(partes[2], 10);
    } else if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
      const partes = str.slice(0, 10).split("/");
      dia = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      ano = parseInt(partes[2], 10);
    } else if (/^\d{2}\/\d{2}$/.test(str)) {
      const partes = str.split("/");
      dia = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
    }

    if (!dia || !mes || isNaN(dia) || isNaN(mes) || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return {
        temData: false,
        formatada: str,
        diaMes: str,
        idade: null,
        ehHoje: false,
        ehAmanha: false,
        ehProximaSemana: false,
        ehMesAtual: false,
        diasRestantes: 999
      };
    }

    const hoje = new Date();
    const hojeDia = hoje.getDate();
    const hojeMes = hoje.getMonth() + 1;
    const hojeAno = hoje.getFullYear();

    const diaStr = String(dia).padStart(2, "0");
    const mesStr = String(mes).padStart(2, "0");
    const diaMes = `${diaStr}/${mesStr}`;
    const formatada = ano ? `${diaStr}/${mesStr}/${ano}` : diaMes;

    let idade = null;
    if (ano && ano > 1900 && ano <= hojeAno) {
      idade = hojeAno - ano;
      if (hojeMes < mes || (hojeMes === mes && hojeDia < dia)) {
        idade--;
      }
    }

    const ehHoje = (dia === hojeDia && mes === hojeMes);
    const ehMesAtual = (mes === hojeMes);

    // Calcula dias até o próximo aniversário
    const dataHojeZero = new Date(hojeAno, hojeMes - 1, hojeDia);
    let proxAniv = new Date(hojeAno, mes - 1, dia);
    if (proxAniv < dataHojeZero) {
      proxAniv = new Date(hojeAno + 1, mes - 1, dia);
    }
    const diffMs = proxAniv.getTime() - dataHojeZero.getTime();
    const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const ehAmanha = diasRestantes === 1;
    const ehProximaSemana = diasRestantes >= 0 && diasRestantes <= 7;

    return {
      temData: true,
      dia,
      mes,
      ano,
      formatada,
      diaMes,
      idade,
      ehHoje,
      ehAmanha,
      ehProximaSemana,
      ehMesAtual,
      diasRestantes
    };
  },

  getTemplates() {
    try {
      const salvo = localStorage.getItem(this.STORAGE_TEMPLATES_KEY);
      return salvo ? JSON.parse(salvo) : this.defaultTemplates;
    } catch (e) {
      return this.defaultTemplates;
    }
  },

  salvarTemplate(nome, texto) {
    const list = this.getTemplates();
    const novo = {
      id: "tpl-" + Date.now(),
      nome: nome.trim(),
      texto: texto.trim()
    };
    list.push(novo);
    localStorage.setItem(this.STORAGE_TEMPLATES_KEY, JSON.stringify(list));
    return novo;
  },

  // Sanitização e Validação do Telefone
  sanitizarTelefone(raw) {
    if (!raw) return null;
    let digitos = String(raw).replace(/\D/g, "");
    if (!digitos) return null;

    // Se já tiver 55 no início (DDI Brasil) e tiver 12 ou 13 dígitos
    if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
      return digitos;
    }

    // Se tiver 10 ou 11 dígitos (DDD + Número, ex: 84999998888 ou 84988887777)
    if (digitos.length === 10 || digitos.length === 11) {
      return "55" + digitos;
    }

    // Se for 8 ou 9 dígitos sem DDD, assume DDD 84 (Riachuelo-RN)
    if (digitos.length === 8 || digitos.length === 9) {
      return "5584" + digitos;
    }

    // Se tiver 12 ou 13 dígitos sem ter 55 (caso raro)
    if (digitos.length >= 10 && digitos.length <= 13) {
      return digitos.startsWith("55") ? digitos : "55" + digitos;
    }

    return null;
  },

  formatarTelefoneExibicao(raw) {
    const clean = this.sanitizarTelefone(raw);
    if (!clean) return raw || "Não informado";
    const num = clean.replace(/^55/, "");
    if (num.length === 11) {
      return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`;
    }
    if (num.length === 10) {
      return `(${num.slice(0, 2)}) ${num.slice(2, 6)}-${num.slice(6)}`;
    }
    return clean;
  },

  // Substituição de Tags dinâmicas
  processarMensagem(template, eleitor) {
    if (!template) return "";
    let msg = template;

    const nomeCompleto = (eleitor.nome || "Amigo(a)").trim();
    const partesNome = nomeCompleto.split(/\s+/);
    const primeiroNome = partesNome[0] || "Amigo(a)";
    const saudacoes = ["Olá", "Oi", "Tudo bem,", "Como vai,"];
    const saudacaoSorteada = saudacoes[Math.floor(Math.random() * saudacoes.length)];
    const aniv = this.obterStatusAniversario(eleitor.dataNascimento);

    msg = msg.replace(/\{nome\}/gi, nomeCompleto);
    msg = msg.replace(/\{primeiro_nome\}/gi, primeiroNome);
    msg = msg.replace(/\{saudacao\}/gi, saudacaoSorteada);
    msg = msg.replace(/\{bairro\}/gi, eleitor.bairroNome || eleitor.comunidade || "Riachuelo");
    msg = msg.replace(/\{secao\}/gi, eleitor.secao || "-");
    msg = msg.replace(/\{lideranca\}/gi, eleitor.liderancaNome || "nossa liderança");
    msg = msg.replace(/\{rua\}/gi, eleitor.rua || eleitor.endereco || "sua localidade");
    msg = msg.replace(/\{data_nascimento\}/gi, aniv.temData ? aniv.formatada : "-");
    msg = msg.replace(/\{idade\}/gi, aniv.idade !== null ? `${aniv.idade} anos` : "");

    return msg;
  },

  // Histórico de Envios
  getHistory() {
    try {
      const data = localStorage.getItem(this.STORAGE_HISTORY_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  },

  registrarEnvio(eleitorId, status = "enviado") {
    const history = this.getHistory();
    history[eleitorId] = {
      status: status,
      timestamp: new Date().toISOString(),
      dataLocal: new Date().toLocaleDateString("pt-BR")
    };
    localStorage.setItem(this.STORAGE_HISTORY_KEY, JSON.stringify(history));
  },

  jaFoiContatadoHoje(eleitorId) {
    const history = this.getHistory();
    const item = history[eleitorId];
    if (!item) return false;
    const hoje = new Date().toLocaleDateString("pt-BR");
    return item.dataLocal === hoje && item.status === "enviado";
  },

  limparHistoricoEnvios() {
    localStorage.removeItem(this.STORAGE_HISTORY_KEY);
  },

  // Montagem da Fila (com priorização e marcação automática de Aniversariantes)
  carregarFila() {
    const currentUser = db.getCurrentUser();
    const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";

    const todos = db.getEleitores() || [];
    const fila = [];

    todos.forEach(e => {
      // Regra de perfil: liderança só vê os seus eleitores
      if (isLider) {
        const nomeLider = (currentUser.nome || "").trim().toLowerCase();
        const eLid = (e.liderancaNome || "").trim().toLowerCase();
        if (eLid !== nomeLider && e.liderancaId !== currentUser.liderancaId) {
          return;
        }
      } else if (this.state.filtros.lideranca) {
        if ((e.liderancaNome || "").trim().toLowerCase() !== this.state.filtros.lideranca.trim().toLowerCase()) {
          return;
        }
      }

      if (this.state.filtros.bairro) {
        if (e.bairroNome !== this.state.filtros.bairro && e.comunidadeId !== this.state.filtros.bairro) {
          return;
        }
      }

      if (this.state.filtros.secao) {
        if (String(e.secao) !== String(this.state.filtros.secao)) {
          return;
        }
      }

      const aniv = this.obterStatusAniversario(e.dataNascimento);

      if (this.state.filtros.aniversario) {
        if (this.state.filtros.aniversario === "hoje" && !aniv.ehHoje) return;
        if (this.state.filtros.aniversario === "semana" && !aniv.ehProximaSemana) return;
        if (this.state.filtros.aniversario === "mes" && !aniv.ehMesAtual) return;
      }

      if (this.state.filtros.busca) {
        const q = this.state.filtros.busca.toLowerCase();
        const match = (e.nome && e.nome.toLowerCase().includes(q)) ||
                      (e.bairroNome && e.bairroNome.toLowerCase().includes(q)) ||
                      (e.telefone && e.telefone.includes(q)) ||
                      (aniv.formatada && aniv.formatada.includes(q));
        if (!match) return;
      }

      // Validação de telefone
      const foneValido = this.sanitizarTelefone(e.telefone);
      if (!foneValido) return;

      // Filtro de não contatados hoje
      const contatadoHoje = this.jaFoiContatadoHoje(e.id);
      if (this.state.filtros.apenasNaoContatados && contatadoHoje) {
        return;
      }

      fila.push({
        ...e,
        aniversarioInfo: aniv,
        telefoneSanitizado: foneValido,
        contatadoHoje: contatadoHoje,
        statusFila: contatadoHoje ? "ja_enviado" : "pendente"
      });
    });

    // Coloca aniversariantes de HOJE sempre no topo da fila para nunca esquecer
    fila.sort((a, b) => {
      const aHoje = a.aniversarioInfo?.ehHoje ? 1 : 0;
      const bHoje = b.aniversarioInfo?.ehHoje ? 1 : 0;
      if (bHoje !== aHoje) return bHoje - aHoje;

      const aSemana = a.aniversarioInfo?.ehProximaSemana ? 1 : 0;
      const bSemana = b.aniversarioInfo?.ehProximaSemana ? 1 : 0;
      if (bSemana !== aSemana) return bSemana - aSemana;

      return 0;
    });

    this.state.queue = fila;
    this.state.currentIndex = 0;
    return fila;
  },

  // Renderiza o Painel de Lembrete de Aniversariantes no topo do Disparo em Massa
  renderPainelAniversariantes() {
    const currentUser = db.getCurrentUser();
    const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
    const todos = (db.getEleitores() || []).filter(e => {
      if (!isLider) return true;
      const nomeLider = (currentUser.nome || "").trim().toLowerCase();
      const eLid = (e.liderancaNome || "").trim().toLowerCase();
      return eLid === nomeLider || e.liderancaId === currentUser.liderancaId;
    });

    const comAniv = todos.map(e => ({
      ...e,
      aniversarioInfo: this.obterStatusAniversario(e.dataNascimento),
      contatadoHoje: this.jaFoiContatadoHoje(e.id)
    }));

    const anivHoje = comAniv.filter(e => e.aniversarioInfo.ehHoje);
    const anivSemana = comAniv.filter(e => !e.aniversarioInfo.ehHoje && e.aniversarioInfo.ehProximaSemana)
      .sort((a, b) => a.aniversarioInfo.diasRestantes - b.aniversarioInfo.diasRestantes);
    const anivMes = comAniv.filter(e => e.aniversarioInfo.ehMesAtual);

    // Atualiza KPI de Aniversariantes
    const kpiHoje = document.getElementById("wppKpiAniversariantesHoje");
    const kpiSub = document.getElementById("wppKpiAniversariantesSub");
    if (kpiHoje) kpiHoje.textContent = anivHoje.length;
    if (kpiSub) {
      kpiSub.textContent = anivHoje.length > 0
        ? `🎉 ${anivHoje.length} fazendo aniversário hoje! (${anivMes.length} no mês)`
        : `${anivMes.length} aniversariante(s) neste mês`;
    }

    const painel = document.getElementById("wppPainelAniversariantes");
    if (!painel) return;

    const hojeFormatado = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

    if (anivHoje.length > 0) {
      const listaCardsHoje = anivHoje.map(e => {
        const foneOk = !!this.sanitizarTelefone(e.telefone);
        const idadeTxt = e.aniversarioInfo.idade !== null ? ` • <strong>${e.aniversarioInfo.idade} anos</strong>` : "";
        const statusEnvio = e.contatadoHoje
          ? `<span class="badge-status oficial" style="font-size:0.7rem;">✅ Já parabenizado hoje</span>`
          : `<span class="badge-status" style="font-size:0.7rem; background:rgba(245,158,11,0.25); color:var(--gold-400); border:1px solid var(--gold-400);">🎂 Aguardando Parabéns!</span>`;

        return `
          <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; background:rgba(0,0,0,0.28); border:1px solid rgba(251,191,36,0.45); border-radius:10px; padding:10px 14px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span style="font-size:1.15rem;">🎂</span>
                <strong style="color:#fff; font-size:0.95rem;">${e.nome}</strong>
                ${statusEnvio}
              </div>
              <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:3px;">
                📍 ${e.bairroNome || "Riachuelo"} • 🎖️ Líder: ${e.liderancaNome || "Sem liderança"} • 📅 ${e.aniversarioInfo.formatada}${idadeTxt}
              </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">
              ${foneOk ? `
                <button type="button" class="btn btn-gold btn-sm" onclick="WhatsAppDispatcher.parabenizarEleitorDireto('${e.id}')" style="font-weight:800;">
                  💬 Enviar Parabéns Agora
                </button>
              ` : `
                <span style="font-size:0.75rem; color:#f87171;">⚠️ Sem WhatsApp</span>
              `}
            </div>
          </div>
        `;
      }).join("");

      painel.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(6, 78, 59, 0.45) 100%); border: 2px solid var(--gold-400); border-radius: 12px; padding: 16px 18px; box-shadow: 0 8px 26px rgba(245, 158, 11, 0.15);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.8rem; line-height:1;">🎂</span>
              <div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <h3 style="margin:0; color:var(--gold-400); font-size:1.05rem;">LEMBRETE DE ANIVERSÁRIO HOJE (${hojeFormatado})</h3>
                  <span style="background:var(--gold-400); color:#000; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:999px;">NÃO ESQUEÇA!</span>
                </div>
                <p style="margin:2px 0 0 0; font-size:0.82rem; color:#e2e8f0;">
                  Você tem <strong>${anivHoje.length} eleitor(es)</strong> fazendo aniversário hoje! Eles já foram marcados e priorizados no topo da fila.
                </p>
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button type="button" class="btn btn-gold btn-sm" onclick="WhatsAppDispatcher.filtrarAniversariantesHoje()" style="font-weight:800;">
                🎂 Filtrar Aniversariantes + Mensagem de Parabéns
              </button>
              ${this.state.filtros.aniversario ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="WhatsAppDispatcher.limparFiltroAniversario()">
                  Ver Todos os Eleitores
                </button>
              ` : ""}
            </div>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:10px;">
            ${listaCardsHoje}
          </div>
        </div>
      `;
    } else if (anivSemana.length > 0 || anivMes.length > 0) {
      const proxLista = anivSemana.slice(0, 4).map(e =>
        `<span style="background:rgba(255,255,255,0.06); border:1px solid rgba(251,191,36,0.3); padding:3px 9px; border-radius:999px; font-size:0.76rem; color:#fff;">
          🎉 <strong>${e.nome}</strong> (${e.aniversarioInfo.diaMes} — ${e.aniversarioInfo.ehAmanha ? "Amanhã!" : `em ${e.aniversarioInfo.diasRestantes} dias`})
        </span>`
      ).join(" ");

      painel.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(251, 191, 36, 0.35); border-radius: 10px; padding: 12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <span style="font-size:1.35rem;">🎂</span>
            <div>
              <strong style="color:var(--gold-400); font-size:0.88rem;">Radar de Aniversários (${hojeFormatado}):</strong>
              <span style="font-size:0.82rem; color:var(--text-secondary); margin-left:4px;">
                Nenhum aniversariante exatamente hoje • <strong>${anivSemana.length}</strong> nos próximos 7 dias • <strong>${anivMes.length}</strong> neste mês.
              </span>
              ${proxLista ? `<div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">${proxLista}</div>` : ""}
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="WhatsAppDispatcher.filtrarAniversariantesPeriodo('mes')" style="border-color:rgba(251,191,36,0.4); color:var(--gold-400);">
              📅 Ver Aniversariantes do Mês (${anivMes.length})
            </button>
            ${this.state.filtros.aniversario ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="WhatsAppDispatcher.limparFiltroAniversario()">
                Limpar Filtro
              </button>
            ` : ""}
          </div>
        </div>
      `;
    } else {
      painel.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.55); border: 1px dashed rgba(251, 191, 36, 0.3); border-radius: 10px; padding: 10px 14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; font-size:0.8rem; color:var(--text-muted);">
          <div>
            🎂 <strong>Lembrete Automático de Aniversários Ativo:</strong> Sempre que um eleitor cadastrado fizer aniversário, ele aparecerá em destaque aqui no Disparo em Massa para você nunca esquecer.
          </div>
          ${this.state.filtros.aniversario ? `
            <button type="button" class="btn btn-secondary btn-sm" onclick="WhatsAppDispatcher.limparFiltroAniversario()">
              Mostrar Todos os Eleitores
            </button>
          ` : ""}
        </div>
      `;
    }
  },

  carregarTemplateAniversario() {
    this.ensureDefaultTemplates();
    const select = document.getElementById("wppSelectTemplate");
    if (select) select.value = "tpl-aniversario";
    this.aplicarTemplate("tpl-aniversario");
    if (typeof showToast === "function") {
      showToast("🎂 Mensagem de Feliz Aniversário carregada no editor!");
    }
  },

  filtrarAniversariantesHoje() {
    const sel = document.getElementById("wppFiltroAniversario");
    const chk = document.getElementById("wppCheckAniversariantesHoje");
    if (sel) sel.value = "hoje";
    if (chk) chk.checked = true;
    this.carregarTemplateAniversario();
    this.aplicarFiltrosInterface();
  },

  filtrarAniversariantesPeriodo(periodo) {
    const sel = document.getElementById("wppFiltroAniversario");
    const chk = document.getElementById("wppCheckAniversariantesHoje");
    if (sel) sel.value = periodo;
    if (chk) chk.checked = (periodo === "hoje");
    this.carregarTemplateAniversario();
    this.aplicarFiltrosInterface();
  },

  limparFiltroAniversario() {
    const sel = document.getElementById("wppFiltroAniversario");
    const chk = document.getElementById("wppCheckAniversariantesHoje");
    if (sel) sel.value = "";
    if (chk) chk.checked = false;
    this.aplicarFiltrosInterface();
  },

  aoMudarFiltroAniversario() {
    const sel = document.getElementById("wppFiltroAniversario");
    const chk = document.getElementById("wppCheckAniversariantesHoje");
    const valor = sel ? sel.value : "";
    if (chk) chk.checked = (valor === "hoje");
    if (valor === "hoje" || valor === "semana" || valor === "mes") {
      const editor = document.getElementById("wppEditorMensagem");
      if (editor && !editor.value.trim()) {
        this.carregarTemplateAniversario();
      }
    }
    this.aplicarFiltrosInterface();
  },

  aoAlternarCheckAniversariantesHoje(marcado) {
    const sel = document.getElementById("wppFiltroAniversario");
    if (sel) sel.value = marcado ? "hoje" : "";
    if (marcado) {
      this.carregarTemplateAniversario();
    }
    this.aplicarFiltrosInterface();
  },

  parabenizarEleitorDireto(eleitorId) {
    const eleitor = db.getEleitorById(eleitorId);
    if (!eleitor) return;

    const fone = this.sanitizarTelefone(eleitor.telefone);
    if (!fone) {
      if (typeof showToast === "function") {
        showToast(`⚠️ O eleitor ${eleitor.nome} não possui telefone válido cadastrado.`);
      }
      return;
    }

    this.carregarTemplateAniversario();
    const tplAniv = this.getTemplates().find(t => t.id === "tpl-aniversario") || this.defaultTemplates[0];
    const editorTxt = document.getElementById("wppEditorMensagem")?.value || tplAniv.texto;
    const msg = this.processarMensagem(editorTxt, eleitor);
    const url = `https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(msg)}`;

    window.open(url, "_blank");
    this.registrarEnvio(eleitor.id, "enviado");
    this.carregarFila();
    this.atualizarInterfaceFila();

    if (typeof showToast === "function") {
      showToast(`🎂 Parabéns enviado no WhatsApp para ${eleitor.nome}!`);
    }
  },

  // Ação de Envio do Contato Atual
  enviarContatoAtual() {
    const contato = this.state.queue[this.state.currentIndex];
    if (!contato) {
      if (typeof showToast === "function") showToast("Nenhum contato na fila para enviar.");
      return;
    }

    const templateText = document.getElementById("wppEditorMensagem")?.value || "";
    if (!templateText.trim()) {
      if (typeof showToast === "function") showToast("⚠️ Digite ou selecione um modelo de mensagem antes de enviar.");
      return;
    }

    const mensagemFinal = this.processarMensagem(templateText, contato);
    const url = `https://api.whatsapp.com/send?phone=${contato.telefoneSanitizado}&text=${encodeURIComponent(mensagemFinal)}`;

    // Abre o WhatsApp Web em nova aba
    window.open(url, "_blank");

    // Registra envio
    this.registrarEnvio(contato.id, "enviado");
    contato.statusFila = "enviado";
    contato.contatadoHoje = true;

    if (typeof showToast === "function") {
      showToast(`✅ WhatsApp aberto para ${contato.nome}!`);
    }

    this.avancarParaProximo();
  },

  pularContatoAtual() {
    const contato = this.state.queue[this.state.currentIndex];
    if (contato) {
      contato.statusFila = "pulado";
      if (typeof showToast === "function") {
        showToast(`⏭️ Contato ${contato.nome} pulado.`);
      }
    }
    this.avancarParaProximo();
  },

  avancarParaProximo() {
    if (this.state.currentIndex < this.state.queue.length - 1) {
      this.state.currentIndex++;
      this.atualizarInterfaceFila();

      // Se auto-avanço com contagem regressiva estiver ativo
      if (this.state.autoAdvance) {
        this.iniciarContagemAutoAvanco();
      }
    } else {
      // Fim da fila
      this.state.currentIndex = this.state.queue.length;
      this.atualizarInterfaceFila();
      if (typeof showToast === "function") {
        showToast("🎉 Fila de disparos concluída com sucesso!");
      }
    }
  },

  voltarParaAnterior() {
    if (this.state.currentIndex > 0) {
      this.state.currentIndex--;
      this.cancelarContagem();
      this.atualizarInterfaceFila();
    }
  },

  selecionarContatoFila(index) {
    if (index >= 0 && index < this.state.queue.length) {
      this.state.currentIndex = index;
      this.cancelarContagem();
      this.atualizarInterfaceFila();
    }
  },

  iniciarContagemAutoAvanco() {
    this.cancelarContagem();
    let tempoRestante = this.state.delaySeconds;
    const btnAuto = document.getElementById("wppBtnAutoCountdown");
    const containerAuto = document.getElementById("wppAutoCountdownBox");
    
    if (!btnAuto || !containerAuto) return;
    containerAuto.style.display = "flex";
    btnAuto.textContent = `Aguardando ${tempoRestante}s (Anti-bloqueio)...`;

    this.state.countdownInterval = setInterval(() => {
      tempoRestante--;
      if (tempoRestante > 0) {
        btnAuto.textContent = `Aguardando ${tempoRestante}s (Anti-bloqueio)...`;
      } else {
        this.cancelarContagem();
        btnAuto.textContent = `Pronto para o próximo!`;
        // Destaca o botão principal com animação sutil
        const btnEnviar = document.getElementById("wppBtnEnviarPrincipal");
        if (btnEnviar) {
          btnEnviar.classList.add("pulse-ready");
          setTimeout(() => btnEnviar.classList.remove("pulse-ready"), 1500);
        }
      }
    }, 1000);
  },

  cancelarContagem() {
    if (this.state.countdownInterval) {
      clearInterval(this.state.countdownInterval);
      this.state.countdownInterval = null;
    }
    const containerAuto = document.getElementById("wppAutoCountdownBox");
    if (containerAuto) containerAuto.style.display = "none";
  },

  atualizarInterfaceFila() {
    this.renderPainelAniversariantes();

    const total = this.state.queue.length;
    const atualIndex = this.state.currentIndex;
    const contato = this.state.queue[atualIndex];

    const enviadasTotal = this.state.queue.filter(c => c.statusFila === "enviado").length;
    const progressoPercent = total > 0 ? Math.round((enviadasTotal / total) * 100) : 0;

    // Atualiza badges e contadores
    const elContadorProgresso = document.getElementById("wppContadorProgresso");
    const elBarraProgresso = document.getElementById("wppBarraProgresso");
    const elKpiFilaTotal = document.getElementById("wppKpiFilaTotal");
    const elKpiEnviadasHoje = document.getElementById("wppKpiEnviadasHoje");

    if (elContadorProgresso) {
      elContadorProgresso.textContent = total > 0 ? `${atualIndex + 1 > total ? total : atualIndex + 1} de ${total} contatos (${progressoPercent}% enviados)` : "Fila vazia";
    }
    if (elBarraProgresso) {
      elBarraProgresso.style.width = `${progressoPercent}%`;
    }
    if (elKpiFilaTotal) elKpiFilaTotal.textContent = total;
    if (elKpiEnviadasHoje) elKpiEnviadasHoje.textContent = enviadasTotal;

    // Atualiza card do contato atual em foco
    const boxContatoAtual = document.getElementById("wppBoxContatoAtual");
    const boxFimFila = document.getElementById("wppBoxFimFila");
    const btnEnviar = document.getElementById("wppBtnEnviarPrincipal");

    if (!contato) {
      if (boxContatoAtual) boxContatoAtual.style.display = "none";
      if (boxFimFila) boxFimFila.style.display = total > 0 ? "block" : "none";
      if (btnEnviar) btnEnviar.disabled = true;
      this.atualizarPreviewMensagem(null);
      this.renderTabelaFila();
      return;
    }

    const aniv = contato.aniversarioInfo || this.obterStatusAniversario(contato.dataNascimento);

    if (boxContatoAtual) boxContatoAtual.style.display = "block";
    if (boxFimFila) boxFimFila.style.display = "none";
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = aniv.ehHoje
        ? `<span>🎂 Parabenizar <strong>${contato.nome.split(" ")[0]}</strong> no WhatsApp</span>`
        : `<span>🚀 Abrir WhatsApp para <strong>${contato.nome.split(" ")[0]}</strong></span>`;
    }

    // Banner de Aniversário no Card em Foco
    const bannerFocoAniv = document.getElementById("wppFocoAniversarioBanner");
    if (bannerFocoAniv) {
      if (aniv.ehHoje) {
        bannerFocoAniv.style.display = "block";
        bannerFocoAniv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <strong style="color:var(--gold-400); font-size:0.88rem;">🎂 HOJE É ANIVERSÁRIO DESTE ELEITOR! (${aniv.formatada}${aniv.idade !== null ? ` • ${aniv.idade} anos` : ""})</strong>
              <div style="font-size:0.76rem; color:#e2e8f0;">Não esqueça de enviar sua mensagem de felicitações!</div>
            </div>
            <button type="button" class="btn btn-gold btn-sm" onclick="WhatsAppDispatcher.carregarTemplateAniversario()" style="font-size:0.75rem; padding:4px 10px;">
              🎂 Usar Mensagem de Parabéns
            </button>
          </div>
        `;
      } else if (aniv.ehProximaSemana) {
        bannerFocoAniv.style.display = "block";
        bannerFocoAniv.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span style="font-size:0.8rem; color:var(--gold-400);">
              🎉 <strong>Aniversário Próximo:</strong> Dia <strong>${aniv.diaMes}</strong> (${aniv.ehAmanha ? "Amanhã!" : `faltam ${aniv.diasRestantes} dias`})
            </span>
            <button type="button" class="btn btn-secondary btn-sm" onclick="WhatsAppDispatcher.carregarTemplateAniversario()" style="font-size:0.72rem; padding:3px 8px;">
              🎂 Modelo de Parabéns
            </button>
          </div>
        `;
      } else {
        bannerFocoAniv.style.display = "none";
      }
    }

    // Preenche dados do card do contato
    const elNome = document.getElementById("wppFocoNome");
    const elTel = document.getElementById("wppFocoTelefone");
    const elNasc = document.getElementById("wppFocoNascimento");
    const elBairro = document.getElementById("wppFocoBairro");
    const elLider = document.getElementById("wppFocoLider");
    const elBadgeStatus = document.getElementById("wppFocoStatusBadge");

    if (elNome) {
      elNome.innerHTML = aniv.ehHoje
        ? `${contato.nome} <span style="background:var(--gold-400); color:#000; font-size:0.7rem; padding:2px 7px; border-radius:999px; font-weight:800; margin-left:6px;">🎂 ANIVERSARIANTE HOJE!</span>`
        : contato.nome;
    }
    if (elTel) elTel.textContent = this.formatarTelefoneExibicao(contato.telefone);
    if (elNasc) {
      if (aniv.temData) {
        elNasc.innerHTML = `${aniv.formatada}${aniv.idade !== null ? ` (${aniv.idade} anos)` : ""} ${aniv.ehHoje ? "🎂" : ""}`;
      } else {
        elNasc.textContent = "Não informada";
      }
    }
    if (elBairro) elBairro.textContent = contato.bairroNome || "-";
    if (elLider) elLider.textContent = contato.liderancaNome || "Sem liderança";

    if (elBadgeStatus) {
      if (contato.statusFila === "enviado") {
        elBadgeStatus.className = "badge-status oficial";
        elBadgeStatus.textContent = "✅ Enviado";
      } else if (contato.statusFila === "pulado") {
        elBadgeStatus.className = "badge-status provisorio";
        elBadgeStatus.textContent = "⏭️ Pulado";
      } else if (contato.contatadoHoje) {
        elBadgeStatus.className = "badge-status oficial";
        elBadgeStatus.textContent = "✓ Já contatado hoje";
      } else {
        elBadgeStatus.className = "badge-status pendente";
        elBadgeStatus.textContent = "⏳ Pendente";
      }
    }

    this.atualizarPreviewMensagem(contato);
    this.renderTabelaFila();
  },

  atualizarPreviewMensagem(contato) {
    const previewEl = document.getElementById("wppChatPreviewBody");
    const horaEl = document.getElementById("wppChatPreviewHora");
    const templateText = document.getElementById("wppEditorMensagem")?.value || "";

    if (!previewEl) return;

    if (!templateText.trim()) {
      previewEl.innerHTML = `<em style="color:#86a796;">Escreva sua mensagem no editor ao lado ou selecione um modelo pronto...</em>`;
      return;
    }

    const c = contato || (this.state.queue[0] || {
      nome: "Maria das Chagas Silva",
      bairroNome: "Centro",
      secao: "12",
      liderancaNome: "Antônio Marcos",
      rua: "Rua do Comércio",
      dataNascimento: "1985-11-04"
    });

    const msg = this.processarMensagem(templateText, c);
    // Transforma quebras de linha em <br> e emojis/links
    previewEl.innerHTML = msg.replace(/\n/g, "<br>");

    if (horaEl) {
      const now = new Date();
      horaEl.textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }
  },

  renderTabelaFila() {
    const tbody = document.getElementById("wppTabelaFilaBody");
    if (!tbody) return;

    if (this.state.queue.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:25px; color:var(--text-muted);">
            Nenhum eleitor localizado para os filtros informados ou todos estão sem telefone cadastrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.state.queue.map((e, idx) => {
      const isCurrent = idx === this.state.currentIndex;
      const aniv = e.aniversarioInfo || this.obterStatusAniversario(e.dataNascimento);

      let statusBadge = `<span class="badge-status pendente" style="font-size:0.7rem;">Pendente</span>`;
      if (e.statusFila === "enviado") {
        statusBadge = `<span class="badge-status oficial" style="font-size:0.7rem;">✅ Enviado</span>`;
      } else if (e.statusFila === "pulado") {
        statusBadge = `<span class="badge-status provisorio" style="font-size:0.7rem;">Pulado</span>`;
      } else if (e.contatadoHoje) {
        statusBadge = `<span class="badge-status oficial" style="font-size:0.7rem;">Contatado Hoje</span>`;
      }

      let anivCellHtml = `<span style="font-size:0.76rem; color:var(--text-dim);">Não informada</span>`;
      if (aniv.temData) {
        if (aniv.ehHoje) {
          anivCellHtml = `
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <span style="background:linear-gradient(90deg, #f59e0b, #fbbf24); color:#000; font-weight:800; font-size:0.72rem; padding:2px 8px; border-radius:999px;">
                🎂 HOJE! (${aniv.diaMes})
              </span>
              ${aniv.idade !== null ? `<span style="font-size:0.75rem; color:var(--gold-400); font-weight:700;">${aniv.idade} anos</span>` : ""}
            </div>
          `;
        } else if (aniv.ehProximaSemana) {
          anivCellHtml = `
            <div>
              <span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--gold-400); font-weight:700;">🎉 ${aniv.formatada}</span>
              <span style="display:block; font-size:0.7rem; color:var(--emerald-400);">${aniv.ehAmanha ? "Amanhã!" : `Em ${aniv.diasRestantes} dias`}</span>
            </div>
          `;
        } else if (aniv.ehMesAtual) {
          anivCellHtml = `
            <div>
              <span style="font-family:var(--font-mono); font-size:0.8rem; color:#e2e8f0;">📅 ${aniv.formatada}</span>
              <span style="display:block; font-size:0.7rem; color:var(--gold-400);">Aniversariante do mês</span>
            </div>
          `;
        } else {
          anivCellHtml = `<span style="font-family:var(--font-mono); font-size:0.8rem; color:var(--text-muted);">${aniv.formatada}${aniv.idade !== null ? ` (${aniv.idade}a)` : ""}</span>`;
        }
      }

      const rowBg = isCurrent
        ? "background:rgba(37,211,102,0.14);"
        : (aniv.ehHoje ? "background:rgba(245,158,11,0.12); border-left:3px solid #fbbf24;" : "");

      return `
        <tr class="${isCurrent ? 'wpp-row-active' : ''}" style="${rowBg}">
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${idx + 1}</td>
          <td>
            <strong style="color:#ffffff; font-size:0.86rem; cursor:pointer;" onclick="WhatsAppDispatcher.selecionarContatoFila(${idx})">${e.nome}</strong>
            ${isCurrent ? `<span style="margin-left:6px; font-size:0.7rem; background:#25D366; color:#000; padding:1px 6px; border-radius:4px; font-weight:700;">ATUAL</span>` : ''}
            ${aniv.ehHoje ? `<span style="margin-left:6px; font-size:0.7rem; background:var(--gold-400); color:#000; padding:1px 7px; border-radius:4px; font-weight:800;">🎂 ANIVERSÁRIO HOJE</span>` : ''}
          </td>
          <td>${anivCellHtml}</td>
          <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--emerald-400);">${this.formatarTelefoneExibicao(e.telefone)}</td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${e.bairroNome || '-'}</td>
          <td style="font-size:0.8rem; color:var(--gold-400);">${e.liderancaNome || 'Sem liderança'}</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }).join("");
  },

  inserirTagNoEditor(tag) {
    const editor = document.getElementById("wppEditorMensagem");
    if (!editor) return;

    const start = editor.selectionStart || 0;
    const end = editor.selectionEnd || 0;
    const text = editor.value;

    editor.value = text.substring(0, start) + tag + text.substring(end);
    editor.focus();
    editor.selectionStart = editor.selectionEnd = start + tag.length;

    this.atualizarPreviewMensagem(this.state.queue[this.state.currentIndex]);
  },

  aplicarTemplate(tplId) {
    const templates = this.getTemplates();
    const tpl = templates.find(t => t.id === tplId);
    if (!tpl) return;

    const editor = document.getElementById("wppEditorMensagem");
    if (editor) {
      editor.value = tpl.texto;
      this.atualizarPreviewMensagem(this.state.queue[this.state.currentIndex]);
    }
  },

  salvarNovoTemplateModal() {
    const textoAtual = document.getElementById("wppEditorMensagem")?.value || "";
    if (!textoAtual.trim()) {
      if (typeof showToast === "function") showToast("Digite uma mensagem no editor antes de salvar como modelo.");
      return;
    }

    const nome = prompt("Digite um nome para este modelo de mensagem:", "Meu Modelo Personalizado");
    if (!nome) return;

    this.salvarTemplate(nome, textoAtual);
    this.popularTemplatesSelect();
    if (typeof showToast === "function") showToast("✅ Modelo de mensagem salvo com sucesso!");
  },

  popularTemplatesSelect() {
    const select = document.getElementById("wppSelectTemplate");
    if (!select) return;

    this.ensureDefaultTemplates();
    const templates = this.getTemplates();
    select.innerHTML = '<option value="">-- Selecione um modelo pronto --</option>' +
      templates.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");
  },

  popularFiltros() {
    const bairros = db.getComunidades() || [];
    const liderancas = db.getLiderancas() || [];
    const secoes = TSE_DATA ? TSE_DATA.secoes : [];

    const filtroBairro = document.getElementById("wppFiltroBairro");
    const filtroLider = document.getElementById("wppFiltroLideranca");
    const filtroSecao = document.getElementById("wppFiltroSecao");

    if (filtroBairro) {
      filtroBairro.innerHTML = '<option value="">Todos os Bairros / Comunidades</option>' +
        bairros.map(b => `<option value="${b.nome}">${b.nome}</option>`).join("");
    }

    if (filtroLider) {
      filtroLider.innerHTML = '<option value="">Todas as Lideranças</option>' +
        liderancas.map(l => `<option value="${l.nome}">${l.nome}</option>`).join("");
    }

    if (filtroSecao) {
      filtroSecao.innerHTML = '<option value="">Todas as 16 Seções</option>' +
        secoes.map(s => `<option value="${s.secao}">Seção ${s.secao} (${s.local})</option>`).join("");
    }
  },

  aplicarFiltrosInterface() {
    const filtroBairro = document.getElementById("wppFiltroBairro");
    const filtroLider = document.getElementById("wppFiltroLideranca");
    const filtroSecao = document.getElementById("wppFiltroSecao");
    const filtroAniversario = document.getElementById("wppFiltroAniversario");
    const checkNaoContatados = document.getElementById("wppCheckNaoContatados");
    const searchInput = document.getElementById("wppSearchInput");

    this.state.filtros = {
      bairro: filtroBairro ? filtroBairro.value : "",
      lideranca: filtroLider ? filtroLider.value : "",
      secao: filtroSecao ? filtroSecao.value : "",
      aniversario: filtroAniversario ? filtroAniversario.value : "",
      apenasNaoContatados: checkNaoContatados ? checkNaoContatados.checked : false,
      busca: searchInput ? searchInput.value : ""
    };

    this.carregarFila();
    this.atualizarInterfaceFila();
  },

  reiniciarFila() {
    if (confirm("Deseja reiniciar a fila do começo (contato 1)?")) {
      this.state.currentIndex = 0;
      this.cancelarContagem();
      this.carregarFila();
      this.atualizarInterfaceFila();
      if (typeof showToast === "function") showToast("Fila reiniciada!");
    }
  },

  exportarRelatorioEnviosCSV() {
    const history = this.getHistory();
    const todos = db.getEleitores() || [];
    const chaves = Object.keys(history);

    if (chaves.length === 0) {
      if (typeof showToast === "function") showToast("Nenhum envio registrado no histórico para exportar.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "ID;NOME;DATA_NASCIMENTO;TELEFONE;BAIRRO;LIDERANCA;STATUS_ENVIO;DATA_ENVIO\n";

    chaves.forEach(id => {
      const e = todos.find(item => item.id === id) || { id: id, nome: "Não encontrado" };
      const hist = history[id];
      const linha = [
        e.id,
        `"${e.nome || ''}"`,
        `"${e.dataNascimento || ''}"`,
        `"${e.telefone || ''}"`,
        `"${e.bairroNome || ''}"`,
        `"${e.liderancaNome || ''}"`,
        `"${hist.status}"`,
        `"${hist.timestamp || ''}"`
      ].join(";");
      csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_disparos_whatsapp_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Disparo individual direto da linha da tabela de Eleitores
function dispararWhatsAppEleitor(eleitorId) {
  const eleitor = db.getEleitorById(eleitorId);
  if (!eleitor) return;

  const fone = WhatsAppDispatcher.sanitizarTelefone(eleitor.telefone);
  if (!fone) {
    if (typeof showToast === "function") {
      showToast(`⚠️ Eleitor ${eleitor.nome} não possui telefone válido para WhatsApp cadastrado.`);
    }
    return;
  }

  const aniv = WhatsAppDispatcher.obterStatusAniversario(eleitor.dataNascimento);
  const templates = WhatsAppDispatcher.getTemplates();
  const tplAniv = templates.find(t => t.id === "tpl-aniversario") || WhatsAppDispatcher.defaultTemplates[0];
  const tplPadrao = templates.find(t => t.id !== "tpl-aniversario") || templates[0];

  // Se hoje for aniversário do eleitor, usa automaticamente a mensagem de Feliz Aniversário!
  const templateEscolhido = aniv.ehHoje
    ? tplAniv.texto
    : (tplPadrao?.texto || "Olá {primeiro_nome}, aqui é da equipe do Radar de Gestão!");

  const msg = WhatsAppDispatcher.processarMensagem(templateEscolhido, eleitor);
  const url = `https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
  WhatsAppDispatcher.registrarEnvio(eleitor.id, "enviado");
  if (typeof showToast === "function") {
    showToast(aniv.ehHoje ? `🎂 Mensagem de Feliz Aniversário aberta para ${eleitor.nome}!` : `💬 WhatsApp aberto para ${eleitor.nome}!`);
  }
}

// Redireciona da tela de Eleitores para a tela de Disparo em Massa
function iniciarDisparoEmMassaEleitores() {
  if (typeof navigateTo === "function") {
    navigateTo("whatsapp");
  }
}
