// ============================================================
//  Velvet & Co. — Lógica principal (conectado a API/PostgreSQL)
// ============================================================

/* ── Estado de la UI ── */
let activeCategory = 'Todos';
let searchQuery    = '';
let toastTimerRef  = null;

// Caché local de productos (se llenan desde la API)
let _products    = [];
let _categories  = ['Todos'];

/* ── Inicialización ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  Cart.onUpdate(updateCartUI);
  Cart.onUpdate(({ count }) => bumpBadge(count));

  await loadCategories();
  await loadProducts();
});

/* ── Carga de datos desde la API ─────────────────────────── */
async function loadCategories() {
  try {
    _categories = await API.getCategories();
    renderCategoryBar();
  } catch (err) {
    console.error('Error cargando categorías:', err);
  }
}

async function loadProducts() {
  const grid = document.getElementById('productGrid');
  grid.innerHTML = `<div class="empty-state"><p>Cargando productos...</p></div>`;

  try {
    _products = await API.getProducts({
      category: activeCategory,
      search:   searchQuery,
    });
    renderProducts();
  } catch (err) {
    console.error('Error cargando productos:', err);
    grid.innerHTML = `<div class="empty-state"><p>❌ No se pudo conectar al servidor</p></div>`;
  }
}

/* ── Categorías ──────────────────────────────────────────── */
function renderCategoryBar() {
  const bar = document.getElementById('catBar');
  bar.innerHTML = _categories
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
  loadProducts();
}

/* ── Búsqueda ────────────────────────────────────────────── */
function handleSearch() {
  searchQuery = document.getElementById('searchInput').value.trim();
  loadProducts();
}

/* ── Renderizado de productos ────────────────────────────── */
function renderProducts() {
  const grid  = document.getElementById('productGrid');
  const title = document.getElementById('sectionTitle');
  const badge = document.getElementById('countBadge');

  title.textContent = activeCategory === 'Todos' ? 'Todos los productos' : activeCategory;
  badge.textContent = `${_products.length} producto${_products.length !== 1 ? 's' : ''}`;

  if (!_products.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <p style="font-size:2rem;margin-bottom:.5rem">🔍</p>
        <p>No se encontraron productos</p>
      </div>`;
    return;
  }

  grid.innerHTML = _products.map(productCard).join('');
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
        <div class="product-cat">${p.category}</div>
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
async function openModal(id) {
  // Buscar en caché primero, sino pedir a la API
  let p = _products.find((x) => x.id === id);
  if (!p) {
    try { p = await API.getProduct(id); } catch { return; }
  }

  const tags = Array.isArray(p.tags) ? p.tags : JSON.parse(p.tags || '[]');

  document.getElementById('mEmoji').textContent = p.emoji;
  document.getElementById('mCat').textContent   = p.category;
  document.getElementById('mName').textContent  = p.name;
  document.getElementById('mDesc').textContent  = p.description;
  document.getElementById('mPrice').textContent = formatPrice(p.price);
  document.getElementById('mTags').innerHTML    = tags
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
  const p = _products.find((x) => Number(x.id) === Number(id));
  if (!p) return;
  Cart.add(p);
  showToast(`${p.name} añadido`);
}

function updateCartUI({ items, count, total }) {
  const badge = document.getElementById('cartBadge');
  badge.textContent = count;

  document.getElementById('subtotalVal').textContent = formatPrice(total);
  document.getElementById('totalVal').textContent    = formatPrice(total);
  document.getElementById('checkoutBtn').disabled    = items.length === 0;

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
async function checkout() {
  const container = document.getElementById('cartItems');
  const foot      = document.getElementById('cartFoot');
  const { items, total } = Cart.getState();
  const email = document.getElementById('emailInput')?.value || '';

  container.innerHTML = `<div class="cart-empty"><p>Procesando pedido...</p></div>`;
  foot.style.display = 'none';

  try {
    const payload = {
      email,
      items: items.map(({ product: p, qty }) => ({
        product_id: p.id,
        quantity:   qty,
        price:      p.price,
      })),
    };

    const res = await fetch('/api/orders', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Error al procesar');

    container.innerHTML = `
      <div class="success-screen">
        <div class="success-icon">🎉</div>
        <h3>¡Pedido confirmado!</h3>
        <p>Pedido #${data.order_id} guardado correctamente.<br>
           Envío discreto en 2–3 días hábiles.</p>
        <button class="back-btn" onclick="resetAfterCheckout()">Seguir comprando</button>
      </div>`;

    Cart.clear();

  } catch (err) {
    container.innerHTML = `
      <div class="cart-empty">
        <p>❌ ${err.message}</p>
        <button class="back-btn" onclick="resetAfterCheckout()">Volver</button>
      </div>`;
    foot.style.display = 'block';
  }
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
  void badge.offsetWidth;
  if (count > 0) badge.classList.add('bump');
  setTimeout(() => badge.classList.remove('bump'), 300);
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimerRef);
  toastTimerRef = setTimeout(() => el.classList.remove('show'), 2200);
}