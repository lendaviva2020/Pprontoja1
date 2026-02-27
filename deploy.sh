#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# ProntoJá - Script de Deploy Automático (GitHub + Vercel)
# Execute: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e  # Para em qualquer erro

# ─── Cores ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

header() { echo -e "\n${BLUE}${BOLD}══════════════════════════════════════════${NC}"; echo -e "${BOLD}  $1${NC}"; echo -e "${BLUE}══════════════════════════════════════════${NC}"; }
ok()     { echo -e "${GREEN}✅ $1${NC}"; }
warn()   { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()    { echo -e "${RED}❌ $1${NC}"; exit 1; }
info()   { echo -e "${CYAN}ℹ️  $1${NC}"; }
ask()    { echo -e "${BOLD}❓ $1${NC}"; }

echo -e "${GREEN}${BOLD}"
echo "  ██████╗ ██████╗  ██████╗ ███╗   ██╗████████╗ ██████╗      "
echo "  ██╔══██╗██╔══██╗██╔═══██╗████╗  ██║╚══██╔══╝██╔═══██╗     "
echo "  ██████╔╝██████╔╝██║   ██║██╔██╗ ██║   ██║   ██║   ██║     "
echo "  ██╔═══╝ ██╔══██╗██║   ██║██║╚██╗██║   ██║   ██║   ██║     "
echo "  ██║     ██║  ██║╚██████╔╝██║ ╚████║   ██║   ╚██████╔╝     "
echo "  ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝    ╚═════╝      "
echo -e "${NC}"
echo -e "${BOLD}  Deploy Automático → GitHub + Vercel${NC}"
echo ""

# ─── 1. VERIFICAR PRÉ-REQUISITOS ─────────────────────────────────────────────
header "Passo 1/6 — Verificando pré-requisitos"

command -v git   >/dev/null 2>&1 || err "Git não encontrado. Instale: https://git-scm.com"
command -v node  >/dev/null 2>&1 || err "Node.js não encontrado. Instale: https://nodejs.org"
command -v npm   >/dev/null 2>&1 || err "npm não encontrado."

ok "Git $(git --version | cut -d' ' -f3)"
ok "Node $(node --version)"
ok "npm $(npm --version)"

# Instalar GitHub CLI se não existir
if ! command -v gh &>/dev/null; then
  warn "GitHub CLI (gh) não encontrado. Instalando..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install gh 2>/dev/null || warn "Instale manualmente: https://cli.github.com"
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update && sudo apt install gh -y 2>/dev/null || warn "Instale manualmente: https://cli.github.com"
  fi
fi

if command -v gh &>/dev/null; then
  ok "GitHub CLI $(gh --version | head -1)"
else
  warn "GitHub CLI não disponível - você fará o push manualmente"
fi

# Instalar Vercel CLI se não existir
if ! command -v vercel &>/dev/null; then
  info "Instalando Vercel CLI..."
  npm install -g vercel 2>/dev/null
fi
command -v vercel >/dev/null 2>&1 && ok "Vercel CLI $(vercel --version)" || err "Vercel CLI não instalou. Rode: npm i -g vercel"

# ─── 2. CONFIGURAR VARIÁVEIS ──────────────────────────────────────────────────
header "Passo 2/6 — Configuração do projeto"

echo ""
ask "Nome do repositório GitHub (ex: prontoja-app) [prontoja-app]:"
read -r REPO_NAME
REPO_NAME=${REPO_NAME:-prontoja-app}

ask "Visibilidade do repositório (public/private) [private]:"
read -r REPO_VISIBILITY
REPO_VISIBILITY=${REPO_VISIBILITY:-private}

ask "Nome do projeto na Vercel (ex: prontoja) [prontoja]:"
read -r VERCEL_PROJECT_NAME
VERCEL_PROJECT_NAME=${VERCEL_PROJECT_NAME:-prontoja}

echo ""
info "Configurações:"
echo "  Repositório: ${BOLD}$REPO_NAME${NC} (${REPO_VISIBILITY})"
echo "  Projeto Vercel: ${BOLD}$VERCEL_PROJECT_NAME${NC}"
echo ""
ask "Confirmar? (s/N):"
read -r CONFIRM
[[ "$CONFIRM" =~ ^[sS]$ ]] || { warn "Cancelado."; exit 0; }

# ─── 3. VARIÁVEIS DE AMBIENTE ─────────────────────────────────────────────────
header "Passo 3/6 — Variáveis de ambiente (.env.local)"

echo ""
info "Você precisará das seguintes chaves. Vamos configurar agora."
echo ""

configure_env() {
  local ENV_FILE=".env.local"
  
  # Verificar se já tem valores configurados
  if [ -f "$ENV_FILE" ]; then
    info "Arquivo .env.local encontrado. Atualizando valores faltantes..."
  else
    touch "$ENV_FILE"
  fi

  get_or_set() {
    local KEY=$1
    local PROMPT=$2
    local CURRENT
    CURRENT=$(grep "^${KEY}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"')
    
    if [ -z "$CURRENT" ] || [[ "$CURRENT" == *"SUBSTITUA"* ]]; then
      ask "$PROMPT"
      read -r VALUE
      if [ -n "$VALUE" ]; then
        # Remover linha existente e adicionar nova
        grep -v "^${KEY}=" "$ENV_FILE" > /tmp/env_tmp 2>/dev/null && mv /tmp/env_tmp "$ENV_FILE" || true
        echo "${KEY}=${VALUE}" >> "$ENV_FILE"
        ok "$KEY configurado"
      else
        warn "$KEY pulado (configure depois em .env.local)"
      fi
    else
      ok "$KEY já configurado"
    fi
  }

  echo ""
  info "━━━ SUPABASE (https://supabase.com/dashboard) ━━━"
  get_or_set "NEXT_PUBLIC_SUPABASE_URL" "NEXT_PUBLIC_SUPABASE_URL (https://xxx.supabase.co):"
  get_or_set "NEXT_PUBLIC_SUPABASE_ANON_KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY:"
  get_or_set "SUPABASE_SERVICE_ROLE_KEY" "SUPABASE_SERVICE_ROLE_KEY (Settings > API > service_role):"

  echo ""
  info "━━━ STRIPE (https://dashboard.stripe.com) ━━━"
  get_or_set "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_... ou pk_test_...):"
  get_or_set "STRIPE_SECRET_KEY" "STRIPE_SECRET_KEY (sk_live_... ou sk_test_...):"
  get_or_set "STRIPE_WEBHOOK_SECRET" "STRIPE_WEBHOOK_SECRET (whsec_...) [pode pular agora]:"
  get_or_set "STRIPE_CONNECT_WEBHOOK_SECRET" "STRIPE_CONNECT_WEBHOOK_SECRET (whsec_...) [pode pular agora]:"

  echo ""
  info "━━━ MERCADO PAGO (https://www.mercadopago.com.br/developers) ━━━"
  get_or_set "MERCADO_PAGO_ACCESS_TOKEN" "MERCADO_PAGO_ACCESS_TOKEN [pode pular agora]:"

  echo ""
  info "━━━ APP URL ━━━"
  info "Isso será atualizado automaticamente após o deploy Vercel"
  get_or_set "NEXT_PUBLIC_APP_URL" "NEXT_PUBLIC_APP_URL [Enter para usar placeholder]:"
  
  # Garantir que APP_URL tem valor
  if ! grep -q "^NEXT_PUBLIC_APP_URL=" "$ENV_FILE" 2>/dev/null; then
    echo "NEXT_PUBLIC_APP_URL=https://${VERCEL_PROJECT_NAME}.vercel.app" >> "$ENV_FILE"
    ok "NEXT_PUBLIC_APP_URL definido como placeholder"
  fi
}

configure_env

# ─── 4. GITHUB ────────────────────────────────────────────────────────────────
header "Passo 4/6 — Criando repositório GitHub"

# Verificar se já é um repo git
if [ ! -d ".git" ]; then
  info "Inicializando repositório git..."
  git init
  git checkout -b main 2>/dev/null || git branch -m main
  ok "Git inicializado"
fi

# Adicionar todos os arquivos se não tiver commits
if ! git log --oneline -1 &>/dev/null; then
  git add -A
  git commit -m "feat: ProntoJá v1.0 - marketplace de serviços com Stripe Connect

- Autenticação completa (login, cadastro, middleware SSR)
- Dashboards cliente e profissional
- Fluxo de criação de jobs (wizard 4 etapas)
- Sistema de propostas (envio, listagem, aceitação)
- Stripe Connect onboarding para profissionais
- Checkout Stripe Elements com split 90/10
- Webhooks Stripe (pagamentos, estornos, chargebacks)
- API de liberação de pagamento e estorno
- Painel administrativo completo
- Row Level Security em todas as tabelas Supabase
- Stack: Next.js 15 + TypeScript + Tailwind + Supabase + Stripe"
  ok "Commit inicial criado"
fi

# Criar repositório no GitHub
if command -v gh &>/dev/null; then
  # Verificar se está logado
  if ! gh auth status &>/dev/null; then
    info "Fazendo login no GitHub..."
    gh auth login
  fi
  
  GITHUB_USER=$(gh api user --jq .login 2>/dev/null)
  
  # Verificar se repositório já existe
  if gh repo view "$GITHUB_USER/$REPO_NAME" &>/dev/null; then
    warn "Repositório $GITHUB_USER/$REPO_NAME já existe"
    REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME"
  else
    info "Criando repositório $REPO_NAME no GitHub..."
    gh repo create "$REPO_NAME" \
      --${REPO_VISIBILITY} \
      --description "ProntoJá - Marketplace de Serviços com Stripe Connect" \
      --source=. \
      --remote=origin \
      --push
    REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME"
    ok "Repositório criado: $REPO_URL"
  fi

  # Configurar remote se não existir
  if ! git remote get-url origin &>/dev/null; then
    git remote add origin "$REPO_URL"
  fi

  # Push
  info "Fazendo push para GitHub..."
  git push -u origin main --force
  ok "Código enviado para GitHub: $REPO_URL"
else
  warn "GitHub CLI não disponível. Faça manualmente:"
  echo ""
  echo "  1. Acesse: https://github.com/new"
  echo "  2. Nome do repositório: ${BOLD}$REPO_NAME${NC}"
  echo "  3. Copie a URL do repositório"
  echo "  4. Execute:"
  echo "     git remote add origin https://github.com/SEU_USUARIO/$REPO_NAME.git"
  echo "     git push -u origin main"
  echo ""
  ask "Quando finalizar, pressione Enter para continuar..."
  read -r _
  ask "Cole a URL do repositório GitHub (https://github.com/...):"
  read -r REPO_URL
fi

# ─── 5. VERCEL DEPLOY ─────────────────────────────────────────────────────────
header "Passo 5/6 — Deploy na Vercel"

info "Fazendo login na Vercel (se necessário)..."
vercel whoami 2>/dev/null || vercel login

info "Iniciando deploy do projeto..."
echo ""

# Deploy com todas as variáveis de ambiente
DEPLOY_CMD="vercel --yes --name $VERCEL_PROJECT_NAME"

# Passar cada variável de ambiente para a Vercel
while IFS='=' read -r KEY VALUE; do
  # Pular linhas vazias e comentários
  [[ -z "$KEY" || "$KEY" =~ ^# ]] && continue
  # Pular chaves NEXT_PUBLIC (são buildtime, serão configuradas depois)
  # Passar todas as env vars
  DEPLOY_CMD="$DEPLOY_CMD -e ${KEY}=${VALUE}"
done < <(grep -v '^#' .env.local 2>/dev/null | grep '=')

# Deploy produção
DEPLOY_OUTPUT=$(vercel --yes --name "$VERCEL_PROJECT_NAME" --prod 2>&1)
echo "$DEPLOY_OUTPUT"

# Extrair URL do deploy
DEPLOY_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE 'https://[a-zA-Z0-9.-]+\.vercel\.app' | tail -1)

if [ -z "$DEPLOY_URL" ]; then
  DEPLOY_URL=$(vercel ls "$VERCEL_PROJECT_NAME" 2>/dev/null | grep 'https://' | head -1 | awk '{print $2}')
fi

if [ -n "$DEPLOY_URL" ]; then
  ok "Deploy realizado: $DEPLOY_URL"
  
  # Atualizar NEXT_PUBLIC_APP_URL com a URL real
  info "Atualizando NEXT_PUBLIC_APP_URL para $DEPLOY_URL..."
  vercel env rm NEXT_PUBLIC_APP_URL production --yes 2>/dev/null || true
  echo "$DEPLOY_URL" | vercel env add NEXT_PUBLIC_APP_URL production 2>/dev/null
  ok "URL atualizada na Vercel"
fi

# Configurar variáveis via vercel env add (para garantir que estão no painel)
info "Sincronizando variáveis de ambiente na Vercel..."
while IFS='=' read -r KEY VALUE; do
  [[ -z "$KEY" || "$KEY" =~ ^# || -z "$VALUE" ]] && continue
  [[ "$VALUE" == *"SUBSTITUA"* ]] && continue
  
  # Remover variável existente antes de adicionar
  vercel env rm "$KEY" production --yes 2>/dev/null || true
  echo "$VALUE" | vercel env add "$KEY" production 2>/dev/null && info "  ✓ $KEY" || warn "  ✗ $KEY (configure manualmente)"
done < <(grep -v '^#' .env.local 2>/dev/null | grep '=')

ok "Variáveis de ambiente sincronizadas"

# ─── 6. CONFIGURAR WEBHOOKS STRIPE ───────────────────────────────────────────
header "Passo 6/6 — Configurar Webhooks Stripe"

if [ -n "$DEPLOY_URL" ]; then
  WEBHOOK_URL="$DEPLOY_URL"
else
  ask "URL de produção da Vercel (ex: https://prontoja.vercel.app):"
  read -r WEBHOOK_URL
fi

echo ""
info "Configure os seguintes webhooks no Stripe Dashboard:"
echo "  https://dashboard.stripe.com/webhooks/create"
echo ""
echo -e "  ${BOLD}Webhook 1 — Pagamentos principais:${NC}"
echo "  URL:     ${BOLD}${WEBHOOK_URL}/api/stripe/webhook${NC}"
echo "  Eventos: payment_intent.*, charge.refunded, charge.dispute.*,"
echo "           transfer.created"
echo ""
echo -e "  ${BOLD}Webhook 2 — Contas conectadas (Stripe Connect):${NC}"
echo "  URL:     ${BOLD}${WEBHOOK_URL}/api/stripe/webhook-connect${NC}"
echo "  Eventos: account.updated, payout.paid, payout.failed,"
echo "           capability.updated, transfer.created"
echo ""
warn "Após criar os webhooks, copie os SIGNING SECRETs e adicione:"
echo "  vercel env add STRIPE_WEBHOOK_SECRET production"
echo "  vercel env add STRIPE_CONNECT_WEBHOOK_SECRET production"
echo ""
warn "Depois rode um novo deploy para aplicar:"
echo "  vercel --prod"

# ─── RESUMO FINAL ─────────────────────────────────────────────────────────────
header "🎉 Deploy Concluído!"

echo ""
echo -e "${GREEN}${BOLD}Links do projeto:${NC}"
[ -n "$REPO_URL"   ] && echo -e "  🐙 GitHub:  ${CYAN}$REPO_URL${NC}"
[ -n "$DEPLOY_URL" ] && echo -e "  🚀 Vercel:  ${CYAN}$DEPLOY_URL${NC}"
[ -n "$DEPLOY_URL" ] && echo -e "  ⚙️  Admin:   ${CYAN}${DEPLOY_URL}/admin${NC}"
echo ""
echo -e "${BOLD}Próximos passos:${NC}"
echo "  1. Configure os webhooks Stripe (URLs acima)"
echo "  2. Ative o modo live no Stripe (substitua sk_test por sk_live)"
echo "  3. Complete o onboarding em /profissional/stripe-connect"
echo "  4. Teste o fluxo completo de pagamento"
echo ""
echo -e "${BOLD}Deploy automático futuro:${NC}"
echo "  git add -A && git commit -m 'feat: ...' && git push"
echo "  (Vercel detecta o push e faz deploy automático)"
echo ""
echo -e "${YELLOW}${BOLD}⚠️  Importante:${NC}"
echo "  • Nunca faça commit do .env.local (já está no .gitignore)"
echo "  • Rotacione as chaves Stripe após configurar em produção"
echo "  • Configure 2FA no GitHub e na Vercel"
echo ""
