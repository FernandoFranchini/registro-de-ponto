/* ========================================================
   MÓDULO DE FALTAS E SOLICITAÇÕES DE ABONO (Módulo 3)
   Abono de faltas, solicitações com antecedência mínima de 3 dias.
   ======================================================== */

const AusenciasService = {

  // Calcula a diferença em dias inteiros entre duas datas
  calcularAntecedenciaDias(dataAusenciaStr) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const parts = dataAusenciaStr.split('-');
    const dataAusencia = new Date(parts[0], parts[1] - 1, parts[2]);
    dataAusencia.setHours(0, 0, 0, 0);

    const diffMs = dataAusencia.getTime() - hoje.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  },

  // Processa e valida o formulário de ausência
  async solicitarAusencia(dataForm) {
    const { identificador, tipo_ausencia, data_ausencia, observacao } = dataForm;

    // 1. Buscar funcionário por Matrícula ou CPF
    const funcionario = await DataService.buscarFuncionarioPorMatriculaOuCPF(identificador);
    if (!funcionario) {
      return {
        sucesso: false,
        mensagem: 'Funcionário não encontrado com a matrícula ou CPF fornecido.'
      };
    }

    // 2. Calcular antecedência em dias
    const antecedencia_dias = this.calcularAntecedenciaDias(data_ausencia);

    // 3. Regra Módulo 3: Faltas planejadas exigem solicitação com no mínimo 3 dias de antecedência
    if (tipo_ausencia === 'FALTA_PLANEJADA' && antecedencia_dias < 3) {
      return {
        sucesso: false,
        mensagem: `A regra exige no mínimo 3 dias de antecedência para solicitação de Falta Planejada. Antecedência informada: ${antecedencia_dias} dia(s).`
      };
    }

    // 4. Salvar solicitação no Supabase / LocalStorage
    const solicitacao = {
      funcionario_id: funcionario.id,
      data_ausencia,
      tipo_ausencia,
      antecedencia_dias: Math.max(0, antecedencia_dias),
      status: 'PENDENTE',
      observacao: observacao || ''
    };

    const salvo = await DataService.salvarSolicitacaoAusencia(solicitacao);

    return {
      sucesso: true,
      solicitacao: salvo,
      mensagem: 'Solicitação de ausência/abono enviada ao RH com sucesso! Status: PENDENTE.'
    };
  }
};
