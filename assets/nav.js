
// We control scroll position ourselves on every navigation (see swapContent)
// -- don't let the browser's own back/forward scroll memory fight that.
history.scrollRestoration = "manual";

// Accordion tree: opening a branch closes its sibling branches at the same
// level, so at most one root-to-leaf path is ever expanded at once. "toggle"
// does not bubble, so this must be a capturing listener on an ancestor.
document.addEventListener("toggle", function (e) {
  const el = e.target;
  if (!(el instanceof HTMLDetailsElement) || !el.classList.contains("tree-node") || !el.open) return;
  const parent = el.parentElement;
  if (!parent) return;
  Array.from(parent.children).forEach((sib) => {
    if (sib !== el && sib.tagName === "DETAILS" && sib.open) sib.open = false;
  });
}, true);

// Client-side navigation: fetch the target page, swap only .content and the
// footer nav, never touch/reload navbar or the sidebar (so its scroll
// position and expanded tree branches stay put -- the whole point of a
// "static" left column).
function swapContent(html, url) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const newContent = doc.querySelector("main.content");
  const current = document.querySelector("main.content");
  if (!newContent || !current) { location.href = url; return; }
  current.innerHTML = newContent.innerHTML;
  document.title = doc.title;

  const newFooter = doc.querySelector("#page-footer-nav");
  const currentFooter = document.querySelector("#page-footer-nav");
  if (newFooter && currentFooter) currentFooter.innerHTML = newFooter.innerHTML;

  document.querySelectorAll(".filetree-sidebar .active-note").forEach((el) => el.classList.remove("active-note"));
  const activeLink = document.querySelector('.filetree-sidebar a[href="' + url + '"]');
  const keepOpen = new Set();
  if (activeLink) {
    const holder = activeLink.closest(".notelink");
    if (holder) holder.classList.add("active-note");
    let d = activeLink.closest("details");
    while (d) {
      d.open = true;
      keepOpen.add(d);
      // The whole open path -- current article + every ancestor -- shares
      // the same active-note highlight (mirrors the server-rendered tree).
      const summary = d.querySelector(":scope > summary.notelink");
      if (summary) summary.classList.add("active-note");
      d = d.parentElement ? d.parentElement.closest("details") : null;
    }
    activeLink.scrollIntoView({ block: "nearest" });
  }
  // Client-side swaps never went through the server's single-path render, so
  // any branch left open from before that isn't on the new active path (e.g.
  // a whole other top-level section) has to be closed explicitly here too.
  document.querySelectorAll(".filetree-sidebar details.tree-node[open]").forEach((d) => {
    if (!keepOpen.has(d)) d.open = false;
  });

  // Reset scroll on every plausible scroll container -- which one actually
  // holds the page's scroll offset depends on the inherited Obsidian-app
  // CSS cascade, so cover window/html/body all at once rather than guess.
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  current.scrollTop = 0;
}

function navigate(url, push) {
  return fetch(url)
    .then((r) => r.text())
    .then((html) => {
      swapContent(html, url);
      if (push) history.pushState({ url: url }, "", url);
    })
    .catch(() => { location.href = url; });
}

document.addEventListener("click", function (e) {
  const a = e.target.closest("a");
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/") || a.target === "_blank") return;
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();

  // A tree-node label click always toggles ITS OWN branch closed if it was
  // already open -- whether that's because you're already on that exact
  // page, or because you navigated into one of its descendants (making it
  // an already-open ancestor). Capture the pre-click state before anything
  // (navigation, the active-path re-render) can change it.
  const summary = a.closest("summary");
  const ownDetails = summary ? summary.closest("details") : null;
  const wasOpen = ownDetails ? ownDetails.open : false;

  if (href === location.pathname) {
    // Already on this page -- nothing to fetch, just toggle.
    if (ownDetails) ownDetails.open = !wasOpen;
    return;
  }

  navigate(href, true).then(() => {
    // swapContent() always force-opens the newly active node's own branch
    // to reveal the new position -- override that back closed if the user
    // just clicked an already-expanded branch (same "click open -> close"
    // rule as the same-page case above).
    if (ownDetails && wasOpen) ownDetails.open = false;
  });
});

window.addEventListener("popstate", function () {
  navigate(location.pathname, false);
});

// Domain switch (top-left "Genesys" / "Terrinoth"): a client-side theme
// toggle -- swaps the domain-* class on <body> (driving fonts, header
// colors, and the background image via custom-style.css), and marks
// whichever word is active vs. inactive. Persisted in localStorage so it
// survives full page reloads; client-side navigate() above never touches
// <body>, so within a session the choice already carries over on its own.
const DOMAIN_STORAGE_KEY = "domain";
function applyDomain(domain) {
  document.body.classList.remove("domain-genesys", "domain-terrinoth");
  document.body.classList.add("domain-" + domain);
  document.querySelectorAll(".domain-switch").forEach(function (el) {
    el.classList.toggle("active", el.dataset.domain === domain);
  });
}
document.querySelectorAll(".domain-switch").forEach(function (el) {
  el.addEventListener("click", function (e) {
    // Genesys keeps its real href="/" (existing click handler above still
    // navigates there); Terrinoth has no content of its own yet, so its
    // click is a pure theme toggle with nothing to navigate to.
    if (el.getAttribute("href") === "#") e.preventDefault();
    localStorage.setItem(DOMAIN_STORAGE_KEY, el.dataset.domain);
    applyDomain(el.dataset.domain);
  });
});
(function () {
  const saved = localStorage.getItem(DOMAIN_STORAGE_KEY);
  if (saved === "genesys" || saved === "terrinoth") applyDomain(saved);
})();
