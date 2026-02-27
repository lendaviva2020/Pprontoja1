# 🚀 Deploy ProntoJá — GitHub + Vercel

## Método 1: Deploy em 1 comando (recomendado)

```bash
# Na pasta do projeto:
bash deploy.sh
```

O script faz tudo automaticamente:
- Verifica pré-requisitos (git, node, gh CLI, vercel CLI)
- Cria o repositório no GitHub
- Faz push do código
- Deploy na Vercel com região São Paulo (gru1)
- Configura as variáveis de ambiente
- Mostra as URLs dos webhooks para configurar no Stripe

---

## Método 2: Passo a passo manual

### Pré-requisitos

```bash
# Instalar Vercel CLI
npm install -g vercel

# Instalar GitHub CLI
# Mac: brew install gh
# Linux: https://cli.github.com/manual/installation
# Windows: https://github.com/cli/cli/releases
```

### 1. Criar repositório GitHub

```bash
# Login no GitHub
gh auth login

# Criar repositório e fazer push
gh repo create prontoja-app --private --source=. --remote=origin --push
```

Ou manualmente:
1. Acesse https://github.com/new
2. Crie o repositório
3. Execute:
```bash
git remote add origin https://github.com/SEU_USUARIO/prontoja-app.git
git push -u origin main
```

### 2. Configurar .env.local

Crie/edite o arquivo `.env.local` na raiz do projeto:

```bash
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# STRIPE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# MERCADO PAGO (opcional na fase 1)
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...

# URL DA APLICAÇÃO
NEXT_PUBLIC_APP_URL=https://prontoja.vercel.app
```

### 3. Deploy na Vercel

```bash
# Login na Vercel
vercel login

# Deploy de produção
vercel --prod

# Ou com nome específico
vercel --prod --name prontoja
```

### 4. Configurar variáveis na Vercel

```bash
# Adicionar todas as variáveis de uma vez:
bash setup-vercel-env.sh

# Ou individualmente:
vercel env add STRIPE_SECRET_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... etc
```

### 5. Configurar Webhooks Stripe

Acesse: https://dashboard.stripe.com/webhooks/create

**Webhook 1 — Pagamentos:**
- URL: `https://SEU_DOMINIO.vercel.app/api/stripe/webhook`
- Eventos:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `charge.refunded`
  - `charge.dispute.created`
  - `charge.dispute.closed`
  - `transfer.created`

**Webhook 2 — Contas Conectadas:**
- URL: `https://SEU_DOMINIO.vercel.app/api/stripe/webhook-connect`
- Eventos:
  - `account.updated`
  - `payout.paid`
  - `payout.failed`
  - `capability.updated`

Após criar cada webhook, copie o **Signing Secret** e adicione:

```bash
vercel env add STRIPE_WEBHOOK_SECRET production
# Cole o valor: whsec_...

vercel env add STRIPE_CONNECT_WEBHOOK_SECRET production
# Cole o valor: whsec_...
```

Depois faça um novo deploy para aplicar:

```bash
vercel --prod
```

---

## Integração GitHub → Vercel (deploy automático)

Após o primeiro deploy manual, conecte o repositório GitHub na Vercel para deploys automáticos:

1. Acesse https://vercel.com/dashboard
2. Clique no projeto `prontoja`
3. Vá em **Settings → Git**
4. Clique em **Connect Git Repository**
5. Selecione o repositório `prontoja-app`
6. Configure:
   - **Production Branch:** `main`
   - **Preview Branches:** qualquer branch com `preview/*`

A partir daí, **todo push para `main` faz deploy automático** na Vercel.

---

## Configurar domínio personalizado (opcional)

```bash
# Adicionar domínio na Vercel
vercel domains add prontoja.com.br

# Ou via painel:
# Settings → Domains → Add
```

Configure os DNS no seu provedor:
```
Tipo: CNAME
Nome: @
Valor: cname.vercel-dns.com

Tipo: CNAME  
Nome: www
Valor: cname.vercel-dns.com
```

Após configurar o domínio, atualize `NEXT_PUBLIC_APP_URL`:

```bash
vercel env rm NEXT_PUBLIC_APP_URL production --yes
echo "https://prontoja.com.br" | vercel env add NEXT_PUBLIC_APP_URL production
vercel --prod
```

---

## URLs importantes após o deploy

| Página | URL |
|--------|-----|
| App principal | `https://prontoja.vercel.app` |
| Painel admin | `https://prontoja.vercel.app/admin` |
| Login | `https://prontoja.vercel.app/auth/login` |
| Cadastro | `https://prontoja.vercel.app/auth/cadastro` |
| Dashboard cliente | `https://prontoja.vercel.app/cliente` |
| Dashboard profissional | `https://prontoja.vercel.app/profissional` |
| Stripe Connect | `https://prontoja.vercel.app/profissional/stripe-connect` |
| Webhook Stripe | `https://prontoja.vercel.app/api/stripe/webhook` |
| Webhook Connect | `https://prontoja.vercel.app/api/stripe/webhook-connect` |

---

## Checklist de Produção

- [ ] Substituir `sk_test_` por `sk_live_` nas variáveis Stripe
- [ ] Substituir `pk_test_` por `pk_live_`
- [ ] Configurar os 2 webhooks Stripe com os Signing Secrets corretos
- [ ] Verificar que `SUPABASE_SERVICE_ROLE_KEY` está configurado
- [ ] Criar primeiro usuário admin (via Supabase Dashboard → tabela `user_roles`)
- [ ] Testar fluxo completo: cadastro → job → proposta → pagamento → liberação
- [ ] Configurar 2FA no GitHub e na Vercel
- [ ] Rotacionar chaves Stripe após configuração (Stripe Dashboard → API Keys → Rotate)
