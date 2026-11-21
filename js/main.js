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
  const scrollProgress = document.querySelector('.scroll-progress');
  if (scrollProgress) {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollProgress.style.width = `${maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0}%`;
  }
  const activeHero = document.querySelector('.hero');
  if (activeHero && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const heroProgress = Math.max(0, Math.min(1, window.scrollY / Math.max(activeHero.offsetHeight, 1)));
    activeHero.style.setProperty('--hero-push', (1 + heroProgress * 0.08).toFixed(3));
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.story-image, .grow-image, .brand-image').forEach(frame => {
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const image = frame.querySelector('img');
      if (image) image.style.transform = `scale(1.06) translateY(${(progress - 0.5) * 10}px)`;
    });
  }
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
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = (target === 2004 ? '2004' : target.toLocaleString('en-IN')) + suffix;
    return;
  }
  const duration = 2000;
  const start = performance.now();
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    const formatted = target === 2004 ? '2004' : value.toLocaleString('en-IN');
    el.textContent = formatted + suffix;
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
// CINEMATIC ENTRANCE
// ========================================
window.addEventListener('load', () => {
  window.setTimeout(() => {
    document.querySelector('.cinematic-loader')?.classList.add('done');
  }, 650);
});

const hero = document.querySelector('.hero');
if (hero) {
  hero.classList.add('active-cinematic');
  hero.addEventListener('pointermove', (event) => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = hero.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const product = hero.querySelector('.hero-product-reveal');
    if (product) product.style.transform = `translate3d(${x * -14}px,${y * -10}px,0) scale(1)`;
  });
  hero.addEventListener('pointerleave', () => {
    const product = hero.querySelector('.hero-product-reveal');
    if (product) product.style.transform = '';
  });
}

// ========================================
// CHOCO PIE CINEMATIC STORY
// ========================================
const pieStoryStage = document.querySelector('.pie-story-stage');
const pieStoryChapters = document.querySelectorAll('.pie-story-chapter');

if (pieStoryStage && pieStoryChapters.length) {
  const storyObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    pieStoryChapters.forEach(chapter => chapter.classList.remove('active'));
    visible.target.classList.add('active');
    pieStoryStage.dataset.chapter = visible.target.dataset.chapter;
    const chapterIndex = parseInt(visible.target.dataset.chapter || '0', 10);
    const progress = document.querySelector('.pie-story-progress span');
    if (progress) progress.style.height = `${chapterIndex * 25}%`;
  }, { threshold: [0.35, 0.55, 0.75], rootMargin: '-18% 0px -18% 0px' });

  pieStoryChapters.forEach(chapter => storyObserver.observe(chapter));
}

const presentationImage = document.querySelector('.pie-story-product');
const presentationStage = document.querySelector('.pie-story-stage');
let presentationRotation = 0;
let presentationZoom = 1.08;
let presentationLight = 0;

function updatePresentation() {
  if (!presentationImage || !presentationStage) return;
  presentationImage.style.transform = `translate(-50%, -50%) scale(${presentationZoom}) rotate(${presentationRotation}deg)`;
  const light = presentationStage.querySelector('.stage-light');
  if (light) {
    light.style.filter = `hue-rotate(${presentationLight * 18}deg) brightness(${1 + presentationLight * 0.08})`;
  }
}

document.querySelectorAll('.presentation-control').forEach(control => {
  control.addEventListener('click', () => {
    const action = control.dataset.action;
    if (action === 'left') presentationRotation -= 6;
    if (action === 'right') presentationRotation += 6;
    if (action === 'zoom') presentationZoom = presentationZoom >= 1.28 ? 1.08 : presentationZoom + 0.1;
    if (action === 'light') presentationLight = (presentationLight + 1) % 3;
    updatePresentation();
  });
});

presentationStage?.addEventListener('pointermove', event => {
  if (presentationStage.dataset.chapter !== '4' || event.pointerType === 'touch') return;
  const rect = presentationStage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  presentationRotation = Math.max(-8, Math.min(8, x * 16));
  updatePresentation();
});
