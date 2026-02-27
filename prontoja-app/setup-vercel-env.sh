#!/bin/bash
# Script para adicionar variáveis de ambiente na Vercel após o deploy
# Execute: bash setup-vercel-env.sh

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

echo -e "${BOLD}Configurando variáveis de ambiente na Vercel...${NC}"
echo ""

# Verificar se está na pasta do projeto
[ ! -f ".env.local" ] && { echo "Execute na raiz do projeto (onde está o .env.local)"; exit 1; }

add_env() {
  local KEY=$1
  local VALUE=$2
  local ENV=${3:-production}  # production | preview | development
  
  if [ -n "$VALUE" ] && [[ "$VALUE" != *"SUBSTITUA"* ]]; then
    vercel env rm "$KEY" "$ENV" --yes 2>/dev/null || true
    echo "$VALUE" | vercel env add "$KEY" "$ENV"
    echo -e "${GREEN}✓ $KEY${NC}"
  else
    echo -e "${YELLOW}⏭ $KEY (vazio/placeholder)${NC}"
  fi
}

# Ler .env.local e adicionar todas as variáveis
while IFS='=' read -r KEY VALUE; do
  [[ -z "$KEY" || "$KEY" =~ ^# || -z "$VALUE" ]] && continue
  add_env "$KEY" "$VALUE" "production"
  add_env "$KEY" "$VALUE" "preview"
done < <(grep -v '^#' .env.local | grep '=')

echo ""
echo -e "${GREEN}${BOLD}Variáveis configuradas!${NC}"
echo -e "${CYAN}Verifique em: https://vercel.com/dashboard → Settings → Environment Variables${NC}"
