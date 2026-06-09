// ============================================================
//  Velvet & Co. — Comunicación con la API del servidor
//  Reemplaza products.js (datos hardcodeados)
// ============================================================

const API = {
  baseURL: '/api',

  async getCategories() {
    const res = await fetch(`${this.baseURL}/categories`);
    if (!res.ok) throw new Error('Error al cargar categorías');
    return res.json();
  },

  async getProducts({ category = null, search = '' } = {}) {
    const params = new URLSearchParams();
    if (category && category !== 'Todos') params.set('category', category);
    if (search) params.set('search', search);
    const url = `${this.baseURL}/products${params.size ? '?' + params : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error al cargar productos');
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`${this.baseURL}/products/${id}`);
    if (!res.ok) throw new Error('Producto no encontrado');
    return res.json();
  },
};