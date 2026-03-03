/**
 * src/lib/mercadopago.ts
 *
 * SDK do MercadoPago para Next.js (server-side only).
 * Usa fetch nativo — sem dependência do SDK oficial (que tem problemas com Edge).
 *
 * ─── ARQUITETURA MARKETPLACE ────────────────────────────────────────────────
 * Fluxo:
 *   1. Profissional conecta conta MP via OAuth
 *   2. Plataforma armazena access_token do profissional
 *   3. Cliente cria pagamento → preference criada com o access_token do profissional
 *      e marketplace_fee = 10% (taxa da plataforma)
 *   4. MP cobra o cliente, envia 90% ao profissional, 10% fica na conta da plataforma
 *   5. Webhook notifica sobre status do pagamento
 *
 * ─── VARIÁVEIS DE AMBIENTE NECESSÁRIAS ────────────────────────────────────
 * MP_CLIENT_ID          → App ID da aplicação MP (painel de devs)
 * MP_CLIENT_SECRET      → App Secret da aplicação MP
 * MP_ACCESS_TOKEN       → Access token da plataforma (conta principal)
 * MP_WEBHOOK_SECRET     → Secret para validar webhooks (HMAC SHA-256)
 * NEXT_PUBLIC_APP_URL   → URL da aplicação (ex: https://prontoja.com.br)
 * ────────────────────────────────────────────────────────────────────────────
 */

const MP_BASE = "https://api.mercadopago.com";

// ─── Tipos MP ─────────────────────────────────────────────────────────────────

export interface MPOAuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  live_mode: boolean;
  public_key: string;
}

export interface MPItem {
  id?: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id?: "BRL";
  category_id?: string;
  picture_url?: string;
}

export interface MPPayer {
  name?: string;
  surname?: string;
  email: string;
  phone?: { area_code?: string; number?: string };
  identification?: { type: "CPF" | "CNPJ"; number: string };
  address?: {
    zip_code?: string;
    street_name?: string;
    street_number?: string | number;
  };
}

export interface MPPreferenceRequest {
  items: MPItem[];
  payer?: MPPayer;
  back_urls?: {
    success: string;
    pending: string;
    failure: string;
  };
  auto_return?: "approved" | "all";
  notification_url?: string;
  external_reference: string;
  expires?: boolean;
  expiration_date_to?: string;
  marketplace_fee?: number;
  statement_descriptor?: string;
  metadata?: Record<string, string>;
}

export interface MPPreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  client_id: string;
  collector_id: number;
  external_reference: string;
  items: MPItem[];
  marketplace_fee: number;
  date_created: string;
  metadata: Record<string, string>;
}

export interface MPPaymentResponse {
  id: number;
  status: MPPaymentStatus;
  status_detail: MPPaymentStatusDetail;
  external_reference: string;
  description: string;
  transaction_amount: number;
  transaction_amount_refunded?: number;
  currency_id: string;
  payer: MPPayer & { id?: number };
  payment_method_id: string;
  payment_type_id: string;
  date_created: string;
  date_approved: string | null;
  money_release_date: string | null;
  marketplace_fee: number;
  net_amount: number;
  application_fee: number;
  refunds: MPRefund[];
  metadata: Record<string, string>;
}

export interface MPRefund {
  id: number;
  payment_id: number;
  amount: number;
  metadata: Record<string, string>;
  source: { id: string; name: string; type: string };
  date_created: string;
  unique_sequence_number: string | null;
}

export interface MPWebhookBody {
  id: string;
  live_mode: boolean;
  type: "payment" | "plan" | "subscription" | "invoice" | "point_integration_wh" | "mp-connect" | "chargebacks";
  date_created: string;
  user_id: string;
  api_version: string;
  action:
    | "payment.created"
    | "payment.updated"
    | "mp-connect.application-linked"
    | "mp-connect.application-unlinked"
    | "chargebacks.created"
    | "chargebacks.updated"
    | string;
  data: {
    id: string;
  };
}

export type MPPaymentStatus =
  | "pending"
  | "approved"
  | "authorized"
  | "in_process"
  | "in_mediation"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back";

export type MPPaymentStatusDetail =
  | "accredited"
  | "pending_contingency"
  | "pending_review_manual"
  | string;

export interface MPAccountInfo {
  id: number;
  nickname: string;
  email: string;
  first_name: string;
  last_name: string;
  site_id: string;
  country_id: string;
  thumbnail: { picture_url: string | null };
}

export interface MPProfessionalMetadata {
  mp_access_token?: string;
  mp_refresh_token?: string;
  mp_account_id?: string;
  mp_public_key?: string;
  mp_user_id?: string;
  mp_expires_at?: string;
  mp_scope?: string;
  mp_nickname?: string;
  mp_email?: string;
  mp_live_mode?: boolean;
  mp_status?: "not_connected" | "connected" | "disconnected" | "error";
  mp_connected_at?: string;
}

// ─── SDK Cliente ──────────────────────────────────────────────────────────────
export class MercadoPagoClient {
  private readonly accessToken: string;
  private readonly baseUrl = MP_BASE;

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env.MP_ACCESS_TOKEN ?? "";
    if (!this.accessToken) {
      throw new Error("[MercadoPago] MP_ACCESS_TOKEN não configurado");
    }
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        "X-Idempotency-Key": `prontoja-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      let detail = text;
      try {
        const json = JSON.parse(text);
        detail = json.message ?? json.error ?? text;
      } catch {
        // usar texto bruto
      }
      throw new Error(`MercadoPago API ${res.status}: ${detail}`);
    }

    return res.json() as Promise<T>;
  }

  async createPreference(data: MPPreferenceRequest): Promise<MPPreferenceResponse> {
    return this.request<MPPreferenceResponse>("POST", "/checkout/preferences", data);
  }

  async getPayment(paymentId: string | number): Promise<MPPaymentResponse> {
    return this.request<MPPaymentResponse>("GET", `/v1/payments/${paymentId}`);
  }

  async searchPaymentsByReference(
    externalReference: string
  ): Promise<{ results: MPPaymentResponse[]; paging: { total: number } }> {
    return this.request("GET", `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&limit=5`);
  }

  async refundPayment(
    paymentId: string | number,
    amount?: number
  ): Promise<MPRefund> {
    const body = amount !== undefined ? { amount } : undefined;
    return this.request<MPRefund>("POST", `/v1/payments/${paymentId}/refunds`, body);
  }

  async getAccountInfo(): Promise<MPAccountInfo> {
    return this.request<MPAccountInfo>("GET", "/v1/account");
  }

  withToken(token: string): MercadoPagoClient {
    return new MercadoPagoClient(token);
  }
}

let _mpInstance: MercadoPagoClient | null = null;

export function getMercadoPago(): MercadoPagoClient {
  if (!_mpInstance) {
    _mpInstance = new MercadoPagoClient();
  }
  return _mpInstance;
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────

export function getMPOAuthUrl(state: string): string {
  const clientId = process.env.MP_CLIENT_ID;
  if (!clientId) throw new Error("MP_CLIENT_ID não configurado");

  const redirectUri = encodeURIComponent(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/oauth/callback`
  );

  return (
    `https://auth.mercadopago.com.br/authorization` +
    `?client_id=${clientId}` +
    `&response_type=code` +
    `&platform_id=mp` +
    `&redirect_uri=${redirectUri}` +
    `&state=${encodeURIComponent(state)}`
  );
}

export async function exchangeMPCode(
  code: string
): Promise<MPOAuthTokenResponse> {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/mercadopago/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("MP_CLIENT_ID ou MP_CLIENT_SECRET não configurados");
  }

  const res = await fetch(`${MP_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OAuth token exchange falhou: ${err.message ?? res.status}`);
  }

  return res.json() as Promise<MPOAuthTokenResponse>;
}

export async function refreshMPToken(
  refreshToken: string
): Promise<MPOAuthTokenResponse> {
  const clientId = process.env.MP_CLIENT_ID;
  const clientSecret = process.env.MP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("MP_CLIENT_ID ou MP_CLIENT_SECRET não configurados");
  }

  const res = await fetch(`${MP_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Refresh token falhou: ${err.message ?? res.status}`);
  }

  return res.json() as Promise<MPOAuthTokenResponse>;
}

export async function validateMPWebhookSignature(
  xSignature: string,
  xRequestId: string,
  dataId: string,
  secret: string
): Promise<boolean> {
  try {
    const parts = xSignature.split(",");
    let ts = "";
    let v1 = "";

    for (const part of parts) {
      const [key, value] = part.split("=", 2);
      if (key === "ts") ts = value;
      if (key === "v1") v1 = value;
    }

    if (!ts || !v1) return false;

    const message = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(message)
    );

    const computed = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computed === v1;
  } catch (err) {
    console.error("[MP] Erro ao validar assinatura:", err);
    return false;
  }
}

export function mapMPStatusToInternal(
  mpStatus: MPPaymentStatus
): "pending" | "captured" | "authorized" | "failed" | "refunded" | "disputed" {
  switch (mpStatus) {
    case "approved":
      return "captured";
    case "authorized":
      return "authorized";
    case "pending":
    case "in_process":
      return "pending";
    case "rejected":
    case "cancelled":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    case "in_mediation":
      return "disputed";
    default:
      return "pending";
  }
}

export function calculateMPFees(
  amountCents: number,
  platformFeePct = 10
): {
  amountBRL: number;
  platformFeesBRL: number;
  platformFeesCents: number;
  professionalPayoutBRL: number;
  professionalPayoutCents: number;
} {
  const amountBRL = amountCents / 100;
  const platformFeesBRL = Math.round(amountBRL * (platformFeePct / 100) * 100) / 100;
  const professionalPayoutBRL = Math.round((amountBRL - platformFeesBRL) * 100) / 100;

  return {
    amountBRL,
    platformFeesBRL,
    platformFeesCents: Math.round(platformFeesBRL * 100),
    professionalPayoutBRL,
    professionalPayoutCents: Math.round(professionalPayoutBRL * 100),
  };
}

export function translateMPStatusDetail(detail: string): string {
  const translations: Record<string, string> = {
    accredited: "Pagamento aprovado e creditado",
    pending_contingency: "Aguardando processamento",
    pending_review_manual: "Em revisão manual",
    cc_rejected_bad_filled_card_number: "Número do cartão inválido",
    cc_rejected_bad_filled_date: "Data de vencimento inválida",
    cc_rejected_bad_filled_other: "Dados do cartão inválidos",
    cc_rejected_bad_filled_security_code: "Código de segurança inválido",
    cc_rejected_blacklist: "Cartão bloqueado",
    cc_rejected_call_for_authorize: "Ligue para o banco para autorizar",
    cc_rejected_card_disabled: "Cartão desativado",
    cc_rejected_duplicated_payment: "Pagamento duplicado",
    cc_rejected_high_risk: "Pagamento recusado por risco",
    cc_rejected_insufficient_amount: "Saldo insuficiente",
    cc_rejected_invalid_installments: "Parcelamento não permitido",
    cc_rejected_max_attempts: "Número máximo de tentativas excedido",
    cc_rejected_other_reason: "Pagamento recusado",
  };

  return translations[detail] ?? detail.replace(/_/g, " ");
}
