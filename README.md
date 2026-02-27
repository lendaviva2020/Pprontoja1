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

O modelo de negócio é baseado em **split payment**: a plataforma retém 10% de cada transação e repassa 90% ao profissional via Stripe Connect.

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
- ✅ Onboarding Stripe Connect para receber pagamentos
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
| Pagamentos | Stripe Connect (split payment) |
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
      └── Stripe ────────────────────────────────────┘
            ├── Connect (contas profissionais)
            ├── Payment Intents (custódia)
            └── Webhooks (eventos de pagamento)
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
│   │   ├── stripe/             # Webhooks e pagamentos
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
│       └── onboarding/         # Stripe Connect onboarding
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
    └── stripe.ts               # Stripe instance
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

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[projeto].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=https://seudominio.com
```

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

**Stripe Webhook** (configurar em dashboard.stripe.com):
- Endpoint: `https://seudominio.com/api/webhooks/stripe`
- Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `account.updated`

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
| `POST` | `/api/stripe/payment` | Criar Payment Intent |
| `POST` | `/api/webhooks/stripe` | Receber eventos do Stripe |

---

## Licença

Projeto proprietário — todos os direitos reservados.
