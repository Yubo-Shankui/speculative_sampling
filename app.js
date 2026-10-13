'use strict';
const sectionLinks = Array.from(document.querySelectorAll('.toc a[href^="#"]')).filter(a => a.hash !== '#top');
const sections = sectionLinks.map(a => document.querySelector(a.hash)).filter(Boolean);
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (!visible.length) return;
    for (const link of sectionLinks) {
      const active = link.hash === '#' + visible[0].target.id;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-10% 0px -55% 0px', threshold: 0 });
  sections.forEach(section => observer.observe(section));
}
const demo = window.SPECULATIVE_SAMPLING_CONFIG?.demo;
if (demo?.src) {
  const video = document.querySelector('#demo-video');
  video.src = demo.src;
  if (demo.poster) video.poster = demo.poster;
  document.querySelector('#demo-description').textContent = demo.description || '';
  document.querySelector('#demo-caption').textContent = demo.caption || '';
  document.querySelector('#demo').hidden = false;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Explanatory videos play on view; the recorded demo stays separate.
for (const video of document.querySelectorAll('.paper-video video')) {
  if (!('IntersectionObserver' in window)) continue;
  let inView = false;
  let userPaused = false;
  video.muted = true;
  video.addEventListener('pause', () => {
    if (inView && !document.hidden) userPaused = true;
  });
  video.addEventListener('play', () => { userPaused = false; });
  function syncVideo() {
    if (inView && !document.hidden && !reducedMotion.matches && !userPaused && !video.ended) {
      video.play().catch(() => {});
    } else if (!inView || document.hidden || reducedMotion.matches) {
      video.pause();
    }
  }
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    syncVideo();
  }, { threshold: 0.3 }).observe(video);
  document.addEventListener('visibilitychange', syncVideo);
  reducedMotion.addEventListener('change', syncVideo);
}
