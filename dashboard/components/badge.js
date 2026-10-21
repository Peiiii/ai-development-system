export function createBadge(text, {variant = "neutral", className = ""} = {}) {
  const badge = document.createElement("span");
  badge.dataset.slot = "badge";
  badge.dataset.variant = variant;
  badge.className = className;
  badge.textContent = text;
  return badge;
}
