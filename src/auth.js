const USERS_KEY = "hearth-users";
const SESSION_KEY = "hearth-session";

const demoUsers = [
  { name: "Ada Okonkwo", email: "ada@hearth.shop", password: "hearth" },
  { name: "Emmanuel Chukwudi", email: "emmaxzchukwudi12@gmail.com", password: "hearth" },
];

function readUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function seed() {
  const users = readUsers();
  let changed = false;
  for (const demo of demoUsers) {
    if (!users.some((user) => user.email === demo.email)) {
      users.push(demo);
      changed = true;
    }
  }
  if (changed) writeUsers(users);
}

seed();

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function publicAccount() {
  const session = getSession();
  if (!session) return { signedIn: false, demo: "ada@hearth.shop / hearth" };
  return { signedIn: true, name: session.name, email: session.email };
}

export function signUp({ name, email, password }) {
  const cleanName = (name || "").trim();
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();
  if (!cleanName || !cleanEmail || !cleanPassword) {
    return { ok: false, message: "Name, email, and password are required." };
  }
  if (!cleanEmail.includes("@")) return { ok: false, message: "Enter a valid email." };
  if (cleanPassword.length < 4) return { ok: false, message: "Password must be at least 4 characters." };
  const users = readUsers();
  if (users.some((user) => user.email === cleanEmail)) {
    return { ok: false, message: "That email already has an account. Log in instead." };
  }
  const user = { name: cleanName, email: cleanEmail, password: cleanPassword };
  users.push(user);
  writeUsers(users);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
  return { ok: true, message: `Welcome, ${user.name}.`, account: publicAccount() };
}

export function signIn({ email, password }) {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();
  const user = readUsers().find((row) => row.email === cleanEmail && row.password === cleanPassword);
  if (!user) {
    return { ok: false, message: "Email or password is wrong. Demo: ada@hearth.shop / hearth" };
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify({ name: user.name, email: user.email }));
  return { ok: true, message: `Signed in as ${user.name}.`, account: publicAccount() };
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
  return { ok: true, message: "Signed out.", account: publicAccount() };
}
