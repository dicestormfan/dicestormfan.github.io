
// Client-side navigation: fetch the target page, swap only .content, never
// touch/reload navbar or the sidebar (so its scroll position and the page's
// own scroll frame stay put -- the whole point of a "static" left column).
function swapContent(html, url) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const newContent = doc.querySelector("main.content");
  const current = document.querySelector("main.content");
  if (!newContent || !current) { location.href = url; return; }
  current.innerHTML = newContent.innerHTML;
  document.title = doc.title;
  document.querySelectorAll(".filetree-sidebar .notelink").forEach((el) => el.classList.remove("active-note"));
  const activeLink = document.querySelector('.filetree-sidebar a[href="' + url + '"]');
  if (activeLink) activeLink.closest(".notelink").classList.add("active-note");
  window.scrollTo(0, 0);
}

function navigate(url, push) {
  fetch(url)
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
  navigate(href, true);
});

window.addEventListener("popstate", function () {
  navigate(location.pathname, false);
});
