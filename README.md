
# ProntoJá 🛠️

> Marketplace de serviços locais que conecta clientes a profissionais qualificados — com pagamentos integrados, chat em tempo real e sistema de avaliações.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Banco de Dados](#banco-de-dados)
- [Fluxo Principal](#fluxo-principal)
- [Configuração Local](#configuração-local)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Deploy](#deploy)
- [APIs](#apis)

---

## Visão Geral

O ProntoJá é um marketplace B2C onde clientes publicam jobs (serviços que precisam) e profissionais enviam propostas. A plataforma gerencia todo o ciclo: contratação → pagamento em custódia → execução → liberação → avaliação.

O modelo de negócio é baseado em **split payment**: a plataforma retém 10% de cada transação e repassa 90% ao profissional via **Stripe Connect** ou **Mercado Pago** (marketplace).

---

## Funcionalidades

### Para Clientes
- ✅ Publicar jobs com categoria, descrição, localização e orçamento
- ✅ Receber e comparar propostas de profissionais
- ✅ Aceitar proposta e pagar com segurança (custódia via Stripe)
- ✅ Chat em tempo real com o profissional contratado
- ✅ Marcar job como concluído e liberar pagamento
- ✅ Avaliar profissional com notas por critério (pontualidade, qualidade, comunicação)
- ✅ Abrir disputas em caso de problemas

### Para Profissionais
- ✅ Perfil completo com foto, bio, skills, certificados e portfólio
- ✅ Perfil público acessível em `/p/[slug]`
- ✅ Enviar propostas com valor e prazo
- ✅ Chat em tempo real com cliente
- ✅ Onboarding Stripe Connect ou Mercado Pago para receber pagamentos
- ✅ Dashboard de jobs, avaliações e ganhos
- ✅ Responder avaliações de clientes

### Para Administradores
- ✅ Painel admin com visão geral de transações
- ✅ Gestão de disputas
- ✅ Relatórios de receita (split 10%)

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Estilização | Tailwind CSS |
| Backend/DB | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth |
| Pagamentos | Stripe Connect + Mercado Pago (split payment) |
| Realtime | Supabase Realtime (WebSocket) |
| Storage | Supabase Storage |
| Deploy | Vercel |
| Ícones | Lucide React |

---

## Arquitetura

```
Cliente (Browser)
      │
      ▼
  Vercel (Next.js 15)
      │
      ├── App Router (RSC + Client Components)
      ├── API Routes (/api/*)
      │
      ├── Supabase ──────────────────────────────────┐
      │     ├── PostgreSQL (14 tabelas + RLS)        │
      │     ├── Auth (JWT)                           │
      │     ├── Realtime (chat + typing)             │
      │     └── Storage (avatars, portfolio, chat)   │
      │                                              │
      ├── Stripe ────────────────────────────────────┘
      │     ├── Connect (contas profissionais)
      │     ├── Payment Intents (custódia)
      │     └── Webhooks (eventos de pagamento)
      │
      └── Mercado Pago (opcional)
            ├── OAuth (contas profissionais)
            ├── Checkout / Preference (custódia + split 10%)
            └── Webhook (payment, mp-connect, chargebacks)
```

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── admin/                  # Painel administrativo
│   │   ├── page.tsx            # Dashboard admin
│   │   └── disputas/           # Gestão de disputas
│   │
│   ├── api/                    # API Routes
│   │   ├── chat/[job_id]/      # Mensagens do chat
│   │   ├── jobs/               # CRUD de jobs
│   │   ├── perfil/             # Perfil profissional
│   │   │   └── upload/         # Upload de arquivos
│   │   ├── proposals/          # Propostas
│   │   ├── reviews/            # Avaliações
│   │   │   └── [id]/responder/ # Resposta do profissional
│   │   ├── stripe/             # Webhooks e Connect Stripe
│   │   ├── mercadopago/        # OAuth, checkout, webhook, release MP
│   │   └── webhooks/           # Stripe webhooks
│   │
│   ├── auth/                   # Login, cadastro, callback
│   │
│   ├── chat/[job_id]/          # Página de chat
│   │
│   ├── cliente/                # Área do cliente
│   │   ├── dashboard/
│   │   ├── jobs/               # Lista e detalhe de jobs
│   │   ├── mensagens/          # Lista de conversas
│   │   ├── pagamento/[id]/     # Checkout Stripe
│   │   ├── pagamento-mp/       # Checkout Mercado Pago
│   │   └── avaliar/[job_id]/   # Formulário de avaliação
│   │
│   ├── p/[slug]/               # Perfil público do profissional
│   │
│   └── profissional/           # Área do profissional
│       ├── dashboard/
│       ├── jobs/
│       ├── mensagens/          # Lista de conversas
│       ├── perfil/editar/      # Wizard de edição de perfil
│       ├── avaliacoes/         # Dashboard de avaliações
│       ├── onboarding/         # Onboarding de perfil
│       ├── stripe-connect/     # Stripe Connect
│       └── mercadopago-connect/# Mercado Pago OAuth
│
├── components/
│   ├── chat/
│   │   └── ChatBox.tsx         # Chat realtime (Supabase)
│   ├── layout/
│   │   ├── SidebarCliente.tsx
│   │   └── SidebarProfissional.tsx
│   └── reviews/
│       ├── ReviewForm.tsx
│       └── ProfessionalReviewResponse.tsx
│
└── lib/
    ├── supabase/
    │   ├── client.ts           # Browser client
    │   ├── server.ts           # Server client (cookies)
    │   └── service.ts          # Service role client
    ├── stripe.ts               # Stripe instance
    └── mercadopago.ts          # SDK Mercado Pago (OAuth, HMAC, taxas)
```

---

## Banco de Dados

### Tabelas Principais (14 total)

| Tabela | Descrição |
|---|---|
| `profiles` | Usuários com role (client/professional/admin), slug, skills, completeness |
| `jobs` | Serviços publicados pelos clientes |
| `proposals` | Propostas dos profissionais para cada job |
| `transactions` | Pagamentos com split (platform_fee 10%, professional_amount 90%) |
| `messages` | Mensagens do chat com tipos (text/image/file/system) |
| `typing_indicators` | Indicador "digitando..." em tempo real |
| `reviews` | Avaliações com rating geral e por critério |
| `professional_skills` | Skills do profissional com nível (beginner→expert) |
| `professional_certificates` | Certificados e credenciais |
| `professional_portfolio` | Portfólio com imagens e descrições |
| `disputes` | Disputas entre cliente e profissional |
| `notifications` | Notificações do sistema |
| `stripe_accounts` | Contas Stripe Connect dos profissionais |
| `service_categories` | Categorias de serviços disponíveis |

### Segurança (RLS)
Todas as tabelas possuem Row Level Security ativado. O acesso é controlado por `auth.uid()` — cada usuário acessa apenas seus próprios dados, com exceções para dados públicos (perfis, reviews visíveis).

---

## Fluxo Principal

```
1. Cliente publica job
        │
        ▼
2. Profissionais enviam propostas
        │
        ▼
3. Cliente aceita proposta
        │
        ▼
4. Cliente paga (Stripe → custódia)
        │
        ▼
5. Chat ativo (cliente ↔ profissional)
        │
        ▼
6. Cliente marca job como concluído
        │
        ▼
7. Pagamento liberado (90% profissional + 10% plataforma)
        │
        ▼
8. Cliente avalia profissional
```

---

## Configuração Local

```bash
# 1. Clonar o repositório
git clone https://github.com/lendaviva2020/Pprontoja1.git
cd Pprontoja1

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env.local
# Editar .env.local com suas credenciais

# 4. Rodar em desenvolvimento
npm run dev
```

Acesse: `http://localhost:3000`

---

## Variáveis de Ambiente

### Onde configurar

- **Supabase:** não é necessário cadastrar chaves do Mercado Pago ou Stripe. No Supabase você só configura **Authentication → URL Configuration → Redirect URLs** (veja [Login com Google](#login-com-google)). As variáveis abaixo são usadas pela aplicação Next.js e devem ser cadastradas na **Vercel** (e no `.env.local` em desenvolvimento).
- **Vercel:** todas as variáveis listadas abaixo devem ser adicionadas em **Project → Settings → Environment Variables**.

---

### Lista completa (nome da variável → descrição)

| Nome | Onde obter | Obrigatório |
|------|------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (secret) | Sim |
| `NEXT_PUBLIC_APP_URL` | URL do app (ex: `https://prontoja.vercel.app` ou `http://localhost:3000`) | Sim |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key | Se usar Stripe |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API keys → Publishable key | Se usar Stripe |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks → Signing secret do endpoint | Se usar Stripe |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe → Webhooks → endpoint Connect → Signing secret | Se usar Stripe Connect |
| `MP_CLIENT_ID` | Mercado Pago → developers.mercadopago.com → App → App ID | Se usar Mercado Pago |
| `MP_CLIENT_SECRET` | Mercado Pago → App → Client Secret | Se usar Mercado Pago |
| `MP_ACCESS_TOKEN` | Mercado Pago → App → Access Token (produção) | Se usar Mercado Pago |
| `MP_WEBHOOK_SECRET` | Mercado Pago → Webhooks → Secret signature (após criar o webhook) | Se usar Mercado Pago |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | Mercado Pago → App → Public Key (opcional, para front) | Opcional |

Exemplo de `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Mercado Pago (Marketplace)
MP_CLIENT_ID=...
MP_CLIENT_SECRET=...
MP_ACCESS_TOKEN=APP_USR-...
MP_WEBHOOK_SECRET=    # Copiar do painel MP após configurar a URL do webhook
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...   # Opcional
```

---

### Chaves no Supabase (Dashboard)

No **Supabase** você **não** adiciona as chaves do Mercado Pago nem do Stripe. O Supabase só precisa:

1. **Project Settings → API**
   - Anote **Project URL** e **anon key** (e o **service_role key**) para colar na **Vercel** como variáveis de ambiente (veja tabela acima).

2. **Authentication → URL Configuration → Redirect URLs**
   - Adicione: `http://localhost:3000/api/auth/callback` (desenvolvimento)
   - Adicione: `https://SEU_DOMINIO.com/api/auth/callback` (produção)

Nenhuma variável com **nome** “MP_” ou “STRIPE_” deve ser criada no Supabase; elas são usadas apenas pela aplicação que roda na Vercel.

---

### Chaves na Vercel (Environment Variables)

Em **Vercel → seu projeto → Settings → Environment Variables**, adicione **nome** e **valor** (Value) para cada linha abaixo. Marque **Production**, **Preview** e **Development** conforme necessário.

| Nome | Valor (exemplo) | Ambientes |
|------|-----------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Todos |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Todos |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Todos |
| `NEXT_PUBLIC_APP_URL` | `https://prontoja.vercel.app` | Todos |
| `STRIPE_SECRET_KEY` | `sk_live_...` ou `sk_test_...` | Todos |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` ou `pk_test_...` | Todos |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Todos |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `whsec_...` | Todos |
| `MP_CLIENT_ID` | Número do App (ex: `5313676125501714`) | Todos |
| `MP_CLIENT_SECRET` | String do Client Secret | Todos |
| `MP_ACCESS_TOKEN` | `APP_USR-...` | Todos |
| `MP_WEBHOOK_SECRET` | Valor do “Secret signature” do webhook no painel MP | Todos |
| `NEXT_PUBLIC_MP_PUBLIC_KEY` | `APP_USR-...` (opcional) | Todos |

Depois de salvar, faça um novo deploy para as variáveis serem aplicadas.

### Login com Google

1. **Google Cloud Console**: Crie um projeto em [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID.
2. **Authorized redirect URIs**: Adicione `https://[seu-projeto].supabase.co/auth/v1/callback`.
3. **Supabase Dashboard**: Authentication → Providers → Google → habilite e cole Client ID e Client Secret.
4. **Redirect URLs no Supabase**: Authentication → URL Configuration → adicione `http://localhost:3000/api/auth/callback` (dev) e `https://seudominio.com/api/auth/callback` (prod).
5. **SUPABASE_SERVICE_ROLE_KEY**: Necessária para criar profile e role de novos usuários OAuth (já listada acima).

---

## Deploy

O projeto está na **raiz do repositório**, então o Vercel detecta o Next.js automaticamente (não é preciso configurar Root Directory).

Deploy automático no **Vercel**:

```bash
# Deploy manual via CLI
vercel --prod

# Ou via push (deploy automático)
git push origin main
```

**Configurar variáveis no Vercel:**
```bash
./setup-vercel-env.sh
```

**Stripe Webhooks** (dashboard.stripe.com):
- Payment: `https://seudominio.com/api/stripe/webhook` — eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`
- Connect: `https://seudominio.com/api/stripe/webhook-connect` — eventos: `account.updated`, `transfer.created`, `payout.paid`, `payout.failed`

**Mercado Pago** (developers.mercadopago.com → Webhooks):
- Production URL: `https://seudominio.com/api/mercadopago/webhook`
- Redirect URI do app: `https://seudominio.com/api/mercadopago/oauth/callback`
- Eventos: **Payments**, **Application linking**, **Complaints**
- Copie o **Secret signature** e preencha `MP_WEBHOOK_SECRET` na Vercel

---

## APIs

| Método | Rota | Descrição |
|---|---|---|
| `GET/PATCH` | `/api/perfil` | Perfil do profissional autenticado |
| `POST` | `/api/perfil/upload` | Upload de avatar, certificados, portfólio |
| `GET/POST` | `/api/chat/[job_id]` | Mensagens do chat |
| `POST` | `/api/reviews` | Criar avaliação |
| `PATCH` | `/api/reviews/[id]/responder` | Profissional responde avaliação |
| `GET/POST` | `/api/jobs` | Listar/criar jobs |
| `POST` | `/api/proposals` | Enviar proposta |
| `POST` | `/api/stripe/connect` | Iniciar onboarding Stripe Connect |
| `POST` | `/api/stripe/checkout` | Criar Payment Intent (Stripe) |
| `POST` | `/api/stripe/webhook` | Webhook Stripe (pagamentos) |
| `POST` | `/api/stripe/webhook-connect` | Webhook Stripe Connect |
| `GET` | `/api/mercadopago/oauth` | Iniciar OAuth Mercado Pago |
| `GET` | `/api/mercadopago/oauth/callback` | Callback OAuth Mercado Pago |
| `GET/DELETE` | `/api/mercadopago/connect` | Status / desconectar conta MP |
| `POST` | `/api/mercadopago/checkout` | Criar Preference (checkout MP) |
| `POST` | `/api/mercadopago/webhook` | Webhook Mercado Pago |
| `POST` | `/api/mercadopago/release-payment` | Liberar pagamento (marcar job concluído) |

---

## Licença

Projeto proprietário — todos os direitos reservados.
