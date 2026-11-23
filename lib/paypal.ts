interface PayPalLink {
  href: string;
  rel: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalLink[];
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount: { value: string; currency_code: string };
}

interface PayPalCaptureResponse extends PayPalOrderResponse {
  purchase_units?: Array<{
    payments?: {
      captures?: PayPalCapture[];
    };
  }>;
}

function getPayPalBaseUrl() {
  return process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`PayPal authentication failed (${response.status}).`);
  }
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function paypalRequest<T>(
  path: string,
  method: string,
  body?: unknown,
  requestId?: string,
): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`PayPal request failed (${response.status}): ${errorText}`);
    throw new Error(`PayPal request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

export async function createPayPalOrder(input: {
  localOrderId: string;
  currency: string;
  totalCents: number;
  deliveryEmail: string;
}) {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("Missing APP_URL environment variable.");

  return paypalRequest<PayPalOrderResponse>("/v2/checkout/orders", "POST", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: input.localOrderId,
        custom_id: input.localOrderId,
        invoice_id: input.localOrderId,
        amount: {
          currency_code: input.currency,
          value: (input.totalCents / 100).toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "E-book Store",
      user_action: "PAY_NOW",
      return_url: `${appUrl}/checkout?payment=success`,
      cancel_url: `${appUrl}/checkout?payment=cancelled`,
    },
  });
}

export function getPayPalApprovalUrl(order: PayPalOrderResponse) {
  const approvalUrl = order.links.find((link) => link.rel === "approve")?.href;
  if (!approvalUrl) return undefined;
  try {
    const url = new URL(approvalUrl);
    const expectedHost = process.env.PAYPAL_ENV === "production"
      ? "www.paypal.com"
      : "www.sandbox.paypal.com";
    return url.protocol === "https:" && url.hostname === expectedHost ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function capturePayPalOrder(paypalOrderId: string) {
  return paypalRequest<PayPalCaptureResponse>(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    "POST",
    {},
    `capture-${paypalOrderId}`,
  );
}

export function getCompletedCapture(order: PayPalCaptureResponse) {
  return order.purchase_units
    ?.flatMap((unit) => unit.payments?.captures ?? [])
    .find((capture) => capture.status === "COMPLETED");
}

export function captureMatchesOrder(capture: PayPalCapture, totalCents: number, currency: string) {
  return capture.amount.currency_code === currency && capture.amount.value === (totalCents / 100).toFixed(2);
}
