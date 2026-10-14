window.TPCart = (() => {
  const KEY = 'tp-cart';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    updateBadge();
    window.dispatchEvent(new CustomEvent('tp-cart-updated'));
  }
  function count() {
    return read().reduce((s, x) => s + (Number(x.qty) || 1), 0);
  }
  function total(currency) {
    const c = currency || 'PLN';
    return read().reduce((s, x) => {
      const q = Number(x.qty) || 1;
      if (c === 'EUR') {
        const v = Number(x.price_eur);
        return s + (isNaN(v) ? 0 : v * q);
      }
      const v = Number(x.price_pln);
      return s + (isNaN(v) ? 0 : v * q);
    }, 0);
  }
  function add(product) {
    const items = read();
    const id = String(product.id);
    const eur = (product.price_eur === null || product.price_eur === undefined || product.price_eur === '')
      ? null : Number(product.price_eur);
    const existing = items.find(x => String(x.id) === id);
    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + 1;
      if (product.price_pln != null) existing.price_pln = Number(product.price_pln) || 0;
      if (eur !== null) existing.price_eur = eur;
    } else {
      items.push({
        id,
        sku: product.sku || '',
        name: product.name || '',
        price_pln: Number(product.price_pln) || 0,
        price_eur: eur,
        image: product.image || '',
        qty: 1
      });
    }
    write(items);
    return true;
  }
  function remove(id) {
    write(read().filter(x => String(x.id) !== String(id)));
  }
  function setQty(id, qty) {
    const items = read();
    const it = items.find(x => String(x.id) === String(id));
    if (!it) return;
    it.qty = Math.max(1, Math.min(99, Number(qty) || 1));
    write(items);
  }
  function clear() { write([]); }
  function has(id) {
    return read().some(x => String(x.id) === String(id));
  }
  function updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const n = count();
    badge.textContent = n > 0 ? String(n) : '';
    badge.hidden = n === 0;
  }

  document.addEventListener('DOMContentLoaded', updateBadge);
  window.addEventListener('storage', updateBadge);
  window.addEventListener('focus', updateBadge);

  return { read, add, remove, setQty, clear, count, total, has, updateBadge };
})();