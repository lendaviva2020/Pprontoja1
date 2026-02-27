import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/** Retorna o cliente Stripe. Inicializado apenas em runtime para evitar erro no build. */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeInstance = new Stripe(key, { apiVersion: "2026-02-25.clover" });
  }
  return stripeInstance;
}
