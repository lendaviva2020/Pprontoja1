-- ─── Migração: sistema MercadoPago ──────────────────────────────────────────
-- Arquivo: supabase/migrations/20240301000000_mercadopago.sql

-- ─── 1) Tabela oauth_states (CSRF para OAuth flows) ────────────────────────
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state       TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway     TEXT NOT NULL DEFAULT 'mercadopago',
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, gateway)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_states_state ON public.oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON public.oauth_states(expires_at);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

-- ─── 2) Tabela webhook_events (se não existir) ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway       TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  event_type    TEXT,
  payload       JSONB,
  status        TEXT NOT NULL DEFAULT 'processing',
  processed_at  TIMESTAMPTZ,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(gateway, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_event ON public.webhook_events(gateway, event_id);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- ─── 3) Colunas extras em payments ──────────────────────────────────────────
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS gateway_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_account_id TEXT,
  ADD COLUMN IF NOT EXISTS refunded_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS released_by UUID REFERENCES auth.users(id);

-- ─── 4) Índices para busca de pagamentos MP ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payments_job_gateway
  ON public.payments(job_id, gateway);

CREATE INDEX IF NOT EXISTS idx_payments_gateway_id
  ON public.payments(gateway, gateway_payment_id);

-- ─── 5) Tabela audit_logs (criar se não existir; depois garantir colunas) ───
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  changes     JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Se a tabela já existia com schema antigo, adicionar colunas que faltam
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id);
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS changes JSONB;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ─── 6) Tabela disputes (se não existir) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disputes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id           UUID REFERENCES public.payments(id),
  job_id               UUID REFERENCES public.jobs(id),
  opened_by            UUID REFERENCES auth.users(id),
  type                 TEXT NOT NULL DEFAULT 'chargeback',
  reason               TEXT,
  status               TEXT NOT NULL DEFAULT 'open',
  amount_cents          INTEGER,
  gateway_dispute_id   TEXT,
  description          TEXT,
  evidence_due_by      TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- ─── 7) Variáveis de ambiente (.env.local) ──────────────────────────────────
/*
# MercadoPago
MP_CLIENT_ID=
MP_CLIENT_SECRET=
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=https://prontoja.com.br
*/

-- ─── 8) Webhook no painel MP ───────────────────────────────────────────────
/*
URL: https://SEU_DOMINIO/api/mercadopago/webhook
Eventos: payment (created, updated), mp-connect, chargebacks
*/
