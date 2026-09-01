import { bindUi, runGiftDemo } from "./app.js";
import { registerWebMcp } from "./webmcp.js";
import { bindVoice } from "./voice.js";

try {
  bindUi();
} catch (error) {
  console.error(error);
}
bindVoice();

const status = document.querySelector("#webmcp-status");
const help = document.querySelector("#webmcp-help");
const probeLine = document.querySelector("#mcp-probe");
const demo = document.querySelector("#btn-gift-demo");
if (demo) demo.addEventListener("click", () => runGiftDemo());

function describeProbe(probe) {
  if (!probe) return "";
  if (probe.framed) return "This page is inside a frame. ChatGPT cannot see site tools in iframes — open http://localhost:5176 as the only address.";
  return `API probe: navigator.modelContext=${probe.navigator ? "yes" : "no"}, document.modelContext=${probe.document ? "yes" : "no"}.`;
}

function showToolCount(count) {
  document.querySelectorAll("[data-tool-count]").forEach((node) => {
    node.textContent = `${count} site tools. You still confirm.`;
  });
}

void registerWebMcp((state, count, probe) => {
  if (count) showToolCount(count);
  if (state === "ready") {
    status.textContent = `WebMCP: ${count} tools ready`;
    status.className = "pill ok";
    help.hidden = true;
    return;
  }
  status.textContent = "WebMCP: waiting for agent browser";
  status.className = "pill wait";
  help.hidden = false;
  if (probeLine) probeLine.textContent = describeProbe(probe);
});
