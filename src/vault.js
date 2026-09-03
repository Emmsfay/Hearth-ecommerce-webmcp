const VAULT_KEY = "hearth-customer-vault";

const seeds = [
  {
    email: "ada@hearth.shop",
    password: "hearth",
    name: "Ada Okonkwo",
    phone: "020 7946 0123",
    shipping: {
      address: "14 Table Lane",
      city: "London",
      postcode: "E1 6AN",
    },
    preferences: {
      likes: ["cooking", "gifts under £40", "stoneware"],
      promo: "HEARTH10",
      category: "table",
    },
    orders: [],
  },
  {
    email: "emmaxzchukwudi12@gmail.com",
    password: "hearth",
    name: "Emmanuel Chukwudi",
    phone: "0803 000 0000",
    shipping: {
      address: "12 Hearth Close",
      city: "Lagos",
      postcode: "101233",
    },
    preferences: {
      likes: ["wool", "kitchen", "cast iron"],
      promo: "HEARTH10",
      category: "kitchen",
    },
    orders: [],
  },
];

function readVault() {
  try {
    const raw = JSON.parse(localStorage.getItem(VAULT_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function writeVault(vault) {
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
  return vault;
}

function seedVault() {
  const vault = readVault();
  let changed = false;
  for (const seed of seeds) {
    const key = seed.email;
    if (!vault[key]) {
      vault[key] = {
        ...seed,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
      continue;
    }
    const row = vault[key];
    if (!row.shipping?.address) {
      row.shipping = seed.shipping;
      row.preferences = { ...seed.preferences, ...row.preferences };
      row.phone = row.phone || seed.phone;
      row.updatedAt = new Date().toISOString();
      changed = true;
    }
  }
  if (changed) writeVault(vault);
}

seedVault();

function keyOf(email) {
  return String(email || "").trim().toLowerCase();
}

export function getVaultRecord(email) {
  seedVault();
  return readVault()[keyOf(email)] || null;
}

export function publicCustomer(email) {
  const row = getVaultRecord(email);
  if (!row) return null;
  return {
    storedIn: "this browser customer vault (hearth-customer-vault)",
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    shipping: row.shipping || {},
    preferences: {
      likes: row.preferences?.likes || [],
      promo: row.preferences?.promo || "",
      category: row.preferences?.category || "",
    },
    orders: (row.orders || []).slice(-8),
    updatedAt: row.updatedAt,
    passwordReturned: false,
  };
}

export function profileStatus(email) {
  const row = email ? getVaultRecord(email) : null;
  if (!row) {
    return {
      available: false,
      status: "no saved shipping profile",
      passwordReturned: false,
    };
  }
  const hasShipping = Boolean(row.shipping?.address);
  return {
    available: true,
    firstName: (row.name || "").trim().split(/\s+/)[0] || null,
    email: row.email,
    hasShipping,
    hasPhone: Boolean(row.phone),
    likesOnFile: Boolean(row.preferences?.likes?.length),
    promoOnFile: Boolean(row.preferences?.promo),
    status: hasShipping ? "saved shipping profile available" : "account on file, no shipping yet",
    passwordReturned: false,
  };
}

export function upsertCustomer(email, patch = {}) {
  const key = keyOf(email);
  if (!key) return null;
  const vault = readVault();
  const prev = vault[key] || { email: key, shipping: {}, preferences: { likes: [] }, orders: [] };
  vault[key] = {
    ...prev,
    ...patch,
    email: key,
    name: patch.name || prev.name || "",
    phone: patch.phone || prev.phone || "",
    shipping: { ...prev.shipping, ...patch.shipping },
    preferences: {
      likes: patch.preferences?.likes || prev.preferences?.likes || [],
      promo: patch.preferences?.promo || prev.preferences?.promo || "HEARTH10",
      category: patch.preferences?.category || prev.preferences?.category || "",
    },
    orders: prev.orders || [],
    password: patch.password || prev.password || "",
    updatedAt: new Date().toISOString(),
  };
  writeVault(vault);
  return publicCustomer(key);
}

export function recordCustomerOrder(email, order) {
  const key = keyOf(email);
  const vault = readVault();
  const row = vault[key];
  if (!row) return null;
  row.orders = row.orders || [];
  row.orders.push({
    id: order.id,
    total: order.total,
    items: order.lines?.map((line) => `${line.name} × ${line.qty}`) || [],
    at: new Date().toISOString(),
  });
  row.updatedAt = new Date().toISOString();
  writeVault(vault);
  return publicCustomer(key);
}

export function shippingFromVault(email) {
  const row = getVaultRecord(email);
  if (!row) return null;
  return {
    name: row.name || "",
    email: row.email || "",
    address: row.shipping?.address || "",
    city: row.shipping?.city || "",
    postcode: row.shipping?.postcode || "",
    promo: row.preferences?.promo || "HEARTH10",
    hasShipping: Boolean(row.shipping?.address),
  };
}

export function applyIdentityToForm(email) {
  const fields = shippingFromVault(email);
  if (!fields) return { ok: false, message: "No saved customer for that email." };
  const map = {
    name: "#ship-name",
    email: "#ship-email",
    promo: "#promo",
  };
  for (const [field, selector] of Object.entries(map)) {
    const node = document.querySelector(selector);
    if (node && fields[field]) node.value = fields[field];
  }
  return {
    ok: true,
    message: "Name and email applied. Street and phone were not written to the page.",
    promo: fields.promo,
    hasShipping: fields.hasShipping,
  };
}

export function revealShippingToForm(email) {
  const fields = shippingFromVault(email);
  if (!fields?.hasShipping) return { ok: false, message: "No saved shipping profile." };
  const map = {
    address: "#ship-address",
    city: "#ship-city",
    postcode: "#ship-postcode",
  };
  for (const [field, selector] of Object.entries(map)) {
    const node = document.querySelector(selector);
    if (node && fields[field]) node.value = fields[field];
  }
  return { ok: true, message: "Saved address is now visible on the form." };
}

export function applyCustomerToForm(email) {
  return applyIdentityToForm(email);
}

export function vaultPassword(email) {
  return getVaultRecord(email)?.password || "";
}

export function rememberCustomerLike(email, like) {
  const key = keyOf(email);
  const row = getVaultRecord(key);
  const likes = [...(row?.preferences?.likes || [])];
  const note = String(like || "").trim();
  if (note && !likes.includes(note)) likes.push(note);
  return upsertCustomer(key || email, {
    name: row?.name,
    preferences: {
      likes,
      promo: row?.preferences?.promo,
      category: row?.preferences?.category,
    },
  });
}

export function listPublicCustomers() {
  seedVault();
  return Object.keys(readVault()).map((email) => profileStatus(email));
}
