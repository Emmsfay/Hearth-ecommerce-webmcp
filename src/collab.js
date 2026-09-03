const MAX = 30;
const PROPOSAL_ARM_MS = 700;

const store = {
  events: [],
  undo: [],
  proposal: null,
};

const handlers = {
  onUndo: null,
  onApprove: null,
  onChoose: null,
};

let proposalArmedAt = 0;

function isTrustedProposalClick(event) {
  if (!event?.isTrusted) return false;
  if (Date.now() - proposalArmedAt < PROPOSAL_ARM_MS) return false;
  return true;
}

export function bindCollab(hooks = {}) {
  handlers.onUndo = hooks.onUndo || null;
  handlers.onApprove = hooks.onApprove || null;
  handlers.onChoose = hooks.onChoose || null;
  document.querySelector("#btn-undo")?.addEventListener("click", () => {
    const result = undoLast("you");
    if (result.ok) handlers.onUndo?.(result);
  });
  document.querySelector("#proposal-card")?.addEventListener("click", (event) => {
    if (!isTrustedProposalClick(event)) return;
    const approve = event.target.closest("[data-approve]");
    const choose = event.target.closest("[data-choose]");
    const reject = event.target.closest("[data-reject]");
    if (approve) handlers.onApprove?.(store.proposal, event);
    if (choose) handlers.onChoose?.(choose.dataset.choose, event);
    if (reject) {
      logEvent({ who: "you", verb: "rejected", detail: "Declined the agent’s proposal." });
      store.proposal = null;
      renderCollab();
    }
  });
  renderCollab();
}

export function snapshotCart(cart, promo) {
  return {
    cart: cart.map((line) => ({ id: line.id, qty: line.qty })),
    promo: promo || "",
  };
}

export function logEvent({ who, verb, detail, snapshot = null, fromProposal = false }) {
  const event = {
    id: `ev-${Date.now()}-${store.events.length}`,
    who: who === "agent" ? "agent" : "you",
    verb,
    detail,
    at: new Date().toISOString(),
  };
  store.events.push(event);
  if (store.events.length > MAX) store.events = store.events.slice(-MAX);
  if (snapshot) {
    store.undo.push({
      snapshot,
      label: `${who === "agent" ? "Agent" : "You"} ${verb}`,
      fromProposal: Boolean(fromProposal) || verb === "approved",
      retractEventId: fromProposal || verb === "approved" ? event.id : null,
    });
  }
  if (store.undo.length > 12) store.undo = store.undo.slice(-12);
  renderCollab();
  return event;
}

export function getActivity() {
  return store.events.slice(-16);
}

export function setProposal(proposal) {
  store.proposal = proposal;
  proposalArmedAt = Date.now();
  renderCollab();
  return proposal;
}

export function getProposal() {
  return store.proposal;
}

export function clearProposal() {
  store.proposal = null;
  renderCollab();
}

export function resetCollab() {
  store.events = [];
  store.undo = [];
  store.proposal = null;
  proposalArmedAt = 0;
  renderCollab();
}

export function hasEventVerb(verb) {
  return store.events.some((event) => event.verb === verb);
}

export function retractEventsByVerb(verb) {
  store.events = store.events.filter((event) => event.verb !== verb);
  renderCollab();
}

function retractApprovedEvent(row) {
  if (row.retractEventId) {
    store.events = store.events.filter((event) => event.id !== row.retractEventId);
    return;
  }
  if (!row.fromProposal) return;
  for (let i = store.events.length - 1; i >= 0; i -= 1) {
    if (store.events[i].verb === "approved") {
      store.events.splice(i, 1);
      return;
    }
  }
}

export function undoLast(who = "you") {
  const row = store.undo.pop();
  if (!row) return { ok: false, message: "Nothing to undo." };
  retractApprovedEvent(row);
  logEvent({ who, verb: "undid", detail: `Reverted: ${row.label}.` });
  renderCollab();
  return { ok: true, snapshot: row.snapshot, label: row.label };
}

function whoLabel(who) {
  return who === "agent" ? "Agent" : "You";
}

export function renderCollab() {
  const list = document.querySelector("#activity-log");
  const undo = document.querySelector("#btn-undo");
  const card = document.querySelector("#proposal-card");
  if (undo) undo.hidden = store.undo.length === 0;
  if (list) {
    list.replaceChildren();
    const rows = store.events.slice(-10).reverse();
    if (!rows.length) {
      const empty = document.createElement("li");
      empty.className = "activity-empty";
      empty.textContent = "Nothing yet.";
      list.append(empty);
    }
    for (const event of rows) {
      const li = document.createElement("li");
      li.className = `activity-item is-${event.who}`;
      li.innerHTML = `<span class="activity-who"></span><span class="activity-copy"></span>`;
      li.querySelector(".activity-who").textContent = `${whoLabel(event.who)} ${event.verb}`;
      li.querySelector(".activity-copy").textContent = event.detail;
      list.append(li);
    }
  }
  if (!card) return;
  const proposal = store.proposal;
  if (!proposal) {
    card.hidden = true;
    card.replaceChildren();
    return;
  }
  card.hidden = false;
  const picks = proposal.options || [];
  card.innerHTML = `
    <p class="proposal-kicker">Agent proposal — you decide</p>
    <h3></h3>
    <p class="proposal-why"></p>
    <ul class="proposal-options"></ul>
    <div class="proposal-actions">
      <button type="button" class="btn-link" data-approve="pick">Approve pick</button>
      <button type="button" class="ghost" data-reject>Not this</button>
    </div>`;
  card.querySelector("h3").textContent = proposal.title;
  card.querySelector(".proposal-why").textContent = proposal.reason;
  const ul = card.querySelector(".proposal-options");
  for (const option of picks) {
    const li = document.createElement("li");
    li.innerHTML = `<strong></strong><span></span><button type="button" class="text-btn" data-choose></button>`;
    li.querySelector("strong").textContent = `${option.label}${option.id === proposal.pickId ? " · pick" : ""}`;
    li.querySelector("span").textContent = option.tradeoff;
    const btn = li.querySelector("[data-choose]");
    btn.dataset.choose = option.id;
    btn.textContent = `Choose ${option.id}`;
    ul.append(li);
  }
}
