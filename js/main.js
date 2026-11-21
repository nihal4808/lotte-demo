/**
 * LOTTE INDIA — MAIN JAVASCRIPT
 * Handles: Navigation, Hero Slider, Brand Carousel, 
 *          FAQ, Forms, Tabs, Scroll Animations, etc.
 */

'use strict';

// ========================================
// NAVIGATION
// ========================================
const navbar = document.getElementById('navbar');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');

// Scroll behavior
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar?.classList.add('scrolled');
    scrollTopBtn?.classList.add('visible');
  } else {
    navbar?.classList.remove('scrolled');
    scrollTopBtn?.classList.remove('visible');
  }
});

// Mobile menu toggle
navToggle?.addEventListener('click', () => {
  navMenu?.classList.toggle('mobile-open');
  const spans = navToggle.querySelectorAll('span');
  if (navMenu?.classList.contains('mobile-open')) {
    spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
    spans[1].style.opacity = '0';
    spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
  } else {
    spans.forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }
});

// Mobile nav dropdowns
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024) {
      const hasDropdown = item.querySelector('.dropdown-menu, .mega-dropdown');
      if (hasDropdown && !e.target.closest('a[href]:not([href="#"])')) {
        e.preventDefault();
        item.classList.toggle('mobile-expanded');
      }
    }
  });
});

// Close menu on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('#navbar') && navMenu?.classList.contains('mobile-open')) {
    navMenu.classList.remove('mobile-open');
  }
});

// ========================================
// HERO SLIDER
// ========================================
const heroSlides = document.querySelectorAll('.hero-slide');
const heroDots = document.querySelectorAll('.hero-dot');
let currentSlide = 0;
let heroInterval;

function showSlide(n) {
  heroSlides.forEach(s => s.classList.remove('active'));
  heroDots.forEach(d => d.classList.remove('active'));
  currentSlide = (n + heroSlides.length) % heroSlides.length;
  heroSlides[currentSlide]?.classList.add('active');
  heroDots[currentSlide]?.classList.add('active');
}

function startHeroSlider() {
  if (!heroSlides.length) return;
  heroInterval = setInterval(() => showSlide(currentSlide + 1), 6000);
}

document.querySelector('.hero-next')?.addEventListener('click', () => {
  clearInterval(heroInterval);
  showSlide(currentSlide + 1);
  startHeroSlider();
});

document.querySelector('.hero-prev')?.addEventListener('click', () => {
  clearInterval(heroInterval);
  showSlide(currentSlide - 1);
  startHeroSlider();
});

heroDots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    clearInterval(heroInterval);
    showSlide(i);
    startHeroSlider();
  });
});

startHeroSlider();

// ========================================
// BRAND CAROUSEL
// ========================================
const brandSlides = document.querySelectorAll('.brand-slide');
const brandTabs = document.querySelectorAll('.brand-tab');
let currentBrand = 0;
let brandInterval;

function showBrand(n) {
  brandSlides.forEach(s => s.classList.remove('active'));
  brandTabs.forEach(t => t.classList.remove('active'));
  currentBrand = (n + brandSlides.length) % brandSlides.length;
  brandSlides[currentBrand]?.classList.add('active');
  brandTabs[currentBrand]?.classList.add('active');
}

brandTabs.forEach((tab, i) => {
  tab.addEventListener('click', () => {
    clearInterval(brandInterval);
    showBrand(i);
    brandInterval = setInterval(() => showBrand(currentBrand + 1), 7000);
  });
});

if (brandSlides.length) {
  brandInterval = setInterval(() => showBrand(currentBrand + 1), 7000);
}

// ========================================
// TABS (Investor Centre)
// ========================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target)?.classList.add('active');
  });
});

// Activate first tab
const firstTab = document.querySelector('.tab-btn');
const firstPanel = document.querySelector('.tab-panel');
if (firstTab) firstTab.classList.add('active');
if (firstPanel) firstPanel.classList.add('active');

// ========================================
// FAQ ACCORDION
// ========================================
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const item = question.closest('.faq-item');
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('open');
    
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-answer')?.classList.remove('open');
    });
    
    // Toggle clicked
    if (!isOpen) {
      item.classList.add('open');
      answer?.classList.add('open');
    }
  });
});

// ========================================
// SCROLL ANIMATIONS (AOS-like)
// ========================================
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add('aos-animate');
      }, parseInt(delay));
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('[data-aos]').forEach(el => animObserver.observe(el));

// ========================================
// COUNTER ANIMATION
// ========================================
function animateCounter(el, target, suffix = '') {
  const duration = 2000;
  const start = performance.now();
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

// ========================================
// SCROLL TO TOP
// ========================================
const scrollTopBtn = document.querySelector('.scroll-top');
scrollTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ========================================
// FORMS
// ========================================
document.querySelectorAll('form[data-validate]').forEach(form => {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Basic validation
    let valid = true;
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        field.style.borderColor = 'var(--lotte-red)';
        valid = false;
        field.addEventListener('input', () => { field.style.borderColor = ''; }, { once: true });
      }
    });
    
    if (valid) {
      const success = form.nextElementSibling;
      if (success?.classList.contains('success-msg')) {
        form.style.opacity = '0.5';
        form.style.pointerEvents = 'none';
        success.style.display = 'block';
        setTimeout(() => {
          form.style.opacity = '';
          form.style.pointerEvents = '';
          form.reset();
          success.style.display = 'none';
        }, 5000);
      }
    }
  });
});

// ========================================
// INNER PAGE: Mark active nav link
// ========================================
(function markActiveNav() {
  const path = window.location.pathname;
  const fileName = path.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === fileName) {
      link.closest('.nav-item')?.classList.add('active');
    }
  });
})();

// ========================================
// LIGHTBOX FOR CERTS (simple)
// ========================================
document.querySelectorAll('[data-lightbox]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const src = el.href || el.dataset.src;
    if (!src) return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;
      display:flex;align-items:center;justify-content:center;cursor:pointer;
      animation:fadeIn 0.3s ease;
    `;
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90vw;max-height:85vh;border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
    const close = document.createElement('div');
    close.style.cssText = `
      position:absolute;top:20px;right:20px;width:44px;height:44px;
      background:var(--lotte-red);border-radius:50%;display:flex;
      align-items:center;justify-content:center;color:#fff;font-size:1.3rem;cursor:pointer;
    `;
    close.innerHTML = '×';
    overlay.append(img, close);
    document.body.append(overlay);
    overlay.addEventListener('click', () => overlay.remove());
  });
});

// Add CSS animation keyframe
const style = document.createElement('style');
style.textContent = '@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }';
document.head.append(style);

// ========================================
// STICKY HEADER on inner pages
// ========================================
if (document.body.classList.contains('inner-page')) {
  navbar?.classList.add('inner-page');
}

// ========================================
// REAL-TIME 3D PRODUCT STUDIO
// ========================================
function initLotte3D() {
  if (!window.THREE) return;

  function makePie() {
    const group = new THREE.Group();
    const choco = new THREE.MeshStandardMaterial({ color: 0x3a120b, roughness: 0.38, metalness: 0.04 });
    const biscuit = new THREE.MeshStandardMaterial({ color: 0x8b4a20, roughness: 0.62 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfff4df, roughness: 0.42 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.28, 64), choco);
    top.position.y = 1.18;
    group.add(top);
    const bottom = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.92, 0.28, 64), choco);
    bottom.position.y = -1.18;
    group.add(bottom);
    const biscuitTop = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.42, 64), biscuit);
    biscuitTop.position.y = 0.82;
    group.add(biscuitTop);
    const biscuitBottom = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 0.42, 64), biscuit);
    biscuitBottom.position.y = -0.82;
    group.add(biscuitBottom);
    const filling = new THREE.Mesh(new THREE.CylinderGeometry(1.74, 1.74, 0.46, 64), cream);
    filling.scale.y = 1;
    group.add(filling);
    group.rotation.z = -0.18;
    return group;
  }

  function makeToffee(colorA, colorB) {
    const group = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const piece = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.58, 1.2, 8, 24),
        new THREE.MeshStandardMaterial({ color: i % 2 ? colorA : colorB, roughness: 0.28, metalness: 0.08 })
      );
      piece.rotation.z = Math.PI / 2;
      piece.position.set((i - 2) * 0.48, Math.sin(i) * 0.12, (i % 2) * 0.32);
      group.add(piece);
    }
    group.rotation.z = -0.12;
    return group;
  }

  function makeEclairs() {
    const group = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const angle = i * 0.78;
      const radius = i % 2 ? 0.58 : 1.18;
      const piece = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.36, 0.9, 8, 20),
        new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0x542411 : 0xb96a2a, roughness: 0.32 })
      );
      piece.position.set(Math.cos(angle) * radius, (i - 3) * 0.12, Math.sin(angle) * radius);
      piece.rotation.z = Math.PI / 2;
      piece.rotation.y = angle;
      group.add(piece);
    }
    return group;
  }

  function setupCanvas(canvas, options = {}) {
    if (!canvas) return null;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 0.2, options.hero ? 9 : 8);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene.add(new THREE.HemisphereLight(0xffeee0, 0x170605, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(4, 6, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff3b45, 3.2);
    rim.position.set(-5, 1, -4);
    scene.add(rim);

    const product = makePie();
    product.scale.setScalar(options.hero ? 1.15 : 1.28);
    scene.add(product);

    let dragging = false;
    let previousX = 0;
    let previousY = 0;
    let targetX = 0;
    let targetY = 0;
    canvas.addEventListener('pointerdown', e => {
      dragging = true;
      previousX = e.clientX;
      previousY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!dragging) return;
      targetY += (e.clientX - previousX) * 0.008;
      targetX += (e.clientY - previousY) * 0.008;
      previousX = e.clientX;
      previousY = e.clientY;
    });
    canvas.addEventListener('pointerup', () => dragging = false);
    canvas.addEventListener('pointercancel', () => dragging = false);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      camera.position.z = Math.max(5.2, Math.min(12, camera.position.z + e.deltaY * 0.006));
    }, { passive: false });

    let lightIndex = 0;
    function rotateLight() {
      lightIndex = (lightIndex + 1) % 3;
      const colors = [0xffffff, 0xffd2b0, 0xbfd7ff];
      const positions = [[4,6,8], [-5,4,6], [2,-4,7]];
      key.color.setHex(colors[lightIndex]);
      key.position.set(...positions[lightIndex]);
    }

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    window.addEventListener('resize', resize);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function animate(time) {
      if (!reduceMotion) {
        if (!dragging) targetY += 0.0024;
        product.rotation.y += (targetY - product.rotation.y) * 0.07;
        product.rotation.x += (targetX - product.rotation.x) * 0.07;
        product.position.y = options.hero ? Math.sin(time * 0.001) * 0.08 : Math.sin(time * 0.0012) * 0.12;
      }
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    return {
      scene, camera, renderer, product,
      replace(next) {
        scene.remove(product);
        scene.add(next);
        return next;
      },
      rotateLight
    };
  }

  const hero3D = setupCanvas(document.getElementById('chocoPieCanvas'), { hero: true });
  const studio3D = setupCanvas(document.getElementById('studioCanvas'));
  let studioProduct = studio3D?.product;

  document.querySelectorAll('.studio-product').forEach(button => {
    button.addEventListener('click', () => {
      if (!studio3D) return;
      document.querySelectorAll('.studio-product').forEach(b => b.classList.remove('active'));
      button.classList.add('active');
      let next;
      if (button.dataset.product === 'toffee') next = makeToffee(0xd69a5b, 0x7a3a20);
      else if (button.dataset.product === 'eclair') next = makeEclairs();
      else if (button.dataset.product === 'caramilk') next = makeToffee(0xf2d19a, 0xfff1c9);
      else next = makePie();
      next.scale.setScalar(1.28);
      studio3D.scene.remove(studioProduct);
      studio3D.scene.add(next);
      studioProduct = next;
    });
  });

  document.getElementById('studioLight')?.addEventListener('click', () => studio3D?.rotateLight());
}

window.addEventListener('load', initLotte3D);
