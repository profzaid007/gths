(function(){
  const state = {
    products: [],
    categories: [],
    activeCategory: 'all',
    activeSubcategory: 'all',
    search: ''
  };

  const els = {
    categoryCards: document.getElementById('categoryCards'),
    categoryChips: document.getElementById('categoryChips'),
    subcategoryChips: document.getElementById('subcategoryChips'),
    search: document.getElementById('productSearch'),
    resultsInfo: document.getElementById('resultsInfo'),
    grid: document.getElementById('productsGrid')
  };

  function slugify(text){
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function getCategoryIcon(name){
    const icons = {
      'Hand Tools & Measuring Instruments': '<svg class="icon" viewBox="0 0 40 40"><line x1="9" y1="33" x2="21" y2="21"/><g transform="rotate(45 27 15)"><rect x="19" y="9" width="16" height="12" rx="2"/><line x1="19" y1="15" x2="12" y2="15"/></g></svg>',
      'Power Tools & Cutting Equipment': '<svg class="icon" viewBox="0 0 40 40"><rect x="6" y="14" width="18" height="9" rx="3"/><path d="M24 15 L31 17 L31 20 L24 22 Z"/><line x1="31" y1="18.5" x2="36" y2="18.5"/><path d="M13 23 L18 23 L16 33 L11 33 Z"/><rect x="10" y="33" width="7" height="4" rx="1"/></svg>',
      'Fasteners, Fixings & Hardware': '<svg class="icon" viewBox="0 0 40 40"><polygon points="20,6 27,10 27,18 20,22 13,18 13,10"/><line x1="20" y1="22" x2="20" y2="34"/><line x1="16" y1="25" x2="24" y2="25"/><line x1="16" y1="29" x2="24" y2="29"/><line x1="16" y1="33" x2="24" y2="33"/></svg>',
      'Electricals & Safety': '<svg class="icon" viewBox="0 0 40 40"><path d="M8 26 A12 10 0 0 1 32 26 Z"/><line x1="5" y1="26" x2="35" y2="26"/><line x1="20" y1="10" x2="20" y2="15"/></svg>',
      'Plumbing, Pipes & Fittings': '<svg class="icon" viewBox="0 0 40 40"><path d="M8 12h8v8H8z"/><path d="M16 14h8v8h-8z"/><path d="M24 16h8v8h-8z"/><line x1="12" y1="20" x2="12" y2="30"/><line x1="28" y1="12" x2="28" y2="16"/></svg>',
      'Pneumatics & Air Tools': '<svg class="icon" viewBox="0 0 40 40"><circle cx="20" cy="20" r="10"/><path d="M20 10v10l7 7"/></svg>',
      'Adhesives, Paints & Surface Finishing': '<svg class="icon" viewBox="0 0 40 40"><path d="M20 8c0 0-8 12-8 18a8 8 0 0016 0c0-6-8-18-8-18z"/></svg>',
      'Material Handling, Storage & Lifting': '<svg class="icon" viewBox="0 0 40 40"><rect x="6" y="16" width="28" height="18" rx="2"/><path d="M14 16 L14 11 A2 2 0 0 1 16 9 L24 9 A2 2 0 0 1 26 11 L26 16"/><line x1="6" y1="24" x2="34" y2="24"/><rect x="17" y="21" width="6" height="6" rx="1"/></svg>',
      'Welding & Metalworking': '<svg class="icon" viewBox="0 0 40 40"><path d="M10 30l10-20 10 20z"/><line x1="12" y1="26" x2="28" y2="26"/></svg>'
    };
    return icons[name] || '<svg class="icon" viewBox="0 0 40 40"><circle cx="20" cy="20" r="10"/></svg>';
  }

  function renderCategoryCards(){
    els.categoryCards.innerHTML = state.categories.map(cat => {
      const count = state.products.filter(p => p.category === cat.id).length;
      return `<button class="cat-card" data-category="${cat.id}" type="button">
        <span class="rivet tl"></span><span class="rivet tr"></span>
        ${getCategoryIcon(cat.name)}
        <h3>${cat.name}</h3>
        <span class="count">${count} items</span>
      </button>`;
    }).join('');
  }

  function renderChips(){
    const catChips = [`<button class="chip ${state.activeCategory === 'all' ? 'active' : ''}" data-category="all" type="button">All</button>`]
      .concat(state.categories.map(cat => `<button class="chip ${state.activeCategory === cat.id ? 'active' : ''}" data-category="${cat.id}" type="button">${cat.name}</button>`));
    els.categoryChips.innerHTML = catChips.join('');

    let subChips = [`<button class="chip ${state.activeSubcategory === 'all' ? 'active' : ''}" data-subcategory="all" type="button">All</button>`];
    if (state.activeCategory !== 'all'){
      const cat = state.categories.find(c => c.id === state.activeCategory);
      if (cat){
        subChips = subChips.concat(cat.subcategories.map(sub => `<button class="chip ${state.activeSubcategory === sub.id ? 'active' : ''}" data-subcategory="${sub.id}" type="button">${sub.name}</button>`));
      }
    } else {
      subChips = [];
    }
    els.subcategoryChips.innerHTML = subChips.join('');
    els.subcategoryChips.style.display = subChips.length ? 'flex' : 'none';
  }

  function getFilteredProducts(){
    const q = state.search.toLowerCase().trim();
    return state.products.filter(p => {
      const matchesCategory = state.activeCategory === 'all' || p.category === state.activeCategory;
      const matchesSubcategory = state.activeSubcategory === 'all' || p.subcategory === state.activeSubcategory;
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.subcategoryName.toLowerCase().includes(q);
      return matchesCategory && matchesSubcategory && matchesSearch;
    });
  }

  function renderProducts(){
    const filtered = getFilteredProducts();
    els.resultsInfo.textContent = `Showing ${filtered.length} of ${state.products.length} products`;
    if (!filtered.length){
      els.grid.innerHTML = '<div class="no-results">No products match your filters. Try a different search or category.</div>';
      return;
    }
    els.grid.innerHTML = filtered.map(p => `
      <article class="product-card">
        <div class="product-media">
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-body">
          <div class="product-meta">${p.subcategoryName}</div>
          <h3>${p.name}</h3>
          <p class="product-desc">${p.description}</p>
          <div class="product-price">${p.price}</div>
          <button class="btn btn-dark btn-block" type="button">Request Quote</button>
        </div>
      </article>
    `).join('');
  }

  function bindEvents(){
    els.categoryCards.addEventListener('click', e => {
      const card = e.target.closest('.cat-card');
      if (!card) return;
      state.activeCategory = card.dataset.category;
      state.activeSubcategory = 'all';
      state.search = '';
      els.search.value = '';
      updateUI();
    });

    els.categoryChips.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.activeCategory = chip.dataset.category;
      state.activeSubcategory = 'all';
      updateUI();
    });

    els.subcategoryChips.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      state.activeSubcategory = chip.dataset.subcategory;
      updateUI();
    });

    els.search.addEventListener('input', e => {
      state.search = e.target.value;
      updateUI();
    });
  }

  function updateUI(){
    renderChips();
    renderProducts();
  }

  fetch('/assets/data/products.json')
    .then(r => r.json())
    .then(data => {
      state.categories = data.categories;
      state.products = data.products;
      renderCategoryCards();
      renderChips();
      renderProducts();
      bindEvents();
    })
    .catch(err => {
      els.grid.innerHTML = '<div class="no-results">Unable to load catalogue. Please try again later.</div>';
      console.error(err);
    });
})();
