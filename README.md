# Hearth

A standard shop built for the [WebMCP Challenge](https://webmcp.devpost.com/). People browse, search, and check out as usual. Agents use the same live page through tools instead of guessing at buttons.

The agent **proposes**. You **approve**. Then someone **reviews** the order before it can be placed.

## Why WebMCP

Shopping is the textbook case. An agent that clicks tiles is slow and wrong. Hearth declares `recommend_gift`, `compare_products`, `prepare_order`, and `place_order`. The person still sees the proposal, still undoes cart changes, and still confirms the purchase.

## License

This project is released under the **MIT License**. See [LICENSE](LICENSE).

## Run

Docker maps the shop to port **5176**.

```bash
cd ~/hearth
docker compose up --build
```

Open http://localhost:5176

Or serve the folder with any static server.

## How to test WebMCP

Site tools only appear in the **ChatGPT desktop** built-in browser.

1. Use **ChatGPT desktop**, model **GPT-5.6 Sol or Terra** (not Luna).
2. Open the shop as the **only URL**: `http://localhost:5176`
3. Wait until the address bar shows **Site tools**.
4. Click **Reset demo session** for an empty cart and empty activity, then follow the judged path below.

`place_order` requires a prior `prepare_order` (or the person clicking **Review order**) **and** `confirm: true`. No real payment is taken.

## Privacy

Account and vault tools return `profileStatus` only for example “saved shipping profile available”. They never return street, city, postcode, phone, or likes. The checkout form on the page may still fill those fields for the human.

**Reset demo session** clears cart, promo, activity, proposal, undo, and prepared/review state. It keeps the signed-in account and does not wipe the customer vault.

## Public URL

There is **no public HTTPS demo URL** in this repo. Judges who need a reachable site should deploy the static files or the Docker image to any HTTPS host.

### Deploy

This is a static site (HTML, CSS, JS, images). Host it on **Cloudflare Pages**, Netlify, GitHub Pages, or any static host, then open the **HTTPS** URL as the only address in ChatGPT desktop so Site tools can attach.

Local Docker remains `http://localhost:5176`.

## Demo video (under 3 minutes)

Film this exact judged path — not a tool-call listing. Use **ChatGPT desktop**, **GPT-5.6 Sol or Terra**, and `http://localhost:5176` as the only URL. Wait for **Site tools** in the address bar.

1. **Reset demo session** — click the control in the header or the shared-decision rail. Show an empty cart and an empty activity timeline.
2. Agent calls `recommend_gift` (occasion: host gift for a cook). The proposal appears: serving bowl vs mug, with trade-offs. The cart stays empty. Timeline: “Agent proposed.”
3. **Human clicks Approve** on the page (not the agent auto-approving). The bowl is added. Timeline: “You approved.” Approving the bowl also applies promo HEARTH10 — that is part of the pick, not a separate step.
4. Agent calls `explain_cart` — show the on-page bag and the tool’s reasons, promo, total, and next step (prepare).
5. Agent calls `prepare_order` — the review/confirmation summary appears; Place stays gated until a confirmed place.
6. Agent calls `place_order` with `confirm: false` — **blocked**. Show the refusal.
7. Agent calls `place_order` with `confirm: true` — order placed. Thanks / confirmation.

Demo shop — nothing is charged.
