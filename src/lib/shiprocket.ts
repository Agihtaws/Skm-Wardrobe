const SR_BASE = "https://apiv2.shiprocket.in/v1/external";

// ── Your store details ────────────────────────────────────────────────────────
const STORE_PHONE   = "6383399316";
const STORE_NAME    = "SKM Wardrobe";
const STORE_ADDRESS = "10/8BIB, Royal Nagar, Keezhakorkai";
const STORE_CITY    = "Kumbakonam";
const STORE_STATE   = "Tamil Nadu";
const STORE_PINCODE = "612401";
const STORE_COUNTRY = "India";

// ── Token cache ───────────────────────────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry: number        = 0;

export async function getSRToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res  = await fetch(`${SR_BASE}/auth/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      email:    process.env.SHIPROCKET_EMAIL!,
      password: process.env.SHIPROCKET_PASSWORD!,
    }),
  });

  const json = await res.json();
  if (!json.token) throw new Error("Shiprocket login failed");

  cachedToken = json.token;
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // 23 hours
  return cachedToken!;
}

export async function srFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getSRToken();
  const res   = await fetch(`${SR_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  return res.json();
}

// ── Create forward shipment ───────────────────────────────────────────────────
export async function createShiprocketOrder(params: {
  order_id:       string;
  order_date:     string;
  customer_name:  string;
  customer_phone: string;
  address:        string;
  city:           string;
  state:          string;
  pincode:        string;
  total:          number;
  payment_method: "prepaid" | "cod";
  items: { name: string; qty: number; price: number; sku: string }[];
}) {
  return srFetch("/orders/create/adhoc", {
    method: "POST",
    body:   JSON.stringify({
      order_id:               params.order_id,
      order_date:             params.order_date,
      pickup_location:        "Primary",
      channel_id:             process.env.SHIPROCKET_CHANNEL_ID,
      billing_customer_name:  params.customer_name,
      billing_last_name:      "",
      billing_address:        params.address,
      billing_city:           params.city,
      billing_pincode:        params.pincode,
      billing_state:          params.state,
      billing_country:        "India",
      billing_email:          "customer@skmwardrobe.in",
      billing_phone:          params.customer_phone,
      shipping_is_billing:    true,
      order_items:            params.items.map((i) => ({
        name:          i.name,
        sku:           i.sku,
        units:         i.qty,
        selling_price: i.price,
      })),
      payment_method: params.payment_method === "cod" ? "COD" : "Prepaid",
      sub_total:      params.total,
      length:         30,
      breadth:        25,
      height:         5,
      weight:         0.5,
    }),
  });
}

// ── Get shipping label PDF URL ────────────────────────────────────────────────
export async function getLabelURL(shipment_id: string) {
  return srFetch("/courier/generate/label", {
    method: "POST",
    body:   JSON.stringify({ shipment_id: [shipment_id] }),
  });
}

// ── Get invoice PDF URL ───────────────────────────────────────────────────────
export async function getInvoiceURL(order_ids: string[]) {
  return srFetch("/orders/print/invoice", {
    method: "POST",
    body:   JSON.stringify({ ids: order_ids }),
  });
}

// ── Get available couriers for a pincode ─────────────────────────────────────
export async function getAvailableCouriers(params: {
  pincode:     string;
  cod:         boolean;
  weight:      number;
  order_id:    string;
  shipment_id: string;
}) {
  return srFetch(
    `/courier/serviceability/?pickup_postcode=${STORE_PINCODE}&delivery_postcode=${params.pincode}&cod=${params.cod ? 1 : 0}&weight=${params.weight}&order_id=${params.order_id}&shipment_id=${params.shipment_id}`
  );
}

// ── Assign courier ────────────────────────────────────────────────────────────
export async function assignCourier(shipment_id: string, courier_id: number) {
  return srFetch("/courier/assign/awb", {
    method: "POST",
    body:   JSON.stringify({ shipment_id, courier_id }),
  });
}

// ── Generate pickup ───────────────────────────────────────────────────────────
export async function generatePickup(shipment_ids: string[]) {
  return srFetch("/courier/generate/pickup", {
    method: "POST",
    body:   JSON.stringify({ shipment_id: shipment_ids }),
  });
}

// ── Track shipment ────────────────────────────────────────────────────────────
export async function trackShipment(awb: string) {
  return srFetch(`/courier/track/awb/${awb}`);
}

// ── Cancel shipment ───────────────────────────────────────────────────────────
export async function cancelShipment(awbs: string[]) {
  return srFetch("/orders/cancel/shipment/awbs", {
    method: "POST",
    body:   JSON.stringify({ awbs }),
  });
}

// ── Create return / reverse pickup ───────────────────────────────────────────
export async function createReturn(params: {
  order_id:         string;
  channel_order_id: string;
  customer_name:    string;
  customer_phone:   string;
  address:          string;
  city:             string;
  state:            string;
  pincode:          string;
  items: { name: string; sku: string; qty: number; price: number }[];
}) {
  return srFetch("/orders/create/return", {
    method: "POST",
    body:   JSON.stringify({
      order_id:               params.order_id,
      channel_order_id:       params.channel_order_id,

      // Pickup from customer
      pickup_customer_name:   params.customer_name,
      pickup_phone:           params.customer_phone,
      pickup_address:         params.address,
      pickup_city:            params.city,
      pickup_state:           params.state,
      pickup_country:         STORE_COUNTRY,
      pickup_pincode:         params.pincode,

      // Return to your store
      shipping_customer_name: STORE_NAME,
      shipping_phone:         STORE_PHONE,
      shipping_address:       STORE_ADDRESS,
      shipping_city:          STORE_CITY,
      shipping_state:         STORE_STATE,
      shipping_country:       STORE_COUNTRY,
      shipping_pincode:       STORE_PINCODE,

      payment_method: "Prepaid",
      sub_total:      params.items.reduce((s, i) => s + i.price * i.qty, 0),
      order_items:    params.items.map((i) => ({
        name:          i.name,
        sku:           i.sku,
        units:         i.qty,
        selling_price: i.price,
      })),
    }),
  });
}