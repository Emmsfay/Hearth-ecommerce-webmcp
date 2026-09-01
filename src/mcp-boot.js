(function () {
  var publishedNames = Object.create(null);
  var chain = Promise.resolve();
  var readySent = false;

  function sameContext(a, b) {
    return a === b || (a && b && a.registerTool === b.registerTool && a.provideContext === b.provideContext);
  }

  function grab() {
    var found = [];
    var list = [
      navigator.modelContext,
      document.modelContext,
      window.agent,
      navigator.modelContextTesting,
    ];
    for (var i = 0; i < list.length; i += 1) {
      var ctx = list[i];
      if (!ctx || (typeof ctx.registerTool !== "function" && typeof ctx.provideContext !== "function")) continue;
      var seen = false;
      for (var j = 0; j < found.length; j += 1) {
        if (sameContext(found[j], ctx)) {
          seen = true;
          break;
        }
      }
      if (!seen) found.push(ctx);
    }
    return found;
  }

  function framed() {
    try {
      return window.top !== window;
    } catch (error) {
      return true;
    }
  }

  function probe() {
    return {
      framed: framed(),
      navigator: Boolean(navigator.modelContext),
      document: Boolean(document.modelContext),
      agent: Boolean(window.agent),
      count: grab().length,
    };
  }

  function settle(value) {
    if (!value || typeof value.then !== "function") return Promise.resolve(value);
    return value.catch(function () {});
  }

  async function publishNow(ctx, tools) {
    if (!ctx || !tools || !tools.length) return;
    var fresh = tools.filter(function (tool) {
      return tool && tool.name && !publishedNames[tool.name];
    });
    if (!fresh.length) return;

    if (typeof ctx.provideContext === "function") {
      try {
        await settle(ctx.provideContext({ tools: fresh }));
      } catch (error) {
        void error;
      }
      for (var i = 0; i < fresh.length; i += 1) publishedNames[fresh[i].name] = true;
      return;
    }

    if (typeof ctx.registerTool !== "function") return;
    for (var n = 0; n < fresh.length; n += 1) {
      var tool = fresh[n];
      if (publishedNames[tool.name]) continue;
      publishedNames[tool.name] = true;
      try {
        await settle(ctx.registerTool(tool));
      } catch (error) {
        void error;
      }
    }
  }

  function publish(ctx, tools) {
    chain = chain.then(function () {
      return publishNow(ctx, tools);
    }).catch(function () {});
    return chain;
  }

  function announce() {
    if (readySent || !grab().length) return false;
    readySent = true;
    window.__hearthMcpReady = true;
    document.dispatchEvent(new CustomEvent("hearth-mcp-ready", { detail: probe() }));
    return true;
  }

  window.__hearthMcp = {
    grab: grab,
    probe: probe,
    publish: publish,
    framed: framed,
  };

  if (document.readyState === "complete") announce();
  else window.addEventListener("load", announce);
  setInterval(announce, 250);
})();
