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
  function total() {
    return read().reduce((s, x) => s + (Number(x.price) || 0) * (Number(x.qty) || 1), 0);
  }
  function add(product) {
    const items = read();
    const id = String(product.id);
    const existing = items.find(x => String(x.id) === id);
    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + 1;
    } else {
      items.push({
        id,
        sku: product.sku || '',
        name: product.name || '',
        price: Number(product.price_pln) || 0,
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
