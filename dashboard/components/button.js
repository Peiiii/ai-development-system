// Source-owned primitive: semantic slots and explicit variants, following shadcn/ui.
export function createButton({text = "", variant = "ghost", size = "default", className = "", onClick, label} = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.slot = "button";
  button.dataset.variant = variant;
  button.dataset.size = size;
  button.className = className;
  button.textContent = text;
  if (label) button.setAttribute("aria-label", label);
  if (onClick) button.addEventListener("click", onClick);
  return button;
}
