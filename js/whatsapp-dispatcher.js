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
      apenasNaoContatados: false,
      busca: ""
    }
  },

  // Templates padrões de mensagem
  defaultTemplates: [
    {
      id: "tpl-secao",
      nome: "🗳️ Lembrete de Seção e Votação",
      texto: "{saudacao} {primeiro_nome}, tudo bem? Passando para lembrar que seu local de votação em Riachuelo é a Seção {secao}. Qualquer dúvida sobre seu título ou local, estamos à total disposição!"
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
    }
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

    msg = msg.replace(/\{nome\}/gi, nomeCompleto);
    msg = msg.replace(/\{primeiro_nome\}/gi, primeiroNome);
    msg = msg.replace(/\{saudacao\}/gi, saudacaoSorteada);
    msg = msg.replace(/\{bairro\}/gi, eleitor.bairroNome || eleitor.comunidade || "Riachuelo");
    msg = msg.replace(/\{secao\}/gi, eleitor.secao || "-");
    msg = msg.replace(/\{lideranca\}/gi, eleitor.liderancaNome || "nossa liderança");
    msg = msg.replace(/\{rua\}/gi, eleitor.rua || eleitor.endereco || "sua localidade");

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

  // Montagem da Fila
  carregarFila() {
    const currentUser = db.getCurrentUser();
    const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";

    const todos = db.getEleitores() || [];
    const history = this.getHistory();

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

      if (this.state.filtros.busca) {
        const q = this.state.filtros.busca.toLowerCase();
        const match = (e.nome && e.nome.toLowerCase().includes(q)) ||
                      (e.bairroNome && e.bairroNome.toLowerCase().includes(q)) ||
                      (e.telefone && e.telefone.includes(q));
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
        telefoneSanitizado: foneValido,
        contatadoHoje: contatadoHoje,
        statusFila: contatadoHoje ? "ja_enviado" : "pendente"
      });
    });

    this.state.queue = fila;
    this.state.currentIndex = 0;
    return fila;
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

    if (boxContatoAtual) boxContatoAtual.style.display = "block";
    if (boxFimFila) boxFimFila.style.display = "none";
    if (btnEnviar) {
      btnEnviar.disabled = false;
      btnEnviar.innerHTML = `<span>🚀 Abrir WhatsApp para <strong>${contato.nome.split(" ")[0]}</strong></span>`;
    }

    // Preenche dados do card do contato
    const elNome = document.getElementById("wppFocoNome");
    const elTel = document.getElementById("wppFocoTelefone");
    const elBairro = document.getElementById("wppFocoBairro");
    const elSecao = document.getElementById("wppFocoSecao");
    const elLider = document.getElementById("wppFocoLider");
    const elBadgeStatus = document.getElementById("wppFocoStatusBadge");

    if (elNome) elNome.textContent = contato.nome;
    if (elTel) elTel.textContent = this.formatarTelefoneExibicao(contato.telefone);
    if (elBairro) elBairro.textContent = contato.bairroNome || "-";
    if (elSecao) elSecao.textContent = `Seção ${contato.secao || '-'}`;
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
      rua: "Rua do Comércio"
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
          <td colspan="6" style="text-align:center; padding:25px; color:var(--text-muted);">
            Nenhum eleitor localizado para os filtros informados ou todos estão sem telefone cadastrado.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.state.queue.map((e, idx) => {
      const isCurrent = idx === this.state.currentIndex;
      let statusBadge = `<span class="badge-status pendente" style="font-size:0.7rem;">Pendente</span>`;
      if (e.statusFila === "enviado") {
        statusBadge = `<span class="badge-status oficial" style="font-size:0.7rem;">✅ Enviado</span>`;
      } else if (e.statusFila === "pulado") {
        statusBadge = `<span class="badge-status provisorio" style="font-size:0.7rem;">Pulado</span>`;
      } else if (e.contatadoHoje) {
        statusBadge = `<span class="badge-status oficial" style="font-size:0.7rem;">Contatado Hoje</span>`;
      }

      return `
        <tr class="${isCurrent ? 'wpp-row-active' : ''}" style="${isCurrent ? 'background:rgba(37,211,102,0.12);' : ''}">
          <td style="font-family:var(--font-mono); font-size:0.75rem; color:var(--text-dim);">${idx + 1}</td>
          <td>
            <strong style="color:#ffffff; font-size:0.86rem; cursor:pointer;" onclick="WhatsAppDispatcher.selecionarContatoFila(${idx})">${e.nome}</strong>
            ${isCurrent ? `<span style="margin-left:6px; font-size:0.7rem; background:#25D366; color:#000; padding:1px 6px; border-radius:4px; font-weight:700;">ATUAL</span>` : ''}
          </td>
          <td style="font-family:var(--font-mono); font-size:0.8rem; color:var(--emerald-400);">${this.formatarTelefoneExibicao(e.telefone)}</td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${e.bairroNome || '-'}</td>
          <td style="font-size:0.8rem; color:var(--text-muted);">Seção ${e.secao || '-'}</td>
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
    const checkNaoContatados = document.getElementById("wppCheckNaoContatados");
    const searchInput = document.getElementById("wppSearchInput");

    this.state.filtros = {
      bairro: filtroBairro ? filtroBairro.value : "",
      lideranca: filtroLider ? filtroLider.value : "",
      secao: filtroSecao ? filtroSecao.value : "",
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
    csvContent += "ID;NOME;TELEFONE;BAIRRO;SECAO;LIDERANCA;STATUS_ENVIO;DATA_ENVIO\n";

    chaves.forEach(id => {
      const e = todos.find(item => item.id === id) || { id: id, nome: "Não encontrado" };
      const hist = history[id];
      const linha = [
        e.id,
        `"${e.nome || ''}"`,
        `"${e.telefone || ''}"`,
        `"${e.bairroNome || ''}"`,
        `"${e.secao || ''}"`,
        `"${e.liderancaNome || ''}"`,
        `"${hist.status}"`,
        `"${hist.timestamp || ''}"`
      ].join(";");
      csvContent += linha + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_disparos_whatsapp_bacurau_${new Date().toISOString().slice(0, 10)}.csv`);
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

  // Se tiver um template padrão, usa o de Seção
  const template = WhatsAppDispatcher.getTemplates()[0]?.texto || "Olá {primeiro_nome}, aqui é da equipe do Radar Bacurau!";
  const msg = WhatsAppDispatcher.processarMensagem(template, eleitor);
  const url = `https://api.whatsapp.com/send?phone=${fone}&text=${encodeURIComponent(msg)}`;

  window.open(url, "_blank");
  WhatsAppDispatcher.registrarEnvio(eleitor.id, "enviado");
  if (typeof showToast === "function") {
    showToast(`💬 WhatsApp aberto para ${eleitor.nome}!`);
  }
}

// Redireciona da tela de Eleitores para a tela de Disparo em Massa
function iniciarDisparoEmMassaEleitores() {
  if (typeof navigateTo === "function") {
    navigateTo("whatsapp");
  }
}
