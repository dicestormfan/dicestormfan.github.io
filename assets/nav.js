
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

// ArrowLeft/ArrowRight page through the whole book front-to-back (flat
// depth-first order, see FLAT_ORDER_URLS/flattenOrder in build-site.js) --
// not just prev/next among siblings at the current depth (that's the footer
// nav's job). Ignored with any modifier held, or while a form field has
// focus, so it never fights normal text-selection/editing use of the arrow
// keys.
const FLAT_ORDER = ["/buch/genesys/0-0-introduction/","/buch/genesys/0-0-1-what-is-a-roleplaying-game-anyway/","/buch/genesys/0-0-2-how-do-i-use-this-book/","/buch/genesys/0-0-3-what-do-you-need-to-play/","/buch/genesys/1-0-the-rules/","/buch/genesys/1-0-1-narrative-play/","/buch/genesys/1-1-0-chapter-1-core-mechanics/","/buch/genesys/1-1-1-0-the-dice/","/buch/genesys/1-1-1-1-positive-dice/","/buch/genesys/1-1-1-2-negative-dice/","/buch/genesys/1-1-1-3-ten-sided-dice/","/buch/genesys/1-1-2-0-dice-symbols-and-results/","/buch/genesys/1-1-2-1-positive-results/","/buch/genesys/1-1-2-2-negative-results/","/buch/genesys/1-1-3-lights-camera-action/","/buch/genesys/1-1-4-0-the-basic-dice-pool/","/buch/genesys/1-1-5-0-characteristic-ratings/","/buch/genesys/1-1-5-1-characteristics-in-play/","/buch/genesys/1-1-6-skills-and-training/","/buch/genesys/1-1-7-0-difficulty/","/buch/genesys/1-1-7-1-defining-task-difficulty/","/buch/genesys/1-1-8-0-building-a-basic-dice-pool/","/buch/genesys/1-1-8-1-applying-skills-and-characteristics/","/buch/genesys/1-1-8-2-applying-task-difficulty/","/buch/genesys/1-1-8-3-0-modifying-a-dice-pool/","/buch/genesys/1-1-8-3-1-adding-dice/","/buch/genesys/1-1-8-3-2-upgrading-and-downgrading-dice/","/buch/genesys/1-1-8-3-3-removing-dice/","/buch/genesys/1-1-9-0-interpreting-the-pool/","/buch/genesys/1-1-9-1-successes-and-failures/","/buch/genesys/1-1-9-2-advantage-and-threat/","/buch/genesys/1-1-9-3-rounding-up/","/buch/genesys/1-1-10-0-triumph-and-despair/","/buch/genesys/1-1-10-1-triumph/","/buch/genesys/1-1-10-2-despair/","/buch/genesys/1-1-10-3-unlimited-possibilities/","/buch/genesys/1-1-11-0-other-types-of-checks/","/buch/genesys/1-1-11-1-opposed-checks/","/buch/genesys/1-1-11-2-competitive-checks/","/buch/genesys/1-1-11-3-assisted-checks/","/buch/genesys/1-1-12-0-other-key-elements/","/buch/genesys/1-1-12-1-talents/","/buch/genesys/1-1-12-2-story-points/","/buch/genesys/1-1-13-0-experience-and-development/","/buch/genesys/1-1-13-1-starting-experience-points/","/buch/genesys/1-1-13-2-improving-characteristics/","/buch/genesys/1-1-13-3-skill-training/","/buch/genesys/1-1-13-4-acquiring-talents/","/buch/genesys/1-1-14-0-derived-attributes/","/buch/genesys/1-1-14-1-wound-threshold/","/buch/genesys/1-1-14-2-strain-threshold/","/buch/genesys/1-1-14-3-defense/","/buch/genesys/1-1-14-4-soak-value/","/buch/genesys/1-2-0-chapter-2-creating-characters/","/buch/genesys/1-2-1-character-concept/","/buch/genesys/1-2-2-generation-steps/","/buch/genesys/1-2-3-0-step-1-determine-background/","/buch/genesys/1-2-3-1-background-questions/","/buch/genesys/1-2-4-0-step-2-select-a-character-archetype-or-species/","/buch/genesys/1-2-4-1-archetype-1-average-human/","/buch/genesys/1-2-4-2-archetype-2-the-laborer/","/buch/genesys/1-2-4-3-archetype-3-the-intellectual/","/buch/genesys/1-2-4-4-archetype-4-the-aristocrat/","/buch/genesys/1-2-5-0-step-3-choose-a-career/","/buch/genesys/1-2-5-1-what-does-this-do/","/buch/genesys/1-2-5-2-careers/","/buch/genesys/1-2-5-3-0-role-based-careers/","/buch/genesys/1-2-5-3-1-entertainer/","/buch/genesys/1-2-5-3-2-explorer/","/buch/genesys/1-2-5-3-3-healer/","/buch/genesys/1-2-5-3-4-leader/","/buch/genesys/1-2-5-3-5-scoundrel/","/buch/genesys/1-2-5-3-6-socialite/","/buch/genesys/1-2-5-3-7-soldier/","/buch/genesys/1-2-5-3-8-tradesperson/","/buch/genesys/1-2-5-4-0-setting-based-careers/","/buch/genesys/1-2-5-4-1-hacker/","/buch/genesys/1-2-5-4-2-fighter-pilot/","/buch/genesys/1-2-5-4-3-knight/","/buch/genesys/1-2-5-4-4-mad-scientist/","/buch/genesys/1-2-5-4-5-priest/","/buch/genesys/1-2-5-4-6-druid/","/buch/genesys/1-2-5-4-7-starship-captain/","/buch/genesys/1-2-5-4-8-wizard/","/buch/genesys/1-2-6-0-step-4-invest-experience-points/","/buch/genesys/1-2-6-1-starting-xp/","/buch/genesys/1-2-6-2-improving-characteristics/","/buch/genesys/1-2-6-3-skill-training/","/buch/genesys/1-2-6-4-acquiring-talents/","/buch/genesys/1-2-7-0-step-5-determine-derived-attributes/","/buch/genesys/1-2-7-1-wound-threshold/","/buch/genesys/1-2-7-2-strain-threshold/","/buch/genesys/1-2-7-3-defense/","/buch/genesys/1-2-7-4-soak-value/","/buch/genesys/1-2-8-0-step-6-determine-character-motivation/","/buch/genesys/1-2-8-1-desire/","/buch/genesys/1-2-8-2-fear/","/buch/genesys/1-2-8-3-strength/","/buch/genesys/1-2-8-4-flaw/","/buch/genesys/1-2-8-5-motivations-in-play/","/buch/genesys/1-2-9-0-step-7-choose-gear-appearance-and-personality/","/buch/genesys/1-2-9-1-starting-gear/","/buch/genesys/1-2-9-2-appearance/","/buch/genesys/1-2-9-3-personality/","/buch/genesys/1-3-0-chapter-3-skills/","/buch/genesys/1-3-1-what-are-skills/","/buch/genesys/1-3-2-skill-ranks/","/buch/genesys/1-3-3-skill-descriptions/","/buch/genesys/1-3-4-choosing-skills/","/buch/genesys/1-3-5-0-social-skills/","/buch/genesys/1-3-5-1-charm-presence/","/buch/genesys/1-3-5-2-coercion-willpower/","/buch/genesys/1-3-5-3-deception-cunning/","/buch/genesys/1-3-5-4-leadership-presence/","/buch/genesys/1-3-5-5-negotiation-presence/","/buch/genesys/1-3-6-0-general-skills/","/buch/genesys/1-3-6-1-alchemy-intellect/","/buch/genesys/1-3-6-2-astrocartography-intellect/","/buch/genesys/1-3-6-3-athletics-brawn/","/buch/genesys/1-3-6-4-computers-intellect/","/buch/genesys/1-3-6-5-cool-presence/","/buch/genesys/1-3-6-6-coordination-agility/","/buch/genesys/1-3-6-7-discipline-willpower/","/buch/genesys/1-3-6-8-driving-agility/","/buch/genesys/1-3-6-9-mechanics-intellect/","/buch/genesys/1-3-6-10-medicine-intellect/","/buch/genesys/1-3-6-11-operating-intellect/","/buch/genesys/1-3-6-12-perception-cunning/","/buch/genesys/1-3-6-13-piloting-agility/","/buch/genesys/1-3-6-14-resilience-brawn/","/buch/genesys/1-3-6-15-riding-agility/","/buch/genesys/1-3-6-16-skulduggery-cunning/","/buch/genesys/1-3-6-17-stealth-agility/","/buch/genesys/1-3-6-18-streetwise-cunning/","/buch/genesys/1-3-6-19-survival-cunning/","/buch/genesys/1-3-6-20-vigilance-willpower/","/buch/genesys/1-3-7-0-knowledge-skills/","/buch/genesys/1-3-7-1-knowledge-intellect/","/buch/genesys/1-3-8-0-combat-skills/","/buch/genesys/1-3-8-1-brawl-brawn/","/buch/genesys/1-3-8-2-0-melee-brawn/","/buch/genesys/1-3-8-2-1-melee-light/","/buch/genesys/1-3-8-2-2-melee-heavy/","/buch/genesys/1-3-8-3-0-ranged-agility/","/buch/genesys/1-3-8-3-1-ranged-light/","/buch/genesys/1-3-8-3-2-ranged-heavy/","/buch/genesys/1-3-8-3-3-gunnery/","/buch/genesys/1-3-9-0-magic-skills/","/buch/genesys/1-3-9-1-arcana-intellect/","/buch/genesys/1-3-9-2-divine-willpower/","/buch/genesys/1-3-9-3-primal-cunning/","/buch/genesys/1-4-0-chapter-4-talents/","/buch/genesys/1-4-1-talent-types/","/buch/genesys/1-4-2-talent-tiers/","/buch/genesys/1-4-3-talent-ranks-and-purchasing-the-same-talent-multiple-times/","/buch/genesys/1-4-4-0-talent-descriptions/","/buch/genesys/1-4-4-1-0-talent-entries/","/buch/genesys/1-4-4-1-1-0-tier-1/","/buch/genesys/1-4-4-1-1-1-bought-info/","/buch/genesys/1-4-4-1-1-2-clever-retort/","/buch/genesys/1-4-4-1-1-3-defensive-sysops/","/buch/genesys/1-4-4-1-1-4-desperate-recovery/","/buch/genesys/1-4-4-1-1-5-duelist/","/buch/genesys/1-4-4-1-1-6-durable/","/buch/genesys/1-4-4-1-1-7-forager/","/buch/genesys/1-4-4-1-1-8-grit/","/buch/genesys/1-4-4-1-1-9-hamstring-shot/","/buch/genesys/1-4-4-1-1-10-jump-up/","/buch/genesys/1-4-4-1-1-11-knack-for-it/","/buch/genesys/1-4-4-1-1-12-know-somebody/","/buch/genesys/1-4-4-1-1-13-let-s-ride/","/buch/genesys/1-4-4-1-1-14-one-with-nature/","/buch/genesys/1-4-4-1-1-15-parry/","/buch/genesys/1-4-4-1-1-16-proper-upbringing/","/buch/genesys/1-4-4-1-1-17-quick-draw/","/buch/genesys/1-4-4-1-1-18-quick-strike/","/buch/genesys/1-4-4-1-1-19-rapid-reaction/","/buch/genesys/1-4-4-1-1-20-second-wind/","/buch/genesys/1-4-4-1-1-21-surgeon/","/buch/genesys/1-4-4-1-1-22-swift/","/buch/genesys/1-4-4-1-1-23-toughened/","/buch/genesys/1-4-4-1-1-24-unremarkable/","/buch/genesys/1-4-4-1-2-0-tier-2/","/buch/genesys/1-4-4-1-2-1-basic-military-training/","/buch/genesys/1-4-4-1-2-2-berserk/","/buch/genesys/1-4-4-1-2-3-coordinated-assault/","/buch/genesys/1-4-4-1-2-4-counteroffer/","/buch/genesys/1-4-4-1-2-5-daring-aviator/","/buch/genesys/1-4-4-1-2-6-defensive-stance/","/buch/genesys/1-4-4-1-2-7-defensive-sysops-improved/","/buch/genesys/1-4-4-1-2-8-dual-wielder/","/buch/genesys/1-4-4-1-2-9-fan-the-hammer/","/buch/genesys/1-4-4-1-2-10-heightened-awareness/","/buch/genesys/1-4-4-1-2-11-inspiring-rhetoric/","/buch/genesys/1-4-4-1-2-12-inventor/","/buch/genesys/1-4-4-1-2-13-lucky-strike/","/buch/genesys/1-4-4-1-2-14-scathing-tirade/","/buch/genesys/1-4-4-1-2-15-side-step/","/buch/genesys/1-4-4-1-3-0-tier-3/","/buch/genesys/1-4-4-1-3-1-animal-companion/","/buch/genesys/1-4-4-1-3-2-barrel-roll/","/buch/genesys/1-4-4-1-3-3-distinctive-style/","/buch/genesys/1-4-4-1-3-4-dodge/","/buch/genesys/1-4-4-1-3-5-eagle-eyes/","/buch/genesys/1-4-4-1-3-6-field-commander/","/buch/genesys/1-4-4-1-3-7-forgot-to-count/","/buch/genesys/1-4-4-1-3-8-full-throttle/","/buch/genesys/1-4-4-1-3-9-grenadier/","/buch/genesys/1-4-4-1-3-10-inspiring-rhetoric-improved/","/buch/genesys/1-4-4-1-3-11-painkiller-specialization/","/buch/genesys/1-4-4-1-3-12-scathing-tirade-improved/","/buch/genesys/1-4-4-1-3-13-heroic-will/","/buch/genesys/1-4-4-1-3-14-natural/","/buch/genesys/1-4-4-1-3-15-rapid-archery/","/buch/genesys/1-4-4-1-3-16-parry-improved/","/buch/genesys/1-4-4-1-4-0-tier-4/","/buch/genesys/1-4-4-1-4-1-can-t-we-talk-about-this/","/buch/genesys/1-4-4-1-4-2-deadeye/","/buch/genesys/1-4-4-1-4-3-defensive/","/buch/genesys/1-4-4-1-4-4-defensive-driving/","/buch/genesys/1-4-4-1-4-5-enduring/","/buch/genesys/1-4-4-1-4-6-field-commander-improved/","/buch/genesys/1-4-4-1-4-7-how-convenient/","/buch/genesys/1-4-4-1-4-8-inspiring-rhetoric-supreme/","/buch/genesys/1-4-4-1-4-9-mad-inventor/","/buch/genesys/1-4-4-1-4-10-overcharge/","/buch/genesys/1-4-4-1-4-11-scathing-tirade-supreme/","/buch/genesys/1-4-4-1-5-0-tier-5/","/buch/genesys/1-4-4-1-5-1-dedication/","/buch/genesys/1-4-4-1-5-2-indomitable/","/buch/genesys/1-4-4-1-5-3-master/","/buch/genesys/1-4-4-1-5-4-overcharge-improved/","/buch/genesys/1-4-4-1-5-5-ruinous-repartee/","/buch/genesys/1-5-0-chapter-5-equipment/","/buch/genesys/1-5-1-0-rarity/","/buch/genesys/1-5-1-1-selling-and-trading/","/buch/genesys/1-5-2-0-encumbrance/","/buch/genesys/1-5-2-1-encumbrance-values/","/buch/genesys/1-5-2-2-encumbrance-threshold/","/buch/genesys/1-5-2-3-lifting-and-carrying-excessive-encumbrance/","/buch/genesys/1-5-2-4-concealing-gear/","/buch/genesys/1-5-3-0-item-qualities/","/buch/genesys/1-5-3-1-accurate-passive/","/buch/genesys/1-5-3-2-auto-fire-active/","/buch/genesys/1-5-3-3-blast-active/","/buch/genesys/1-5-3-4-breach-passive/","/buch/genesys/1-5-3-5-burn-active/","/buch/genesys/1-5-3-6-concussive-active/","/buch/genesys/1-5-3-7-cumbersome-passive/","/buch/genesys/1-5-3-8-defensive-passive/","/buch/genesys/1-5-3-9-deflection-passive/","/buch/genesys/1-5-3-10-disorient-active/","/buch/genesys/1-5-3-11-ensnare-active/","/buch/genesys/1-5-3-12-guided-active/","/buch/genesys/1-5-3-13-inaccurate-passive/","/buch/genesys/1-5-3-14-inferior-passive/","/buch/genesys/1-5-3-15-knockdown-active/","/buch/genesys/1-5-3-16-limited-ammo-passive/","/buch/genesys/1-5-3-17-linked-active/","/buch/genesys/1-5-3-18-pierce-passive/","/buch/genesys/1-5-3-19-prepare-passive/","/buch/genesys/1-5-3-20-reinforced-passive/","/buch/genesys/1-5-3-21-slow-firing-passive/","/buch/genesys/1-5-3-22-stun-active/","/buch/genesys/1-5-3-23-stun-damage-passive/","/buch/genesys/1-5-3-24-sunder-active/","/buch/genesys/1-5-3-25-superior-passive/","/buch/genesys/1-5-3-26-tractor-passive/","/buch/genesys/1-5-3-27-unwieldy-passive/","/buch/genesys/1-5-3-28-vicious-passive/","/buch/genesys/1-5-4-item-maintenance/","/buch/genesys/1-5-5-weapons/","/buch/genesys/1-5-6-0-weapon-descriptions/","/buch/genesys/1-5-6-1-knife/","/buch/genesys/1-5-6-2-revolver/","/buch/genesys/1-5-7-armor/","/buch/genesys/1-5-8-0-armor-descriptions/","/buch/genesys/1-5-8-1-heavy-jacket/","/buch/genesys/1-5-9-0-gear/","/buch/genesys/1-5-9-1-gear-characteristics/","/buch/genesys/1-5-9-2-the-right-tool-for-the-job/","/buch/genesys/1-5-9-3-unique-rules/","/buch/genesys/1-5-10-0-gear-descriptions/","/buch/genesys/1-5-10-1-backpack/","/buch/genesys/1-5-10-2-painkiller/","/buch/genesys/1-5-10-3-rope/","/buch/genesys/1-6-0-chapter-6-combat-encounters/","/buch/genesys/1-6-1-0-narrative-and-structured-gameplay/","/buch/genesys/1-6-1-1-structured-gameplay-overview/","/buch/genesys/1-6-1-2-the-turn/","/buch/genesys/1-6-2-incidentals/","/buch/genesys/1-6-3-0-maneuvers/","/buch/genesys/1-6-3-1-maneuver-limitations/","/buch/genesys/1-6-3-2-0-types-of-maneuvers/","/buch/genesys/1-6-3-2-1-aim/","/buch/genesys/1-6-3-2-2-assist/","/buch/genesys/1-6-3-2-3-guarded-stance/","/buch/genesys/1-6-3-2-4-interact-with-the-environment/","/buch/genesys/1-6-3-2-5-manage-gear/","/buch/genesys/1-6-3-2-6-mount-or-dismount/","/buch/genesys/1-6-3-2-7-move/","/buch/genesys/1-6-3-2-8-drop-prone-or-stand-from-prone/","/buch/genesys/1-6-3-2-9-preparation/","/buch/genesys/1-6-4-0-actions/","/buch/genesys/1-6-4-1-action-limitations/","/buch/genesys/1-6-4-2-0-types-of-actions/","/buch/genesys/1-6-4-2-1-exchange-an-action-for-a-maneuver/","/buch/genesys/1-6-4-2-2-spend-an-action-to-activate-an-ability/","/buch/genesys/1-6-4-2-3-perform-a-skill-check/","/buch/genesys/1-6-4-2-4-perform-a-combat-check/","/buch/genesys/1-6-5-0-defense/","/buch/genesys/1-6-5-1-melee-and-ranged-defense/","/buch/genesys/1-6-6-soak/","/buch/genesys/1-6-7-0-range-bands/","/buch/genesys/1-6-7-1-0-the-five-range-bands/","/buch/genesys/1-6-7-1-1-engaged/","/buch/genesys/1-6-7-1-2-short-range/","/buch/genesys/1-6-7-1-3-medium-range/","/buch/genesys/1-6-7-1-4-long-range/","/buch/genesys/1-6-7-1-5-extreme-range/","/buch/genesys/1-6-8-0-additional-combat-modifiers/","/buch/genesys/1-6-8-1-0-conditional-and-situational-modifiers/","/buch/genesys/1-6-8-1-1-making-ranged-attacks-at-engaged-targets/","/buch/genesys/1-6-8-1-2-making-ranged-attacks-while-engaged/","/buch/genesys/1-6-8-1-3-attacking-prone-targets-and-attacking-while-prone/","/buch/genesys/1-6-8-1-4-two-weapon-combat/","/buch/genesys/1-6-8-1-5-unarmed-combat/","/buch/genesys/1-6-8-1-6-improvised-weapons/","/buch/genesys/1-6-8-1-7-size-differences-silhouettes/","/buch/genesys/1-6-9-0-environmental-effects/","/buch/genesys/1-6-9-1-concealment-darkness-smoke-and-intervening-terrain/","/buch/genesys/1-6-9-2-cover/","/buch/genesys/1-6-9-3-difficult-and-impassable-terrain/","/buch/genesys/1-6-9-4-gravity/","/buch/genesys/1-6-9-5-water-and-swimming/","/buch/genesys/1-6-9-6-vacuum/","/buch/genesys/1-6-9-7-fire-acid-and-corrosive-atmospheres/","/buch/genesys/1-6-9-8-suffocation/","/buch/genesys/1-6-9-9-falling/","/buch/genesys/1-6-10-0-wounds-strain-and-states-of-health/","/buch/genesys/1-6-10-1-wounds-and-wound-threshold/","/buch/genesys/1-6-10-2-strain-and-strain-threshold/","/buch/genesys/1-6-11-critical-injuries/","/buch/genesys/1-6-12-0-other-ongoing-status-effects/","/buch/genesys/1-6-12-1-staggered/","/buch/genesys/1-6-12-2-immobilized/","/buch/genesys/1-6-12-3-disoriented/","/buch/genesys/1-6-12-4-death/","/buch/genesys/1-6-13-0-recovery-and-healing/","/buch/genesys/1-6-13-1-0-healing-wounds/","/buch/genesys/1-6-13-1-1-natural-rest/","/buch/genesys/1-6-13-1-2-medical-care/","/buch/genesys/1-6-13-1-3-painkillers/","/buch/genesys/1-6-13-1-4-recovering-from-strain/","/buch/genesys/1-6-13-1-5-recovering-from-critical-injuries/","/buch/genesys/1-7-0-chapter-7-social-encounters/","/buch/genesys/1-7-1-what-is-a-social-encounter/","/buch/genesys/1-7-2-narrative-gameplay/","/buch/genesys/1-7-3-0-structuring-social-encounters/","/buch/genesys/1-7-3-1-determine-the-goal/","/buch/genesys/1-7-3-2-set-a-start-and-end/","/buch/genesys/1-7-3-3-manage-timing-and-ability-use/","/buch/genesys/1-7-3-4-skill-checks-in-social-encounters/","/buch/genesys/1-7-3-5-0-winning-social-encounters/","/buch/genesys/1-7-3-5-1-proposing-a-mutually-agreeable-solution/","/buch/genesys/1-7-3-5-2-succeeding-on-an-opposed-social-skill-check/","/buch/genesys/1-7-3-5-3-targeting-the-opponent-s-strain-threshold/","/buch/genesys/1-7-4-0-using-motivations-in-social-encounters/","/buch/genesys/1-7-4-1-increase-or-decrease-your-chances/","/buch/genesys/1-7-4-2-discerning-other-characters-motivations/","/buch/genesys/1-8-0-chapter-8-the-gamemaster/","/buch/genesys/1-8-1-0-gaming-the-system/","/buch/genesys/1-8-1-1-the-most-important-thing/","/buch/genesys/1-8-2-0-before-play-begins/","/buch/genesys/1-8-2-1-social-contract/","/buch/genesys/1-8-2-2-setting-the-stage/","/buch/genesys/1-8-3-0-player-character-creation/","/buch/genesys/1-8-3-1-character-building/","/buch/genesys/1-8-3-2-personal-knowledge/","/buch/genesys/1-8-4-0-preparation-tips/","/buch/genesys/1-8-4-1-bullet-points/","/buch/genesys/1-8-4-2-reminders-and-notes/","/buch/genesys/1-8-4-3-npc-roll-call/","/buch/genesys/1-8-5-0-game-mastering-resources/","/buch/genesys/1-8-5-1-boost-and-setback-dice/","/buch/genesys/1-8-5-2-story-points/","/buch/genesys/1-8-5-3-motivation/","/buch/genesys/1-8-5-4-strain/","/buch/genesys/1-8-5-5-initiative/","/buch/genesys/1-8-5-6-experience-points/","/buch/genesys/1-8-5-7-time-and-timing/","/buch/genesys/1-8-6-0-the-narrative-dice/","/buch/genesys/1-8-6-1-0-get-everyone-involved/","/buch/genesys/1-8-6-1-1-interpreting-symbols-and-colors/","/buch/genesys/1-8-6-1-2-dynamic-dice/","/buch/genesys/1-8-7-0-adversaries/","/buch/genesys/1-8-7-1-0-adversary-profiles/","/buch/genesys/1-8-7-1-1-minions/","/buch/genesys/1-8-7-1-2-rivals/","/buch/genesys/1-8-7-1-3-nemeses/","/buch/genesys/1-8-8-0-adversary-profile/","/buch/genesys/1-8-8-0-1-street-tough-minion/","/buch/genesys/1-8-8-0-2-gang-leader-rival/","/buch/genesys/1-8-8-0-3-local-official-nemesis/","/buch/genesys/1-8-8-1-making-sure-adversaries-are-appropriate-challenges/","/buch/genesys/2-0-settings/","/buch/genesys/2-0-1-the-setting-worksheet/","/buch/genesys/2-0-2-0-setting-sheet/","/buch/genesys/2-0-2-1-setting/","/buch/genesys/2-0-2-2-overview/","/buch/genesys/2-0-2-3-genre-setting-tropes-and-themes/","/buch/genesys/2-0-2-4-factions-organizations/","/buch/genesys/2-0-2-5-movers-shakers/","/buch/genesys/2-0-2-6-major-species-types/","/buch/genesys/2-0-2-7-setting-specific-skills/","/buch/genesys/2-0-2-8-technology-level/","/buch/genesys/2-1-0-chapter-1-fantasy/","/buch/genesys/2-1-1-0-tropes/","/buch/genesys/2-1-1-1-magic/","/buch/genesys/2-1-1-2-monsters/","/buch/genesys/2-1-1-3-quests/","/buch/genesys/2-1-1-4-the-macguffin/","/buch/genesys/2-1-1-5-good-and-evil/","/buch/genesys/2-1-1-6-familiar-historical-elements/","/buch/genesys/2-1-1-7-keeps-and-dungeons/","/buch/genesys/2-1-1-8-different-styles-of-fantasy/","/buch/genesys/2-1-2-example-setting-runebound/","/buch/genesys/2-1-3-0-new-starting-character-options/","/buch/genesys/2-1-3-1-elf/","/buch/genesys/2-1-3-2-dwarf/","/buch/genesys/2-1-3-3-orc/","/buch/genesys/2-1-4-0-setting-specific-gear/","/buch/genesys/2-1-4-1-0-weapons/","/buch/genesys/2-1-4-1-1-axe-mace-or-sword/","/buch/genesys/2-1-4-1-2-greatsword-or-greataxe/","/buch/genesys/2-1-4-1-3-halberd/","/buch/genesys/2-1-4-1-4-light-spear/","/buch/genesys/2-1-4-1-5-shield/","/buch/genesys/2-1-4-1-6-bow-and-longbow/","/buch/genesys/2-1-4-1-7-crossbow/","/buch/genesys/2-1-4-2-0-armor/","/buch/genesys/2-1-4-2-1-chainmail/","/buch/genesys/2-1-4-2-2-heavy-robes/","/buch/genesys/2-1-4-2-3-leather-armor/","/buch/genesys/2-1-4-2-4-plate-armor/","/buch/genesys/2-1-4-2-5-magic-plate/","/buch/genesys/2-1-4-3-0-gear/","/buch/genesys/2-1-4-3-1-backpack-of-holding/","/buch/genesys/2-1-4-3-2-fine-cloak/","/buch/genesys/2-1-4-3-3-herbs-of-healing/","/buch/genesys/2-1-4-3-4-thieves-tools/","/buch/genesys/2-1-4-3-5-torch/","/buch/genesys/2-1-4-3-6-winter-clothing/","/buch/genesys/2-1-5-0-setting-specific-adversaries/","/buch/genesys/2-1-5-1-skeleton-minion/","/buch/genesys/2-1-5-2-beastman-minion/","/buch/genesys/2-1-5-3-razorwing-rival/","/buch/genesys/2-1-5-4-bane-spider-rival/","/buch/genesys/2-1-5-5-ogre-nemesis/","/buch/genesys/3-0-game-master-s-toolkit/","/buch/genesys/3-1-0-chapter-1-customizing-rules/","/buch/genesys/3-1-1-0-create-a-skill/","/buch/genesys/3-1-1-1-designing-a-skill/","/buch/genesys/3-1-1-2-things-to-consider-when-creating-a-skill/","/buch/genesys/3-1-1-3-counting-skill-characteristic-links/","/buch/genesys/3-1-2-0-create-a-species-or-archetype/","/buch/genesys/3-1-2-1-creating-a-species-or-archetype/","/buch/genesys/3-1-2-2-modifying-the-basic-species-profile/","/buch/genesys/3-1-3-0-create-a-talent/","/buch/genesys/3-1-3-1-what-is-a-talent/","/buch/genesys/3-1-3-2-creating-a-talent/","/buch/genesys/3-1-4-0-create-an-item/","/buch/genesys/3-1-4-1-gear/","/buch/genesys/3-1-4-2-gear-with-specific-rules/","/buch/genesys/3-1-4-3-armor/","/buch/genesys/3-1-4-4-weapons/","/buch/genesys/3-1-5-0-create-an-adversary/","/buch/genesys/3-1-5-1-develop-a-concept/","/buch/genesys/3-1-5-2-choose-adversary-type/"];
document.addEventListener("keydown", function (e) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
  const idx = FLAT_ORDER.indexOf(location.pathname);
  if (idx === -1) return;
  const targetIdx = e.key === "ArrowLeft" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= FLAT_ORDER.length) return;
  navigate(FLAT_ORDER[targetIdx], true);
});

// Domain switch (top-left "Genesys" / "Terrinoth"): a client-side theme
// toggle -- swaps the domain-* class on <body> (driving fonts, header
// colors, and the background image via site.css), and marks
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

// Light/dark toggle (top-right glyph button). The initial theme is already
// applied by the inline script right after <body> (see pageShell) -- before
// this file even loads -- so all that's left here is reacting to clicks.
const THEME_STORAGE_KEY = "theme";
const themeToggle = document.querySelector(".theme-toggle");
if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    const next = document.body.classList.contains("theme-dark") ? "light" : "dark";
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add("theme-" + next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
  });
}
