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
import { profileStatus, publicCustomer, rememberCustomerLike, upsertCustomer } from "./vault.js";

const aliases = [
  { id: "mug", words: ["mug", "cup"] },
  { id: "napkins", words: ["napkin", "napkins"] },
  { id: "skillet", words: ["skillet", "pan", "cast iron"] },
  { id: "board", words: ["board", "cutting board"] },
  { id: "bowl", words: ["bowl"] },
  { id: "candles", words: ["candle", "candles", "taper", "beeswax"] },
  { id: "soap", words: ["soap"] },
  { id: "throw", words: ["throw", "blanket", "wool"] },
  { id: "pitcher", words: ["pitcher", "jug"] },
  { id: "tumblers", words: ["tumbler", "tumblers", "glasses"] },
  { id: "vase", words: ["vase"] },
  { id: "mats", words: ["placemat", "placemats", "mats"] },
  { id: "tray", words: ["tray"] },
  { id: "oil", words: ["cruet", "olive oil"] },
  { id: "salt", words: ["salt", "cellar"] },
  { id: "apron", words: ["apron"] },
  { id: "rest", words: ["spoon rest"] },
  { id: "kettle", words: ["kettle"] },
  { id: "basket", words: ["basket"] },
  { id: "lotion", words: ["lotion"] },
  { id: "diffuser", words: ["diffuser"] },
  { id: "hook", words: ["hook", "coat hook"] },
];

let recognition = null;
let listening = false;
let handsFree = false;
let speaking = false;
let greeted = false;
let lastSpoken = "";
let ignoreUntil = 0;
let speakGen = 0;
let restartTimer = null;

function spoken() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function customerFirstName() {
  const session = getSession();
  if (!session) return "";
  const full = session.name || publicCustomer(session.email)?.name || "";
  return full.trim().split(/\s+/)[0] || "";
}

function greeting() {
  const name = customerFirstName();
  if (name) return `Hello ${name}. What would you like to order?`;
  return "Hello. What would you like to order? Sign in if you want me to use your saved details.";
}

function panelOpen() {
  const panel = document.querySelector("#voice-panel");
  return Boolean(panel && !panel.hidden);
}

function normalizeHeard(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEcho(text) {
  const heard = normalizeHeard(text);
  const spoken = normalizeHeard(lastSpoken);
  if (!heard || heard.length < 2) return true;
  if (!spoken) return false;
  if (heard === spoken) return true;
  if (spoken.includes(heard) && heard.length >= 6) return true;
  if (heard.includes(spoken.slice(0, 36)) && spoken.length >= 16) return true;
  if (/what would you like to order/.test(heard) && /what would you like to order/.test(spoken)) return true;
  if (/^hello\b/.test(heard) && /^hello\b/.test(spoken)) return true;
  return false;
}

function stopRecognition() {
  try {
    recognition?.stop();
  } catch {
    /* already stopped */
  }
}

function speak(text) {
  lastSpoken = text;
  speakGen += 1;
  const gen = speakGen;
  speaking = true;
  stopRecognition();
  if (!window.speechSynthesis) {
    speaking = false;
    ignoreUntil = Date.now() + 300;
    scheduleListen();
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  const finish = () => {
    if (gen !== speakGen) return;
    speaking = false;
    ignoreUntil = Date.now() + 600;
    scheduleListen();
  };
  utter.onend = finish;
  utter.onerror = finish;
  window.speechSynthesis.speak(utter);
}

function scheduleListen() {
  if (!handsFree || !recognition || !panelOpen() || speaking) return;
  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    if (!handsFree || !panelOpen() || listening || speaking) return;
    if (Date.now() < ignoreUntil) {
      scheduleListen();
      return;
    }
    try {
      recognition.start();
    } catch {
      /* already started */
    }
  }, 350);
}

function stopHandsFree() {
  handsFree = false;
  speaking = false;
  speakGen += 1;
  clearTimeout(restartTimer);
  window.speechSynthesis?.cancel();
  stopRecognition();
  setListening(false);
}

function findSpokenProduct(text) {
  const lower = text.toLowerCase();
  for (const row of aliases) {
    if (row.words.some((word) => lower.includes(word))) return products.find((item) => item.id === row.id);
  }
  return products.find((item) => lower.includes(item.name.toLowerCase()));
}

function reply(text) {
  speaking = true;
  stopRecognition();
  rememberTurn("hearth", text);
  const line = document.querySelector("#voice-reply");
  if (line) line.textContent = text;
  renderMemoryPanel();
  speak(text);
  return text;
}

export function handleUtterance(raw) {
  const text = (raw || "").trim();
  if (!text || isEcho(text)) return "";
  rememberTurn("you", text);
  const said = text.toLowerCase();

  const nameMatch = said.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\s-]{1,40})/);
  if (nameMatch) {
    const name = nameMatch[1].replace(/[.,!?].*$/, "").trim();
    rememberFact({ name });
    const session = getSession();
    if (session) upsertCustomer(session.email, { name });
    return reply(`I'll remember your name as ${name}. What would you like to order?`);
  }
  const likeMatch = said.match(/(?:i like|i love|remember i like)\s+(.+)/);
  if (likeMatch) {
    const like = likeMatch[1].replace(/[.,!?].*$/, "").trim();
    rememberFact({ like });
    const session = getSession();
    if (session) rememberCustomerLike(session.email, like);
    return reply(`Noted — you like ${like}. Anything you want to order?`);
  }
  if (/saved (details|address|profile)|use my (saved|address|details)|apply (my )?saved/.test(said)) {
    const result = applySavedProfile(undefined, "you");
    if (!result.ok) return reply(result.message);
    return reply("Using your saved shipping profile. The address stays hidden on the page. What would you like to order?");
  }
  if (/forget|clear memory|wipe memory/.test(said)) {
    forgetMemory();
    renderMemoryPanel();
    return reply("Memory cleared in this browser. What would you like to order?");
  }
  if (/what do you remember|what.?s my name|memory/.test(said)) {
    const mem = memorySummary();
    const session = getSession();
    const vault = session ? publicCustomer(session.email) : null;
    if (!mem.name && !mem.likes.length && !mem.lastQuery && !vault) return reply("I do not have notes yet. What would you like to order?");
    const bits = [];
    const name = vault?.name || mem.name;
    const likes = vault?.preferences?.likes?.length ? vault.preferences.likes : mem.likes;
    if (name) bits.push(`your name is ${name}`);
    if (likes.length) bits.push(`you like ${likes.join(", ")}`);
    if (vault?.shipping?.address) bits.push("a saved shipping profile is on file");
    if (mem.lastQuery) bits.push(`you last searched for ${mem.lastQuery}`);
    return reply(`I remember ${bits.join(", ")}. What would you like to order?`);
  }
  if (/help|what can you|commands/.test(said)) {
    return reply("Tell me what you want to order — a mug, skillet, bowl, or anything in the shop. I can also open your cart or start checkout.");
  }
  if (/stop listening|that's all|goodbye|good bye|thank you/.test(said)) {
    stopHandsFree();
    const status = document.querySelector("#voice-status");
    if (status) status.textContent = "Paused — tap Speak to continue";
    return reply("I'll stop listening. Tap Speak when you want to order again.");
  }
  if (/home\b/.test(said) && !/home and care|home & care/.test(said)) {
    showHome();
    return reply("Home. What would you like to order?");
  }
  if (/about|help centre|help center/.test(said)) {
    showAbout();
    return reply("Opened About. What would you like to order?");
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
    if (!cart.lines.length) return reply("Your cart is empty. What would you like to order?");
    const names = cart.lines.map((line) => `${line.name} times ${line.qty}`).join(", ");
    return reply(`In the bag: ${names}. Total ${money(cart.total)}. Anything else?`);
  }
  if (/kitchen|cookware/.test(said)) {
    filterProducts({ category: "kitchen" }, "you");
    rememberFact({ lastQuery: "kitchen" });
    return reply("Showing kitchen. What would you like to order from here?");
  }
  if (/table|dine|linen/.test(said) && !/vegetable/.test(said)) {
    filterProducts({ category: "table" }, "you");
    rememberFact({ lastQuery: "table" });
    return reply("Showing table and dine. What would you like to order?");
  }
  if (/home and care|home & care|candles|soap|throw/.test(said) && /show|open|category|care/.test(said)) {
    filterProducts({ category: "care" }, "you");
    rememberFact({ lastQuery: "home and care" });
    return reply("Showing home and care. What would you like to order?");
  }
  if (/all products|shop|catalog/.test(said)) {
    showCatalog();
    return reply("All products. What would you like to order?");
  }

  const product = findSpokenProduct(said);
  if (product && /add|buy|get|order|put/.test(said)) {
    addToCart(product.id, 1, "you");
    rememberFact({ lastProduct: product.id, like: product.category });
    return reply(`Added ${product.name} for ${money(product.price)}. Anything else?`);
  }
  if (product && /open|show me the|product/.test(said)) {
    openProduct(product.id, "you");
    rememberFact({ lastProduct: product.id });
    return reply(`${product.name}, ${money(product.price)}. ${product.blurb} Shall I add it?`);
  }
  if (product) {
    searchProducts(product.name.split(" ")[0], "you");
    rememberFact({ lastQuery: product.name, lastProduct: product.id });
    return reply(`I found ${product.name} at ${money(product.price)}. Want me to add it to your bag?`);
  }

  if (/^(find|search|show|look for|i want|i need)\s*$/.test(said)) {
    return reply("What would you like me to look for?");
  }

  const search = said.replace(/^(find|search|show|look for|i want|i need)\s+/, "");
  if (search && search !== said) {
    const found = searchProducts(search, "you");
    rememberFact({ lastQuery: search });
    if (!found.count) return reply(`Nothing matched “${search}”. What else would you like to order?`);
    return reply(`${found.count} match${found.count === 1 ? "" : "es"} for ${search}. Which one should I add?`);
  }

  const mem = readMemory();
  if (mem.facts.lastProduct && /same|again|that one|yes|add it/.test(said)) {
    addToCart(mem.facts.lastProduct, 1, "you");
    return reply("Added the last product you looked at. Anything else?");
  }
  return reply("What would you like to order? I can add something to your bag or start checkout.");
}

function setListening(on) {
  listening = on;
  const btn = document.querySelector("#btn-voice-mic");
  const status = document.querySelector("#voice-status");
  if (btn) {
    btn.classList.toggle("is-on", on || handsFree);
    btn.setAttribute("aria-pressed", handsFree ? "true" : "false");
    btn.textContent = handsFree ? (on ? "Listening…" : "Wait…") : "Speak";
  }
  if (status) {
    if (handsFree && on) status.textContent = "Listening for your answer";
    else if (handsFree) status.textContent = "Speaking — then I’ll listen";
    else status.textContent = "Voice ready";
  }
}

function startListen() {
  if (!recognition) {
    return reply("Voice needs Chrome or Edge, and the microphone permission.");
  }
  if (listening || speaking) return;
  scheduleListen();
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
    if (vault?.shipping?.address) bits.push("Saved shipping profile available");
    if (mem.lastQuery) bits.push(`Last search: ${mem.lastQuery}`);
    if (mem.lastProduct) bits.push(`Last product: ${mem.lastProduct}`);
    facts.textContent = bits.join(" · ") || (session ? `Signed in as ${session.name}.` : "Sign in so I can greet you by name and use saved details.");
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

function setPanelChrome(open) {
  const panel = document.querySelector("#voice-panel");
  if (!panel) return;
  panel.hidden = !open;
  panel.classList.toggle("is-open", open);
  document.querySelectorAll("[data-voice-open]").forEach((btn) => {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
  const fab = document.querySelector("#btn-voice-fab");
  if (fab) fab.hidden = open;
}

function openVoiceSession() {
  setPanelChrome(true);
  renderMemoryPanel();
  handsFree = true;
  if (greeted) {
    if (!speaking && !listening) scheduleListen();
    return;
  }
  greeted = true;
  reply(greeting());
}

function closeVoiceSession() {
  greeted = false;
  lastSpoken = "";
  stopHandsFree();
  setPanelChrome(false);
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
    recognition.onend = () => {
      setListening(false);
      if (handsFree && !speaking && Date.now() >= ignoreUntil) scheduleListen();
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "aborted" || event.error === "not-allowed") return;
      if (handsFree && !speaking) scheduleListen();
    };
    recognition.onresult = (event) => {
      if (speaking || Date.now() < ignoreUntil) return;
      const last = event.results?.[event.results.length - 1];
      if (!last?.isFinal) return;
      const text = last[0]?.transcript || "";
      if (isEcho(text)) return;
      const heard = document.querySelector("#voice-heard");
      if (heard) heard.textContent = text;
      speaking = true;
      stopRecognition();
      handleUtterance(text);
    };
  } else if (document.querySelector("#voice-status")) {
    document.querySelector("#voice-status").textContent = "Type an order — mic needs Chrome or Edge";
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-voice-open]")) {
      event.preventDefault();
      openVoiceSession();
    }
    if (event.target.closest("[data-voice-close]")) {
      event.preventDefault();
      closeVoiceSession();
    }
  });
  mic?.addEventListener("click", () => {
    if (handsFree) {
      stopHandsFree();
      const status = document.querySelector("#voice-status");
      if (status) status.textContent = "Paused — tap Speak to continue";
      const btn = document.querySelector("#btn-voice-mic");
      if (btn) btn.textContent = "Speak";
      return;
    }
    handsFree = true;
    if (!greeted) {
      greeted = true;
      reply(greeting());
    } else {
      startListen();
    }
  });
  forget?.addEventListener("click", () => {
    forgetMemory();
    renderMemoryPanel();
    reply("Memory cleared. What would you like to order?");
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
    profileStatus: session ? profileStatus(session.email) : profileStatus(),
    hint: "Voice notes only. Vault street, phone, and likes are not returned to the agent.",
  };
}

export function rememberVoiceNote(note) {
  rememberFact({ note });
  return memorySummary();
}
