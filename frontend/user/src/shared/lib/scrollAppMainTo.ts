/** Scroll the app shell main pane so `el` sits near the top (not the window). */
export function scrollAppMainToElement(
  el: HTMLElement,
  offset = 12,
  behavior: ScrollBehavior = 'smooth',
) {
  const scroller = el.closest('main.app-main') as HTMLElement | null;
  if (!scroller) {
    el.scrollIntoView({ behavior, block: 'start' });
    return;
  }
  const scrollerRect = scroller.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  scroller.scrollBy({
    top: elRect.top - scrollerRect.top - offset,
    behavior,
  });
}
