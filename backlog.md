# Backlog do Projeto - Sistema de Controle de Ponto

Este documento registra todas as funcionalidades, requisitos e tarefas do projeto de Registro e Controle de Ponto com Autenticação Biométrica Facial.

---

## Módulo 1: Registro e Biometria
- [x] **[FUNC-1.1] Leitura de Câmera e Captura Facial**: Integração com API nativa `navigator.mediaDevices.getUserMedia` para exibição de vídeo em tempo real no kiosk tablet/desktop.
- [x] **[FUNC-1.2] Validação Biométrica Facial**: Comparação do vetor facial capturado com o vetor cadastrado no banco de dados (`vetor_biometrico`).
- [x] **[FUNC-1.3] Registro de Ponto com Sucesso**: Registro no banco (`registros_ponto`) informando matrícula/CPF e tipo (ENTRADA/SAÍDA).
- [x] **[FUNC-1.4] Emissão de Comprovante Digital**: Geração de comprovante em tela com dados da marcação, data/hora, status da jornada e código hash único para verificação.
- [x] **[FUNC-1.5] Auditoria de Tentativa de Fraude**: Em caso de falha ou incompatibilidade biométrica, bloqueio do registro e criação de entrada em `logs_auditoria_fraude` com foto capturada e detalhes.

---

## Módulo 2: Atrasos, Saídas Antecipadas e Banco de Horas
- [x] **[FUNC-2.1] Detecção Automática de Atrasos**: Validação da hora de entrada contra `horario_entrada_previsto`. Atrasos > 10 minutos geram notificação/alerta ao RH e marcação do status como `ATRASO`.
- [x] **[FUNC-2.2] Saída Antecipada com Justificativa**: Identificação de saída antes de `horario_saida_previsto`. Exigência de preenchimento de justificativa no momento do registro.
- [x] **[FUNC-2.3] Cálculo e Crédito de Banco de Horas**: Apuração automática do saldo de horas trabalhadas no dia (`saldo_horas_dia`), creditando horas excedentes com status `HORA_EXTRA`.

---

## Módulo 3: Faltas e Solicitações de Abono
- [x] **[FUNC-3.1] Solicitação de Falta Planejada**: Permite a solicitação de ausência futura exigindo antecedência mínima de 3 dias.
- [x] **[FUNC-3.2] Registro de Faltas Injustificadas e Atestados**: Permite o envio de justificativas e atestados para ausências.
- [x] **[FUNC-3.3] Gestão e Abono Manual pelo RH**: Painel para aprovação/rejeição de abonos pelo RH.

---

## Painel Administrativo / RH
- [x] **[FUNC-4.1] Gestão de Funcionários**: Cadastro, edição, listagem e desativação de funcionários com horários de jornada e cadastro biométrico facial.
- [x] **[FUNC-4.2] Relatório de Registros e Banco de Horas**: Visualização e filtro de registros de ponto, atrasos, justificativas e saldo de horas.
- [x] **[FUNC-4.3] Painel de Auditoria de Fraudes**: Visualização das fotos e alertas de tentativas de fraude capturadas.

---

## Infraestrutura & Supabase
- [x] **[DB-1.1] Esquema SQL Supabase**: Execução/validação de tabelas (`funcionarios`, `registros_ponto`, `solicitacoes_ausencia`, `logs_auditoria_fraude`).
- [x] **[DB-1.2] Camada de Persistência & Fallback Offline**: Conexão com Supabase via REST SDK com suporte a armazenamento local (LocalStorage) para funcionamento offline e testes locais.
