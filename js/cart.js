// ============================================================
//  Velvet & Co. — Módulo de Carrito
// ============================================================

const Cart = (() => {
  // Estado interno
  let items = {};    // { [productId]: { product, qty } }
  let _onUpdate = null;

  /* ── Suscripción ── */
  function onUpdate(callback) { _onUpdate = callback; }

  function _notify() { if (_onUpdate) _onUpdate(getState()); }

  /* ── Operaciones ── */
  function add(product) {
    if (!items[product.id]) items[product.id] = { product, qty: 0 };
    items[product.id].qty++;
    _notify();
  }

  function remove(productId) {
    delete items[productId];
    _notify();
  }

  function changeQty(productId, delta) {
    if (!items[productId]) return;
    items[productId].qty += delta;
    if (items[productId].qty <= 0) delete items[productId];
    _notify();
  }

  function clear() { items = {}; _notify(); }

  /* ── Getters ── */
  function getState() {
    const list   = Object.values(items);
    const count  = list.reduce((s, i) => s + i.qty, 0);
    const total  = list.reduce((s, i) => s + i.product.price * i.qty, 0);
    return { items: list, count, total };
  }

  function isEmpty() { return Object.keys(items).length === 0; }

  return { add, remove, changeQty, clear, getState, isEmpty, onUpdate };
})();