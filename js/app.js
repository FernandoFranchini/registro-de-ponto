/* ========================================================
   APLICAÇÃO PRINCIPAL - APP.JS
   ======================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Relógio em Tempo Real para o Kiosk
  function atualizarRelogio() {
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR');
    const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const clockTime = document.getElementById('clock-time');
    const clockDate = document.getElementById('clock-date');
    if (clockTime) clockTime.textContent = hora;
    if (clockDate) clockDate.textContent = data;
  }
  setInterval(atualizarRelogio, 1000);
  atualizarRelogio();

  // 2. Navegação Principais Abas
  const navButtons = document.querySelectorAll('.nav-btn');
  const viewSections = document.querySelectorAll('.view-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      viewSections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      if (targetSection) targetSection.classList.add('active');

      if (targetId === 'rh-view') {
        RHService.carregarEstatisticas();
        RHService.carregarFuncionarios();
        RHService.carregarRegistrosPonto();
        RHService.carregarAbonos();
        RHService.carregarLogsFraude();
      }
    });
  });

  // 3. Navegação Sub-abas no Painel RH
  const subtabButtons = document.querySelectorAll('.subtab-btn');
  const subtabContents = document.querySelectorAll('.subtab-content');

  subtabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      subtabButtons.forEach(b => b.classList.remove('active'));
      subtabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const subtargetId = btn.getAttribute('data-subtarget');
      const subtargetContent = document.getElementById(subtargetId);
      if (subtargetContent) subtargetContent.classList.add('active');
    });
  });

  // 4. Seleção de Tipo de Registro
  const btnEntrada = document.getElementById('btn-tipo-entrada');
  const btnSaida = document.getElementById('btn-tipo-saida');

  if (btnEntrada && btnSaida) {
    btnEntrada.addEventListener('click', () => {
      PontoService.tipoSelecionado = 'ENTRADA';
      btnEntrada.className = 'btn-type selected-entrada';
      btnSaida.className = 'btn-type';
    });

    btnSaida.addEventListener('click', () => {
      PontoService.tipoSelecionado = 'SAIDA';
      btnSaida.className = 'btn-type selected-saida';
      btnEntrada.className = 'btn-type';
    });
  }

  // 5. Câmera WebCam no Kiosk
  const videoElement = document.getElementById('webcam-video');
  const cameraStatusText = document.getElementById('camera-status-text');
  const btnToggleCamera = document.getElementById('btn-toggle-camera');

  async function iniciarCam() {
    if (cameraStatusText) cameraStatusText.textContent = 'Iniciando Câmera...';
    const ok = await BiometricsService.initCamera('webcam-video');
    if (cameraStatusText) {
      cameraStatusText.textContent = ok ? 'Câmera Ativa / Rosto em Foco' : 'Câmera Indisponível (Modo Simulado)';
    }
  }
  iniciarCam();

  if (btnToggleCamera) {
    btnToggleCamera.addEventListener('click', iniciarCam);
  }

  // 6. Submissão / Botão Registrar Ponto no Kiosk
  const btnRegistrarPonto = document.getElementById('btn-registrar-ponto');
  const identificadorInput = document.getElementById('funcionario-identificador');
  const kioskAlert = document.getElementById('kiosk-alert');
  const kioskAlertMsg = document.getElementById('kiosk-alert-message');

  function exibirAlertaKiosk(mensagem, tipo = 'info') {
    if (!kioskAlert || !kioskAlertMsg) return;
    kioskAlert.className = `alert alert-${tipo}`;
    kioskAlertMsg.textContent = mensagem;
    kioskAlert.style.display = 'flex';
  }

  if (btnRegistrarPonto) {
    btnRegistrarPonto.addEventListener('click', async () => {
      const idVal = (identificadorInput.value || '').trim();
      if (!idVal) {
        exibirAlertaKiosk('Por favor, digite sua Matrícula ou CPF.', 'danger');
        return;
      }

      exibirAlertaKiosk('Validando biometria e regras de ponto...', 'info');

      // Executa de forma assíncrona após pequena pausa para atualizar a tela
      setTimeout(async () => {
        try {
          const resultado = await PontoService.processarRegistroPonto(idVal, videoElement);

          if (resultado.requerJustificativa) {
            exibirAlertaKiosk(resultado.mensagem, 'warning');
            document.getElementById('modal-justificativa').classList.add('show');
            return;
          }

          if (!resultado.sucesso) {
            const tipoAlert = resultado.fraudeDetectada ? 'danger' : 'warning';
            exibirAlertaKiosk(resultado.mensagem, tipoAlert);
            return;
          }

          exibirAlertaKiosk('Ponto registrado com sucesso!', 'success');
          exibirComprovante(resultado);
        } catch (err) {
          console.error('Erro ao registrar ponto:', err);
          exibirAlertaKiosk('Erro interno ao registrar ponto.', 'danger');
        }
      }, 50);
    });
  }

  // 7. Modal Justificativa de Saída Antecipada
  const formJustificativa = document.getElementById('form-justificativa');
  if (formJustificativa) {
    formJustificativa.addEventListener('submit', async (e) => {
      e.preventDefault();
      const texto = document.getElementById('justificativa-texto').value.trim();
      if (!texto) return;

      PontoService.justificativaPendente = texto;
      document.getElementById('modal-justificativa').classList.remove('show');
      document.getElementById('justificativa-texto').value = '';

      const idVal = identificadorInput.value.trim();
      const resultado = await PontoService.processarRegistroPonto(idVal, videoElement);

      if (resultado.sucesso) {
        exibirAlertaKiosk('Saída antecipada registrada com justificativa!', 'success');
        exibirComprovante(resultado);
      } else {
        exibirAlertaKiosk(resultado.mensagem, 'danger');
      }
    });
  }

  // Helper para exibir comprovante digital no modal
  function exibirComprovante(resultado) {
    document.getElementById('rec-nome').textContent = resultado.funcionario.nome_completo;
    document.getElementById('rec-matricula').textContent = `${resultado.funcionario.matricula} (${resultado.funcionario.cpf})`;
    document.getElementById('rec-tipo').textContent = resultado.registro.tipo;
    document.getElementById('rec-data-hora').textContent = new Date(resultado.registro.data_hora).toLocaleString('pt-BR');
    document.getElementById('rec-status').textContent = resultado.registro.status_jornada;
    document.getElementById('rec-hash').textContent = resultado.receiptHash;

    document.getElementById('modal-comprovante').classList.add('show');
  }

  // Fechar modais
  document.querySelectorAll('[data-dismiss="modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('show'));
    });
  });

  const btnFecharComprovante = document.getElementById('btn-fechar-comprovante');
  if (btnFecharComprovante) {
    btnFecharComprovante.addEventListener('click', () => {
      document.getElementById('modal-comprovante').classList.remove('show');
      identificadorInput.value = '';
    });
  }

  // 8. Form de Solicitação de Ausência
  const ausenciaForm = document.getElementById('ausencia-form');
  const ausenciaAlert = document.getElementById('ausencia-alert');

  if (ausenciaForm) {
    ausenciaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const identificador = document.getElementById('ausencia-identificador').value.trim();
      const tipo_ausencia = document.getElementById('ausencia-tipo').value;
      const data_ausencia = document.getElementById('ausencia-data').value;
      const observacao = document.getElementById('ausencia-observacao').value.trim();

      const resp = await AusenciasService.solicitarAusencia({
        identificador,
        tipo_ausencia,
        data_ausencia,
        observacao
      });

      ausenciaAlert.style.display = 'block';
      ausenciaAlert.className = `alert alert-${resp.sucesso ? 'success' : 'danger'}`;
      ausenciaAlert.textContent = resp.mensagem;

      if (resp.sucesso) {
        ausenciaForm.reset();
      }
    });
  }

  // 9. Cadastro / Edição de Funcionários no RH
  const formFuncionario = document.getElementById('form-funcionario');
  if (formFuncionario) {
    formFuncionario.addEventListener('submit', async (e) => {
      e.preventDefault();
      await RHService.salvarFuncionarioForm();
    });
  }

  // Capturar Biometria Facial para Cadastro no RH
  const btnCapturarBiometriaCad = document.getElementById('btn-capturar-biometria-cad');
  if (btnCapturarBiometriaCad) {
    btnCapturarBiometriaCad.addEventListener('click', async () => {
      const vector = await BiometricsService.extractBiometricVector(videoElement);
      document.getElementById('func-vetor-biometrico').value = JSON.stringify(vector);

      const badge = document.getElementById('biometria-status-cad');
      badge.style.display = 'inline-block';
      badge.textContent = 'Biometria Capturada';
      alert('Vetor biométrico facial capturado com sucesso!');
    });
  }
});
