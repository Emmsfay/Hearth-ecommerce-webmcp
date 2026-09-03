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
    tool("get_shop_state", "See the current page, cart, whether someone is signed in, proposal, and last order. When signed out, account is only signedIn:false. Profile status is included only after sign-in. Never lists other customers.", emptySchema(), () => shop.getShopState(), { readOnly: true, idempotent: true }),
    tool("open_page", "Open a site page: home, shop, about, login, signup, or checkout.", {
      type: "object",
      properties: { page: { type: "string", enum: ["home", "shop", "about", "login", "signup", "checkout"] } },
      required: ["page"],
    }, ({ page }) => shop.openPage(page)),
    tool("get_account", "See whether the person is signed in. When signed out, returns only signedIn:false. When signed in, returns profileStatus — never street, city, postcode, phone, or likes.", emptySchema(), () => shop.getAccount(), { readOnly: true, idempotent: true }),
    tool("get_saved_customer", "See profile status for the signed-in account only. When signed out, returns only signedIn:false. Never lists other customers.", {
      type: "object",
      properties: { email: { type: "string", description: "Ignored unless it matches the signed-in account." } },
    }, ({ email }) => shop.getSavedCustomer(email), { readOnly: true, idempotent: true }),
    tool("use_saved_customer", "Sign in as a vault customer without returning the password. Street and phone stay in the vault. Requires the email the person provides. Prefer this over sign_in.", {
      type: "object",
      properties: { email: { type: "string" } },
      required: ["email"],
    }, ({ email }) => shop.useSavedCustomer(email, "agent")),
    tool("apply_saved_profile", "Mark the saved shipping profile for use at place time. Does not write street or phone onto the page. Returns profileStatus only.", {
      type: "object",
      properties: { email: { type: "string" } },
    }, ({ email }) => shop.applySavedProfile(email, "agent")),
    tool("save_customer_profile", "Save name, shipping, likes, and promo in the customer vault. Password and address are stored in the vault only and are never returned. Tool output is profileStatus.", {
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
    tool("sign_in", "Sign in on this browser with credentials the person provides. Prefer use_saved_customer so the agent never holds a password.", {
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
    tool("recommend_gift", "Propose 2–3 gift options with trade-offs and set a proposal card. Read-only: do not add to cart, do not apply promo, do not call approve_proposal / add_to_cart / apply_promo until the human has actually approved on the page or in chat. STOP and wait.", {
      type: "object",
      properties: {
        occasion: { type: "string", description: "e.g. host gift, birthday, kitchen" },
        budget: { type: "number", description: "Maximum price in GBP" },
        recipient: { type: "string", description: "Who it is for, e.g. a cook" },
      },
    }, (input) => shop.recommendGift(input, "agent"), { readOnly: true, idempotent: true }),
    tool("compare_products", "Side-by-side trade-offs for two or more products: price, use, delivery/weight, who it is for.", {
      type: "object",
      properties: {
        ids: { description: "Product ids such as bowl, mug", anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }] },
        names: { description: "Product names", anyOf: [{ type: "array", items: { type: "string" } }, { type: "string" }] },
      },
    }, (input) => shop.compareProducts(input), { readOnly: true, idempotent: true }),
    tool("explain_cart", "Human-readable why each line is in the bag, totals, promo, and what is missing before checkout.", emptySchema(), () => shop.explainCart(), { readOnly: true, idempotent: true }),
    tool("prepare_order", "Build a confirmation summary and mark the order prepared. Does not submit. Required before place_order.", emptySchema(), () => shop.prepareOrder("agent")),
    tool("approve_proposal", "Apply a proposal option as the agent. Logs as Agent approved — never You. Prefer the on-page Approve / Choose buttons for a human You approved action. Do not call this from recommend_gift.", {
      type: "object",
      properties: { optionId: { type: "string", description: "Option id. Defaults to the agent’s pick." } },
    }, ({ optionId }) => shop.approveProposal(optionId)),
    tool("undo_last", "Undo the last cart mutation (add, remove, qty, promo) from the shared snapshot stack.", emptySchema(), () => shop.undoLastAction("agent")),
    tool("start_checkout", "Open checkout. Needs items in the bag and a signed-in account. Does not write or return the saved address. Ask the person to click Use saved details.", emptySchema(), () => shop.startCheckout("agent")),
    tool("fill_checkout", "Update name, email, or promo on checkout. Street, city, and postcode arguments are ignored so they stay off the page. Output never includes street or phone.", {
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
    tool("place_order", "Place a demo order. Requires a prior prepare_order (or the person clicking Review order) AND confirm=true. No real payment is taken.", {
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
    tool("run_gift_demo", "Sign Ada in from the vault (no password returned) and set a bowl-vs-mug proposal. Does not add to the cart or open checkout. Wait for human approval, then prepare_order, then place_order with confirm=true.", emptySchema(), () => shop.runGiftDemo()),
    tool("get_customer_memory", "Read voice-session notes plus profileStatus for the signed-in vault. Never returns street, phone, or likes from the vault.", emptySchema(), () => getVoiceMemory(), { readOnly: true, idempotent: true }),
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
