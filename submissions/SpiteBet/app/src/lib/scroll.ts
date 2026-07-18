/** Smooth-scrolls to a section id, accounting for the sticky navbar height. */
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const nav = document.querySelector('nav');
  const offset = nav ? nav.getBoundingClientRect().height : 0;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;

  window.scrollTo({ top, behavior: 'smooth' });
}
