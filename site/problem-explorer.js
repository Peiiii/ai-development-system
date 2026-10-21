export class ProblemExplorer {
  constructor(root) {
    this.tabs = [...root.querySelectorAll('[data-problem-tab]')];
    this.panels = [...root.querySelectorAll('[data-problem-panel]')];
    this.tablist = root.querySelector('.problem-tabs');
    this.indicator = root.querySelector('.problem-tab-indicator');
    this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.tablist.setAttribute('role', 'tablist');
    for (const tab of this.tabs) {
      tab.setAttribute('role', 'tab');
      tab.addEventListener('click', () => this.select(tab));
      tab.addEventListener('keydown', this.onKeydown);
    }
    for (const panel of this.panels) panel.setAttribute('role', 'tabpanel');
    root.classList.add('is-enhanced');
    const initial = this.panels.find(panel => panel.dataset.default === 'true') || this.panels[0];
    this.select(this.tabs.find(tab => tab.dataset.problemTab === initial.dataset.problemPanel), false);
    this.observer = new ResizeObserver(() => this.positionIndicator(false));
    this.observer.observe(this.tablist);
    document.fonts.ready.then(() => this.positionIndicator(false));
    if ('IntersectionObserver' in window && !this.motion.matches) {
      const entrance = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        root.animate([{ opacity: .55, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320, easing: 'ease-out' });
        entrance.disconnect();
      }, { threshold: .08 });
      entrance.observe(root);
    }
  }

  select = (tab, animate = true) => {
    const changed = this.selected !== tab;
    this.selected = tab;
    for (const item of this.tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    }
    for (const panel of this.panels) {
      for (const animation of panel.getAnimations()) animation.cancel();
      panel.hidden = panel.dataset.problemPanel !== tab.dataset.problemTab;
      if (!panel.hidden && animate && changed && !this.motion.matches) panel.animate([{ opacity: .5, transform: 'translateX(7px)' }, { opacity: 1, transform: 'translateX(0)' }], { duration: 200, easing: 'ease-out' });
    }
    this.positionIndicator(animate);
  };

  positionIndicator = animate => {
    this.tablist.setAttribute('aria-orientation', window.innerWidth <= 700 ? 'horizontal' : 'vertical');
    this.indicator.classList.toggle('is-moving', animate && !this.motion.matches);
    this.indicator.style.width = `${this.selected.offsetWidth}px`;
    this.indicator.style.height = `${this.selected.offsetHeight}px`;
    this.indicator.style.transform = `translate(${this.selected.offsetLeft}px, ${this.selected.offsetTop}px)`;
    if (window.innerWidth <= 700 && (this.selected.offsetLeft < this.tablist.scrollLeft || this.selected.offsetLeft + this.selected.offsetWidth > this.tablist.scrollLeft + this.tablist.clientWidth)) this.tablist.scrollTo({ left: this.selected.offsetLeft - 12, behavior: 'instant' });
  };

  onKeydown = event => {
    const index = this.tabs.indexOf(event.currentTarget);
    const offsets = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    let next;
    if (event.key in offsets) next = (index + offsets[event.key] + this.tabs.length) % this.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.tabs.length - 1;
    else return;
    event.preventDefault();
    this.tabs[next].focus({ preventScroll: true });
    this.select(this.tabs[next]);
  };
}
