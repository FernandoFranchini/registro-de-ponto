/* ========================================================
   MÓDULO DO PAINEL DE RH (ADMINISTRATIVO E AUDITORIA)
   ======================================================== */

const RHService = {

  // Carrega e atualiza estatísticas no topo do Painel RH
  async carregarEstatisticas() {
    const funcionarios = await DataService.getFuncionarios();
    const registros = await DataService.getRegistros();
    const ausencias = await DataService.getAusencias();
    const fraudes = await DataService.getLogsFraude();

    const hojeStr = new Date().toISOString().split('T')[0];
    const registrosHoje = registros.filter(r => (r.data_hora || '').startsWith(hojeStr));
    const abonosPendentes = ausencias.filter(a => a.status === 'PENDENTE');

    document.getElementById('stat-total-func').textContent = funcionarios.length;
    document.getElementById('stat-registros-hoje').textContent = registrosHoje.length;
    document.getElementById('stat-ausencias-pendentes').textContent = abonosPendentes.length;
    document.getElementById('stat-logs-fraude').textContent = fraudes.length;
  },

  // Renderiza a Tabela de Funcionários
  async carregarFuncionarios() {
    const funcionarios = await DataService.getFuncionarios();
    const tbody = document.getElementById('lista-funcionarios-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (funcionarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum funcionário cadastrado.</td></tr>';
      return;
    }

    funcionarios.forEach(func => {
      const tr = document.createElement('tr');
      const temBiometria = func.vetor_biometrico && func.vetor_biometrico.length > 0;
      const badgeBio = temBiometria
        ? '<span class="badge badge-normal">Cadastrada</span>'
        : '<span class="badge badge-rejeitado">Pendente</span>';

      tr.innerHTML = `
        <td><strong>${func.matricula}</strong></td>
        <td>${func.nome_completo}<br><small style="color:var(--text-secondary);">${func.cpf}</small></td>
        <td>${func.horario_entrada_previsto.substring(0, 5)} - ${func.horario_saida_previsto.substring(0, 5)}</td>
        <td>${badgeBio}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="RHService.editarFuncionario('${func.id}')">Editar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  // Preenche formulário para edição de funcionário
  async editarFuncionario(funcId) {
    const funcionarios = await DataService.getFuncionarios();
    const func = funcionarios.find(f => f.id === funcId);
    if (!func) return;

    document.getElementById('func-id').value = func.id;
    document.getElementById('func-nome').value = func.nome_completo;
    document.getElementById('func-cpf').value = func.cpf;
    document.getElementById('func-matricula').value = func.matricula;
    document.getElementById('func-entrada').value = func.horario_entrada_previsto.substring(0, 5);
    document.getElementById('func-saida').value = func.horario_saida_previsto.substring(0, 5);

    if (func.vetor_biometrico) {
      document.getElementById('func-vetor-biometrico').value = JSON.stringify(func.vetor_biometrico);
      const statusBadge = document.getElementById('biometria-status-cad');
      statusBadge.style.display = 'inline-block';
      statusBadge.textContent = 'Biometria Existente';
    }
  },

  // Salva ou atualiza Funcionário
  async salvarFuncionarioForm() {
    const id = document.getElementById('func-id').value;
    const nome_completo = document.getElementById('func-nome').value.trim();
    const cpf = document.getElementById('func-cpf').value.trim();
    const matricula = document.getElementById('func-matricula').value.trim();
    const horario_entrada_previsto = document.getElementById('func-entrada').value + ':00';
    const horario_saida_previsto = document.getElementById('func-saida').value + ':00';
    const vetorStr = document.getElementById('func-vetor-biometrico').value;

    let vetor_biometrico = null;
    if (vetorStr) {
      try { vetor_biometrico = JSON.parse(vetorStr); } catch (e) {}
    }

    const funcionarioObj = {
      id: id || null,
      nome_completo,
      cpf,
      matricula,
      horario_entrada_previsto,
      horario_saida_previsto,
      vetor_biometrico
    };

    await DataService.salvarFuncionario(funcionarioObj);
    document.getElementById('form-funcionario').reset();
    document.getElementById('func-id').value = '';
    document.getElementById('func-vetor-biometrico').value = '';
    document.getElementById('biometria-status-cad').style.display = 'none';

    await this.carregarFuncionarios();
    await this.carregarEstatisticas();
    alert('Funcionário salvo com sucesso!');
  },

  // Carrega Registros de Ponto
  async carregarRegistrosPonto() {
    const registros = await DataService.getRegistros();
    const funcionarios = await DataService.getFuncionarios();
    const tbody = document.getElementById('lista-registros-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (registros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum registro de ponto encontrado.</td></tr>';
      return;
    }

    registros.forEach(reg => {
      const func = funcionarios.find(f => f.id === reg.funcionario_id) || reg.funcionario || { nome_completo: 'Desconhecido', matricula: '-' };
      const dateFormatted = new Date(reg.data_hora).toLocaleString('pt-BR');

      let badgeClass = 'badge-normal';
      if (reg.status_jornada === 'ATRASO') badgeClass = 'badge-atraso';
      if (reg.status_jornada === 'SAIDA_ANTECIPADA') badgeClass = 'badge-saida-antecipada';
      if (reg.status_jornada === 'HORA_EXTRA') badgeClass = 'badge-hora-extra';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dateFormatted}</td>
        <td><strong>${func.nome_completo}</strong><br><small>Matrícula: ${func.matricula}</small></td>
        <td><strong>${reg.tipo}</strong></td>
        <td><span class="badge ${badgeClass}">${reg.status_jornada}</span></td>
        <td>${reg.saldo_horas_dia || '00:00:00'}</td>
        <td>${reg.autenticado_biometria ? '<span class="badge badge-normal">Sim</span>' : 'Não'}</td>
        <td>${reg.justificativa ? `<em>"${reg.justificativa}"</em>` : '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  // Carrega Lista de Abonos e Solicitações
  async carregarAbonos() {
    const ausencias = await DataService.getAusencias();
    const funcionarios = await DataService.getFuncionarios();
    const tbody = document.getElementById('lista-abonos-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (ausencias.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhuma solicitação de abono encontrada.</td></tr>';
      return;
    }

    ausencias.forEach(aus => {
      const func = funcionarios.find(f => f.id === aus.funcionario_id) || aus.funcionario || { nome_completo: 'Desconhecido', matricula: '-' };
      const dtCriacao = new Date(aus.created_at).toLocaleDateString('pt-BR');
      const dtAusencia = new Date(aus.data_ausencia + 'T00:00:00').toLocaleDateString('pt-BR');

      let badgeStatus = 'badge-pendente';
      if (aus.status === 'APROVADO') badgeStatus = 'badge-aprovado';
      if (aus.status === 'REJEITADO') badgeStatus = 'badge-rejeitado';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dtCriacao}</td>
        <td><strong>${func.nome_completo}</strong><br><small>Matrícula: ${func.matricula}</small></td>
        <td>${dtAusencia}</td>
        <td><strong>${aus.tipo_ausencia}</strong></td>
        <td><span class="badge ${badgeStatus}">${aus.status}</span></td>
        <td>${aus.observacao || '-'}</td>
        <td>
          ${aus.status === 'PENDENTE' ? `
            <button class="btn btn-success btn-sm" onclick="RHService.responderAbono('${aus.id}', 'APROVADO')">Aprovar</button>
            <button class="btn btn-danger btn-sm" onclick="RHService.responderAbono('${aus.id}', 'REJEITADO')">Rejeitar</button>
          ` : 'Finalizado'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  // Responde (Aprova/Rejeita) uma solicitação de abono
  async responderAbono(id, novoStatus) {
    await DataService.atualizarStatusAusencia(id, novoStatus);
    await this.carregarAbonos();
    await this.carregarEstatisticas();
  },

  // Carrega Logs de Fraudes
  async carregarLogsFraude() {
    const fraudes = await DataService.getLogsFraude();
    const funcionarios = await DataService.getFuncionarios();
    const tbody = document.getElementById('lista-fraudes-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (fraudes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum alerta de fraude registrado.</td></tr>';
      return;
    }

    fraudes.forEach(frd => {
      const func = funcionarios.find(f => f.id === frd.funcionario_id) || frd.funcionario || { nome_completo: 'Não identificado', matricula: '-' };
      const dateFormatted = new Date(frd.tentativa_data_hora).toLocaleString('pt-BR');
      const imgTag = frd.imagem_capturada_url
        ? `<img src="${frd.imagem_capturada_url}" class="img-fraud-thumbnail" alt="Foto Tentativa" onclick="window.open('${frd.imagem_capturada_url}', '_blank')">`
        : '<small style="color:var(--text-muted)">Sem imagem</small>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dateFormatted}</td>
        <td><strong>${func.nome_completo}</strong><br><small>Matrícula: ${func.matricula}</small></td>
        <td style="color:var(--danger); font-weight:600;">${frd.detalhe_tentativa}</td>
        <td>${imgTag}</td>
      `;
      tbody.appendChild(tr);
    });
  }
};
