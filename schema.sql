-- ========================================================
-- ESQUEMA SQL - SUPABASE (POSTGRESQL)
-- Projeto: Controle de Entrada e Saída de Funcionários
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE FUNCIONARIOS
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    matricula VARCHAR(50) UNIQUE NOT NULL,
    carga_horaria_diaria INTERVAL NOT NULL DEFAULT '08:00:00',
    horario_entrada_previsto TIME NOT NULL DEFAULT '08:00:00',
    horario_saida_previsto TIME NOT NULL DEFAULT '17:00:00',
    vetor_biometrico JSONB, -- Dados do modelo facial para validacao
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE REGISTROS DE PONTO
CREATE TABLE IF NOT EXISTS public.registros_ponto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA', 'SAIDA')),
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status_jornada VARCHAR(30) NOT NULL CHECK (status_jornada IN ('NORMAL', 'ATRASO', 'SAIDA_ANTECIPADA', 'HORA_EXTRA')),
    justificativa TEXT,
    autenticado_biometria BOOLEAN NOT NULL DEFAULT FALSE,
    saldo_horas_dia INTERVAL DEFAULT '00:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABELA DE FALTAS E SOLICITAÇÕES DE ABONO
CREATE TABLE IF NOT EXISTS public.solicitacoes_ausencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    data_ausencia DATE NOT NULL,
    tipo_ausencia VARCHAR(50) NOT NULL CHECK (tipo_ausencia IN ('FALTA_PLANEJADA', 'FALTA_INJUSTIFICADA', 'ATESTADO')),
    antecedencia_dias INT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'REJEITADO')),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABELA DE AUDITORIA DE FRAUDES
CREATE TABLE IF NOT EXISTS public.logs_auditoria_fraude (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    funcionario_id UUID REFERENCES public.funcionarios(id),
    tentativa_data_hora TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detalhe_tentativa TEXT NOT NULL,
    imagem_capturada_url TEXT
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_registros_funcionario ON public.registros_ponto(funcionario_id);
CREATE INDEX IF NOT EXISTS idx_registros_data_hora ON public.registros_ponto(data_hora);
