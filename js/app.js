// ============================================================
//  Velvet & Co. — Lógica principal de la aplicación
// ============================================================

/* ── Estado de la UI ── */
let activeCategory = 'Todos';
let searchQuery    = '';
let toastTimer     = null;

/* ── Inicialización ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Cart.onUpdate(updateCartUI);
  renderCategoryBar();
  renderProducts();
  Cart.onUpdate(({ count }) => bumpBadge(count));
});

/* ── Categorías ──────────────────────────────────────────── */
function renderCategoryBar() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = DB.categories
    .map(
      (c) => `
      <button class="cat-btn${c === activeCategory ? ' active' : ''}"
              onclick="setCategory('${c}')">
        ${c}
      </button>`
    )
    .join('');
}

function setCategory(cat) {
  activeCategory = cat;
  renderCategoryBar();
  renderProducts();
}

/* ── Búsqueda ────────────────────────────────────────────── */
function handleSearch() {
  searchQuery = document.getElementById('searchInput').value.toLowerCase().trim();
  renderProducts();
}

/* ── Filtrado ────────────────────────────────────────────── */
function getFilteredProducts() {
  return DB.products.filter((p) => {
    const catOk    = activeCategory === 'Todos' || p.cat === activeCategory;
    const searchOk = !searchQuery || p.name.toLowerCase().includes(searchQuery)
                                  || p.cat.toLowerCase().includes(searchQuery)
                                  || p.tags.some(t => t.toLowerCase().includes(searchQuery));
    return catOk && searchOk;
  });
}

/* ── Renderizado de productos ────────────────────────────── */
function renderProducts() {
  const filtered = getFilteredProducts();
  const grid     = document.getElementById('productGrid');
  const title    = document.getElementById('sectionTitle');
  const badge    = document.getElementById('countBadge');

  title.textContent = activeCategory === 'Todos' ? 'Todos los productos' : activeCategory;
  badge.textContent = `${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <p style="font-size:2rem;margin-bottom:.5rem">🔍</p>
        <p>No se encontraron productos</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(productCard).join('');
}

function productCard(p) {
  const badgeHtml = p.badge
    ? `<span class="product-badge${p.badge === 'Hot' ? ' hot' : ''}">${p.badge}</span>`
    : '';

  return `
    <div class="product-card" onclick="openModal(${p.id})">
      <div class="product-img">
        <span>${p.emoji}</span>
        ${badgeHtml}
      </div>
      <div class="product-info">
        <div class="product-cat">${p.cat}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-stars">${starsHtml(p.stars)}</div>
        <div class="product-bottom">
          <span class="product-price">${formatPrice(p.price)}</span>
          <button class="add-btn"
                  onclick="addToCart(event, ${p.id})"
                  aria-label="Agregar ${p.name} al carrito">+</button>
        </div>
      </div>
    </div>`;
}

/* ── Modal de producto ───────────────────────────────────── */
function openModal(id) {
  const p = DB.products.find((x) => x.id === id);
  if (!p) return;

  document.getElementById('mEmoji').textContent = p.emoji;
  document.getElementById('mCat').textContent   = p.cat;
  document.getElementById('mName').textContent  = p.name;
  document.getElementById('mDesc').textContent  = p.desc;
  document.getElementById('mPrice').textContent = formatPrice(p.price);
  document.getElementById('mTags').innerHTML    = p.tags
    .map((t) => `<span class="tag">${t}</span>`)
    .join('');

  document.getElementById('mAddBtn').onclick = () => {
    addToCartById(p.id);
    closeModal();
  };

  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

/* ── Carrito ─────────────────────────────────────────────── */
function addToCart(event, id) {
  event.stopPropagation();
  addToCartById(id);
}

function addToCartById(id) {
  const p = DB.products.find((x) => x.id === id);
  if (!p) return;
  Cart.add(p);
  showToast(`${p.emoji} ${p.name} añadido`);
}

function updateCartUI({ items, count, total }) {
  // Badge
  const badge = document.getElementById('cartBadge');
  badge.textContent = count;

  // Totales
  document.getElementById('subtotalVal').textContent = formatPrice(total);
  document.getElementById('totalVal').textContent    = formatPrice(total);
  document.getElementById('checkoutBtn').disabled    = items.length === 0;

  // Lista de items
  const container = document.getElementById('cartItems');
  if (!items.length) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛍️</div>
        <p>Tu carrito está vacío</p>
        <small>Explora nuestra colección</small>
      </div>`;
    return;
  }

  container.innerHTML = items.map(cartItemHtml).join('');
}

function cartItemHtml({ product: p, qty }) {
  return `
    <div class="cart-item">
      <div class="cart-item-img">${p.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${formatPrice(p.price * qty)}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="Cart.changeQty(${p.id}, -1)"
                  aria-label="Reducir cantidad">−</button>
          <span class="qty-num">${qty}</span>
          <button class="qty-btn" onclick="Cart.changeQty(${p.id}, 1)"
                  aria-label="Aumentar cantidad">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="Cart.remove(${p.id})"
              aria-label="Eliminar ${p.name}">✕</button>
    </div>`;
}

/* ── Drawer del carrito ──────────────────────────────────── */
function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  const ov     = document.getElementById('overlay');
  const isOpen = drawer.classList.contains('open');

  if (isOpen) {
    drawer.classList.remove('open');
    ov.classList.remove('open');
  } else {
    closeModal();
    drawer.classList.add('open');
    ov.classList.add('open');
  }
}

function closeAll() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}

/* ── Checkout ────────────────────────────────────────────── */
function checkout() {
  const container = document.getElementById('cartItems');
  const foot      = document.getElementById('cartFoot');

  container.innerHTML = `
    <div class="success-screen">
      <div class="success-icon">🎉</div>
      <h3>¡Pedido confirmado!</h3>
      <p>Tu pedido fue procesado exitosamente.<br>
         Recibirás un email de confirmación.<br>
         Envío discreto en 2–3 días hábiles.</p>
      <button class="back-btn" onclick="resetAfterCheckout()">Seguir comprando</button>
    </div>`;

  foot.style.display = 'none';
  Cart.clear();
}

function resetAfterCheckout() {
  document.getElementById('cartFoot').style.display = 'block';
  updateCartUI(Cart.getState());
  closeAll();
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatPrice(n) {
  return '$' + n.toLocaleString('es-CL');
}

function starsHtml(count) {
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

function bumpBadge(count) {
  const badge = document.getElementById('cartBadge');
  badge.classList.remove('bump');
  void badge.offsetWidth;               // reflow para reiniciar la animación
  if (count > 0) badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 300);
}

let toastTimerRef = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimerRef);
  toastTimerRef = setTimeout(() => el.classList.remove('show'), 2200);
}