/* ========================================================
   MÓDULO DE REGISTRO DE PONTO (Módulo 1 e Módulo 2)
   Regras de Entrada/Saída, Atrasos (>10min), Saídas Antecipadas
   com Justificativa, Banco de Horas e Comprovante Digital.
   ======================================================== */

const PontoService = {
  tipoSelecionado: 'ENTRADA', // 'ENTRADA' ou 'SAIDA'
  funcionarioAtual: null,
  justificativaPendente: null,

  // Auxiliar para converter "HH:MM:SS" ou "HH:MM" em minutos do dia
  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  },

  // Auxiliar para formatar minutos em string HH:MM:SS ou HH:MM
  minutesToTimeString(minutes) {
    const isNegative = minutes < 0;
    const absMin = Math.abs(minutes);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${isNegative ? '-' : ''}${pad(h)}:${pad(m)}:00`;
  },

  // Gera um Hash Hexadecimal simples para o comprovante
  generateReceiptHash(data) {
    const str = JSON.stringify(data) + Date.now();
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return '0x' + Math.abs(hash).toString(16).toUpperCase() + '9F8A';
  },

  // Avalia as regras de jornada e atraso / saída antecipada / banco de horas
  avaliarJornada(funcionario, tipo, horaAtualDate) {
    const horaAtualMin = horaAtualDate.getHours() * 60 + horaAtualDate.getMinutes();

    const entradaPrevistaMin = this.timeToMinutes(funcionario.horario_entrada_previsto || '08:00:00');
    const saidaPrevistaMin = this.timeToMinutes(funcionario.horario_saida_previsto || '17:00:00');

    let status_jornada = 'NORMAL';
    let exigidJustificativa = false;
    let saldo_horas_min = 0;

    if (tipo === 'ENTRADA') {
      const diferencaEntrada = horaAtualMin - entradaPrevistaMin;
      // Requisito: Atrasos acima de 10 min geram notificação direta ao RH no Supabase
      if (diferencaEntrada > 10) {
        status_jornada = 'ATRASO';
      } else {
        status_jornada = 'NORMAL';
      }
    } else if (tipo === 'SAIDA') {
      const diferencaSaida = horaAtualMin - saidaPrevistaMin;

      // Requisito: Saídas antecipadas exigem justificativa obrigatória na tela
      if (diferencaSaida < -5) {
        status_jornada = 'SAIDA_ANTECIPADA';
        exigidJustificativa = true;
        saldo_horas_min = diferencaSaida; // saldo negativo
      } else if (diferencaSaida > 15) {
        // Requisito: Saídas acumulando horas a mais são creditadas automaticamente no Banco de Horas
        status_jornada = 'HORA_EXTRA';
        saldo_horas_min = diferencaSaida; // saldo positivo
      } else {
        status_jornada = 'NORMAL';
        saldo_horas_min = 0;
      }
    }

    return {
      status_jornada,
      exigidJustificativa,
      saldo_horas_dia: this.minutesToTimeString(saldo_horas_min)
    };
  },

  // Processa a tentativa de registro de ponto
  async processarRegistroPonto(identificador, videoElement) {
    // 1. Buscar funcionário por Matrícula ou CPF
    const funcionario = await DataService.buscarFuncionarioPorMatriculaOuCPF(identificador);
    if (!funcionario) {
      return {
        sucesso: false,
        mensagem: 'Funcionário não encontrado! Verifique a matrícula ou CPF inserido.'
      };
    }

    // 2. Validação Biométrica Facial (Módulo 1)
    const validacaoBio = await BiometricsService.validarBiometriaFuncionario(funcionario, videoElement);

    if (!validacaoBio.valido) {
      // Requisito: Dado que a biometria falhar, Então bloqueia o ponto e gera log de suspeita de fraude
      await DataService.registrarLogFraude({
        funcionario_id: funcionario.id,
        detalhe_tentativa: `Falha de Validação Biométrica Facial (Similaridade: ${validacaoBio.similaridade}%, Distância: ${validacaoBio.distancia}).`,
        imagem_capturada_url: validacaoBio.fotoCapturedUrl
      });

      return {
        sucesso: false,
        fraudeDetectada: true,
        mensagem: 'BLOQUEADO: Falha na validação biométrica facial. Tentativa registrada para auditoria do RH.'
      };
    }

    // 3. Avaliar Regras de Jornada (Módulo 2)
    const agora = new Date();
    const avaliacao = this.avaliarJornada(funcionario, this.tipoSelecionado, agora);

    // Se exige justificativa e ainda não foi fornecida, pausa para abrir o modal de justificativa
    if (avaliacao.exigidJustificativa && !this.justificativaPendente) {
      this.funcionarioAtual = funcionario;
      return {
        sucesso: false,
        requerJustificativa: true,
        mensagem: 'Saída antecipada identificada. Informe a justificativa obrigatória para prosseguir.'
      };
    }

    // 4. Salvar Registro de Ponto no Banco de Dados / Supabase
    const registro = {
      funcionario_id: funcionario.id,
      tipo: this.tipoSelecionado,
      data_hora: agora.toISOString(),
      status_jornada: avaliacao.status_jornada,
      justificativa: this.justificativaPendente || null,
      autenticado_biometria: true,
      saldo_horas_dia: avaliacao.saldo_horas_dia
    };

    const registroSalvo = await DataService.salvarRegistroPonto(registro);

    // Limpa a justificativa pendente após salvar
    this.justificativaPendente = null;

    // 5. Retornar comprovante digital
    const receiptHash = this.generateReceiptHash(registroSalvo);

    return {
      sucesso: true,
      registro: registroSalvo,
      funcionario,
      receiptHash,
      atrasoNotificado: avaliacao.status_jornada === 'ATRASO',
      mensagem: 'Ponto registrado com sucesso!'
    };
  }
};
