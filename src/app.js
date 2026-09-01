import { products, categories, findProduct, money } from "./products.js";
import { getSession, publicAccount, signIn as authSignIn, signOut as authSignOut, signUp as authSignUp } from "./auth.js";
import {
  applyCustomerToForm,
  listPublicCustomers,
  publicCustomer,
  recordCustomerOrder,
  upsertCustomer,
  vaultPassword,
} from "./vault.js";

const state = {
  query: "",
  category: "all",
  maxPrice: 0,
  cart: [],
  promo: "",
  lastOrder: null,
  view: "home",
  afterLogin: null,
};

const els = {};

export function bindUi() {
  els.home = document.querySelector("#home");
  els.shopIntro = document.querySelector("#shop-intro");
  els.catalog = document.querySelector("#catalog");
  els.product = document.querySelector("#product");
  els.about = document.querySelector("#about");
  els.login = document.querySelector("#login");
  els.signup = document.querySelector("#signup");
  els.checkout = document.querySelector("#checkout");
  els.thanks = document.querySelector("#thanks");
  els.filters = document.querySelector(".filters");
  els.cart = document.querySelector("#cart");
  els.cartLines = document.querySelector("#cart-lines");
  els.cartTotal = document.querySelector("#cart-total");
  els.cartCount = document.querySelector("#cart-count");
  els.cartEmpty = document.querySelector("#cart-empty");
  els.cartFoot = document.querySelector("#cart-foot");
  els.cartCountLabel = document.querySelector("#cart-count-label");
  els.miniCartLines = document.querySelector("#mini-cart-lines");
  els.miniCartEmpty = document.querySelector("#mini-cart-empty");
  els.miniCartFoot = document.querySelector("#mini-cart-foot");
  els.miniCartTotal = document.querySelector("#mini-cart-total");
  els.search = document.querySelector("#search");
  els.live = document.querySelector("#live");
  els.summary = document.querySelector("#checkout-summary");
  els.homeFeatured = document.querySelector("#home-featured");
  els.homeDeals = document.querySelector("#home-deals");
  els.ticker = document.querySelector("#ticker");
  els.who = document.querySelector("#who");
  els.linkLogin = document.querySelector("#link-login");
  els.linkSignup = document.querySelector("#link-signup");
  els.btnSignOut = document.querySelector("#btn-signout");

  document.querySelector("#search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    searchProducts(els.search.value, "you");
  });
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => filterProducts({ category: button.dataset.category }, "you"));
  });
  document.querySelectorAll("[data-search]").forEach((button) => {
    button.addEventListener("click", () => searchProducts(button.dataset.search, "you"));
  });
  document.querySelectorAll("[data-product]").forEach((button) => {
    button.addEventListener("click", () => openProduct(button.dataset.product, "you"));
  });
  document.querySelector("#max-price").addEventListener("change", (event) => {
    filterProducts({ maxPrice: Number(event.target.value) }, "you");
  });
  document.querySelector("#btn-cart").addEventListener("click", () => showCart());
  document.querySelector("#btn-mini-checkout")?.addEventListener("click", () => startCheckout("you"));
  document.querySelector("#btn-close-cart").addEventListener("click", () => hideCart());
  document.querySelector("#btn-to-checkout").addEventListener("click", () => startCheckout("you"));
  bindHoverPopups();
  document.querySelector("#btn-cart-promo").addEventListener("click", () => {
    applyPromo(document.querySelector("#cart-promo").value, "you");
  });
  document.querySelector("#cart-promo").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyPromo(document.querySelector("#cart-promo").value, "you");
    }
  });
  els.cartLines.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cart]");
    if (!button) return;
    const line = state.cart.find((row) => row.id === button.dataset.id);
    if (!line) return;
    if (button.dataset.cart === "plus") updateCart(button.dataset.id, line.qty + 1, "you");
    if (button.dataset.cart === "minus") updateCart(button.dataset.id, line.qty - 1, "you");
    if (button.dataset.cart === "remove") updateCart(button.dataset.id, 0, "you");
  });
  document.querySelector("#btn-again").addEventListener("click", () => {
    state.lastOrder = null;
    showCatalog();
  });
  document.querySelector("#checkout-form").addEventListener("submit", (event) => {
    event.preventDefault();
    placeOrder(formData(), true, "you");
  });
  document.querySelector("#promo").addEventListener("change", (event) => {
    applyPromo(event.target.value, "you");
  });
  document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    signIn({
      email: document.querySelector("#login-email").value,
      password: document.querySelector("#login-password").value,
    }, "you");
  });
  document.querySelector("#signup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    signUp({
      name: document.querySelector("#signup-name").value,
      email: document.querySelector("#signup-email").value,
      password: document.querySelector("#signup-password").value,
    }, "you");
  });
  els.btnSignOut.addEventListener("click", () => signOut("you"));
  document.querySelector("#btn-use-saved")?.addEventListener("click", () => applySavedProfile(undefined, "you"));

  window.addEventListener("hashchange", () => applyRoute(location.hash));
  renderAccount();
  renderCart();
  renderFeatured();
  if (!location.hash) location.hash = "/";
  else applyRoute(location.hash);
}

function bindHoverPopups() {
  document.querySelectorAll(".dept, .cart-wrap").forEach((wrap) => {
    const open = () => wrap.classList.add("is-open");
    const close = () => wrap.classList.remove("is-open");
    wrap.addEventListener("pointerenter", open);
    wrap.addEventListener("pointerleave", close);
    wrap.addEventListener("focusin", open);
    wrap.addEventListener("focusout", (event) => {
      if (!wrap.contains(event.relatedTarget)) close();
    });
  });
}

function announce(text) {
  els.live.textContent = text;
  if (!els.ticker) return;
  els.ticker.hidden = !text;
  els.ticker.textContent = text;
}

function setPhoto(img, item) {
  img.alt = item.name;
  img.loading = "lazy";
  img.onerror = () => {
    img.onerror = null;
    img.removeAttribute("src");
    img.classList.add("is-missing");
  };
  img.src = item.image;
}

function formData() {
  return {
    name: document.querySelector("#ship-name").value.trim(),
    email: document.querySelector("#ship-email").value.trim(),
    address: document.querySelector("#ship-address").value.trim(),
    city: document.querySelector("#ship-city").value.trim(),
    postcode: document.querySelector("#ship-postcode").value.trim(),
    promo: document.querySelector("#promo").value.trim(),
  };
}

function fillForm(fields) {
  const map = {
    name: "#ship-name",
    email: "#ship-email",
    address: "#ship-address",
    city: "#ship-city",
    postcode: "#ship-postcode",
    promo: "#promo",
  };
  for (const [key, selector] of Object.entries(map)) {
    if (fields[key]) document.querySelector(selector).value = fields[key];
  }
}

function renderVaultBanner() {
  const banner = document.querySelector("#vault-banner");
  const copy = document.querySelector("#vault-banner-copy");
  if (!banner || !copy) return;
  const session = getSession();
  const profile = session ? publicCustomer(session.email) : null;
  if (!profile) {
    banner.hidden = true;
    copy.textContent = "";
    return;
  }
  banner.hidden = false;
  const ship = profile.shipping || {};
  const place = [ship.address, ship.city, ship.postcode].filter(Boolean).join(", ");
  copy.textContent = place
    ? `On file: ${profile.name} · ${place}. The agent can pull this — you do not need to type it again.`
    : `On file: ${profile.name} <${profile.email}>. Add an address once and it stays in the vault.`;
}

function prefillCheckoutFromAccount() {
  const session = getSession();
  if (!session) {
    renderVaultBanner();
    return;
  }
  const address = document.querySelector("#ship-address");
  if (!address?.value) {
    const applied = applyCustomerToForm(session.email);
    if (applied.ok && applied.fields.promo) applyPromo(applied.fields.promo, "shop");
  } else {
    if (!document.querySelector("#ship-name").value) document.querySelector("#ship-name").value = session.name;
    if (!document.querySelector("#ship-email").value) document.querySelector("#ship-email").value = session.email;
  }
  renderVaultBanner();
}

function visibleProducts() {
  return products.filter((item) => {
    const q = state.query.toLowerCase();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.blurb.toLowerCase().includes(q) || item.category.includes(q);
    const matchesCat = state.category === "all" || item.category === state.category;
    const matchesPrice = !state.maxPrice || item.price <= state.maxPrice;
    return matchesQuery && matchesCat && matchesPrice;
  });
}

function cartTotal() {
  const sub = state.cart.reduce((sum, line) => {
    const product = findProduct(line.id);
    return sum + product.price * line.qty;
  }, 0);
  const discount = state.promo.toUpperCase() === "HEARTH10" ? sub * 0.1 : 0;
  return { sub, discount, total: sub - discount };
}

function parseHash(hash) {
  const path = (hash || "#/").replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  if (!parts.length || parts[0] === "home") return { view: "home" };
  if (parts[0] === "shop") return { view: "catalog" };
  if (parts[0] === "about") return { view: "about" };
  if (parts[0] === "login") return { view: "login" };
  if (parts[0] === "signup") return { view: "signup" };
  if (parts[0] === "checkout") return { view: "checkout" };
  if (parts[0] === "thanks") return { view: "thanks" };
  if (parts[0] === "product" && parts[1]) return { view: "product", id: parts[1] };
  return { view: "home" };
}

function routeHash(view, id) {
  if (view === "home") return "#/";
  if (view === "catalog") return "#/shop";
  if (view === "product") return `#/product/${id}`;
  return `#/${view}`;
}

function setRoute(view, id) {
  const next = routeHash(view, id);
  if ((location.hash || "#/") === next) {
    applyRoute(next);
    return;
  }
  location.hash = next.slice(1) ? next : "#/";
}

function showOnly(view) {
  state.view = view;
  els.home.hidden = view !== "home";
  els.shopIntro.hidden = view !== "catalog";
  els.filters.hidden = view !== "catalog";
  els.catalog.hidden = view !== "catalog";
  els.product.hidden = view !== "product";
  els.about.hidden = view !== "about";
  els.login.hidden = view !== "login";
  els.signup.hidden = view !== "signup";
  els.checkout.hidden = view !== "checkout";
  els.thanks.hidden = view !== "thanks";
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const on = link.dataset.nav === view || (view === "product" && link.dataset.nav === "catalog");
    link.classList.toggle("is-on", on);
  });
}

function applyRoute(hash) {
  const { view, id } = parseHash(hash);
  hideCart();
  if (view === "product") {
    renderProduct(id);
    return;
  }
  if (view === "checkout") {
    if (!state.cart.length) {
      showOnly("catalog");
      renderCatalog();
      history.replaceState(null, "", "#/shop");
      announce("The bag is empty.");
      return;
    }
    if (!getSession()) {
      state.afterLogin = "checkout";
      showOnly("login");
      history.replaceState(null, "", "#/login");
      announce("Sign in to check out.");
      return;
    }
    prefillCheckoutFromAccount();
    showOnly("checkout");
    renderCheckoutSummary();
    renderVaultBanner();
    return;
  }
  showOnly(view);
  if (view === "catalog") renderCatalog();
  if (view === "home") renderFeatured();
  if (view === "login") {
    document.querySelector("#login-email").value ||= "ada@hearth.shop";
  }
}

function renderAccount() {
  const session = getSession();
  els.who.hidden = !session;
  els.btnSignOut.hidden = !session;
  els.linkLogin.hidden = Boolean(session);
  els.linkSignup.hidden = Boolean(session);
  els.who.textContent = session ? session.name : "";
}

function showFormError(id, message) {
  const node = document.querySelector(id);
  node.hidden = !message;
  node.textContent = message || "";
}

function afterAuthSuccess(who) {
  renderAccount();
  const next = state.afterLogin;
  state.afterLogin = null;
  if (next === "checkout") return startCheckout(who);
  showCatalog();
  return publicAccount();
}

export function showHome() {
  setRoute("home");
}

export function showAbout() {
  setRoute("about");
}

export function showLogin() {
  setRoute("login");
}

export function showSignup() {
  setRoute("signup");
}

export function showCatalog() {
  setRoute("catalog");
}

export function openPage(page) {
  const allowed = {
    home: showHome,
    shop: showCatalog,
    about: showAbout,
    login: showLogin,
    signup: showSignup,
    checkout: () => startCheckout("agent"),
  };
  const go = allowed[page];
  if (!go) return `Unknown page “${page}”. Use home, shop, about, login, signup, or checkout.`;
  go();
  return getShopState();
}

export function showCart() {
  els.cart.hidden = false;
  renderCart();
}

export function hideCart() {
  els.cart.hidden = true;
}

function offLabel(item) {
  if (!item.was || item.was <= item.price) return "";
  return `-${Math.round((1 - item.price / item.was) * 100)}%`;
}

function productCard(item) {
  const button = document.createElement("button");
  button.className = "card";
  button.type = "button";
  const off = offLabel(item);
  button.innerHTML = `<div class="card-media">${off ? `<span class="off"></span>` : ""}<img alt=""></div><div class="card-body"><h3></h3><p class="price-row"><span class="now"></span>${item.was ? `<s class="was"></s>` : ""}</p><p class="meta"></p></div>`;
  setPhoto(button.querySelector("img"), item);
  button.querySelector("h3").textContent = item.name;
  button.querySelector(".now").textContent = money(item.price);
  if (item.was) button.querySelector(".was").textContent = money(item.was);
  if (off) button.querySelector(".off").textContent = off;
  button.querySelector(".meta").textContent = "Official Store";
  button.addEventListener("click", () => openProduct(item.id, "you"));
  return button;
}

function renderFeatured() {
  if (els.homeFeatured) {
    els.homeFeatured.replaceChildren();
    for (const id of ["mug", "skillet", "throw", "board"]) {
      const item = findProduct(id);
      if (item) els.homeFeatured.append(productCard(item));
    }
  }
  if (els.homeDeals) {
    els.homeDeals.replaceChildren();
    for (const item of products.filter((row) => row.price <= 40)) {
      els.homeDeals.append(productCard(item));
    }
  }
}

function renderCatalog() {
  const list = visibleProducts();
  els.catalog.replaceChildren();
  if (!list.length) {
    const empty = document.createElement("p");
    empty.textContent = "No goods match that search.";
    els.catalog.append(empty);
    return;
  }
  for (const item of list) els.catalog.append(productCard(item));
  document.querySelectorAll("[data-category]").forEach((button) => {
    button.classList.toggle("is-on", button.dataset.category === state.category);
  });
}

function itemCount() {
  return state.cart.reduce((n, line) => n + line.qty, 0);
}

function totalsMarkup() {
  const { sub, discount, total } = cartTotal();
  const count = itemCount();
  const promo = state.promo.toUpperCase() === "HEARTH10";
  return `
    <div class="t-row"><span>Subtotal (${count} item${count === 1 ? "" : "s"})</span><span>${money(sub)}</span></div>
    <div class="t-row"><span>Delivery</span><span>Free</span></div>
    <div class="t-row ${promo ? "save" : "muted"}"><span>${promo ? "Promo HEARTH10" : "Promo"}</span><span>${promo ? `−${money(discount)}` : "None"}</span></div>
    <div class="t-row due"><span>Total</span><span>${money(total)}</span></div>`;
}

function renderCart() {
  els.cartLines.replaceChildren();
  const count = itemCount();
  if (els.cartEmpty) els.cartEmpty.hidden = count > 0;
  if (els.cartFoot) els.cartFoot.hidden = count === 0;
  if (els.cartCountLabel) els.cartCountLabel.textContent = `${count} item${count === 1 ? "" : "s"}`;
  for (const line of state.cart) {
    const product = findProduct(line.id);
    const li = document.createElement("li");
    li.className = "cart-line";
    li.innerHTML = `<img alt=""><div class="line-copy"><p class="line-name"></p><p class="line-unit"></p><div class="qty"><button type="button" data-cart="minus" aria-label="Fewer">−</button><span class="qty-n"></span><button type="button" data-cart="plus" aria-label="More">+</button><button type="button" class="text-btn" data-cart="remove">Remove</button></div></div><p class="line-sum"></p>`;
    setPhoto(li.querySelector("img"), product);
    li.querySelector(".line-name").textContent = product.name;
    li.querySelector(".line-unit").textContent = `${money(product.price)} each`;
    li.querySelector(".qty-n").textContent = String(line.qty);
    li.querySelector(".line-sum").textContent = money(product.price * line.qty);
    li.querySelectorAll("[data-cart]").forEach((button) => {
      button.dataset.id = product.id;
    });
    els.cartLines.append(li);
  }
  if (els.cartTotal) els.cartTotal.innerHTML = totalsMarkup();
  els.cartCount.textContent = String(count);
  renderMiniCart(count);
  const cartPromo = document.querySelector("#cart-promo");
  if (cartPromo && document.activeElement !== cartPromo) cartPromo.value = state.promo;
  renderCheckoutSummary();
}

function renderMiniCart(count) {
  if (!els.miniCartLines) return;
  els.miniCartLines.replaceChildren();
  if (els.miniCartEmpty) els.miniCartEmpty.hidden = count > 0;
  if (els.miniCartFoot) els.miniCartFoot.hidden = count === 0;
  for (const line of state.cart) {
    const product = findProduct(line.id);
    const li = document.createElement("li");
    li.innerHTML = `<img alt=""><span></span><strong></strong>`;
    setPhoto(li.querySelector("img"), product);
    li.querySelector("span").textContent = `${product.name} × ${line.qty}`;
    li.querySelector("strong").textContent = money(product.price * line.qty);
    els.miniCartLines.append(li);
  }
  if (els.miniCartTotal) {
    els.miniCartTotal.innerHTML = `<span>Total</span><span>${money(cartTotal().total)}</span>`;
  }
}

function renderCheckoutSummary() {
  if (!els.summary) return;
  const lines = state.cart.map((line) => {
    const product = findProduct(line.id);
    return `<li><span>${product.name} × ${line.qty}</span><span>${money(product.price * line.qty)}</span></li>`;
  }).join("");
  els.summary.innerHTML = `
    <h3>Order summary</h3>
    <ul class="sum-lines">${lines || "<li>No items</li>"}</ul>
    ${totalsMarkup()}
    <p class="pay-note">Pay on delivery. Demo — you will not be charged.</p>`;
}

function renderProduct(id) {
  const item = findProduct(id);
  if (!item) {
    showOnly("catalog");
    renderCatalog();
    announce(`No product “${id}”.`);
    return `No product “${id}”.`;
  }
  showOnly("product");
  hideCart();
  const off = offLabel(item);
  const label = categories.find((c) => c.id === item.category)?.label || item.category;
  els.product.innerHTML = `
    <p class="crumb">Home / ${label} / </p>
    <div class="product-hero">
      <img class="product-photo" alt="">
      <div class="buy-box">
        <p class="meta">Official Store</p>
        <h2></h2>
        <p class="price-row"><span class="now"></span>${item.was ? `<s class="was"></s>` : ""}${off ? ` <span class="off"></span>` : ""}</p>
        <p class="blurb"></p>
        <p class="detail"></p>
        <p class="ship-note">Promo HEARTH10 takes 10% off at checkout. Demo shop — pay on delivery is not charged.</p>
        <button type="button" id="add-this" class="add-wide">Add to cart</button>
        <button type="button" class="ghost" id="back-shop">Continue shopping</button>
      </div>
    </div>`;
  setPhoto(els.product.querySelector(".product-photo"), item);
  els.product.querySelector(".crumb").append(item.name);
  els.product.querySelector("h2").textContent = item.name;
  els.product.querySelector(".now").textContent = money(item.price);
  if (item.was) els.product.querySelector(".was").textContent = money(item.was);
  if (off) els.product.querySelector(".off").textContent = off;
  els.product.querySelector(".blurb").textContent = item.blurb;
  els.product.querySelector(".detail").textContent = item.detail;
  els.product.querySelector("#add-this").addEventListener("click", () => addToCart(item.id, 1, "you"));
  els.product.querySelector("#back-shop").addEventListener("click", () => showCatalog());
  announce(`Opened ${item.name}.`);
  return { id: item.id, name: item.name, price: item.price, detail: item.detail };
}

export function searchProducts(query, who = "agent") {
  state.query = (query || "").trim();
  els.search.value = state.query;
  showCatalog();
  const list = visibleProducts();
  announce(`${who === "agent" ? "Agent" : "You"} searched for “${state.query || "everything"}”.`);
  return {
    query: state.query,
    count: list.length,
    products: list.map(({ id, name, price, category }) => ({ id, name, price, category })),
  };
}

export function filterProducts({ category, maxPrice }, who = "agent") {
  if (category) state.category = category;
  if (maxPrice !== undefined) state.maxPrice = Number(maxPrice) || 0;
  document.querySelector("#max-price").value = String(state.maxPrice || 0);
  showCatalog();
  const list = visibleProducts();
  announce(`Showing ${list.length} goods.`);
  return {
    category: state.category,
    maxPrice: state.maxPrice,
    count: list.length,
    products: list.map(({ id, name, price }) => ({ id, name, price })),
  };
}

export function openProduct(id, who = "agent") {
  if (!findProduct(id)) return `No product “${id}”.`;
  setRoute("product", id);
  return { id, name: findProduct(id).name, price: findProduct(id).price, detail: findProduct(id).detail };
}

export function addToCart(id, qty = 1, who = "agent") {
  const item = findProduct(id);
  if (!item) return `No product “${id}”.`;
  const count = Math.max(1, Number(qty) || 1);
  const line = state.cart.find((row) => row.id === id);
  if (line) line.qty += count;
  else state.cart.push({ id, qty: count });
  renderCart();
  showCart();
  announce(`Added ${item.name} to the bag.`);
  return cartSnapshot(`Added ${item.name} × ${count}.`);
}

export function updateCart(id, qty, who = "agent") {
  const count = Number(qty);
  if (count <= 0) {
    state.cart = state.cart.filter((line) => line.id !== id);
  } else {
    const line = state.cart.find((row) => row.id === id);
    if (!line) return `“${id}” is not in the bag.`;
    line.qty = count;
  }
  renderCart();
  return cartSnapshot("Bag updated.");
}

export function applyPromo(code, who = "agent") {
  state.promo = (code || "").trim();
  const promoField = document.querySelector("#promo");
  const cartPromo = document.querySelector("#cart-promo");
  if (promoField) promoField.value = state.promo;
  if (cartPromo && document.activeElement !== cartPromo) cartPromo.value = state.promo;
  renderCart();
  const ok = state.promo.toUpperCase() === "HEARTH10";
  return ok ? cartSnapshot("Promo HEARTH10 applied (10% off).") : cartSnapshot("That code is not valid. Try HEARTH10.");
}

export function getCart() {
  return cartSnapshot("Current bag.");
}

function cartSnapshot(message) {
  const { sub, discount, total } = cartTotal();
  return {
    message,
    lines: state.cart.map((line) => {
      const product = findProduct(line.id);
      return { id: line.id, name: product.name, qty: line.qty, lineTotal: product.price * line.qty };
    }),
    subtotal: sub,
    discount,
    total,
    promo: state.promo,
  };
}

export function startCheckout(who = "agent") {
  if (!state.cart.length) return "The bag is empty.";
  if (!getSession()) {
    state.afterLogin = "checkout";
    showLogin();
    announce("Sign in to check out.");
    return {
      message: "Checkout needs a signed-in account. Call use_saved_customer with an email from the vault (ada@hearth.shop or emmaxzchukwudi12@gmail.com) so the agent never handles a password. Or sign_in, then start_checkout again.",
      savedCustomers: listPublicCustomers(),
    };
  }
  setRoute("checkout");
  announce("Opened checkout with saved details.");
  return {
    ...cartSnapshot("Checkout is open. Saved customer details were applied from the vault. Do not ask the person to retype name or address. Ask them to review, then place_order with confirm=true."),
    savedProfile: publicCustomer(getSession().email),
  };
}

export function fillCheckout(fields = {}, who = "agent") {
  if (els.checkout.hidden) {
    const opened = startCheckout(who);
    if (opened && typeof opened === "object" && String(opened.message || "").includes("signed-in")) return opened;
    if (typeof opened === "string" && opened.includes("signed-in")) return opened;
  }
  const session = getSession();
  if (session && !fields.address) {
    applyCustomerToForm(session.email);
  }
  fillForm(fields);
  if (fields.promo) applyPromo(fields.promo, who);
  renderVaultBanner();
  return {
    message: "Checkout fields updated from the vault and any extra fields you passed. Ask the person to review, then call place_order with confirm=true.",
    savedProfile: session ? publicCustomer(session.email) : null,
  };
}

export function applySavedProfile(email, who = "agent") {
  const session = getSession();
  const target = (email || session?.email || "").trim().toLowerCase();
  if (!target) {
    return { ok: false, message: "Pass an email, or sign in, then apply the saved profile." };
  }
  const applied = applyCustomerToForm(target);
  if (applied.ok && applied.fields.promo) applyPromo(applied.fields.promo, who);
  renderVaultBanner();
  announce(applied.ok ? `Applied saved details for ${applied.customer.name}.` : applied.message);
  return applied;
}

export function useSavedCustomer(email, who = "agent") {
  const target = String(email || "").trim().toLowerCase();
  if (!target) {
    return { ok: false, message: "Pass the customer email stored in the vault.", savedCustomers: listPublicCustomers() };
  }
  const profile = publicCustomer(target);
  if (!profile) {
    return {
      ok: false,
      message: `No vault record for ${target}. Saved customers: ${listPublicCustomers().map((row) => row.email).join(", ")}.`,
      savedCustomers: listPublicCustomers(),
    };
  }
  const password = vaultPassword(target);
  if (!password) {
    return { ok: false, message: "This vault record has no sign-in secret. The customer must sign in once so the vault can store it." };
  }
  const result = authSignIn({ email: target, password });
  if (!result.ok) return { ok: false, message: result.message, passwordReturned: false };
  announce(`Signed in from the vault as ${profile.name}.`);
  afterAuthSuccess(who);
  const applied = applyCustomerToForm(target);
  if (applied.ok && applied.fields.promo) applyPromo(applied.fields.promo, who);
  renderVaultBanner();
  return {
    ok: true,
    message: `Signed in as ${profile.name} using a vault-held secret. The password was not returned to the agent (Infisical Agent Proxy pattern).`,
    account: publicAccount(),
    customer: profile,
    applied: applied.ok,
    passwordReturned: false,
  };
}

export function getSavedCustomer(email) {
  const session = getSession();
  const target = (email || session?.email || "").trim().toLowerCase();
  if (!target) {
    return {
      signedIn: false,
      savedCustomers: listPublicCustomers(),
      hint: "Call use_saved_customer with one of these emails. Do not ask the person to type their address.",
    };
  }
  const customer = publicCustomer(target);
  if (!customer) {
    return { found: false, email: target, savedCustomers: listPublicCustomers() };
  }
  return {
    found: true,
    customer,
    hint: "Call apply_saved_profile to put this on checkout. Never ask the customer to re-enter these fields.",
  };
}

export function saveCustomerProfile(fields = {}) {
  const session = getSession();
  const email = (fields.email || session?.email || "").trim().toLowerCase();
  if (!email) return { ok: false, message: "An email is required to save a customer." };
  const saved = upsertCustomer(email, {
    name: fields.name,
    phone: fields.phone,
    password: fields.password,
    shipping: {
      address: fields.address,
      city: fields.city,
      postcode: fields.postcode,
    },
    preferences: {
      likes: fields.likes,
      promo: fields.promo,
      category: fields.category,
    },
  });
  if (fields.address || fields.city || fields.postcode || fields.name) {
    applyCustomerToForm(email);
    if (fields.promo) applyPromo(fields.promo, "agent");
  }
  renderVaultBanner();
  announce(`Saved ${saved.name} to the customer vault.`);
  return { ok: true, message: "Customer saved in this browser vault. Password is stored but not returned.", customer: saved };
}

export function placeOrder(fields = {}, confirm = false, who = "agent") {
  if (!getSession()) {
    state.afterLogin = "checkout";
    showLogin();
    return "Sign in before placing an order. Demo: ada@hearth.shop / hearth.";
  }
  if (!state.cart.length) return "The bag is empty.";
  if (!confirm) {
    return "This will place an order. Call again with confirm=true after the person agrees. Demo shop — no real payment is taken.";
  }
  const session = getSession();
  if (session && !fields.address) applyCustomerToForm(session.email);
  fillForm(fields);
  let data = { ...formData(), ...fields };
  if ((!data.name || !data.email || !data.address) && session) {
    applyCustomerToForm(session.email);
    data = { ...formData(), ...fields };
  }
  if (!data.name || !data.email || !data.address) {
    return "Name, email, and address are required. Call apply_saved_profile first if they are already in the vault.";
  }
  const snapshot = cartSnapshot("Order placed.");
  const id = `HR-${Math.floor(1000 + Math.random() * 9000)}`;
  state.lastOrder = { id, ...snapshot, customer: data.name };
  upsertCustomer(data.email, {
    name: data.name,
    shipping: {
      address: data.address,
      city: data.city,
      postcode: data.postcode,
    },
    preferences: { promo: data.promo },
  });
  recordCustomerOrder(data.email, state.lastOrder);
  state.cart = [];
  state.promo = "";
  renderCart();
  setRoute("thanks");
  document.querySelector("#thanks-copy").textContent =
    `Order ${id} for ${data.name}. ${money(snapshot.total)} — this is a demo, nothing was charged.`;
  announce(`Order ${id} placed. Details saved to the customer vault.`);
  return state.lastOrder;
}

export function getAccount() {
  const account = publicAccount();
  if (!account.signedIn) {
    return {
      ...account,
      savedCustomers: listPublicCustomers(),
      hint: "Call use_saved_customer with a vault email to sign in without asking for a password.",
    };
  }
  return {
    ...account,
    savedProfile: publicCustomer(account.email),
    hint: "Call apply_saved_profile instead of asking the customer to type their address.",
  };
}

export function signIn(fields, who = "agent") {
  const result = authSignIn(fields);
  showFormError("#login-error", result.ok ? "" : result.message);
  if (!result.ok) {
    showLogin();
    return result;
  }
  upsertCustomer(fields.email, {
    name: result.account?.name,
    password: fields.password,
  });
  announce(result.message);
  afterAuthSuccess(who);
  return { ...result, savedProfile: publicCustomer(fields.email), passwordReturned: false };
}

export function signUp(fields, who = "agent") {
  const result = authSignUp(fields);
  showFormError("#signup-error", result.ok ? "" : result.message);
  if (!result.ok) {
    showSignup();
    return result;
  }
  upsertCustomer(fields.email, {
    name: fields.name,
    password: fields.password,
  });
  announce(result.message);
  afterAuthSuccess(who);
  return { ...result, savedProfile: publicCustomer(fields.email) };
}

export function signOut(who = "agent") {
  const result = authSignOut();
  renderAccount();
  showHome();
  announce(result.message);
  return result;
}

export function runGiftDemo() {
  useSavedCustomer("ada@hearth.shop", "agent");
  addToCart("bowl", 1, "agent");
  applyPromo("HEARTH10", "agent");
  const checkout = startCheckout("agent");
  applySavedProfile("ada@hearth.shop", "agent");
  return {
    success: true,
    message: "Ada is signed in from the vault (password not returned). Serving bowl is in the bag. HEARTH10 and her saved London address are on checkout. Due £28.80. Do not place the order until the person confirms.",
    new_state: getShopState(),
    checkout,
  };
}

export function getShopState() {
  const account = getAccount();
  return {
    view: state.view,
    query: state.query,
    category: state.category,
    maxPrice: state.maxPrice,
    cartCount: state.cart.reduce((n, line) => n + line.qty, 0),
    total: cartTotal().total,
    lastOrder: state.lastOrder?.id || null,
    catalogSize: products.length,
    account,
    savedProfile: account.savedProfile || null,
    hint: "Pull saved customer data with get_saved_customer or apply_saved_profile. Do not ask the person to retype name, email, or address. Sign in with use_saved_customer so the password never leaves the vault.",
  };
}

export function listProducts() {
  return products.map(({ id, name, price, category, blurb }) => ({ id, name, price, category, blurb }));
}
