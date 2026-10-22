const sidebar = document.querySelector('.docs-sidebar');
const toggle = document.querySelector('.doc-menu-button');
const input = document.querySelector('.doc-search input');
const navigation = document.querySelector('#doc-navigation');
const mobile = matchMedia('(max-width: 800px)');
const setMenu = open => {
  navigation.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
};
toggle.addEventListener('click', () => setMenu(navigation.hidden));
setMenu(!mobile.matches);
mobile.addEventListener('change', () => setMenu(!mobile.matches));
input.addEventListener('input', () => {
  const query = input.value.trim().toLocaleLowerCase();
  let found = 0;
  for (const group of sidebar.querySelectorAll('.doc-nav-group')) {
    let count = 0;
    for (const link of group.querySelectorAll('[data-doc-link]')) {
      link.hidden = !link.textContent.toLocaleLowerCase().includes(query);
      if (!link.hidden) count++;
    }
    group.hidden = !count;
    found += count;
  }
  sidebar.querySelector('.doc-no-results').hidden = Boolean(found);
});
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); setMenu(true); input.focus();
  }
});
