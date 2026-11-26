export function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function sizedAvatarUrl(url, size = 72) {
  const raw = String(url || "").trim();
  if (!raw) return "claude-avatar.svg";
  if (/^https:\/\/avatars\.githubusercontent\.com\//.test(raw) && !/[?&](s|size)=\d+/.test(raw)) {
    return `${raw}${raw.includes("?") ? "&" : "?"}s=${size}`;
  }
  if (/^https:\/\/github\.com\/[^/?#]+\.png$/.test(raw)) {
    return `${raw}?size=${size}`;
  }
  return raw;
}

export function formatRepoId(id) {
  if (!id) return "";
  const [owner, ...rest] = id.split("/");
  const name = rest.join("/");
  if (!name) return `<span class="name">${escapeHTML(owner)}</span>`;
  return `<span class="owner">${escapeHTML(owner)}</span><span class="slash">/</span><span class="name">${escapeHTML(name)}</span>`;
}

let avatarFallbackBound = false;
export function initAvatarFallback() {
  if (avatarFallbackBound) return;
  avatarFallbackBound = true;
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const mode = img.dataset.avatarFallback;
    if (!mode) return;
    delete img.dataset.avatarFallback;
    if (mode === "initials") {
      const fallback = document.createElement("div");
      fallback.className = "avatar-fallback";
      fallback.title = img.dataset.author || "";
      fallback.textContent = img.dataset.initials || "AI";
      img.replaceWith(fallback);
      return;
    }
    img.src = "claude-avatar.svg";
    img.classList.add("is-fallback");
  }, true);
}

let modalPreviousActiveElement = null;

export function openModalWithContent(html) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;
  modalPreviousActiveElement = document.activeElement;
  body.innerHTML = html;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.scrollTop = 0;
  const panel = modal.querySelector(".modal-panel");
  if (panel) {
    panel.setAttribute("tabindex", "-1");
    panel.focus();
  } else {
    modal.querySelector(".modal-close")?.focus();
  }
}

export function closeModal() {
  const modal = document.getElementById("modal");
  if (!modal || !modal.classList.contains("open")) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (modalPreviousActiveElement && typeof modalPreviousActiveElement.focus === "function") {
    modalPreviousActiveElement.focus();
  }
  modalPreviousActiveElement = null;
}
