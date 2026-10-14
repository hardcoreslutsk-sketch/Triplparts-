(() => {
  function init() {
    const btn = document.getElementById('hamburger');
    const menu = document.getElementById('nav-menu');
    if (!btn || !menu) return;

    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
    function toggle(e) {
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    }

    btn.addEventListener('click', toggle);

    document.addEventListener('click', (e) => {
      if (menu.hidden) return;
      if (menu.contains(e.target) || btn.contains(e.target)) return;
      close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });

    menu.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => setTimeout(close, 60));
    });
  }
  document.addEventListener('DOMContentLoaded', init);
})();
