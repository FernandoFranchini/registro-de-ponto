/* ========================================================
   CONFIGURAÇÃO SUPABASE E CAMADA DE DADOS / LOCALSTORAGE FALLBACK
   ======================================================== */

const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://xyzcompany.supabase.co';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummykey';

// Inicializa cliente Supabase se a biblioteca estiver carregada
let supabaseClient = null;
if (typeof supabase !== 'undefined' && supabase.createClient) {
  try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase JS não configurado com credenciais válidas. Usando modo de fallback LocalStorage.', e);
  }
}

// Chaves para LocalStorage Fallback
const STORAGE_KEYS = {
  FUNCIONARIOS: 'pontobio_funcionarios',
  REGISTROS: 'pontobio_registros',
  AUSENCIAS: 'pontobio_ausencias',
  FRAUDES: 'pontobio_fraudes'
};

// Dados Iniciais Mock de Exemplo para Testes Immediate
const DEFAULT_FUNCIONARIOS = [
  {
    id: 'f1010101-1111-4111-8111-111111111111',
    nome_completo: 'Carlos Eduardo Silva',
    cpf: '123.456.789-00',
    matricula: '1001',
    carga_horaria_diaria: '08:00:00',
    horario_entrada_previsto: '08:00:00',
    horario_saida_previsto: '17:00:00',
    vetor_biometrico: [0.12, 0.45, 0.88, 0.31, 0.95],
    ativo: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'f2020202-2222-4222-8222-222222222222',
    nome_completo: 'Mariana Oliveira Souza',
    cpf: '987.654.321-11',
    matricula: '1002',
    carga_horaria_diaria: '08:00:00',
    horario_entrada_previsto: '09:00:00',
    horario_saida_previsto: '18:00:00',
    vetor_biometrico: [0.33, 0.11, 0.54, 0.77, 0.22],
    ativo: true,
    created_at: new Date().toISOString()
  }
];

// Helper Data Store Manager (Camada Abstrata)
const DataService = {
  // Inicialização do LocalStorage caso esteja vazio
  initStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS)) {
      localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(DEFAULT_FUNCIONARIOS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REGISTROS)) {
      localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUSENCIAS)) {
      localStorage.setItem(STORAGE_KEYS.AUSENCIAS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FRAUDES)) {
      localStorage.setItem(STORAGE_KEYS.FRAUDES, JSON.stringify([]));
    }
  },

  // FUNCIONARIOS
  async getFuncionarios() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('funcionarios').select('*').eq('ativo', true);
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('Falha na consulta ao Supabase, buscando LocalStorage:', e);
      }
    }
    this.initStorage();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS) || '[]');
    return list.filter(f => f.ativo !== false);
  },

  async buscarFuncionarioPorMatriculaOuCPF(identificador) {
    const term = (identificador || '').trim().toLowerCase();
    if (!term) return null;

    const funcionarios = await this.getFuncionarios();
    return funcionarios.find(f =>
      (f.matricula && f.matricula.toLowerCase() === term) ||
      (f.cpf && f.cpf.replace(/\D/g, '') === term.replace(/\D/g, ''))
    ) || null;
  },

  async salvarFuncionario(funcionario) {
    if (!funcionario.id) {
      funcionario.id = 'f_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      funcionario.created_at = new Date().toISOString();
      funcionario.ativo = true;
    }

    if (supabaseClient) {
      try {
        await supabaseClient.from('funcionarios').upsert([funcionario]);
      } catch (e) {
        console.warn('Erro ao salvar funcionario no Supabase:', e);
      }
    }

    this.initStorage();
    let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FUNCIONARIOS) || '[]');
    const index = list.findIndex(f => f.id === funcionario.id);
    if (index >= 0) {
      list[index] = { ...list[index], ...funcionario };
    } else {
      list.push(funcionario);
    }
    localStorage.setItem(STORAGE_KEYS.FUNCIONARIOS, JSON.stringify(list));
    return funcionario;
  },

  // REGISTROS DE PONTO
  async getRegistros() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('registros_ponto').select('*, funcionario:funcionarios(nome_completo, matricula)').order('data_hora', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn('Falha no Supabase ao buscar registros:', e);
      }
    }
    this.initStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTROS) || '[]');
  },

  async salvarRegistroPonto(registro) {
    registro.id = registro.id || 'reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    registro.created_at = registro.created_at || new Date().toISOString();

    if (supabaseClient) {
      try {
        await supabaseClient.from('registros_ponto').insert([registro]);
      } catch (e) {
        console.warn('Erro ao salvar registro no Supabase:', e);
      }
    }

    this.initStorage();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTROS) || '[]');
    list.unshift(registro);
    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(list));
    return registro;
  },

  // SOLICITAÇÕES DE AUSÊNCIA
  async getAusencias() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('solicitacoes_ausencia').select('*, funcionario:funcionarios(nome_completo, matricula)').order('created_at', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn('Falha no Supabase ao buscar ausencias:', e);
      }
    }
    this.initStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.AUSENCIAS) || '[]');
  },

  async salvarSolicitacaoAusencia(ausencia) {
    ausencia.id = 'aus_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    ausencia.status = ausencia.status || 'PENDENTE';
    ausencia.created_at = new Date().toISOString();

    if (supabaseClient) {
      try {
        await supabaseClient.from('solicitacoes_ausencia').insert([ausencia]);
      } catch (e) {
        console.warn('Erro ao salvar ausencia no Supabase:', e);
      }
    }

    this.initStorage();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUSENCIAS) || '[]');
    list.unshift(ausencia);
    localStorage.setItem(STORAGE_KEYS.AUSENCIAS, JSON.stringify(list));
    return ausencia;
  },

  async atualizarStatusAusencia(id, novoStatus) {
    if (supabaseClient) {
      try {
        await supabaseClient.from('solicitacoes_ausencia').update({ status: novoStatus }).eq('id', id);
      } catch (e) {
        console.warn('Erro ao atualizar ausencia no Supabase:', e);
      }
    }

    this.initStorage();
    let list = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUSENCIAS) || '[]');
    const item = list.find(a => a.id === id);
    if (item) {
      item.status = novoStatus;
      localStorage.setItem(STORAGE_KEYS.AUSENCIAS, JSON.stringify(list));
    }
  },

  // LOGS DE AUDITORIA DE FRAUDE
  async getLogsFraude() {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('logs_auditoria_fraude').select('*, funcionario:funcionarios(nome_completo, matricula)').order('tentativa_data_hora', { ascending: false });
        if (!error && data) return data;
      } catch (e) {
        console.warn('Falha no Supabase ao buscar logs de fraude:', e);
      }
    }
    this.initStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.FRAUDES) || '[]');
  },

  async registrarLogFraude(logData) {
    logData.id = 'frd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    logData.tentativa_data_hora = new Date().toISOString();

    if (supabaseClient) {
      try {
        await supabaseClient.from('logs_auditoria_fraude').insert([logData]);
      } catch (e) {
        console.warn('Erro ao registrar log de fraude no Supabase:', e);
      }
    }

    this.initStorage();
    const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRAUDES) || '[]');
    list.unshift(logData);
    localStorage.setItem(STORAGE_KEYS.FRAUDES, JSON.stringify(list));
    return logData;
  }
};

// Inicializa o storage na carga
DataService.initStorage();
