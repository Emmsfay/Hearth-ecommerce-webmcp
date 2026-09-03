# Hearth

A simple home-goods shop built for the [WebMCP Challenge](https://webmcp.devpost.com/). 
A person and ChatGPT shop on the **same live page**, the person clicks as usual, the agent uses **site tools** and it does not scrape buttons.

The collaboration rule is fixed:

1. The agent **proposes**.
2. User(you) **approves**.
3. Someone **reviews** the order.
4. Only then can it be **placed**, and only with `confirm: true`.

**Live demo:** https://hearth-ecommerce-webmcp.netlify.app/

**License:** [MIT](LICENSE)

---

## What this is

Hearth is a WebMCP host and a static storefront: eight products (mug, napkins, skillet, board, bowl, candles, soap, throw), promo **HEARTH10** (10% off), a shared cart, and a checkout that never takes real payment.

When the page is opened as the **only URL** in ChatGPT desktop (model **GPT-5.6 Sol or Terra**, not Luna), the address bar shows **Site tools**. Those tools read and write the same DOM, cart, and session the human sees.

Human–agent work is visible:

- A **proposal card** with trade-offs (for example serving bowl vs mug: cheaper, better for a cook, delivery impact).
- An **activity timeline** (“Agent proposed”, “You approved”, “You invalidated”).
- **Undo**, which restores the last cart snapshot and leaves checkout if the bag is empty.
- **Reset demo session**, so a user starts from an empty cart and empty log.

`recommend_gift` is proposal-only. It does not add to the cart or apply a promo. **You approved** is written only after a trusted click on the page.

---

## How it works

```
ChatGPT desktop ── Site tools ──► webmcp.js ──► app.js (shop state)
                                      │
You (clicks / voice) ──────────────► app.js
                                      │
                                      ├── collab.js   (proposals, timeline, undo)
                                      ├── vault.js    (shipping profile, never in tool JSON)
                                      ├── auth.js     (session in this browser)
                                      └── products.js (catalog)
```

1. `mcp-boot.js` looks for `document.modelContext` or `navigator.modelContext` as early as possible.
2. `main.js` binds the UI, collaboration rail, and voice panel, then calls `registerWebMcp`.
3. Each tool runs a function in `app.js`. Mutating tools pass `who: "agent"` so the timeline can tell **You** from **Agent**.
4. Checkout is split: `prepare_order` (or **Review order**) unlocks place; `place_order` without `confirm: true` is refused.

There is no backend. Auth, vault, and voice notes live in `localStorage` in this browser only.

---

## File structure

```
hearth/
├── index.html                 # All routes (hash): home, shop, product, about, login, signup, checkout
├── favicon.svg
├── src/
│   ├── mcp-boot.js            # Early WebMCP probe; must load before the app modules
│   ├── main.js                # Boot: bind UI, collab, voice, register tools
│   ├── app.js                 # Shop state, routing, cart, checkout, gift/compare/prepare
│   ├── webmcp.js              # Tool schemas + execute wrappers
│   ├── collab.js              # Proposal card, activity log, undo snapshots
│   ├── products.js            # Catalog, prices, categories
│   ├── auth.js                # Sign in / up / out (localStorage)
│   ├── vault.js               # Customer vault; tools get profileStatus only
│   ├── voice.js               # Voice / type-to-order panel
│   ├── memory.js              # Voice-session notes (hearth-voice-memory)
│   └── styles.css
├── public/products/           # Product photos
├── Dockerfile                 # nginx:1.27-alpine static host
├── docker-compose.yml         # localhost:5176 → container :80
├── nginx.conf
├── serve.py                   # Optional local static fallback
├── scripts/                   # Image copy / compress helpers
├── .github/workflows/security.yml
├── .checkov.yaml
├── sonar-project.properties
├── LICENSE
└── README.md
```

### Pages and chrome — `index.html`

Single HTML file. Hash routes (`#/`, `#/shop`, `#/product/bowl`, `#/about`, `#/login`, `#/signup`, `#/checkout`, `#/thanks`). Includes the header, catalog, checkout form, cart drawer, **shared-decision rail**, and the floating Voice panel.

### Boot and tools

| File | Role |
| --- | --- |
| `src/mcp-boot.js` | Classic script. Finds the model-context API, records a probe, avoids duplicate registration. |
| `src/main.js` | ES module entry. Wires `bindUi`, `bindCollab`, `bindVoice`, `registerWebMcp`. |
| `src/webmcp.js` | Declares every site tool (name, JSON schema, read-only / destructive hints) and calls into `app.js`. |

### Shop logic

| File | Role |
| --- | --- |
| `src/app.js` | Cart, search, filters, checkout, `recommendGift`, `compareProducts`, `explainCart`, `prepareOrder`, `placeOrder`, reset demo, privacy-safe account helpers. |
| `src/collab.js` | `setProposal`, activity events, undo stack, trusted-click gating for “You approved”. |
| `src/products.js` | Eight SKUs, `money()`, `findProduct()`. |

### Identity and privacy

| File | Role |
| --- | --- |
| `src/auth.js` | Session key `hearth-session`. Demo users exist for the login **page**, not for unsigned tool output. |
| `src/vault.js` | Key `hearth-customer-vault`. Street, phone, and likes stay here. Tools receive `profileStatus` such as “saved shipping profile available”. |

When **signed out**, `get_account` / `get_shop_state` / `get_saved_customer` return only `{ signedIn: false }` plus a generic hint. They do not list other customers’ emails.

Saved address is not written into checkout inputs until the person clicks **Use saved details** or **Show saved address**.

### Voice (optional)

| File | Role |
| --- | --- |
| `src/voice.js` | One Voice control (bottom-right). Speak or type an order. |
| `src/memory.js` | Short notes for that session. Tools never get vault street/phone/likes from here. |

### Hosting and CI

| File | Role |
| --- | --- |
| `Dockerfile` + `nginx.conf` | Serve the static tree on port 80. |
| `docker-compose.yml` | Publish **5176:80** with live mounts for `index.html`, `src/`, `public/`. |
| `serve.py` | Threaded HTTP fallback if you are not using Docker. |
| `.github/workflows/security.yml` | Gitleaks, CodeQL, Semgrep, Checkov (`dockerfile`, `yaml`, `secrets`), Trivy, optional Sonar. |

---

## Site tools

Higher-value tools first — these are the collaboration story:

| Tool | What it does |
| --- | --- |
| `recommend_gift` | Sets a proposal card. Does **not** add or apply promo. Wait for a human click. |
| `compare_products` | Price, use, delivery/weight, who it is for. |
| `explain_cart` | Why each line is there, totals, promo, what is missing. |
| `prepare_order` | Review summary. Does not submit. Required before place. |
| `approve_proposal` | Agent-side apply. Logged as **Agent approved**, never **You**. |
| `undo_last` | Restore the last cart snapshot; invalidate preparation if needed. |
| `place_order` | Needs prepare **and** `confirm: true`. Demo only. |

Also registered: page/state (`get_page_title`, `get_shop_state`, `open_page`), account (`get_account`, `get_saved_customer`, `use_saved_customer`, `apply_saved_profile`, `sign_in` / `sign_up` / `sign_out`), catalog (`list_products`, `search_products`, `filter_results`, `open_product`), cart (`add_to_cart`, `update_cart`, `get_cart`, `apply_promo`), checkout (`start_checkout`, `fill_checkout`), plus `run_gift_demo` and voice-memory helpers.

---

## Run locally

Docker maps the shop to port **5176**.

```bash
cd ~/hearth
docker compose up --build
```

Open http://localhost:5176

Or serve the folder with any static server (`python3 serve.py`, nginx, Netlify CLI).

### Deploy

This is static HTML, CSS, JS, and images. The public host is **Netlify**:

https://hearth-ecommerce-webmcp.netlify.app/

No build command. Publish the repo root. No functions directory.

---

## How to test WebMCP

1. **ChatGPT desktop**, model **GPT-5.6 Sol or Terra** (not Luna).
2. Open **only** https://hearth-ecommerce-webmcp.netlify.app/ (or `http://localhost:5176` locally).
3. Wait until the address bar shows **Site tools**.
4. Click **Reset demo session**.
5. Walk the path below.

`place_order` without `confirm: true` must fail. No real payment is taken.

Demo login on the **page** (not via unsigned tool lists): `ada@hearth.shop` / `hearth`.

---

## Privacy (tools vs page)

| Surface | What it may see |
| --- | --- |
| Tool JSON while signed out | `{ signedIn: false }` and a generic hint only |
| Tool JSON while signed in | `profileStatus` (first name, email, flags). Never street, phone, likes |
| Checkout page | Address only after **Use saved details** or **Show saved address** |
| Reset demo session | Clears cart, promo, activity, proposal, undo, prepared state. Keeps the account and vault |

---
