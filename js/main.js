const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}));

function handleTradeSubmit(e){
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const original = btn.textContent;
  btn.textContent = '✓ Request Sent';
  setTimeout(() => { btn.textContent = original; e.target.reset(); }, 2200);
}

function handleNewsletterSubmit(e){
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = '✓';
  setTimeout(() => { btn.textContent = '→'; e.target.reset(); }, 2200);
}

function handleCatalogueDownload(e){
  e.preventDefault();
  const form = document.getElementById('catalogueForm');
  const success = document.getElementById('downloadSuccess');
  const btn = form.querySelector('button[type="submit"]');
  btn.textContent = 'Submitting...';
  setTimeout(() => {
    form.style.display = 'none';
    success.style.display = 'block';
    success.querySelector('a').click();
  }, 800);
}
