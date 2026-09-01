import * as shop from "./app.js";
import { getVoiceMemory, rememberVoiceNote } from "./voice.js";

function asResult(value) {
  if (value && typeof value === "object" && "success" in value) return value;
  if (value && typeof value === "object") {
    return { success: true, message: value.message || "ok", new_state: value };
  }
  return { success: true, message: String(value), new_state: shop.getShopState() };
}

function tool(name, description, inputSchema, run, hints = {}) {
  return {
    name,
    description,
    inputSchema,
    annotations: {
      readOnlyHint: Boolean(hints.readOnly),
      destructiveHint: Boolean(hints.destructive),
      idempotentHint: Boolean(hints.idempotent),
    },
    execute: async (input) => {
      try {
        return asResult(await run(input || {}));
      } catch (error) {
        return { success: false, error: String(error.message || error) };
      }
    },
  };
}

function emptySchema() {
  return { type: "object", properties: {}, additionalProperties: false };
}

export async function registerWebMcp(onStatus) {
  const tools = [
    tool("get_page_title", "Read the title of the current page.", emptySchema(), () => ({
      title: document.title,
      href: location.href,
    }), { readOnly: true, idempotent: true }),
    tool("get_shop_state", "See the current page, cart, signed-in account, saved customer profile, and last order. Call this first. If a saved profile exists, do not ask the person to retype name, email, or address.", emptySchema(), () => shop.getShopState(), { readOnly: true, idempotent: true }),
    tool("open_page", "Open a site page: home, shop, about, login, signup, or checkout.", {
      type: "object",
      properties: { page: { type: "string", enum: ["home", "shop", "about", "login", "signup", "checkout"] } },
      required: ["page"],
    }, ({ page }) => shop.openPage(page)),
    tool("get_account", "See whether the person is signed in, plus their saved vault profile (name, shipping, likes). Prefer this over asking them to type details.", emptySchema(), () => shop.getAccount(), { readOnly: true, idempotent: true }),
    tool("get_saved_customer", "Pull permanently saved customer data from the browser vault: name, shipping address, likes, promo, and recent orders. Never returns a password. Pass email, or omit it to use the signed-in account.", {
      type: "object",
      properties: { email: { type: "string", description: "Customer email. Optional if someone is already signed in." } },
    }, ({ email }) => shop.getSavedCustomer(email), { readOnly: true, idempotent: true }),
    tool("use_saved_customer", "Infisical-style agent proxy: sign in as a vault customer and apply their saved checkout details. The password stays in the vault and is never returned to the agent. Prefer this over sign_in. Demo emails: ada@hearth.shop, emmaxzchukwudi12@gmail.com.", {
      type: "object",
      properties: { email: { type: "string" } },
      required: ["email"],
    }, ({ email }) => shop.useSavedCustomer(email, "agent")),
    tool("apply_saved_profile", "Fill checkout from the vault so the customer does not retype name or address. Uses the signed-in account unless email is passed.", {
      type: "object",
      properties: { email: { type: "string" } },
    }, ({ email }) => shop.applySavedProfile(email, "agent")),
    tool("save_customer_profile", "Permanently save name, shipping, likes, and promo in the customer vault for later agent use. Password is stored in the vault only and is never returned.", {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        password: { type: "string", description: "Optional. Stored in the vault, never returned." },
        address: { type: "string" },
        city: { type: "string" },
        postcode: { type: "string" },
        phone: { type: "string" },
        promo: { type: "string" },
        category: { type: "string" },
        likes: { type: "array", items: { type: "string" } },
      },
    }, (fields) => shop.saveCustomerProfile(fields)),
    tool("sign_in", "Sign in on this browser. Prefer use_saved_customer so the agent never holds a password. Demo: ada@hearth.shop / hearth.", {
      type: "object",
      properties: { email: { type: "string" }, password: { type: "string" } },
      required: ["email", "password"],
    }, (fields) => shop.signIn(fields, "agent")),
    tool("sign_up", "Create a demo account stored only in this browser, then sign in.", {
      type: "object",
      properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } },
      required: ["name", "email", "password"],
    }, (fields) => shop.signUp(fields, "agent")),
    tool("sign_out", "Sign out of the demo account on this page.", emptySchema(), () => shop.signOut("agent")),
    tool("list_products", "List every product in the Hearth catalog with id, price, and category.", emptySchema(), () => shop.listProducts(), { readOnly: true, idempotent: true }),
    tool("search_products", "Search the shop by words such as mug, skillet, linen, gift, or wool.", {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    }, ({ query }) => shop.searchProducts(query, "agent")),
    tool("filter_results", "Filter the catalog by category (all, kitchen, table, care) and optional max price in pounds.", {
      type: "object",
      properties: {
        category: { type: "string", enum: ["all", "kitchen", "table", "care"] },
        maxPrice: { type: "number", description: "Maximum price in GBP. 0 means any." },
      },
    }, (input) => shop.filterProducts(input, "agent")),
    tool("open_product", "Open a product page by id: mug, napkins, skillet, board, bowl, candles, soap, throw.", {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    }, ({ id }) => shop.openProduct(id, "agent")),
    tool("add_to_cart", "Add a product to the bag by id. The bag opens so the person can see it.", {
      type: "object",
      properties: { id: { type: "string" }, qty: { type: "number", minimum: 1 } },
      required: ["id"],
    }, ({ id, qty = 1 }) => shop.addToCart(id, qty, "agent")),
    tool("update_cart", "Set quantity for a product in the bag. Use qty 0 to remove it.", {
      type: "object",
      properties: { id: { type: "string" }, qty: { type: "number" } },
      required: ["id", "qty"],
    }, ({ id, qty }) => shop.updateCart(id, qty, "agent")),
    tool("get_cart", "Return the current bag, promo, and totals.", emptySchema(), () => shop.getCart(), { readOnly: true, idempotent: true }),
    tool("apply_promo", "Apply a promo code. HEARTH10 is 10% off.", {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    }, ({ code }) => shop.applyPromo(code, "agent")),
    tool("start_checkout", "Open checkout. Applies the saved vault profile automatically. Needs items in the bag and a signed-in account (use_saved_customer if not signed in).", emptySchema(), () => shop.startCheckout("agent")),
    tool("fill_checkout", "Fill shipping fields. If you omit address, the vault profile is applied first. Prefer apply_saved_profile instead of asking the customer to dictate an address.", {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        postcode: { type: "string" },
        promo: { type: "string" },
      },
    }, (fields) => shop.fillCheckout(fields, "agent")),
    tool("place_order", "Place a demo order. Must set confirm=true after the person agrees. No real payment is taken.", {
      type: "object",
      properties: {
        confirm: { type: "boolean" },
        name: { type: "string" },
        email: { type: "string" },
        address: { type: "string" },
        city: { type: "string" },
        postcode: { type: "string" },
      },
      required: ["confirm"],
    }, ({ confirm, ...fields }) => shop.placeOrder(fields, confirm, "agent"), { destructive: true }),
    tool("run_gift_demo", "Sign Ada in from the vault (no password returned), add the £32 serving bowl, apply HEARTH10 (£28.80), and open checkout with her saved London address. Does not place the order.", emptySchema(), () => shop.runGiftDemo()),
    tool("get_customer_memory", "Read voice-session notes plus the signed-in vault profile. Prefer get_saved_customer for permanent name and address.", emptySchema(), () => getVoiceMemory(), { readOnly: true, idempotent: true }),
    tool("remember_customer_note", "Store a short note about the customer in this browser's voice memory.", {
      type: "object",
      properties: { note: { type: "string" } },
      required: ["note"],
    }, ({ note }) => rememberVoiceNote(note)),
  ];

  const boot = window.__hearthMcp;
  let registered = false;
  let registering = false;

  const tryRegister = async () => {
    if (registered || registering) return registered;
    const registrars = boot?.grab?.() || [];
    if (!registrars.length) {
      onStatus("missing", tools.length, boot?.probe?.());
      return false;
    }
    registering = true;
    try {
      for (const modelContext of registrars) {
        if (boot?.publish) {
          await boot.publish(modelContext, tools);
          continue;
        }
        if (typeof modelContext.provideContext === "function") {
          try {
            await Promise.resolve(modelContext.provideContext({ tools })).catch(() => {});
          } catch {
            /* host may already have this catalog */
          }
          continue;
        }
        for (const definition of tools) {
          try {
            const result = modelContext.registerTool(definition);
            if (result && typeof result.then === "function") await result.catch(() => {});
          } catch {
            /* duplicate or host-side InvalidStateError — tools still work */
          }
        }
      }
      registered = true;
      onStatus("ready", tools.length, boot?.probe?.());
      return true;
    } finally {
      registering = false;
    }
  };

  const start = () => {
    void tryRegister();
    setInterval(() => {
      if (!registered) void tryRegister();
    }, 400);
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start);
  document.addEventListener("hearth-mcp-ready", () => {
    if (!registered) void tryRegister();
  });
}
