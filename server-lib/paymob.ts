/**
 * Paymob (Egypt) integration — Intention API flow.
 *
 * Flow:
 *  1. Server creates a payment "intention" with the secret key → gets client_secret
 *  2. Frontend uses public key + client_secret to mount the Paymob checkout
 *  3. Paymob calls our webhook (transaction processed callback) → we verify HMAC
 *     and mark the order Paid
 *
 * Required env vars:
 *   PAYMOB_SECRET_KEY        (e.g. egy_sk_live_xxx or egy_sk_test_xxx)
 *   PAYMOB_PUBLIC_KEY        (e.g. egy_pk_live_xxx) — exposed to the browser
 *   PAYMOB_INTEGRATION_ID    (the integration/payment method id, numeric)
 *   PAYMOB_HMAC_SECRET       (for verifying webhook authenticity)
 */
import crypto from "crypto";

const INTENTION_URL = "https://accept.paymob.com/v1/intention/";

export interface IntentionItem {
  name: string;
  amount: number; // in piasters (EGP * 100)
  description?: string;
  quantity: number;
}

export interface CreateIntentionArgs {
  amountCents: number; // total in piasters
  orderNumber: string;
  items: IntentionItem[];
  billing: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    street: string;
  };
}

export interface IntentionResult {
  clientSecret: string;
  publicKey: string;
}

/**
 * Creates a Paymob payment intention. Returns the client_secret + public key
 * the browser needs to open the checkout.
 */
export async function createPaymentIntention(args: CreateIntentionArgs): Promise<IntentionResult> {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  const publicKey = process.env.PAYMOB_PUBLIC_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;

  if (!secretKey || !publicKey || !integrationId) {
    throw new Error("Paymob is not configured (missing PAYMOB_SECRET_KEY / PAYMOB_PUBLIC_KEY / PAYMOB_INTEGRATION_ID)");
  }

  const body = {
    amount: args.amountCents,
    currency: "EGP",
    payment_methods: [Number(integrationId)],
    items: args.items.map((it) => ({
      name: it.name.slice(0, 50),
      amount: it.amount,
      description: (it.description || it.name).slice(0, 50),
      quantity: it.quantity,
    })),
    billing_data: {
      first_name: args.billing.firstName,
      last_name: args.billing.lastName,
      email: args.billing.email,
      phone_number: args.billing.phone,
      city: args.billing.city,
      country: args.billing.country,
      street: args.billing.street,
      apartment: "NA",
      floor: "NA",
      building: "NA",
    },
    special_reference: args.orderNumber,
    extras: { order_number: args.orderNumber },
  };

  const res = await fetch(INTENTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Token ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paymob intention failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as { client_secret?: string };
  if (!json.client_secret) {
    throw new Error("Paymob intention response missing client_secret");
  }

  return { clientSecret: json.client_secret, publicKey };
}

/**
 * Verifies the HMAC of a Paymob transaction webhook.
 * Paymob concatenates a specific ordered set of fields, HMAC-SHA512 with the
 * merchant HMAC secret, and sends the result as the `hmac` query param.
 */
export function verifyWebhookHmac(obj: Record<string, unknown>, receivedHmac: string): boolean {
  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) return false;

  // Ordered keys Paymob uses for the transaction.processed callback
  const orderedKeys = [
    "amount_cents",
    "created_at",
    "currency",
    "error_occured",
    "has_parent_transaction",
    "id",
    "integration_id",
    "is_3d_secure",
    "is_auth",
    "is_capture",
    "is_refunded",
    "is_standalone_payment",
    "is_voided",
    "order.id",
    "owner",
    "pending",
    "source_data.pan",
    "source_data.sub_type",
    "source_data.type",
    "success",
  ];

  const concatenated = orderedKeys
    .map((key) => {
      // Support dotted keys (order.id, source_data.pan, etc.)
      const parts = key.split(".");
      let val: unknown = obj;
      for (const p of parts) {
        val = val && typeof val === "object" ? (val as Record<string, unknown>)[p] : undefined;
      }
      return val === undefined || val === null ? "" : String(val);
    })
    .join("");

  const computed = crypto.createHmac("sha512", hmacSecret).update(concatenated).digest("hex");
  return computed === receivedHmac;
}
