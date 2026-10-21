/** Source-owned horizontal Tabs for one shared, locally rendered content panel. */
export function createTabs(list, panel, {onValueChange = () => {}} = {}) {
  const tabs = [...list.querySelectorAll('[data-slot="tabs-trigger"]')];
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'horizontal');
  panel.setAttribute('role', 'tabpanel');
  let value;
  function select(next) {
    const selected = tabs.find(tab=>tab.dataset.value === next && !tab.disabled);
    if (!selected) return;
    value = next;
    for (const tab of tabs) {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      tab.setAttribute('aria-selected', String(tab === selected));
      tab.dataset.state = tab === selected ? 'active' : 'inactive';
      tab.tabIndex = tab === selected ? 0 : -1;
    }
    panel.setAttribute('aria-labelledby', selected.id);
  }
  function click(event) {
    const tab = event.target.closest('[data-slot="tabs-trigger"]');
    if (!tabs.includes(tab) || tab.disabled || tab.dataset.value === value) return;
    select(tab.dataset.value);
    onValueChange(value);
  }
  function keydown(event) {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    const available = tabs.filter(tab=>!tab.disabled);
    const index = available.indexOf(event.target);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? available.length-1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + available.length) % available.length;
    available[next].focus();
    available[next].click();
  }
  select(tabs.find(tab=>tab.getAttribute('aria-selected') === 'true')?.dataset.value || tabs[0]?.dataset.value);
  list.addEventListener('click', click);
  list.addEventListener('keydown', keydown);
  return {select, get value() {return value;}, destroy() {list.removeEventListener('click',click);list.removeEventListener('keydown',keydown);}};
}
