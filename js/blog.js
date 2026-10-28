/* Theme toggle + mobile menu for blog pages */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById('themeBtn');
  function cur() { return root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function paint() {
    var d = cur() === 'dark';
    btn.querySelector('.ico-sun').style.display = d ? 'block' : 'none';
    btn.querySelector('.ico-moon').style.display = d ? 'none' : 'block';
    btn.setAttribute('aria-label', d ? 'Switch to light theme' : 'Switch to dark theme');
  }
  btn.addEventListener('click', function () {
    var n = cur() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', n);
    try { localStorage.setItem('sn-theme', n); } catch (e) {}
    paint();
  });
  paint();
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () { nav.classList.toggle('scrolled', window.scrollY > 10); }, { passive: true });
  var menu = document.getElementById('menuBtn'), links = document.getElementById('navLinks');
  menu.addEventListener('click', function () { var o = links.classList.toggle('open'); menu.setAttribute('aria-expanded', String(o)); });
  root.classList.add('booted');
})();
