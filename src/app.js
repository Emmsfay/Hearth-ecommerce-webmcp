import { products, categories, findProduct, money } from "./products.js";
import { getSession, publicAccount, signIn as authSignIn, signOut as authSignOut, signUp as authSignUp } from "./auth.js";
import {
  applyIdentityToForm,
  profileStatus,
  publicCustomer,
  recordCustomerOrder,
  revealShippingToForm,
  shippingFromVault,
  upsertCustomer,
  vaultPassword,
} from "./vault.js";
import {
  clearProposal,
  getActivity,
  getProposal,
  hasEventVerb,
  logEvent,
  resetCollab,
  retractEventsByVerb,
  setProposal,
  snapshotCart,
  undoLast,
} from "./collab.js";

const state = {
  query: "",
  category: "all",
  maxPrice: 0,
  cart: [],
  promo: "",
  lastOrder: null,
  view: "home",
  afterLogin: null,
  prepared: false,
  useSavedShipping: false,
  shippingRevealed: false,
};

const productNotes = {
  mug: { use: "Everyday drinking", weight: "light", forWhom: "anyone", ship: "Easy, low delivery impact" },
  napkins: { use: "Table setting or host gift", weight: "very light", forWhom: "hosts", ship: "Easy to ship" },
  skillet: { use: "Daily cooking", weight: "heavy", forWhom: "a cook", ship: "Heavier delivery" },
  board: { use: "Prep and serving", weight: "medium-heavy", forWhom: "a cook", ship: "Bulky to ship" },
  bowl: { use: "Serving or host gift", weight: "heavier", forWhom: "a cook or host", ship: "Bulkier than a mug" },
  candles: { use: "Atmosphere", weight: "light", forWhom: "anyone", ship: "Easy, handle with care" },
  soap: { use: "Sink or guest bath", weight: "very light", forWhom: "anyone", ship: "Easiest to ship" },
  throw: { use: "Sofa or bed", weight: "medium", forWhom: "homebodies", ship: "Bulky but soft" },
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
  els.orderConfirm = document.querySelector("#order-confirm");
  els.orderConfirmBody = document.querySelector("#order-confirm-body");
  els.placeOrder = document.querySelector("#btn-place-order");
  els.placeHint = document.querySelector("#place-hint");

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
    if (!state.prepared) {
      announce("Review the order first.");
      return;
    }
    placeOrder(formData(), true, "you");
  });
  document.querySelector("#btn-review-order")?.addEventListener("click", () => prepareOrder("you"));
  document.querySelector("#promo").addEventListener("change", (event) => {
    applyPromo(event.target.value, "you");
  });
  bindPasswordToggles();
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
  document.querySelector("#btn-use-saved")?.addEventListener("click", () => markUseSavedShipping("you"));
  document.querySelector("#btn-reveal-saved")?.addEventListener("click", () => revealSavedShipping("you"));
  document.querySelectorAll("[data-reset-demo]").forEach((button) => {
    button.addEventListener("click", () => resetDemoSession());
  });
  bindMobileMenu();

  window.addEventListener("hashchange", () => applyRoute(location.hash));
  renderAccount();
  renderCart();
  renderFeatured();
  updatePlaceButton();
  if (!location.hash) location.hash = "/";
  else applyRoute(location.hash);
}

function bindMobileMenu() {
  const toggle = document.querySelector("#btn-menu");
  const row = document.querySelector(".mast-row");
  const panel = document.querySelector("#mast-actions");
  if (!toggle || !row || !panel) return;
  const setOpen = (open) => {
    row.classList.toggle("is-menu-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  };
  toggle.addEventListener("click", () => setOpen(!row.classList.contains("is-menu-open")));
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a, #btn-cart, #btn-signout, [data-reset-demo]")) setOpen(false);
  });
  window.addEventListener("hashchange", () => setOpen(false));
}

function bindPasswordToggles() {
  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    const input = document.getElementById(button.dataset.passwordToggle);
    if (!input) return;
    button.addEventListener("click", () => {
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      button.setAttribute("aria-pressed", reveal ? "true" : "false");
      button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    });
  });
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

function fillForm(fields, { allowShipping = false } = {}) {
  const map = {
    name: "#ship-name",
    email: "#ship-email",
    promo: "#promo",
  };
  if (allowShipping) {
    map.address = "#ship-address";
    map.city = "#ship-city";
    map.postcode = "#ship-postcode";
  }
  for (const [key, selector] of Object.entries(map)) {
    if (fields[key]) document.querySelector(selector).value = fields[key];
  }
}

function clearCheckoutFields() {
  ["#ship-name", "#ship-email", "#ship-address", "#ship-city", "#ship-postcode"].forEach((selector) => {
    const node = document.querySelector(selector);
    if (node) node.value = "";
  });
  state.useSavedShipping = false;
  state.shippingRevealed = false;
}

function checkoutData() {
  const typed = formData();
  const session = getSession();
  const vault = session ? shippingFromVault(session.email) : null;
  if (state.shippingRevealed) return typed;
  if ((state.useSavedShipping || (!typed.address && vault?.hasShipping)) && vault) {
    return {
      name: typed.name || vault.name,
      email: typed.email || vault.email,
      address: vault.address,
      city: vault.city,
      postcode: vault.postcode,
      promo: typed.promo || vault.promo,
    };
  }
  return typed;
}

function renderVaultBanner() {
  const banner = document.querySelector("#vault-banner");
  const copy = document.querySelector("#vault-banner-copy");
  const reveal = document.querySelector("#btn-reveal-saved");
  if (!banner || !copy) return;
  const session = getSession();
  const status = session ? profileStatus(session.email) : null;
  if (!status?.available) {
    banner.hidden = true;
    copy.textContent = "";
    return;
  }
  banner.hidden = false;
  if (state.shippingRevealed) {
    copy.textContent = "Saved address is visible on this form so you can edit it. The agent should not copy it.";
  } else if (state.useSavedShipping && status.hasShipping) {
    copy.textContent = "Using saved shipping profile at place time. Street and phone are hidden from this page.";
  } else if (status.hasShipping) {
    copy.textContent = "Saved shipping profile available. Use it without showing the address, or reveal it to edit.";
  } else {
    copy.textContent = "Account on file. No shipping profile yet — type an address to save one.";
  }
  if (reveal) reveal.hidden = !status.hasShipping;
}

function prefillCheckoutFromAccount() {
  const session = getSession();
  if (!session) {
    renderVaultBanner();
    return;
  }
  const applied = applyIdentityToForm(session.email);
  if (applied.ok && applied.promo && !state.promo) applyPromo(applied.promo, "shop");
  if (!document.querySelector("#ship-name").value) document.querySelector("#ship-name").value = session.name;
  if (!document.querySelector("#ship-email").value) document.querySelector("#ship-email").value = session.email;
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
      clearCheckoutFields();
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
    renderOrderReview();
    updatePlaceButton();
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

export function resetDemoSession() {
  state.cart = [];
  state.promo = "";
  state.lastOrder = null;
  state.prepared = false;
  state.afterLogin = null;
  clearCheckoutFields();
  const promoField = document.querySelector("#promo");
  const cartPromo = document.querySelector("#cart-promo");
  if (promoField) promoField.value = "";
  if (cartPromo) cartPromo.value = "";
  const thanksCopy = document.querySelector("#thanks-copy");
  if (thanksCopy) thanksCopy.textContent = "";
  resetCollab();
  renderCart();
  hideCart();
  showHome();
  announce("Demo session reset. Cart and activity are empty.");
  return {
    ok: true,
    message: "Demo session reset. Cart and activity are empty.",
  };
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

const categoryLabel = {
  table: "Table",
  kitchen: "Kitchen",
  care: "Home & care",
};

function productCard(item) {
  const button = document.createElement("button");
  button.className = "card";
  button.type = "button";
  const off = offLabel(item);
  button.innerHTML = `<div class="card-media">${off ? `<span class="off"></span>` : ""}<img alt=""></div><div class="card-body"><p class="card-cat"></p><h3></h3><p class="card-blurb"></p><p class="price-row"><span class="now"></span>${item.was ? `<s class="was"></s>` : ""}</p></div>`;
  setPhoto(button.querySelector("img"), item);
  button.querySelector(".card-cat").textContent = categoryLabel[item.category] || item.category;
  button.querySelector("h3").textContent = item.name;
  button.querySelector(".card-blurb").textContent = item.blurb;
  button.querySelector(".now").textContent = money(item.price);
  if (item.was) button.querySelector(".was").textContent = money(item.was);
  if (off) button.querySelector(".off").textContent = off;
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
  const count = document.querySelector("#shop-count");
  if (count) count.textContent = `${list.length} good${list.length === 1 ? "" : "s"}`;
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "shop-empty";
    empty.textContent = "No goods match that search. Clear the filters or try another word.";
    els.catalog.append(empty);
    document.querySelectorAll("[data-category]").forEach((button) => {
      button.classList.toggle("is-on", button.dataset.category === state.category);
    });
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
  renderOrderReview();
  updatePlaceButton();
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
  if (who !== "shop") {
    logEvent({
      who,
      verb: "searched",
      detail: `Searched for “${state.query || "everything"}”.`,
    });
  }
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

function invalidatePreparationIfNeeded(who, wasPrepared) {
  const hadPrepare = wasPrepared || hasEventVerb("prepared");
  state.prepared = false;
  if (hadPrepare) {
    retractEventsByVerb("prepared");
    logEvent({
      who: who === "shop" ? "you" : who,
      verb: "invalidated",
      detail: "Preparation invalidated.",
    });
  }
  renderOrderReview();
  updatePlaceButton();
}

function leaveCheckoutIfBagEmpty() {
  if (state.cart.length) return false;
  const onCheckout = state.view === "checkout"
    || (els.checkout && !els.checkout.hidden)
    || /checkout/i.test(location.hash || "");
  clearCheckoutFields();
  if (onCheckout || state.view === "checkout") {
    showOnly("catalog");
    renderCatalog();
    if ((location.hash || "") !== "#/shop") location.hash = "/shop";
    else history.replaceState(null, "", "#/shop");
    announce("Bag is empty. Back to the shop.");
  }
  showCart();
  return true;
}

export function addToCart(id, qty = 1, who = "agent") {
  const item = findProduct(id);
  if (!item) return `No product “${id}”.`;
  const count = Math.max(1, Number(qty) || 1);
  const snap = snapshotCart(state.cart, state.promo);
  const wasPrepared = state.prepared;
  const line = state.cart.find((row) => row.id === id);
  if (line) line.qty += count;
  else state.cart.push({ id, qty: count });
  invalidatePreparationIfNeeded(who, wasPrepared);
  renderCart();
  showCart();
  announce(`Added ${item.name} to the bag.`);
  if (who !== "shop") {
    logEvent({
      who,
      verb: "added",
      detail: `Added ${item.name} × ${count}.`,
      snapshot: snap,
    });
  }
  return cartSnapshot(`Added ${item.name} × ${count}.`);
}

export function updateCart(id, qty, who = "agent") {
  const count = Number(qty);
  const item = findProduct(id);
  const snap = snapshotCart(state.cart, state.promo);
  const wasPrepared = state.prepared;
  const verb = count <= 0 ? "removed" : "updated";
  if (count <= 0) {
    state.cart = state.cart.filter((line) => line.id !== id);
  } else {
    const line = state.cart.find((row) => row.id === id);
    if (!line) return `“${id}” is not in the bag.`;
    line.qty = count;
  }
  invalidatePreparationIfNeeded(who, wasPrepared);
  renderCart();
  leaveCheckoutIfBagEmpty();
  if (who !== "shop") {
    logEvent({
      who,
      verb,
      detail: count <= 0
        ? `Removed ${item?.name || id}.`
        : `Set ${item?.name || id} to ${count}.`,
      snapshot: snap,
    });
  }
  return cartSnapshot("Bag updated.");
}

export function applyPromo(code, who = "agent") {
  const snap = snapshotCart(state.cart, state.promo);
  const wasPrepared = state.prepared;
  state.promo = (code || "").trim();
  const promoField = document.querySelector("#promo");
  const cartPromo = document.querySelector("#cart-promo");
  if (promoField) promoField.value = state.promo;
  if (cartPromo && document.activeElement !== cartPromo) cartPromo.value = state.promo;
  invalidatePreparationIfNeeded(who, wasPrepared);
  renderCart();
  const ok = state.promo.toUpperCase() === "HEARTH10";
  const message = ok ? "Promo HEARTH10 applied (10% off)." : "That code is not valid. Try HEARTH10.";
  if (who !== "shop") {
    logEvent({ who, verb: "applied promo", detail: message, snapshot: snap });
  }
  return ok ? cartSnapshot(message) : cartSnapshot(message);
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
      signedIn: false,
      message: "Checkout needs a signed-in account. Sign in on the page, or call sign_in with credentials the person provides.",
    };
  }
  setRoute("checkout");
  announce("Opened checkout. Saved address stays hidden until you use or reveal it.");
  return {
    ...cartSnapshot("Checkout is open. A saved shipping profile may be available. Street and phone are not on the page. The person must click Use saved details or Show saved address. Then prepare_order, then place_order with confirm=true."),
    profileStatus: profileStatus(getSession().email),
  };
}

export function fillCheckout(fields = {}, who = "agent") {
  if (els.checkout.hidden) {
    const opened = startCheckout(who);
    if (opened && typeof opened === "object" && String(opened.message || "").includes("signed-in")) return opened;
    if (typeof opened === "string" && opened.includes("signed-in")) return opened;
  }
  const session = getSession();
  if (session) applyIdentityToForm(session.email);
  fillForm({ name: fields.name, email: fields.email, promo: fields.promo });
  if (fields.promo) applyPromo(fields.promo, who);
  renderVaultBanner();
  const ignored = Boolean(fields.address || fields.city || fields.postcode);
  return {
    message: ignored
      ? "Name, email, and promo updated. Street, city, and postcode were ignored so they stay off the page. Ask the person to click Use saved details or Show saved address."
      : "Checkout identity updated. Street and phone were not written to the page.",
    profileStatus: session ? profileStatus(session.email) : profileStatus(),
  };
}

export function markUseSavedShipping(who = "you") {
  const session = getSession();
  if (!session) return { ok: false, message: "Sign in first." };
  const vault = shippingFromVault(session.email);
  if (!vault?.hasShipping) return { ok: false, message: "No saved shipping profile.", profileStatus: profileStatus(session.email) };
  applyIdentityToForm(session.email);
  if (vault.promo) applyPromo(vault.promo, who === "you" ? "shop" : who);
  state.useSavedShipping = true;
  renderVaultBanner();
  if (who !== "shop") {
    logEvent({ who, verb: "chose saved shipping", detail: "Will use saved shipping at place time. Address stays hidden." });
  }
  announce("Saved shipping will be used. Address is not shown on the page.");
  return {
    ok: true,
    message: "Saved shipping marked for use at place time. Street and phone were not written to the page.",
    profileStatus: profileStatus(session.email),
  };
}

export function revealSavedShipping(who = "you") {
  const session = getSession();
  if (!session) return { ok: false, message: "Sign in first." };
  if (who !== "you") {
    return {
      ok: false,
      message: "Only the person can reveal the saved address on the page. Ask them to click Show saved address.",
      profileStatus: profileStatus(session.email),
    };
  }
  const revealed = revealShippingToForm(session.email);
  if (!revealed.ok) return { ...revealed, profileStatus: profileStatus(session.email) };
  state.shippingRevealed = true;
  state.useSavedShipping = true;
  applyIdentityToForm(session.email);
  renderVaultBanner();
  logEvent({ who, verb: "revealed address", detail: "You chose to show the saved address on the form." });
  announce("Saved address is visible so you can edit it.");
  return { ok: true, message: "Saved address is visible on the form.", profileStatus: profileStatus(session.email) };
}

export function applySavedProfile(email, who = "agent") {
  const session = getSession();
  const target = (email || session?.email || "").trim().toLowerCase();
  if (!target) {
    return { ok: false, message: "Pass an email, or sign in, then apply the saved profile.", profileStatus: profileStatus() };
  }
  if (who === "you") return markUseSavedShipping("you");
  const applied = applyIdentityToForm(target);
  if (applied.ok && applied.promo) applyPromo(applied.promo, who);
  if (applied.ok && applied.hasShipping) state.useSavedShipping = true;
  renderVaultBanner();
  announce(applied.ok ? "Saved shipping marked for use. Address stays hidden." : applied.message);
  if (who !== "shop") {
    logEvent({
      who,
      verb: "applied profile",
      detail: applied.ok ? "Saved shipping marked for use. Address not written to the page." : applied.message,
    });
  }
  return {
    ok: applied.ok,
    message: applied.ok
      ? "Saved shipping will be used at place time. Street, phone, and likes were not written to the page or returned to the agent."
      : applied.message,
    profileStatus: profileStatus(target),
  };
}

export function useSavedCustomer(email, who = "agent") {
  const target = String(email || "").trim().toLowerCase();
  if (!target) {
    return { ok: false, signedIn: false, message: "Pass the customer email. Do not expect a list of accounts." };
  }
  const status = profileStatus(target);
  if (!status.available) {
    return { ok: false, message: "No vault record for that email." };
  }
  const password = vaultPassword(target);
  if (!password) {
    return { ok: false, message: "This vault record has no sign-in secret. The customer must sign in once so the vault can store it." };
  }
  const result = authSignIn({ email: target, password });
  if (!result.ok) return { ok: false, message: result.message, passwordReturned: false };
  const first = status.firstName || target;
  announce(`Signed in from the vault as ${first}.`);
  afterAuthSuccess(who);
  const applied = applyIdentityToForm(target);
  if (applied.ok && applied.promo) applyPromo(applied.promo, who);
  if (applied.ok && applied.hasShipping) state.useSavedShipping = true;
  renderVaultBanner();
  return {
    ok: true,
    message: `Signed in as ${first} using a vault-held secret. The password was not returned to the agent. Street and phone were not written to the page.`,
    account: publicAccount(),
    profileStatus: profileStatus(target),
    applied: applied.ok,
    passwordReturned: false,
  };
}

export function getSavedCustomer(email) {
  const session = getSession();
  if (!session) {
    return { signedIn: false, hint: "Sign in on the page, or call sign_in with credentials the person provides." };
  }
  const requested = String(email || "").trim().toLowerCase();
  if (requested && requested !== session.email) {
    return { ok: false, message: "Signed-in session only. Other customer profiles are not listed." };
  }
  const status = profileStatus(session.email);
  return {
    found: status.available,
    profileStatus: status,
    hint: "Call apply_saved_profile to mark saved shipping for use. Street, phone, and likes are not written to the page or returned to the agent.",
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
  if (fields.name || fields.email) applyIdentityToForm(email);
  if (fields.promo) applyPromo(fields.promo, "agent");
  renderVaultBanner();
  announce(`Saved ${saved?.name || email} to the customer vault.`);
  return {
    ok: true,
    message: "Customer saved in this browser vault. Password, street, phone, and likes are stored but not returned to the agent.",
    profileStatus: profileStatus(email),
  };
}

export function placeOrder(fields = {}, confirm = false, who = "agent") {
  if (!getSession()) {
    state.afterLogin = "checkout";
    showLogin();
    return "Sign in before placing an order.";
  }
  if (!state.cart.length) return "The bag is empty.";
  if (!confirm) {
    return "This will place an order. Call prepare_order first if you have not, then call again with confirm=true after the person agrees. Demo shop — no real payment is taken.";
  }
  if (!state.prepared) {
    return {
      success: false,
      error: "Order is not prepared. Call prepare_order first (or the person clicks Review order), then place_order with confirm=true.",
    };
  }
  const session = getSession();
  if (session && !fields.address) {
    applyIdentityToForm(session.email);
    const vault = shippingFromVault(session.email);
    if (vault?.hasShipping) state.useSavedShipping = true;
  }
  fillForm({ name: fields.name, email: fields.email, promo: fields.promo });
  const typed = { ...fields };
  if (!typed.address) delete typed.address;
  if (!typed.city) delete typed.city;
  if (!typed.postcode) delete typed.postcode;
  let data = { ...checkoutData(), ...typed };
  if (!data.address && session) {
    const vault = shippingFromVault(session.email);
    if (vault?.hasShipping) data = { ...vault, promo: typed.promo || data.promo || vault.promo, ...typed };
  }
  if (!data.name || !data.email || !data.address) {
    return "Name, email, and a shipping profile are required. Ask the person to click Use saved details, or type an address.";
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
  state.prepared = false;
  renderCart();
  setRoute("thanks");
  document.querySelector("#thanks-copy").textContent =
    `Order ${id} for ${data.name}. ${money(snapshot.total)} — this is a demo, nothing was charged.`;
  announce(`Order ${id} placed. Details saved to the customer vault.`);
  logEvent({ who, verb: "placed", detail: `Order ${id} placed.` });
  return { id, message: snapshot.message, lines: snapshot.lines, subtotal: snapshot.subtotal, discount: snapshot.discount, total: snapshot.total, promo: snapshot.promo, customer: data.name };
}

export function getAccount() {
  const account = publicAccount();
  if (!account.signedIn) {
    return {
      signedIn: false,
      hint: "Sign in on the page, or call sign_in with credentials the person provides.",
    };
  }
  return {
    ...account,
    profileStatus: profileStatus(account.email),
    hint: "A shipping profile may be on file. Call apply_saved_profile to mark it for use. Street and phone stay off the page until the person clicks Show saved address.",
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
  return { ...result, profileStatus: profileStatus(fields.email), passwordReturned: false };
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
  return { ...result, profileStatus: profileStatus(fields.email) };
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
  const proposal = setProposal({
    title: "Serving bowl vs. mug",
    reason: "Both work as a host gift. Bowl is better for a cook; mug is cheaper and lighter to ship.",
    options: [
      {
        id: "bowl",
        label: "Stone serving bowl £32→£28.80 with HEARTH10",
        tradeoff: "Better for a cook. Heavier. Higher perceived value.",
        suggestedPromo: "HEARTH10",
      },
      {
        id: "mug",
        label: "Everyday mug",
        tradeoff: "Cheaper, lighter delivery, everyday use.",
      },
    ],
    pickId: "bowl",
  });
  logEvent({
    who: "agent",
    verb: "proposed",
    detail: "Serving bowl vs. mug — waiting for your approval.",
  });
  return {
    success: true,
    message: "Ada is signed in from the vault (password not returned). Two gift options are on the proposal card. Nothing was added to the bag and checkout was not opened. Approve a pick, then prepare_order, then place_order with confirm=true.",
    proposal,
    profileStatus: profileStatus("ada@hearth.shop"),
    next: "Human approves → prepare_order → place_order confirm=true.",
  };
}

export function getShopState() {
  const account = getAccount();
  const proposal = getProposal();
  const out = {
    view: state.view,
    query: state.query,
    category: state.category,
    maxPrice: state.maxPrice,
    cartCount: state.cart.reduce((n, line) => n + line.qty, 0),
    total: cartTotal().total,
    prepared: Boolean(state.prepared),
    lastOrder: state.lastOrder?.id || null,
    catalogSize: products.length,
    account,
    proposal: proposal
      ? { title: proposal.title, pickId: proposal.pickId, optionIds: (proposal.options || []).map((row) => row.id) }
      : null,
    activity: getActivity().slice(-6).map((row) => ({ who: row.who, verb: row.verb, detail: row.detail })),
  };
  if (!account.signedIn) {
    out.hint = account.hint;
    return out;
  }
  out.profileStatus = account.profileStatus || profileStatus(account.email);
  out.hint = "If a shipping profile is available, call apply_saved_profile to mark it for use. Street and phone stay off the page until the person clicks Show saved address.";
  return out;
}

export function listProducts() {
  return products.map(({ id, name, price, category, blurb }) => ({ id, name, price, category, blurb }));
}

function resolveProduct(token) {
  const key = String(token || "").trim().toLowerCase();
  if (!key) return null;
  return findProduct(key) || products.find((item) => item.name.toLowerCase().includes(key) || item.id === key) || null;
}

function tokensFrom(value) {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return String(value).split(/[,|]/).map((part) => part.trim()).filter(Boolean);
}

export function restoreCartFromSnapshot(snapshot, who = "you") {
  if (!snapshot) return { ok: false, message: "No snapshot to restore." };
  const wasPrepared = state.prepared;
  state.cart = (snapshot.cart || []).map((line) => ({ id: line.id, qty: line.qty }));
  state.promo = snapshot.promo || "";
  invalidatePreparationIfNeeded(who, wasPrepared);
  renderCart();
  leaveCheckoutIfBagEmpty();
  announce(state.cart.length ? "Cart restored." : "Cart restored. Bag is empty.");
  return getCart();
}

export function applyProposalPick(optionId, opts = {}) {
  const source = opts.source === "ui" ? "ui" : "tool";
  const who = source === "ui" ? "you" : "agent";
  if (source === "ui" && !opts.event?.isTrusted) {
    return { ok: false, message: "Approval requires an explicit trusted click." };
  }
  const proposal = getProposal();
  if (!proposal) return { ok: false, message: "No proposal waiting." };
  const option = (proposal.options || []).find((row) => row.id === optionId)
    || (proposal.options || []).find((row) => row.id === proposal.pickId);
  if (!option) return { ok: false, message: "That option is not on the proposal." };
  const productId = option.productId || option.id;
  const snap = snapshotCart(state.cart, state.promo);
  clearProposal();
  logEvent({
    who,
    verb: "approved",
    detail: `${who === "agent" ? "Agent" : "You"} approved ${option.label}.`,
    snapshot: snap,
    fromProposal: true,
  });
  const added = addToCart(productId, 1, "shop");
  const promo = option.suggestedPromo || option.promo;
  if (promo) applyPromo(promo, "shop");
  return { ok: true, message: `Approved ${option.label}. Added to the bag.`, added };
}

export function approveProposal(optionId) {
  const proposal = getProposal();
  const id = optionId || proposal?.pickId;
  return applyProposalPick(id, { source: "tool" });
}

export function undoLastAction(who = "agent") {
  const result = undoLast(who);
  if (!result.ok) return result;
  restoreCartFromSnapshot(result.snapshot, who);
  return { ok: true, message: `Reverted: ${result.label}.`, cart: getCart() };
}

function cartPromoUnchanged(before) {
  const sameCart = JSON.stringify(before.cart || []) === JSON.stringify(state.cart);
  const samePromo = (before.promo || "") === (state.promo || "");
  return sameCart && samePromo;
}

export function recommendGift({ occasion = "", budget, recipient = "" } = {}, who = "agent") {
  const before = snapshotCart(state.cart, state.promo);
  try {
    const cap = Number(budget) > 0 ? Number(budget) : 40;
    const hay = `${occasion} ${recipient}`.toLowerCase();
    const pool = products.filter((item) => item.price <= cap);
    const scored = pool.map((item) => {
      let score = 0;
      if (/cook|kitchen|chef/.test(hay) && ["bowl", "skillet", "board"].includes(item.id)) score += 3;
      if (/host|dinner|house|gift/.test(hay) && ["bowl", "napkins", "candles", "mug"].includes(item.id)) score += 2;
      if (/everyday|mug|coffee|tea/.test(hay) && item.id === "mug") score += 3;
      if (item.price <= 40) score += 1;
      return { item, score, notes: productNotes[item.id] };
    }).sort((a, b) => b.score - a.score || a.item.price - b.item.price);

    let picks = scored.slice(0, 3);
    if (picks.length < 2) {
      picks = ["bowl", "mug"].map((id) => {
        const item = findProduct(id);
        return { item, score: 1, notes: productNotes[id] };
      }).filter((row) => row.item);
    }

    const title = hay.trim()
      ? `Gift options${recipient ? ` for ${recipient}` : ""}`
      : "Serving bowl vs. mug";
    const reason = /cook/.test(hay)
      ? "Both work as a host gift. A bowl is better for a cook; a mug is cheaper and lighter to ship."
      : "Here are two or three options with trade-offs. Nothing was added to the bag.";

    const proposal = setProposal({
      title,
      reason,
      options: picks.map((row, index) => ({
        id: row.item.id,
        label: `${row.item.name} ${money(row.item.price)}${index === 0 && row.item.id === "bowl" ? " → £28.80 with HEARTH10" : ""}`,
        tradeoff: `${row.notes?.forWhom ? `For ${row.notes.forWhom}. ` : ""}${row.notes?.use || row.item.blurb}. ${row.notes?.ship || ""}`.trim(),
        suggestedPromo: row.item.id === "bowl" ? "HEARTH10" : "",
      })),
      pickId: picks[0].item.id,
    });
    logEvent({
      who,
      verb: "proposed",
      detail: `${title} — waiting for your approval.`,
    });
    return {
      message: "Proposal set. Do not add to the cart, apply a promo, or call approve_proposal until the person approves on the page or in chat.",
      added: false,
      proposal,
      options: proposal.options,
    };
  } finally {
    if (!cartPromoUnchanged(before)) restoreCartFromSnapshot(before);
  }
}

export function compareProducts({ ids, names } = {}) {
  const tokens = [...tokensFrom(ids), ...tokensFrom(names)];
  const items = [];
  for (const token of tokens) {
    const item = resolveProduct(token);
    if (item && !items.some((row) => row.id === item.id)) items.push(item);
  }
  if (items.length < 2) {
    return { ok: false, message: "Pass at least two product ids or names to compare." };
  }
  const compared = items.map((item) => {
    const notes = productNotes[item.id] || {};
    return {
      id: item.id,
      name: item.name,
      price: item.price,
      use: notes.use || item.blurb,
      forWhom: notes.forWhom || "anyone",
      weight: notes.weight || "medium",
      delivery: notes.ship || "Standard",
    };
  });
  const cheapest = [...compared].sort((a, b) => a.price - b.price)[0];
  return {
    compared,
    takeaway: `${cheapest.name} is the cheapest. Heavier pieces cost more to ship and suit a cook; lighter pieces are everyday gifts.`,
  };
}

export function explainCart() {
  const { sub, discount, total } = cartTotal();
  const lines = state.cart.map((line) => {
    const product = findProduct(line.id);
    const notes = productNotes[line.id] || {};
    return {
      id: line.id,
      name: product.name,
      qty: line.qty,
      why: notes.use ? `${notes.use}. Suits ${notes.forWhom}.` : product.blurb,
      lineTotal: product.price * line.qty,
    };
  });
  const missing = [];
  if (!state.cart.length) missing.push("No items in the bag.");
  if (state.promo.toUpperCase() !== "HEARTH10") missing.push("Promo HEARTH10 is not applied.");
  if (!getSession()) missing.push("Not signed in.");
  else if (!profileStatus(getSession().email).hasShipping) missing.push("No saved shipping profile — fill checkout on the page.");
  if (!state.prepared) missing.push("Order not yet prepared — call prepare_order or click Review order.");
  const narrative = lines.length
    ? `${lines.map((line) => `${line.name} × ${line.qty}: ${line.why}`).join(" ")} Total ${money(total)}${state.promo ? ` with ${state.promo}` : ""}.`
    : "The bag is empty.";
  return {
    lines,
    subtotal: sub,
    discount,
    total,
    promo: state.promo || "none",
    prepared: Boolean(state.prepared),
    missing,
    narrative,
  };
}

export function prepareOrder(who = "agent") {
  if (!state.cart.length) return { ok: false, message: "The bag is empty." };
  if (!getSession()) {
    state.afterLogin = "checkout";
    showLogin();
    return { ok: false, message: "Sign in first (use_saved_customer). Then prepare_order." };
  }
  if (els.checkout?.hidden) {
    const opened = startCheckout(who);
    if (opened && typeof opened === "object" && String(opened.message || "").includes("signed-in")) return opened;
  }
  const session = getSession();
  if (session) {
    const applied = applyIdentityToForm(session.email);
    if (applied.ok && applied.promo && state.promo.toUpperCase() !== "HEARTH10") applyPromo(applied.promo, who);
    if (applied.hasShipping) state.useSavedShipping = true;
  }
  state.prepared = true;
  renderOrderReview();
  updatePlaceButton();
  logEvent({ who, verb: "prepared", detail: "Order reviewed. Ready to place when you confirm." });
  announce("Order reviewed. Place order is unlocked.");
  return {
    ok: true,
    prepared: true,
    message: "Order prepared. Review the confirmation on the page, then place_order with confirm=true.",
    summary: explainCart(),
    profileStatus: profileStatus(session.email),
  };
}

function updatePlaceButton() {
  if (els.placeOrder) els.placeOrder.disabled = !state.prepared;
  if (els.placeHint) {
    els.placeHint.textContent = state.prepared
      ? "Reviewed. You can place the order."
      : "Review the order before placing. The agent must call prepare_order first if it is placing for you.";
  }
}

function renderOrderReview() {
  if (!els.orderConfirm || !els.orderConfirmBody) return;
  if (!state.prepared) {
    els.orderConfirm.hidden = true;
    els.orderConfirmBody.replaceChildren();
    return;
  }
  const { sub, discount, total } = cartTotal();
  const session = getSession();
  const status = session ? profileStatus(session.email) : profileStatus();
  const lines = state.cart.map((line) => {
    const product = findProduct(line.id);
    return `${product.name} × ${line.qty} — ${money(product.price * line.qty)}`;
  });
  els.orderConfirm.hidden = false;
  els.orderConfirmBody.replaceChildren();
  const list = document.createElement("ul");
  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = line;
    list.append(li);
  }
  const extras = document.createElement("p");
  extras.textContent = [
    state.promo.toUpperCase() === "HEARTH10" ? `Promo HEARTH10 (−${money(discount)})` : "No promo",
    `Total ${money(total)}`,
    status.hasShipping
      ? (state.shippingRevealed ? "Saved address visible on the form." : "Saved shipping profile on file (hidden from this page).")
      : "Fill shipping on the form.",
  ].join(" · ");
  els.orderConfirmBody.append(list, extras);
}
