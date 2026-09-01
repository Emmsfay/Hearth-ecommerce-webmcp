const MEMORY_KEY = "hearth-voice-memory";
const MAX_TURNS = 40;

function empty() {
  return {
    facts: {
      name: "",
      likes: [],
      lastQuery: "",
      lastProduct: "",
      notes: [],
    },
    turns: [],
    updatedAt: null,
  };
}

export function readMemory() {
  try {
    const raw = JSON.parse(localStorage.getItem(MEMORY_KEY) || "null");
    if (!raw || typeof raw !== "object") return empty();
    return {
      ...empty(),
      ...raw,
      facts: { ...empty().facts, ...(raw.facts || {}) },
      turns: Array.isArray(raw.turns) ? raw.turns : [],
    };
  } catch {
    return empty();
  }
}

function writeMemory(memory) {
  memory.updatedAt = new Date().toISOString();
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  return memory;
}

export function rememberTurn(role, text) {
  const memory = readMemory();
  memory.turns.push({ role, text, at: new Date().toISOString() });
  if (memory.turns.length > MAX_TURNS) memory.turns = memory.turns.slice(-MAX_TURNS);
  return writeMemory(memory);
}

export function rememberFact(partial) {
  const memory = readMemory();
  if (partial.name) memory.facts.name = String(partial.name).trim();
  if (partial.lastQuery) memory.facts.lastQuery = String(partial.lastQuery).trim();
  if (partial.lastProduct) memory.facts.lastProduct = String(partial.lastProduct).trim();
  if (partial.like) {
    const like = String(partial.like).trim();
    if (like && !memory.facts.likes.includes(like)) memory.facts.likes.push(like);
  }
  if (partial.note) {
    const note = String(partial.note).trim();
    if (note) memory.facts.notes.push({ text: note, at: new Date().toISOString() });
  }
  return writeMemory(memory);
}

export function forgetMemory() {
  localStorage.removeItem(MEMORY_KEY);
  return empty();
}

export function memorySummary() {
  const memory = readMemory();
  const { name, likes, lastQuery, lastProduct, notes } = memory.facts;
  return {
    storedIn: "this browser (localStorage key hearth-voice-memory)",
    name: name || null,
    likes,
    lastQuery: lastQuery || null,
    lastProduct: lastProduct || null,
    notes: notes.slice(-8),
    turns: memory.turns.slice(-12),
    updatedAt: memory.updatedAt,
  };
}
