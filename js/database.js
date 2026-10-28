/**
 * RADAR BACURAU — Camada de Banco de Dados Persistente e Auditoria
 * Sistema de Inteligência Eleitoral e Gestão Territorial
 * Suporte a Contornos Poligonais dos Bairros, Lideranças e Votos
 */

class RadarBacurauDB {
  constructor() {
    this.STORAGE_KEY = "RADAR_BACURAU_DATA_V4";
    this.CURRENT_USER_KEY = "RADAR_BACURAU_CURRENT_USER";
    this.THEME_KEY = "RADAR_BACURAU_THEME";
    this.data = null;
    this.init();
  }

  init() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.data = JSON.parse(stored);
        // Validação: Garante que Cachoeira do Sapo (com-00) e os polígonos estão presentes
        const temCachoeira = this.data.comunidades && this.data.comunidades.some(c => c.id === "com-00");
        const temPoligonos = this.data.comunidades && this.data.comunidades.some(c => c.poligono && c.poligono.length >= 3);
        if (!temCachoeira || !temPoligonos || !this.data.municipioInfo || this.data.municipioInfo.versaoBase !== SEED_DATA.municipioInfo.versaoBase) {
          this.resetToSeed();
        } else {
          // Remove quaisquer dados fictícios de eleitores
          if (this.data.eleitores && Array.isArray(this.data.eleitores)) {
            const idsMock = ["el-01", "el-02", "el-03", "el-04", "el-05", "el-06", "el-07", "el-08"];
            this.data.eleitores = this.data.eleitores.filter(e => !idsMock.includes(e.id));
            this.save();
          } else {
            this.data.eleitores = [];
            this.save();
          }
        }
        // Remove quaisquer dados fictícios de demandas iniciais
        if (this.data.demandas && Array.isArray(this.data.demandas)) {
          const idsMockDemandas = ["dem-001", "dem-002", "dem-003", "dem-004", "dem-005"];
          this.data.demandas = this.data.demandas.filter(d => !idsMockDemandas.includes(d.id));
          this.save();
        } else {
          this.data.demandas = [];
          this.save();
        }
        if (!this.data.simuladorConfig) {
          this.data.simuladorConfig = JSON.parse(JSON.stringify(SEED_DATA.simuladorConfig || {}));
          this.save();
        }
        if (this.data.comunidades && Array.isArray(this.data.comunidades)) {
          let mudou = false;
          this.data.comunidades.forEach(c => {
            if (!c.metaVotos) {
              c.metaVotos = Math.max(30, Math.round((c.eleitoresEstimados || 200) * 0.4));
              mudou = true;
            }
          });
          if (mudou) this.save();
        }

        // Garante que o Adm Master seja 'ADMINISTRADOR', login 'ADMMASTER' e senha 'Bacurau123.'
        // Remove logins não desejados: juliana, carlos, auditor, alter (Altemar Gabriel)
        const loginsParaRemover = ["juliana", "carlos", "auditor", "alter"];
        const idsParaRemover = ["usr-02", "usr-03", "usr-04"];
        const nomesParaRemover = ["juliana medeiros farias", "carlos eduardo da silva", "auditor convidado tre-rn", "altemar gabriel"];

        if (this.data.usuarios && Array.isArray(this.data.usuarios)) {
          this.data.usuarios = this.data.usuarios.filter(u => {
            const login = (u.login || "").toLowerCase();
            const nome = (u.nome || "").toLowerCase();
            if (idsParaRemover.includes(u.id)) return false;
            if (loginsParaRemover.includes(login)) return false;
            if (nomesParaRemover.includes(nome)) return false;
            return true;
          });
        }

        // Garante usuário master ADMINISTRADOR
        let masterUser = (this.data.usuarios || []).find(u => u.id === "usr-01" || u.perfil === "ADMINISTRADOR MASTER");
        if (!masterUser) {
          masterUser = {
            id: "usr-01",
            nome: "ADMINISTRADOR",
            login: "ADMMASTER",
            senha: "Bacurau123.",
            email: "admin@radarbacurau.rn.gov.br",
            perfil: "ADMINISTRADOR MASTER",
            status: "Ativo",
            ultimoAcesso: new Date().toISOString()
          };
          if (!this.data.usuarios) this.data.usuarios = [];
          this.data.usuarios.unshift(masterUser);
        } else {
          masterUser.nome = "ADMINISTRADOR";
          masterUser.login = "ADMMASTER";
          masterUser.senha = "Bacurau123.";
        }

        // Remove liderança com login 'alter' ou nome 'Altemar Gabriel' se existir
        if (this.data.liderancas && Array.isArray(this.data.liderancas)) {
          this.data.liderancas = this.data.liderancas.filter(l => {
            const login = (l.login || "").toLowerCase();
            const nome = (l.nome || "").toLowerCase();
            return login !== "alter" && nome !== "altemar gabriel";
          });
        }

        this.save();
      } else {
        this.resetToSeed();
      }
    } catch (e) {
      console.error("Erro ao inicializar banco de dados local:", e);
      this.resetToSeed();
    }

    const cur = this.getCurrentUser();
    const masterUser = (this.data.usuarios || []).find(u => u.id === "usr-01" || u.perfil === "ADMINISTRADOR MASTER") || this.data.usuarios[0];
    if (masterUser) {
      masterUser.nome = "ADMINISTRADOR";
      masterUser.login = "ADMMASTER";
      masterUser.senha = "Bacurau123.";
    }
    if (!cur || cur.id === "usr-01" || cur.perfil === "ADMINISTRADOR MASTER" || (cur.nome && cur.nome.includes("Dr.")) || ["juliana", "carlos", "auditor", "alter"].includes((cur.login || "").toLowerCase())) {
      if (masterUser) {
        this.setCurrentUser(masterUser);
      }
    }
  }

  save() {
    try {
      this.data.municipioInfo.dataAtualizacao = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Falha ao salvar no localStorage:", e);
    }
  }

  resetToSeed() {
    this.data = JSON.parse(JSON.stringify(SEED_DATA));
    this.data.eleitores = [];
    this.data.demandas = [];
    if (!this.data.simuladorConfig) {
      this.data.simuladorConfig = JSON.parse(JSON.stringify(SEED_DATA.simuladorConfig || {}));
    }
    this.save();
    this.logAuditoria("Restauração de Dados", "Sistema", "Base de dados restaurada com contornos poligonais precisos dos bairros, demandas zeradas e simulador eleitoral.");
  }

  getLimiteMunicipal() {
    return this.data.limiteMunicipal || SEED_DATA.limiteMunicipal || [];
  }

  atualizarPoligonoComunidade(comunidadeId, novosPontos) {
    const com = this.getComunidadeById(comunidadeId);
    if (!com) return false;
    com.poligono = novosPontos;

    if (novosPontos && novosPontos.length >= 3) {
      const sumLat = novosPontos.reduce((acc, p) => acc + p[0], 0);
      const sumLng = novosPontos.reduce((acc, p) => acc + p[1], 0);
      com.coordenadas = [
        Number((sumLat / novosPontos.length).toFixed(5)),
        Number((sumLng / novosPontos.length).toFixed(5))
      ];

      // Cálculo aproximado de área em hectares usando fórmula de Gauss/Shoelace
      let areaMetros2 = 0;
      const n = novosPontos.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const latMediaRad = (novosPontos[i][0] * Math.PI) / 180;
        const x1 = novosPontos[i][1] * 111320 * Math.cos(latMediaRad);
        const y1 = novosPontos[i][0] * 111320;
        const x2 = novosPontos[j][1] * 111320 * Math.cos(latMediaRad);
        const y2 = novosPontos[j][0] * 111320;
        areaMetros2 += (x1 * y2) - (x2 * y1);
      }
      const areaHectares = Math.abs(areaMetros2) / 20000;
      if (areaHectares > 0.1) {
        com.areaHectares = Math.round(areaHectares);
      }
    }

    this.save();
    this.logAuditoria("Edição Cartográfica", "Território", `Contorno poligonal de "${com.nome}" atualizado (${novosPontos.length} vértices).`);
    return true;
  }

  getCurrentUser() {
    try {
      const user = localStorage.getItem(this.CURRENT_USER_KEY);
      return user ? JSON.parse(user) : this.data.usuarios[0];
    } catch (e) {
      return this.data.usuarios[0];
    }
  }

  setCurrentUser(user) {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
    this.logAuditoria("Alteração de Perfil Ativo", "Autenticação", `Sessão assumida como ${user.nome} (${user.perfil}).`);
  }

  // --- GESTÃO DE USUÁRIOS, LOGIN E SENHA ---
  getUsuarios() {
    const list = this.data.usuarios || [];
    const removidos = ["juliana", "carlos", "auditor", "alter"];
    const nomesRemovidos = ["juliana medeiros farias", "carlos eduardo da silva", "auditor convidado tre-rn", "altemar gabriel"];
    return list.filter(u => 
      !removidos.includes((u.login || "").toLowerCase()) &&
      !nomesRemovidos.includes((u.nome || "").toLowerCase())
    );
  }

  getUsuarioById(id) {
    return (this.data.usuarios || []).find(u => u.id === id);
  }

  saveUsuario(dados) {
    if (!this.data.usuarios) this.data.usuarios = [];
    
    // Validação e normalização de login
    const loginFormatado = (dados.login || "").trim().toLowerCase();
    if (!loginFormatado) {
      throw new Error("O nome de usuário / login é obrigatório.");
    }
    if (!dados.senha || String(dados.senha).length < 4) {
      throw new Error("A senha de acesso deve conter no mínimo 4 caracteres.");
    }
    if (!dados.nome || !dados.nome.trim()) {
      throw new Error("O nome completo do usuário é obrigatório.");
    }

    // Validação de unicidade do login
    const conflito = this.data.usuarios.find(u => u.login && u.login.toLowerCase() === loginFormatado && u.id !== dados.id);
    if (conflito) {
      throw new Error(`O login "${loginFormatado}" já está cadastrado para outro usuário.`);
    }

    if (!dados.id) {
      // Novo Cadastro
      dados.id = "usr-" + Date.now();
      dados.login = loginFormatado;
      dados.status = dados.status || "Ativo";
      dados.ultimoAcesso = "Recém cadastrado";
      dados.dataCriacao = new Date().toLocaleString("pt-BR");
      this.data.usuarios.push(dados);
      this.logAuditoria("Cadastro de Usuário", "Segurança RBAC", `Cadastrado novo login "${dados.login}" (${dados.nome}) com perfil ${dados.perfil}.`);
    } else {
      // Atualização
      const idx = this.data.usuarios.findIndex(u => u.id === dados.id);
      if (idx !== -1) {
        dados.login = loginFormatado;
        this.data.usuarios[idx] = { ...this.data.usuarios[idx], ...dados };
        this.logAuditoria("Atualização de Usuário", "Segurança RBAC", `Atualizado cadastro e credenciais do usuário "${dados.nome}" (${dados.login}).`);
        
        // Se o usuário atual editou seu próprio perfil, atualiza sessão
        const cur = this.getCurrentUser();
        if (cur && cur.id === dados.id) {
          this.setCurrentUser(this.data.usuarios[idx]);
        }
      } else {
        this.data.usuarios.push(dados);
      }
    }
    this.save();
    return dados;
  }

  deleteUsuario(id) {
    if (!this.data.usuarios) return false;
    const usr = this.data.usuarios.find(u => u.id === id);
    if (!usr) return false;
    
    // Protege contra exclusão do último Administrador Master
    const admins = this.data.usuarios.filter(u => u.perfil === "ADMINISTRADOR MASTER");
    if (usr.perfil === "ADMINISTRADOR MASTER" && admins.length <= 1) {
      throw new Error("Operação negada: Não é permitido excluir o único Administrador Master do sistema.");
    }

    this.data.usuarios = this.data.usuarios.filter(u => u.id !== id);
    this.logAuditoria("Exclusão de Usuário", "Segurança RBAC", `Removido usuário ${usr.nome} (Login: ${usr.login}).`);
    this.save();
    return true;
  }

  autenticar(loginOuEmail, senha) {
    if (!loginOuEmail || !senha) {
      throw new Error("Informe o login e a senha.");
    }
    const q = String(loginOuEmail).trim().toLowerCase();
    
    // 1. Busca nos Usuários do Sistema
    const user = (this.data.usuarios || []).find(u => 
      (u.login && u.login.toLowerCase() === q) || 
      (u.email && u.email.toLowerCase() === q)
    );

    if (user) {
      if (user.status && user.status.toLowerCase() === "bloqueado") {
        this.logAuditoria("Acesso Negado", "Autenticação", `Tentativa de login de usuário bloqueado: ${user.nome}.`);
        throw new Error("Este usuário está bloqueado pelo Administrador. Acesso restrito.");
      }

      if (user.senha && String(user.senha) !== String(senha)) {
        this.logAuditoria("Senha Incorreta", "Autenticação", `Senha incorreta para o login "${user.login}".`);
        throw new Error("Senha incorreta. Verifique suas credenciais e tente novamente.");
      }

      user.ultimoAcesso = new Date().toLocaleString("pt-BR");
      this.setCurrentUser(user);
      this.save();
      this.logAuditoria("Login com Sucesso", "Autenticação", `Usuário ${user.nome} (${user.login}) efetuou login com sucesso.`);
      return user;
    }

    // 2. Busca nas Lideranças Cadastradas (se possuir login próprio)
    const lid = (this.data.liderancas || []).find(l => 
      (l.login && l.login.toLowerCase() === q) || 
      (l.email && l.email.toLowerCase() === q)
    );

    if (lid) {
      if (lid.status && lid.status.toLowerCase() === "inativo") {
        this.logAuditoria("Acesso Negado", "Autenticação", `Tentativa de login de liderança inativa: ${lid.nome}.`);
        throw new Error("O cadastro desta liderança está inativo ou suspenso.");
      }

      if (lid.senha && String(lid.senha) !== String(senha)) {
        this.logAuditoria("Senha Incorreta", "Autenticação", `Senha incorreta para a liderança "${lid.login}".`);
        throw new Error("Senha incorreta da liderança.");
      }

      const sessionLider = {
        id: "usr-lid-" + lid.id,
        liderancaId: lid.id,
        nome: lid.nome,
        login: lid.login,
        email: lid.email || "",
        perfil: "LIDERANÇA COMUNITÁRIA",
        status: lid.status || "Ativo",
        comunidadesVinculadas: lid.comunidadesVinculadas || [],
        ultimoAcesso: new Date().toLocaleString("pt-BR")
      };

      this.setCurrentUser(sessionLider);
      this.save();
      this.logAuditoria("Login de Liderança", "Autenticação", `Liderança ${lid.nome} (${lid.login}) autenticada com visão restrita.`);
      return sessionLider;
    }

    this.logAuditoria("Tentativa Inválida", "Autenticação", `Tentativa de login inexistente: "${loginOuEmail}".`);
    throw new Error("Usuário ou e-mail não encontrado no sistema.");
  }

  logout() {
    const cur = this.getCurrentUser();
    if (cur) {
      this.logAuditoria("Logout / Encerramento", "Autenticação", `Sessão de ${cur.nome} (${cur.login}) encerrada.`);
    }
  }

  logAuditoria(acao, entidade, detalhes) {
    if (!this.data) return;
    const user = this.getCurrentUser();
    const log = {
      id: "log-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      timestamp: new Date().toLocaleString("pt-BR"),
      usuario: user.nome || "Sistema",
      perfil: user.perfil || "SISTEMA",
      acao: acao,
      entidade: entidade,
      detalhes: detalhes,
      ip: "189.124.88." + (Math.floor(Math.random() * 50) + 1)
    };

    if (!this.data.logsAuditoria) this.data.logsAuditoria = [];
    this.data.logsAuditoria.unshift(log);

    if (this.data.logsAuditoria.length > 500) {
      this.data.logsAuditoria.pop();
    }
    this.save();
  }

  getLogsAuditoria() {
    return this.data.logsAuditoria || [];
  }

  // --- COMUNIDADES E BAIRROS ---
  getComunidades(filtros = {}) {
    let list = this.data.comunidades || [];
    if (filtros.tipo) {
      list = list.filter(c => c.tipo.toLowerCase().includes(filtros.tipo.toLowerCase()));
    }
    if (filtros.status) {
      list = list.filter(c => c.statusConferencia === filtros.status);
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      list = list.filter(c => 
        c.nome.toLowerCase().includes(q) || 
        (c.liderancaNome && c.liderancaNome.toLowerCase().includes(q)) ||
        (c.observacoes && c.observacoes.toLowerCase().includes(q))
      );
    }
    return list;
  }

  getComunidadeById(id) {
    return (this.data.comunidades || []).find(c => c.id === id);
  }

  saveComunidade(comunidadeData) {
    if (!comunidadeData.poligono || comunidadeData.poligono.length < 3) {
      const [lat, lng] = comunidadeData.coordenadas || [-5.8153, -35.8239];
      const dLat = 0.0035;
      const dLng = 0.0045;
      comunidadeData.poligono = [
        [Number((lat + dLat).toFixed(5)), Number((lng - dLng).toFixed(5))],
        [Number((lat + dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
        [Number((lat - dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
        [Number((lat - dLat).toFixed(5)), Number((lng - dLng).toFixed(5))]
      ];
    }

    if (!comunidadeData.id) {
      comunidadeData.id = "com-" + String(Date.now()).slice(-6);
      this.data.comunidades.push(comunidadeData);
      this.logAuditoria("Criação de Bairro", "Comunidades", `Cadastrado bairro "${comunidadeData.nome}".`);
    } else {
      const index = this.data.comunidades.findIndex(c => c.id === comunidadeData.id);
      if (index !== -1) {
        this.data.comunidades[index] = { ...this.data.comunidades[index], ...comunidadeData };
        this.logAuditoria("Atualização de Bairro", "Comunidades", `Atualizado bairro "${comunidadeData.nome}".`);
      }
    }
    this.save();
    return comunidadeData;
  }

  atribuirLiderancaAoBairro(comunidadeId, nomeLideranca, votosConseguidos, metaVotos = null, contato = "", obs = "") {
    const com = this.getComunidadeById(comunidadeId);
    if (!com) return null;

    nomeLideranca = (nomeLideranca || "").trim();
    const votos = parseInt(votosConseguidos) || 0;

    com.liderancaNome = nomeLideranca || null;
    com.votosConseguidos = votos;
    if (metaVotos !== null && metaVotos !== undefined && metaVotos !== "") {
      com.metaVotos = parseInt(metaVotos) || 0;
    } else if (!com.metaVotos) {
      com.metaVotos = Math.round((com.eleitoresEstimados || 200) * 0.4);
    }

    if (contato) com.liderancaContato = contato;

    if (nomeLideranca) {
      let lid = (this.data.liderancas || []).find(l => l.nome.toLowerCase() === nomeLideranca.toLowerCase());
      if (!lid) {
        lid = {
          id: "lid-" + Date.now(),
          nome: nomeLideranca,
          telefone: contato,
          cargoPapel: "Líder de Bairro / Localidade",
          comunidadesVinculadas: [comunidadeId],
          status: "Ativo",
          dataInicio: new Date().toISOString().split("T")[0],
          votosTotaisConseguidos: votos,
          observacoes: obs
        };
        this.data.liderancas.push(lid);
      } else {
        if (!lid.comunidadesVinculadas.includes(comunidadeId)) {
          lid.comunidadesVinculadas.push(comunidadeId);
        }
        lid.votosTotaisConseguidos = (lid.votosTotaisConseguidos || 0) + votos;
      }
      com.liderancaResponsavelId = lid.id;
      this.logAuditoria("Mapeamento Territorial", "Mapa / Bairro", `Bairro "${com.nome}" mapeado com líder "${nomeLideranca}", ${votos} votos e meta de ${com.metaVotos} votos.`);
    } else {
      com.liderancaResponsavelId = null;
      this.logAuditoria("Desvinculação", "Mapa / Bairro", `Liderança removida do bairro "${com.nome}".`);
    }

    this.save();
    return com;
  }

  salvarMetaBairro(comunidadeId, novaMeta) {
    const com = this.getComunidadeById(comunidadeId);
    if (!com) return null;
    com.metaVotos = Math.max(0, parseInt(novaMeta) || 0);
    this.save();
    this.logAuditoria("Meta Eleitoral", "Território", `Meta de votos de "${com.nome}" ajustada para ${com.metaVotos} votos.`);
    return com;
  }

  getMetasConsolidadas() {
    const coms = this.data.comunidades || [];
    let metaTotal = 0;
    let votosTotal = 0;
    let eleitoresTotal = 0;
    let atingidos = 0;
    let pendentes = 0;

    coms.forEach(c => {
      const meta = Number(c.metaVotos) || Math.round((c.eleitoresEstimados || 200) * 0.4);
      const votos = Number(c.votosConseguidos) || 0;
      const el = Number(c.eleitoresEstimados) || 0;

      metaTotal += meta;
      votosTotal += votos;
      eleitoresTotal += el;

      if (votos >= meta && meta > 0) {
        atingidos++;
      } else {
        pendentes++;
      }
    });

    const percentual = metaTotal > 0 ? Math.min(100, Math.round((votosTotal / metaTotal) * 100)) : 0;

    return {
      metaTotal,
      votosTotal,
      eleitoresTotal,
      percentual,
      totalBairros: coms.length,
      bairrosAtingidos: atingidos,
      bairrosPendentes: pendentes
    };
  }

  // --- LIDERANÇAS ---
  getLiderancas(filtros = {}) {
    let list = this.data.liderancas || [];
    if (filtros.status) {
      list = list.filter(l => l.status === filtros.status);
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      list = list.filter(l => 
        (l.nome && l.nome.toLowerCase().includes(q)) ||
        (l.apelido && l.apelido.toLowerCase().includes(q)) ||
        (l.cargoPapel && l.cargoPapel.toLowerCase().includes(q)) ||
        (l.telefone && l.telefone.includes(q))
      );
    }
    return list;
  }

  getLiderancaById(id) {
    return (this.data.liderancas || []).find(l => l.id === id);
  }

  saveLideranca(dados) {
    if (!this.data.liderancas) this.data.liderancas = [];
    if (dados.login) {
      dados.login = String(dados.login).trim().toLowerCase();
    }

    if (!dados.id) {
      dados.id = "lid-" + Date.now();
      this.data.liderancas.unshift(dados);
      this.logAuditoria("Cadastro de Liderança", "Lideranças", `Cadastrada liderança "${dados.nome}" (Login: ${dados.login || 'sem acesso'}).`);
    } else {
      const idx = this.data.liderancas.findIndex(l => l.id === dados.id);
      if (idx !== -1) {
        this.data.liderancas[idx] = { ...this.data.liderancas[idx], ...dados };
        this.logAuditoria("Atualização de Liderança", "Lideranças", `Atualizada liderança "${dados.nome}".`);
      } else {
        this.data.liderancas.unshift(dados);
      }
    }

    // Se a liderança possui login e senha, sincroniza ou atualiza o perfil em usuarios
    if (dados.login && dados.senha) {
      if (!this.data.usuarios) this.data.usuarios = [];
      const usrId = "usr-lid-" + dados.id;
      const idxUsr = this.data.usuarios.findIndex(u => u.id === usrId || (u.liderancaId && u.liderancaId === dados.id));
      const usuarioLid = {
        id: usrId,
        liderancaId: dados.id,
        nome: dados.nome,
        login: dados.login,
        senha: dados.senha,
        email: dados.email || "",
        perfil: "LIDERANÇA COMUNITÁRIA",
        status: dados.status || "Ativo",
        comunidadesVinculadas: dados.comunidadesVinculadas || [],
        ultimoAcesso: "Recém vinculado"
      };

      if (idxUsr !== -1) {
        this.data.usuarios[idxUsr] = { ...this.data.usuarios[idxUsr], ...usuarioLid };
      } else {
        this.data.usuarios.push(usuarioLid);
      }
    }

    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.salvarLiderancaNuvem(dados);
    }
    return dados;
  }

  deleteLideranca(id) {
    if (!this.data.liderancas) return false;
    const item = this.getLiderancaById(id);
    if (!item) return false;
    this.data.liderancas = this.data.liderancas.filter(l => l.id !== id);

    // Remove usuário vinculado da lista de usuários, se houver
    if (this.data.usuarios) {
      this.data.usuarios = this.data.usuarios.filter(u => 
        u.id !== ("usr-lid-" + id) && 
        u.liderancaId !== id && 
        (!item.login || u.login !== item.login)
      );
    }

    // Desvincula comunidades associadas a esta liderança
    if (this.data.comunidades) {
      this.data.comunidades.forEach(c => {
        if (c.liderancaResponsavelId === id || (c.liderancaNome && c.liderancaNome.toLowerCase() === (item.nome || "").toLowerCase())) {
          c.liderancaNome = null;
          c.liderancaResponsavelId = null;
          c.liderancaContato = null;
          c.votosConquistados = 0;
        }
      });
    }

    this.logAuditoria("Exclusão de Liderança", "Lideranças", `Removida liderança "${item.nome}".`);
    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.excluirLiderancaNuvem(id);
    }
    return true;
  }

  // --- SEÇÕES E LOCAIS ---
  getLocaisVotacao() {
    return this.data.locaisVotacao || [];
  }

  getLocalVotacaoById(id) {
    return (this.data.locaisVotacao || []).find(l => l.id === id);
  }

  getSecoesEleitorais(filtros = {}) {
    return this.data.secoesEleitorais || [];
  }

  saveSecao(secaoData) {
    if (!this.data.secoesEleitorais) this.data.secoesEleitorais = [];
    if (!secaoData.id) {
      secaoData.id = "sec-" + Date.now();
      this.data.secoesEleitorais.push(secaoData);
      this.logAuditoria("Cadastro de Seção", "Seções Eleitorais", `Cadastrada Seção ${secaoData.secao} (8ª Zona).`);
    } else {
      const idx = this.data.secoesEleitorais.findIndex(s => s.id === secaoData.id);
      if (idx !== -1) {
        this.data.secoesEleitorais[idx] = { ...this.data.secoesEleitorais[idx], ...secaoData };
        this.logAuditoria("Atualização de Seção", "Seções Eleitorais", `Atualizada Seção ${secaoData.secao}.`);
      } else {
        this.data.secoesEleitorais.push(secaoData);
      }
    }
    this.save();
    return secaoData;
  }

  deleteSecao(id) {
    if (!this.data.secoesEleitorais) return false;
    const item = this.data.secoesEleitorais.find(s => s.id === id);
    if (!item) return false;
    this.data.secoesEleitorais = this.data.secoesEleitorais.filter(s => s.id !== id);
    this.logAuditoria("Exclusão de Seção", "Seções Eleitorais", `Removida Seção ${item.secao}.`);
    this.save();
    return true;
  }

  // --- CADASTROS ADMINISTRATIVOS / LGPD ---
  getRegistrosLgpd(filtros = {}) {
    if (!this.data.cadastrosAdministrativos) {
      this.data.cadastrosAdministrativos = [];
    }
    let list = this.data.cadastrosAdministrativos;
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      list = list.filter(r => 
        (r.codigoInterno && r.codigoInterno.toLowerCase().includes(q)) ||
        (r.referencia && r.referencia.toLowerCase().includes(q)) ||
        (r.comunidadeNome && r.comunidadeNome.toLowerCase().includes(q)) ||
        (r.finalidade && r.finalidade.toLowerCase().includes(q))
      );
    }
    return list;
  }

  saveRegistroLgpd(dados) {
    if (!this.data.cadastrosAdministrativos) this.data.cadastrosAdministrativos = [];
    if (!dados.id) {
      dados.id = "lgpd-" + Date.now();
      dados.codigoInterno = "LGPD-RIA-" + String(Math.floor(Math.random() * 9000) + 1000);
      dados.dataCriacao = new Date().toLocaleDateString("pt-BR");
      this.data.cadastrosAdministrativos.unshift(dados);
      this.logAuditoria("Registro LGPD", "Conformidade LGPD", `Registrado termo ${dados.codigoInterno} (${dados.referencia}).`);
    } else {
      const idx = this.data.cadastrosAdministrativos.findIndex(r => r.id === dados.id);
      if (idx !== -1) {
        this.data.cadastrosAdministrativos[idx] = { ...this.data.cadastrosAdministrativos[idx], ...dados };
        this.logAuditoria("Atualização LGPD", "Conformidade LGPD", `Atualizado registro ${dados.codigoInterno}.`);
      }
    }
    this.save();
    return dados;
  }

  deleteRegistroLgpd(id) {
    if (!this.data.cadastrosAdministrativos) return false;
    const item = this.data.cadastrosAdministrativos.find(r => r.id === id);
    if (!item) return false;
    this.data.cadastrosAdministrativos = this.data.cadastrosAdministrativos.filter(r => r.id !== id);
    this.logAuditoria("Revogação / Exclusão LGPD", "Conformidade LGPD", `Revogado registro ${item.codigoInterno} (${item.referencia}).`);
    this.save();
    return true;
  }

  saveResultadoEleitoral(resData) {
    if (!this.data.resultadosEleitorais) {
      this.data.resultadosEleitorais = typeof TSE_HISTORICO_SECOES !== 'undefined' ? JSON.parse(JSON.stringify(TSE_HISTORICO_SECOES)) : [];
    }
    if (!resData.id) {
      resData.id = "res-" + Date.now();
    }
    const idx = this.data.resultadosEleitorais.findIndex(r => r.id === resData.id || (r.secao === resData.secao && Number(r.ano) === Number(resData.ano) && r.cargo === resData.cargo));
    if (idx !== -1) {
      this.data.resultadosEleitorais[idx] = { ...this.data.resultadosEleitorais[idx], ...resData };
      this.logAuditoria("Atualização de Resultado", "TSE / Resultados", `Atualizado resultado da Seção ${resData.secao} (${resData.ano} - ${resData.cargo}).`);
    } else {
      this.data.resultadosEleitorais.unshift(resData);
      this.logAuditoria("Lançamento de Resultado", "TSE / Resultados", `Lançado novo resultado para Seção ${resData.secao} (${resData.ano} - ${resData.cargo}).`);
    }
    this.save();
    return resData;
  }

  // --- RESULTADOS HISTÓRICOS TSE (2014-2026) POR SEÇÃO ---
  getResultadosEleitorais(filtros = {}) {
    let list = (this.data.resultadosEleitorais && this.data.resultadosEleitorais.length > 0)
      ? this.data.resultadosEleitorais 
      : (typeof TSE_HISTORICO_SECOES !== 'undefined' ? TSE_HISTORICO_SECOES : []);

    if (filtros.ano) {
      list = list.filter(r => Number(r.ano) === Number(filtros.ano));
    }
    if (filtros.cargo) {
      list = list.filter(r => r.cargo.toLowerCase() === filtros.cargo.toLowerCase());
    }
    if (filtros.secao) {
      list = list.filter(r => r.secao === filtros.secao);
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      list = list.filter(r => 
        r.secao.includes(q) || 
        (r.localNome && r.localNome.toLowerCase().includes(q)) || 
        (r.bairroComunidade && r.bairroComunidade.toLowerCase().includes(q)) ||
        (r.candidatos && r.candidatos.some(c => c.nome.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q)))
      );
    }
    return list;
  }

  getAnosEleicoes() {
    if (typeof TSE_SERVICE !== 'undefined') {
      return TSE_SERVICE.getAnosDisponiveis();
    }
    return [2026, 2024, 2022, 2020, 2018, 2016, 2014];
  }

  getCargosEleicao(ano) {
    if (typeof TSE_SERVICE !== 'undefined') {
      return TSE_SERVICE.getCargosPorAno(ano);
    }
    return ["Prefeito", "Vereador"];
  }

  getSecaoDossie(secaoNumero) {
    if (typeof TSE_SERVICE !== 'undefined') {
      return TSE_SERVICE.getDossieSecao(secaoNumero);
    }
    const list = this.getResultadosEleitorais({ secao: secaoNumero });
    return {
      secao: secaoNumero,
      historicoPorAno: list
    };
  }

  getRankingTerritorialCandidatos(filtros = {}) {
    if (typeof TSE_SERVICE !== 'undefined' && TSE_SERVICE.getRankingCandidatosPaginado) {
      return TSE_SERVICE.getRankingCandidatosPaginado(filtros);
    }
    return { itens: [], totalItens: 0, totalPaginas: 1, paginaAtual: 1, limite: 10, inicioIndice: 0, fimIndice: 0 };
  }

  getDashboardStats() {
    const coms = this.data.comunidades || [];
    const lids = this.data.liderancas || [];
    const secs = this.data.secoesEleitorais || [];

    const bairrosCount = coms.filter(c => c.tipo.includes("Bairro")).length;
    const assentamentosCount = coms.filter(c => c.tipo.includes("Assentamento")).length;

    let totalVotosLiderancasMapeadas = 0;
    let bairrosComLideranca = 0;

    coms.forEach(c => {
      totalVotosLiderancasMapeadas += Number(c.votosConseguidos) || 0;
      if (c.liderancaNome || c.liderancaResponsavelId) bairrosComLideranca++;
    });

    const dems = this.data.demandas || [];
    const totalDemandas = dems.length;
    const demandasPendentes = dems.filter(d => d.status === "Pendente").length;
    const demandasEmAndamento = dems.filter(d => d.status === "Em Andamento").length;
    const demandasConcluidas = dems.filter(d => d.status === "Concluído").length;

    return {
      municipio: this.data.municipioInfo,
      totalComunidades: coms.length,
      bairrosCount,
      assentamentosCount,
      totalLiderancas: lids.length,
      totalSecoes: secs.length,
      totalEleitoresCadastrados: (this.data.eleitores || []).length,
      totalVotosContabilizados: totalVotosLiderancasMapeadas,
      bairrosComLideranca: bairrosComLideranca,
      totalDemandas,
      demandasPendentes,
      demandasEmAndamento,
      demandasConcluidas,
      dataAtualizacao: this.data.municipioInfo.dataAtualizacao || new Date().toISOString()
    };
  }

  // --- GESTÃO DE ELEITORES POR BAIRRO E LIDERANÇA ---
  getEleitores(filtros = {}) {
    if (!this.data.eleitores) {
      this.data.eleitores = [];
    }
    let list = this.data.eleitores || [];

    // Se o usuário atual for Liderança Comunitária, eleitor só é dele (visualização exclusiva)
    const currentUser = this.getCurrentUser();
    const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
    if (isLider) {
      const nomeLider = (currentUser.nome || "").trim().toLowerCase();
      list = list.filter(e => {
        const eLid = (e.liderancaNome || "").trim().toLowerCase();
        return eLid === nomeLider || (currentUser.liderancaId && e.liderancaId === currentUser.liderancaId);
      });
    } else if (filtros.lideranca) {
      const filtroLid = filtros.lideranca.trim().toLowerCase();
      list = list.filter(e => (e.liderancaNome || "").trim().toLowerCase() === filtroLid);
    }

    if (filtros.bairro) {
      list = list.filter(e => e.bairroNome === filtros.bairro || e.comunidadeId === filtros.bairro);
    }
    if (filtros.secao) {
      list = list.filter(e => String(e.secao) === String(filtros.secao));
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      const qDigits = q.replace(/\D/g, "");
      list = list.filter(e => 
        (e.nome && e.nome.toLowerCase().includes(q)) ||
        (e.numeroTitulo && qDigits && e.numeroTitulo.replace(/\D/g, "").includes(qDigits)) ||
        (e.rua && e.rua.toLowerCase().includes(q)) ||
        (e.endereco && e.endereco.toLowerCase().includes(q)) ||
        (e.bairroNome && e.bairroNome.toLowerCase().includes(q)) ||
        (e.liderancaNome && e.liderancaNome.toLowerCase().includes(q)) ||
        (e.secao && String(e.secao).includes(q)) ||
        (e.telefone && e.telefone.includes(q))
      );
    }
    return list;
  }

  getEleitorById(id) {
    return (this.data.eleitores || []).find(e => e.id === id);
  }

  // Validação de exclusividade: cada eleitor pertence unicamente à sua liderança.
  // Caso outra liderança cadastre o mesmo nome e/ou o mesmo título, o sistema impede.
  verificarConflitoEleitor(dados) {
    if (!this.data.eleitores || !Array.isArray(this.data.eleitores)) {
      return { conflito: false };
    }

    const idAtual = dados.id || null;
    const nomeNormalizado = (dados.nome || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const tituloLimpo = (dados.numeroTitulo || "").replace(/\D/g, "");
    const liderancaAtual = (dados.liderancaNome || "").trim().toLowerCase();

    for (const e of this.data.eleitores) {
      // Ignora o próprio eleitor ao editar seus próprios dados
      if (idAtual && e.id === idAtual) continue;

      const eNomeNorm = (e.nome || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const eTituloLimpo = (e.numeroTitulo || "").replace(/\D/g, "");
      const eLideranca = (e.liderancaNome || "").trim().toLowerCase();
      const mesmaLideranca = liderancaAtual && eLideranca && (liderancaAtual === eLideranca);

      // Regra 1: Mesmo Nome E Mesmo Título de Eleitor
      if (tituloLimpo && eTituloLimpo && tituloLimpo === eTituloLimpo && nomeNormalizado && eNomeNorm && nomeNormalizado === eNomeNorm) {
        if (!mesmaLideranca) {
          return {
            conflito: true,
            motivo: "nome_e_titulo_outra_lideranca",
            eleitorExistente: e,
            mensagem: `Não é permitido cadastrar este eleitor! O eleitor "${e.nome}" (Título: ${e.numeroTitulo || dados.numeroTitulo}) já está cadastrado no sistema e pertence com exclusividade à liderança "${e.liderancaNome}". Cada eleitor só pode pertencer a uma única liderança.`
          };
        } else {
          return {
            conflito: true,
            motivo: "duplicidade_mesma_lideranca",
            eleitorExistente: e,
            mensagem: `Este eleitor ("${e.nome}", Título: ${e.numeroTitulo || dados.numeroTitulo}) já foi cadastrado por você anteriormente.`
          };
        }
      }

      // Regra 2: Mesmo Título de Eleitor (documento nacional único de 12 dígitos)
      if (tituloLimpo && eTituloLimpo && tituloLimpo === eTituloLimpo) {
        if (!mesmaLideranca) {
          return {
            conflito: true,
            motivo: "titulo_outra_lideranca",
            eleitorExistente: e,
            mensagem: `Não é permitido! O Título de Eleitor nº ${dados.numeroTitulo} já pertence a "${e.nome}", eleitor(a) exclusivo(a) da liderança "${e.liderancaNome}". O título de eleitor é único e não pode ser cadastrado por outra liderança.`
          };
        } else {
          return {
            conflito: true,
            motivo: "titulo_mesma_lideranca",
            eleitorExistente: e,
            mensagem: `Você já possui um eleitor cadastrado com este mesmo Título (${dados.numeroTitulo}): "${e.nome}".`
          };
        }
      }

      // Regra 3: Mesmo Nome Completo registrado sob outra liderança
      if (nomeNormalizado && eNomeNorm && nomeNormalizado === eNomeNorm) {
        if (!mesmaLideranca) {
          return {
            conflito: true,
            motivo: "nome_outra_lideranca",
            eleitorExistente: e,
            mensagem: `Não é permitido! O eleitor "${e.nome}" já está cadastrado no sistema vinculado com exclusividade à liderança "${e.liderancaNome}". O eleitor pertence exclusivamente a quem o cadastrou.`
          };
        } else {
          return {
            conflito: true,
            motivo: "nome_mesma_lideranca",
            eleitorExistente: e,
            mensagem: `Você já possui um eleitor cadastrado com o nome "${e.nome}". Caso seja um homônimo, diferencie o nome ou edite o cadastro já existente.`
          };
        }
      }
    }

    return { conflito: false };
  }

  saveEleitor(dados) {
    if (!this.data.eleitores) this.data.eleitores = [];

    // Trava de exclusividade e duplicidade
    const checagem = this.verificarConflitoEleitor(dados);
    if (checagem.conflito) {
      throw new Error(checagem.mensagem);
    }

    if (!dados.id) {
      dados.id = "el-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      dados.dataCadastro = new Date().toLocaleDateString("pt-BR");
      this.data.eleitores.unshift(dados);
      this.logAuditoria("Cadastro de Eleitor", "Eleitores", `Cadastrado eleitor exclusivo "${dados.nome}" (Título: ${dados.numeroTitulo || 'S/N'}) no bairro ${dados.bairroNome} (Seção ${dados.secao}, Líder: ${dados.liderancaNome || 'Sem liderança'}).`);
    } else {
      const idx = this.data.eleitores.findIndex(e => e.id === dados.id);
      if (idx !== -1) {
        this.data.eleitores[idx] = { ...this.data.eleitores[idx], ...dados, dataAtualizacao: new Date().toLocaleDateString("pt-BR") };
        this.logAuditoria("Atualização de Eleitor", "Eleitores", `Atualizado cadastro do eleitor "${dados.nome}" (Líder: ${dados.liderancaNome}).`);
      }
    }
    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.salvarEleitorNuvem(dados);
    }
    return dados;
  }

  deleteEleitor(id) {
    if (!this.data.eleitores) return false;
    const item = this.data.eleitores.find(e => e.id === id);
    if (!item) return false;

    // Se usuário for liderança, só pode excluir seu próprio eleitor
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA") {
      const liderNome = (currentUser.nome || "").trim().toLowerCase();
      const itemLider = (item.liderancaNome || "").trim().toLowerCase();
      if (liderNome !== itemLider && currentUser.liderancaId !== item.liderancaId) {
        throw new Error("Você só tem permissão para remover eleitores vinculados à sua própria liderança.");
      }
    }

    this.data.eleitores = this.data.eleitores.filter(e => e.id !== id);
    this.logAuditoria("Exclusão de Eleitor", "Eleitores", `Removido eleitor "${item.nome}" (${item.bairroNome}).`);
    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.excluirEleitorNuvem(id);
    }
    return true;
  }

  getEstatisticasEleitores() {
    let eleitores = this.data.eleitores || [];
    const currentUser = this.getCurrentUser();
    const isLider = currentUser && currentUser.perfil === "LIDERANÇA COMUNITÁRIA";
    if (isLider) {
      const nomeLider = (currentUser.nome || "").trim().toLowerCase();
      eleitores = eleitores.filter(e => {
        const eLid = (e.liderancaNome || "").trim().toLowerCase();
        return eLid === nomeLider || (currentUser.liderancaId && e.liderancaId === currentUser.liderancaId);
      });
    }
    const total = eleitores.length;
    const totalComFoto = eleitores.filter(e => e.fotoTitulo && e.fotoTitulo.trim() !== "").length;

    const mapaBairros = {};
    const mapaLiderancas = {};
    const mapaSecoes = {};

    eleitores.forEach(e => {
      const b = e.bairroNome || "Não Informado";
      const l = e.liderancaNome || "Sem Liderança Vinculada";
      const s = e.secao || "Sem Seção";

      // Bairros
      if (!mapaBairros[b]) {
        mapaBairros[b] = { bairro: b, total: 0, liderancas: {} };
      }
      mapaBairros[b].total++;
      mapaBairros[b].liderancas[l] = (mapaBairros[b].liderancas[l] || 0) + 1;

      // Lideranças
      if (!mapaLiderancas[l]) {
        mapaLiderancas[l] = { lideranca: l, total: 0, bairros: {} };
      }
      mapaLiderancas[l].total++;
      mapaLiderancas[l].bairros[b] = (mapaLiderancas[l].bairros[b] || 0) + 1;

      // Seções
      mapaSecoes[s] = (mapaSecoes[s] || 0) + 1;
    });

    const porBairro = Object.values(mapaBairros).map(item => {
      const lidsArray = Object.entries(item.liderancas).sort((a, b) => b[1] - a[1]);
      const lidPrincipal = lidsArray.length ? lidsArray[0][0] : "-";
      return {
        bairro: item.bairro,
        total: item.total,
        percentual: total > 0 ? ((item.total / total) * 100).toFixed(1) : "0",
        liderancaPrincipal: lidPrincipal
      };
    }).sort((a, b) => b.total - a.total);

    const porLideranca = Object.values(mapaLiderancas).map(item => {
      const bairrosList = Object.keys(item.bairros).join(", ");
      return {
        lideranca: item.lideranca,
        total: item.total,
        percentual: total > 0 ? ((item.total / total) * 100).toFixed(1) : "0",
        bairros: bairrosList
      };
    }).sort((a, b) => b.total - a.total);

    const porSecao = Object.entries(mapaSecoes).map(([secao, count]) => {
      return {
        secao: secao,
        total: count,
        percentual: total > 0 ? ((count / total) * 100).toFixed(1) : "0"
      };
    }).sort((a, b) => b.total - a.total);

    return {
      total,
      totalComFoto,
      porBairro,
      porLideranca,
      porSecao
    };
  }

  getInitialEleitoresSeed() {
    return [];
  }

  // --- GESTÃO DE DEMANDAS COMUNITÁRIAS (GABINETE DE RUA) ---
  getDemandas(filtros = {}) {
    if (!this.data.demandas) {
      this.data.demandas = [];
    }
    let list = this.data.demandas;
    if (filtros.status) {
      list = list.filter(d => d.status.toLowerCase() === filtros.status.toLowerCase());
    }
    if (filtros.prioridade) {
      list = list.filter(d => d.prioridade.toLowerCase() === filtros.prioridade.toLowerCase());
    }
    if (filtros.categoria) {
      list = list.filter(d => d.categoria.toLowerCase() === filtros.categoria.toLowerCase());
    }
    if (filtros.bairro) {
      list = list.filter(d => d.bairroComunidadeId === filtros.bairro || d.bairroNome === filtros.bairro);
    }
    if (filtros.lideranca) {
      list = list.filter(d => d.liderancaNome === filtros.lideranca);
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      list = list.filter(d =>
        (d.titulo && d.titulo.toLowerCase().includes(q)) ||
        (d.descricao && d.descricao.toLowerCase().includes(q)) ||
        (d.solicitante && d.solicitante.toLowerCase().includes(q)) ||
        (d.bairroNome && d.bairroNome.toLowerCase().includes(q)) ||
        (d.liderancaNome && d.liderancaNome.toLowerCase().includes(q)) ||
        (d.solucaoNotas && d.solucaoNotas.toLowerCase().includes(q))
      );
    }
    return list;
  }

  getDemandaById(id) {
    return (this.data.demandas || []).find(d => d.id === id);
  }

  saveDemanda(dados) {
    if (!this.data.demandas) this.data.demandas = [];
    if (!dados.id) {
      dados.id = "dem-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      if (!dados.dataAbertura) dados.dataAbertura = new Date().toISOString().split("T")[0];
      if (!dados.status) dados.status = "Pendente";
      this.data.demandas.unshift(dados);
      this.logAuditoria("Abertura de Demanda", "Demandas", `Registrada demanda "${dados.titulo}" no bairro ${dados.bairroNome} (${dados.categoria}).`);
    } else {
      const idx = this.data.demandas.findIndex(d => d.id === dados.id);
      if (idx !== -1) {
        this.data.demandas[idx] = { ...this.data.demandas[idx], ...dados, dataAtualizacao: new Date().toISOString().split("T")[0] };
        this.logAuditoria("Atualização de Demanda", "Demandas", `Atualizada demanda "${dados.titulo}" (${dados.status}).`);
      }
    }
    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.salvarDemandaNuvem(dados);
    }
    return dados;
  }

  updateDemandaStatus(id, novoStatus, notas = "") {
    const item = this.getDemandaById(id);
    if (!item) return null;
    const statusAntigo = item.status;
    item.status = novoStatus;
    if (notas) {
      item.solucaoNotas = notas;
    }
    if (novoStatus === "Concluído" && !item.dataConclusao) {
      item.dataConclusao = new Date().toISOString().split("T")[0];
    }
    this.logAuditoria("Alteração de Status", "Demandas", `Demanda "${item.titulo}" alterada de "${statusAntigo}" para "${novoStatus}".`);
    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.salvarDemandaNuvem(item);
    }
    return item;
  }

  deleteDemanda(id) {
    if (!this.data.demandas) return false;
    const item = this.getDemandaById(id);
    if (!item) return false;
    this.data.demandas = this.data.demandas.filter(d => d.id !== id);
    this.logAuditoria("Exclusão de Demanda", "Demandas", `Removida demanda "${item.titulo}" (${item.bairroNome}).`);
    this.save();
    if (typeof SupabaseClient !== "undefined" && SupabaseClient.isConnected()) {
      SupabaseClient.excluirDemandaNuvem(id);
    }
    return true;
  }

  addAnexoDemanda(demandaId, anexo) {
    const item = this.getDemandaById(demandaId);
    if (!item) return false;
    if (!Array.isArray(item.anexos)) item.anexos = [];
    item.anexos.push(anexo);
    this.save();
    this.logAuditoria("Anexo de Mídia", "Demandas", `Adicionada mídia "${anexo.nome}" (${anexo.tipo}) na demanda "${item.titulo}".`);
    return true;
  }

  removeAnexoDemanda(demandaId, anexoId) {
    const item = this.getDemandaById(demandaId);
    if (!item || !Array.isArray(item.anexos)) return false;
    item.anexos = item.anexos.filter(a => a.id !== anexoId);
    this.save();
    this.logAuditoria("Remoção de Mídia", "Demandas", `Removida mídia da demanda "${item.titulo}".`);
    return true;
  }

  getEstatisticasDemandas() {
    const demandas = this.data.demandas || [];
    const total = demandas.length;
    const pendentes = demandas.filter(d => d.status === "Pendente").length;
    const emAndamento = demandas.filter(d => d.status === "Em Andamento").length;
    const concluidas = demandas.filter(d => d.status === "Concluído").length;

    const porCategoria = {};
    const porBairro = {};
    const porPrioridade = { Alta: 0, Média: 0, Baixa: 0 };

    demandas.forEach(d => {
      // Categoria
      const cat = d.categoria || "Outras";
      porCategoria[cat] = (porCategoria[cat] || 0) + 1;

      // Bairro
      const b = d.bairroNome || "Não Informado";
      porBairro[b] = (porBairro[b] || 0) + 1;

      // Prioridade
      const pri = d.prioridade || "Média";
      porPrioridade[pri] = (porPrioridade[pri] || 0) + 1;
    });

    const taxaResolucao = total > 0 ? Math.round((concluidas / total) * 100) : 0;

    return {
      total,
      pendentes,
      emAndamento,
      concluidas,
      taxaResolucao,
      porCategoria,
      porBairro,
      porPrioridade
    };
  }

  // --- SIMULADOR ELEITORAL (QUOCIENTE ELEITORAL & SOBRAS 80/20) ---
  getSimuladorConfig() {
    if (!this.data.simuladorConfig) {
      this.data.simuladorConfig = JSON.parse(JSON.stringify(SEED_DATA.simuladorConfig || {}));
    }
    return this.data.simuladorConfig;
  }

  saveSimuladorConfig(cfg) {
    this.data.simuladorConfig = { ...this.data.simuladorConfig, ...cfg };
    this.save();
    this.logAuditoria("Ajuste de Parâmetros", "Simulador Eleitoral", `Parâmetros do simulador atualizados (Cadeiras: ${cfg.totalCadeiras || 9}).`);
    return this.data.simuladorConfig;
  }

  resetSimuladorConfig() {
    this.data.simuladorConfig = JSON.parse(JSON.stringify(SEED_DATA.simuladorConfig || {}));
    this.save();
    this.logAuditoria("Restauração do Simulador", "Simulador Eleitoral", "Configurações do simulador restauradas para o padrão oficial de Riachuelo.");
    return this.data.simuladorConfig;
  }

  calcularQuocienteEleitoral(customParams = null) {
    const config = customParams ? { ...this.getSimuladorConfig(), ...customParams } : this.getSimuladorConfig();

    const eleitoresAptos = Number(config.eleitoresAptos) || 6245;
    const abstencaoPct = Number(config.abstencaoProjetadaPct) || 14.5;
    const brancosNulosPct = Number(config.brancosNulosPct) || 4.2;
    const totalCadeiras = Number(config.totalCadeiras) || 9;
    const clausulaIndivPct = Number(config.clausulaDesempenhoIndividualPct) || 10;
    const clausulaSobrasPartidoPct = Number(config.clausulaSobrasPartidoPct) || 80;
    const clausulaSobrasCandPct = Number(config.clausulaSobrasCandidatoPct) || 20;

    const partidosRaw = config.partidos || [];

    // Votos válidos informados pelos partidos
    const totalVotosValidosPartidos = partidosRaw.reduce((acc, p) => acc + (Number(p.votosTotais) || 0), 0);

    // Projeção demográfica teórica
    const comparecimentoEstimado = Math.round(eleitoresAptos * (1 - abstencaoPct / 100));
    const abstencaoEstimada = eleitoresAptos - comparecimentoEstimado;
    const brancosNulosEstimados = Math.round(comparecimentoEstimado * (brancosNulosPct / 100));
    const validosEstimadosTeoricos = comparecimentoEstimado - brancosNulosEstimados;

    // Base de cálculo dos Válidos: se os partidos têm votos somados > 0, usamos a soma dos partidos; caso contrário usamos a estimativa teórica
    const totalVotosValidos = totalVotosValidosPartidos > 0 ? totalVotosValidosPartidos : validosEstimadosTeoricos;

    // Cálculo do Quociente Eleitoral (QE) — Art. 106 do Código Eleitoral
    // Divide-se o número de votos válidos pelo de lugares a preencher, desprezando a fração se <= 0.5 e equivalente a 1 se > 0.5.
    const qeCalculado = totalCadeiras > 0 ? Math.round(totalVotosValidos / totalCadeiras) : 1;
    const QE = Math.max(1, qeCalculado);

    // Cláusulas de Barreira
    const pisoIndividualQP = Math.round((clausulaIndivPct / 100) * QE); // 10% do QE
    const pisoSobrasPartido = Math.round((clausulaSobrasPartidoPct / 100) * QE); // 80% do QE
    const pisoSobrasCandidato = Math.round((clausulaSobrasCandPct / 100) * QE); // 20% do QE

    // 1ª FASE: CÁLCULO DO QUOCIENTE PARTIDÁRIO (QP)
    const partidos = partidosRaw.map(p => {
      const votos = Number(p.votosTotais) || 0;
      const qpBruto = Math.floor(votos / QE);
      const candMaisVotado = Number(p.candidatoMaisVotadoVotos) || 0;
      const atingiuPisoIndividualQP = candMaisVotado >= pisoIndividualQP;

      // Partido só ganha a vaga se tiver candidato que atinja o piso de 10%
      const cadeirasQP = atingiuPisoIndividualQP ? qpBruto : 0;

      return {
        id: p.id,
        sigla: p.sigla,
        cor: p.cor || "#10b981",
        votosTotais: votos,
        candidatoMaisVotadoVotos: candMaisVotado,
        candidatos: p.candidatos || [],
        percentualVotos: totalVotosValidos > 0 ? ((votos / totalVotosValidos) * 100).toFixed(2) : "0",
        qpBruto: qpBruto,
        cadeirasQP: cadeirasQP,
        cadeirasSobras: 0,
        totalCadeiras: cadeirasQP,
        historicoSobras: [],
        atingiu80Porcento: votos >= pisoSobrasPartido,
        atingiu20PorcentoCand: candMaisVotado >= pisoSobrasCandidato,
        mediaAtual: 0
      };
    });

    let totalCadeirasDistribuidas = partidos.reduce((acc, p) => acc + p.cadeirasQP, 0);
    let cadeirasRestantes = Math.max(0, totalCadeiras - totalCadeirasDistribuidas);

    // 2ª FASE: DISTRIBUIÇÃO DAS SOBRAS ELEITORAIS (MAIORES MÉDIAS)
    // Regra atual (Lei 14.211/2021 + Julgamento ADI 7228 pelo STF):
    // Rodada A: Apenas partidos com >= 80% do QE e candidato com >= 20% do QE
    // Rodada B: Se esgotarem ou nenhum atingir, participam todos os partidos com candidatos com votação mínima.
    const logRodadasSobras = [];
    let rodadaNumero = 1;

    while (cadeirasRestantes > 0) {
      // 1. Tenta selecionar partidos que cumprem 80% e 20%
      let aptos = partidos.filter(p => p.atingiu80Porcento && p.atingiu20PorcentoCand);
      let criterioUsado = "Regra 80/20 (Partido ≥ 80% QE e Candidato ≥ 20%)";

      // 2. Se nenhum partido atende a regra 80/20, abre para todos que disputam (Regra Residual ADI 7228 STF)
      if (aptos.length === 0) {
        aptos = partidos.filter(p => p.votosTotais > 0);
        criterioUsado = "Repescagem Geral STF / ADI 7228 (Todas as legendas participantes)";
      }

      if (aptos.length === 0) break; // Impossível distribuir se ninguém tem votos

      // Calcula a média de cada concorrente: Votos / (Cadeiras Já Obtidas + 1)
      let melhorMedia = -1;
      let partidoVencedor = null;

      aptos.forEach(p => {
        const media = p.votosTotais / (p.totalCadeiras + 1);
        if (media > melhorMedia) {
          melhorMedia = media;
          partidoVencedor = p;
        }
      });

      if (!partidoVencedor) break;

      partidoVencedor.cadeirasSobras++;
      partidoVencedor.totalCadeiras++;
      partidoVencedor.historicoSobras.push({
        rodada: rodadaNumero,
        media: melhorMedia.toFixed(2),
        criterio: criterioUsado
      });

      logRodadasSobras.push({
        rodada: rodadaNumero,
        vencedorSigla: partidoVencedor.sigla,
        media: melhorMedia.toFixed(2),
        novaCadeiraTotal: partidoVencedor.totalCadeiras,
        criterio: criterioUsado
      });

      cadeirasRestantes--;
      rodadaNumero++;
    }

    // Calcula as médias finais de todos os partidos
    partidos.forEach(p => {
      p.mediaFinal = (p.votosTotais / (p.totalCadeiras + 1)).toFixed(2);
    });

    // Ordena partidos por total de cadeiras e votos
    partidos.sort((a, b) => b.totalCadeiras - a.totalCadeiras || b.votosTotais - a.votosTotais);

    // CUSTO MÉDIO DA VAGA (Votos por cadeira conquistada)
    partidos.forEach(p => {
      p.custoPorCadeira = p.totalCadeiras > 0 ? Math.round(p.votosTotais / p.totalCadeiras) : "-";
    });

    // ANÁLISE ESTRATÉGICA / INSIGHTS DO RADAR
    const menorMediaVencedora = logRodadasSobras.length > 0 
      ? Number(logRodadasSobras[logRodadasSobras.length - 1].media) 
      : (QE);

    const insights = [];
    partidos.forEach(p => {
      // Votos necessários para ultrapassar a menor média vencedora e ganhar +1 vaga
      const votosPrecisava = Math.ceil((menorMediaVencedora + 0.01) * (p.totalCadeiras + 1));
      const dif = votosPrecisava - p.votosTotais;
      if (dif > 0 && dif < QE * 1.2) {
        insights.push({
          partido: p.sigla,
          mensagem: `Precisa de apenas <strong>+${dif.toLocaleString("pt-BR")} votos</strong> para puxar mais 1 cadeira na sobra eleitoral.`,
          grau: dif <= 150 ? "urgente" : "oportunidade"
        });
      }
    });

    return {
      eleitoresAptos,
      abstencaoEstimada,
      abstencaoPct,
      comparecimentoEstimado,
      brancosNulosEstimados,
      brancosNulosPct,
      totalVotosValidos,
      totalCadeiras,
      QE,
      pisoIndividualQP,
      pisoSobrasPartido,
      pisoSobrasCandidato,
      totalCadeirasDistribuidas: totalCadeiras - cadeirasRestantes,
      cadeirasSobrasDistribuidas: logRodadasSobras.length,
      partidos,
      logRodadasSobras,
      insights
    };
  }

  exportBackupJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  importBackupJSON(jsonStr) {
    try {
      this.data = JSON.parse(jsonStr);
      this.save();
      return true;
    } catch (e) {
      throw new Error("Erro na importação: " + e.message);
    }
  }
}

// Cria instância global
const db = new RadarBacurauDB();
