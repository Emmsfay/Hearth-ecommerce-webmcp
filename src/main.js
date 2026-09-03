import { applyProposalPick, bindUi, restoreCartFromSnapshot, runGiftDemo } from "./app.js";
import { bindCollab } from "./collab.js";
import { registerWebMcp } from "./webmcp.js";
import { bindVoice } from "./voice.js";

try {
  bindUi();
} catch (error) {
  console.error(error);
}

try {
  bindCollab({
    onUndo(result) {
      if (result?.ok) restoreCartFromSnapshot(result.snapshot, "you");
    },
    onApprove(proposal, event) {
      applyProposalPick(proposal?.pickId, { source: "ui", event });
    },
    onChoose(id, event) {
      applyProposalPick(id, { source: "ui", event });
    },
  });
} catch (error) {
  console.error(error);
}

bindVoice();

const status = document.querySelector("#webmcp-status");
const help = document.querySelector("#webmcp-help");
const probeLine = document.querySelector("#mcp-probe");
const demo = document.querySelector("#btn-gift-demo");
if (demo) demo.addEventListener("click", () => runGiftDemo());

function inAgentBrowser(probe) {
  return Boolean(probe?.navigator || probe?.document || probe?.framed);
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
  if (!help) return;
  if (!inAgentBrowser(probe)) {
    help.hidden = true;
    if (probeLine) probeLine.textContent = "";
    return;
  }
  help.hidden = false;
  if (probeLine) {
    probeLine.textContent = probe.framed
      ? " Open this shop as the only tab — not inside a frame."
      : "";
  }
});
