import { products, money } from "./products.js";
import {
  addToCart,
  applyPromo,
  filterProducts,
  getCart,
  openProduct,
  searchProducts,
  showAbout,
  showCart,
  showCatalog,
  showHome,
  showLogin,
  applySavedProfile,
  startCheckout,
} from "./app.js";
import { getSession } from "./auth.js";
import { forgetMemory, memorySummary, readMemory, rememberFact, rememberTurn } from "./memory.js";
import { publicCustomer, rememberCustomerLike, upsertCustomer } from "./vault.js";

const aliases = [
  { id: "mug", words: ["mug", "cup", "stoneware"] },
  { id: "napkins", words: ["napkin", "napkins", "linen"] },
  { id: "skillet", words: ["skillet", "pan", "cast iron"] },
  { id: "board", words: ["board", "cutting board"] },
  { id: "bowl", words: ["bowl"] },
  { id: "candles", words: ["candle", "candles", "taper", "beeswax"] },
  { id: "soap", words: ["soap"] },
  { id: "throw", words: ["throw", "blanket", "wool"] },
];

let recognition = null;
let listening = false;

function spoken() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

function findSpokenProduct(text) {
  const lower = text.toLowerCase();
  for (const row of aliases) {
    if (row.words.some((word) => lower.includes(word))) return products.find((item) => item.id === row.id);
  }
  return products.find((item) => lower.includes(item.name.toLowerCase()));
}

function reply(text) {
  rememberTurn("hearth", text);
  const line = document.querySelector("#voice-reply");
  if (line) line.textContent = text;
  renderMemoryPanel();
  speak(text);
  return text;
}

export function handleUtterance(raw) {
  const text = (raw || "").trim();
  if (!text) return reply("I did not catch that. Try “find a mug” or “add the skillet”.");
  rememberTurn("you", text);
  const said = text.toLowerCase();

  const nameMatch = said.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\s-]{1,40})/);
  if (nameMatch) {
    const name = nameMatch[1].replace(/[.,!?].*$/, "").trim();
    rememberFact({ name });
    const session = getSession();
    if (session) upsertCustomer(session.email, { name });
    return reply(`I'll remember your name as ${name}.`);
  }
  const likeMatch = said.match(/(?:i like|i love|remember i like)\s+(.+)/);
  if (likeMatch) {
    const like = likeMatch[1].replace(/[.,!?].*$/, "").trim();
    rememberFact({ like });
    const session = getSession();
    if (session) rememberCustomerLike(session.email, like);
    return reply(`Noted — you like ${like}.`);
  }
  if (/saved (details|address|profile)|use my (saved|address|details)|apply (my )?saved/.test(said)) {
    const result = applySavedProfile(undefined, "you");
    if (!result.ok) return reply(result.message);
    const ship = result.customer?.shipping || {};
    return reply(`Using your saved details: ${result.customer.name}, ${[ship.address, ship.city, ship.postcode].filter(Boolean).join(", ")}.`);
  }
  if (/forget|clear memory|wipe memory/.test(said)) {
    forgetMemory();
    renderMemoryPanel();
    return reply("Memory cleared in this browser.");
  }
  if (/what do you remember|what.?s my name|memory/.test(said)) {
    const mem = memorySummary();
    const session = getSession();
    const vault = session ? publicCustomer(session.email) : null;
    if (!mem.name && !mem.likes.length && !mem.lastQuery && !vault) return reply("I do not have notes yet. Say “my name is …” or “I like wool”.");
    const bits = [];
    const name = vault?.name || mem.name;
    const likes = vault?.preferences?.likes?.length ? vault.preferences.likes : mem.likes;
    if (name) bits.push(`your name is ${name}`);
    if (likes.length) bits.push(`you like ${likes.join(", ")}`);
    if (vault?.shipping?.address) bits.push(`your saved address is ${vault.shipping.address}, ${vault.shipping.city}`);
    if (mem.lastQuery) bits.push(`you last searched for ${mem.lastQuery}`);
    return reply(`I remember ${bits.join(", ")}.`);
  }
  if (/help|what can you|commands/.test(said)) {
    return reply("You can say find a mug, add the skillet, show kitchen, apply HEARTH10, open my cart, or start checkout.");
  }
  if (/home\b/.test(said) && !/home and care|home & care/.test(said)) {
    showHome();
    return reply("Home.");
  }
  if (/about|help centre|help center/.test(said)) {
    showAbout();
    return reply("Opened About.");
  }
  if (/sign in|log in|login/.test(said)) {
    showLogin();
    return reply("Opened login. Use your account, or the demo password hearth.");
  }
  if (/promo|hearth ?10|discount|ten percent/.test(said)) {
    const result = applyPromo("HEARTH10", "you");
    return reply(result.message || "Promo updated.");
  }
  if (/checkout|check out|pay/.test(said)) {
    const result = startCheckout("you");
    return reply(typeof result === "string" ? result : "Checkout is open. Review it, then place the order on the page.");
  }
  if (/cart|bag|basket/.test(said)) {
    showCart();
    const cart = getCart();
    if (!cart.lines.length) return reply("Your cart is empty.");
    const names = cart.lines.map((line) => `${line.name} times ${line.qty}`).join(", ");
    return reply(`In the bag: ${names}. Total ${money(cart.total)}.`);
  }
  if (/kitchen|cookware/.test(said)) {
    filterProducts({ category: "kitchen" }, "you");
    rememberFact({ lastQuery: "kitchen" });
    return reply("Showing kitchen.");
  }
  if (/table|dine|linen/.test(said) && !/vegetable/.test(said)) {
    filterProducts({ category: "table" }, "you");
    rememberFact({ lastQuery: "table" });
    return reply("Showing table and dine.");
  }
  if (/home and care|home & care|candles|soap|throw/.test(said) && /show|open|category|care/.test(said)) {
    filterProducts({ category: "care" }, "you");
    rememberFact({ lastQuery: "home and care" });
    return reply("Showing home and care.");
  }
  if (/all products|shop|catalog/.test(said)) {
    showCatalog();
    return reply("All products.");
  }

  const product = findSpokenProduct(said);
  if (product && /add|buy|get|order|put/.test(said)) {
    addToCart(product.id, 1, "you");
    rememberFact({ lastProduct: product.id, like: product.category });
    return reply(`Added ${product.name} for ${money(product.price)}.`);
  }
  if (product && /open|show me the|product/.test(said)) {
    openProduct(product.id, "you");
    rememberFact({ lastProduct: product.id });
    return reply(`${product.name}, ${money(product.price)}. ${product.blurb}`);
  }
  if (product) {
    searchProducts(product.name.split(" ")[0], "you");
    rememberFact({ lastQuery: product.name, lastProduct: product.id });
    return reply(`I found ${product.name} at ${money(product.price)}. Say “add the ${product.id}” to put it in the bag.`);
  }

  const search = said.replace(/^(find|search|show|look for|i want|i need)\s+/, "");
  if (search && search !== said) {
    const found = searchProducts(search, "you");
    rememberFact({ lastQuery: search });
    if (!found.count) return reply(`Nothing matched “${search}”. Try mug, skillet, or wool.`);
    return reply(`${found.count} match${found.count === 1 ? "" : "es"} for ${search}.`);
  }

  const mem = readMemory();
  if (mem.facts.lastProduct && /same|again|that one/.test(said)) {
    addToCart(mem.facts.lastProduct, 1, "you");
    return reply("Added the last product you looked at.");
  }
  return reply("Try “find a mug”, “add the skillet”, or “start checkout”.");
}

function setListening(on) {
  listening = on;
  const btn = document.querySelector("#btn-voice-mic");
  const status = document.querySelector("#voice-status");
  if (btn) {
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.textContent = on ? "Listening…" : "Speak";
  }
  if (status) status.textContent = on ? "Listening" : "Voice ready";
}

function startListen() {
  if (!recognition) {
    return reply("Voice needs Chrome or Edge, and the microphone permission.");
  }
  if (listening) {
    recognition.stop();
    return;
  }
  try {
    recognition.start();
  } catch {
    setListening(false);
  }
}

function renderMemoryPanel() {
  const mem = memorySummary();
  const facts = document.querySelector("#voice-facts");
  const log = document.querySelector("#voice-log");
  if (facts) {
    const bits = [];
    const session = getSession();
    const vault = session ? publicCustomer(session.email) : null;
    if (vault?.name || mem.name) bits.push(`Name: ${vault?.name || mem.name}`);
    const likes = vault?.preferences?.likes?.length ? vault.preferences.likes : mem.likes;
    if (likes.length) bits.push(`Likes: ${likes.join(", ")}`);
    if (vault?.shipping?.address) bits.push(`Address: ${vault.shipping.address}, ${vault.shipping.city}`);
    if (mem.lastQuery) bits.push(`Last search: ${mem.lastQuery}`);
    if (mem.lastProduct) bits.push(`Last product: ${mem.lastProduct}`);
    facts.textContent = bits.join(" · ") || "No notes yet. Say “my name is …” or “use my saved address”.";
  }
  if (log) {
    log.replaceChildren();
    for (const turn of mem.turns.slice(-8)) {
      const p = document.createElement("p");
      p.className = `voice-turn is-${turn.role}`;
      p.textContent = `${turn.role === "you" ? "You" : "Hearth"}: ${turn.text}`;
      log.append(p);
    }
  }
}

function setPanelOpen(open) {
  const panel = document.querySelector("#voice-panel");
  if (!panel) return;
  panel.hidden = !open;
  panel.classList.toggle("is-open", open);
  document.querySelectorAll("[data-voice-open]").forEach((btn) => {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  const fab = document.querySelector("#btn-voice-fab");
  if (fab) fab.hidden = open;
  if (open) renderMemoryPanel();
}

export function bindVoice() {
  const panel = document.querySelector("#voice-panel");
  const mic = document.querySelector("#btn-voice-mic");
  const forget = document.querySelector("#btn-voice-forget");
  if (!panel) return;

  recognition = spoken();
  if (recognition) {
    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript || "";
      const heard = document.querySelector("#voice-heard");
      if (heard) heard.textContent = text;
      handleUtterance(text);
    };
  } else if (document.querySelector("#voice-status")) {
    document.querySelector("#voice-status").textContent = "Type a request — mic needs Chrome or Edge";
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-voice-open]")) {
      event.preventDefault();
      setPanelOpen(true);
    }
    if (event.target.closest("[data-voice-close]")) {
      event.preventDefault();
      setPanelOpen(false);
    }
  });
  mic?.addEventListener("click", () => startListen());
  forget?.addEventListener("click", () => {
    forgetMemory();
    renderMemoryPanel();
    reply("Memory cleared.");
  });
  document.querySelector("#voice-type-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#voice-type");
    const text = input?.value.trim();
    if (!text) return;
    const heard = document.querySelector("#voice-heard");
    if (heard) heard.textContent = text;
    input.value = "";
    handleUtterance(text);
  });
  renderMemoryPanel();
}

export function getVoiceMemory() {
  const session = getSession();
  return {
    voice: memorySummary(),
    vault: session ? publicCustomer(session.email) : null,
    hint: "Name, address, and likes for checkout live in the customer vault. Voice memory is only the conversation overlay.",
  };
}

export function rememberVoiceNote(note) {
  rememberFact({ note });
  return memorySummary();
}
