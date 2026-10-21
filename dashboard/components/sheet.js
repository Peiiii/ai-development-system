// Composition and data-slot/state conventions reference shadcn/ui Sheet.
// Native dialog owns top-layer modality, focus containment and focus restoration.
export function createSheet(dialog, {side = "right", size = "default"} = {}) {
  if (!(dialog instanceof HTMLDialogElement)) throw new TypeError("Sheet requires a dialog element");
  if (!["left", "right"].includes(side)) throw new TypeError("Unsupported Sheet side");
  if (!["default", "wide"].includes(size)) throw new TypeError("Unsupported Sheet size");
  dialog.dataset.slot = "sheet-content";
  dialog.dataset.side = side;
  dialog.dataset.size = size;
  dialog.dataset.state = "closed";
  const controller = new AbortController();
  const options = {signal:controller.signal};
  let outsidePointer = false;
  let revision = 0;
  function outside(event) {
    const rect = dialog.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom;
  }
  function close() {
    if (!dialog.open || dialog.dataset.state === "closed") return;
    const current = ++revision;
    dialog.dataset.state = "closed";
    const animations = dialog.getAnimations();
    if (!animations.length) { dialog.close(); return; }
    Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (current === revision && dialog.open) dialog.close();
    });
  }
  dialog.addEventListener("cancel", (event) => {event.preventDefault();close();}, options);
  dialog.addEventListener("pointerdown", (event) => {outsidePointer = outside(event);}, options);
  dialog.addEventListener("pointercancel", () => {outsidePointer = false;}, options);
  dialog.addEventListener("click", (event) => {
    if (event.target.closest("[data-sheet-close]")) close();
    else if (outsidePointer && outside(event)) close();
    outsidePointer = false;
  }, options);
  dialog.addEventListener("close", () => {
    // Native close events are queued; a caller may already have reopened this instance.
    if (!dialog.open) dialog.dataset.state = "closed";
  }, options);
  return {
    get isOpen() {return dialog.open && dialog.dataset.state === "open";},
    open() {
      ++revision;
      outsidePointer = false;
      dialog.dataset.state = "open";
      if (!dialog.open) dialog.showModal();
    },
    close,
    destroy() {++revision;controller.abort();dialog.close();},
  };
}
