/**
 * DeviseApparel mobile enhancements for Print.App.
 *
 * This file is safe to load on Shopify product pages. The same code can also be
 * pasted into Print.App > Settings > Store Settings > Custom JavaScript to
 * enhance the controls inside Print.App's cross-origin editor.
 */
(function devisePrintAppMobile() {
  'use strict';

  // Easy adjustments: mobile breakpoint and minimum editor panel height.
  const MOBILE_BREAKPOINT = 749;
  const EDITOR_PANEL_MIN_HEIGHT = 250;
  const FRAME_SELECTOR = 'iframe.printapp-frame';
  const FRAME_VISIBLE_CLASS = 'printapp-shown';
  const HOST_OPEN_CLASS = 'devise-printapp-is-open';
  const EDITOR_CLASS = 'devise-printapp-mobile-editor';
  const STYLE_ID = 'devise-printapp-mobile-styles';
  const mobileMedia = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);

  function addStyles(css) {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = css;
    document.head.appendChild(style);
  }

  function isPrintAppEditor() {
    return window.location.hostname === 'editor.print.app' || Boolean(document.querySelector('#app .main.mobile'));
  }

  function enhanceEditor() {
    document.documentElement.classList.add(EDITOR_CLASS);

    addStyles(`
      @media (max-width: ${MOBILE_BREAKPOINT}px), (pointer: coarse) and (max-width: 1024px) {
        html.${EDITOR_CLASS},
        html.${EDITOR_CLASS} body,
        html.${EDITOR_CLASS} #app,
        html.${EDITOR_CLASS} #app > .base {
          width: 100%;
          height: var(--devise-printapp-height, 100dvh) !important;
          min-height: 0 !important;
          overflow: hidden !important;
          overscroll-behavior: none;
        }

        html.${EDITOR_CLASS} body {
          margin: 0;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        html.${EDITOR_CLASS} .main.mobile {
          width: 100%;
          height: var(--devise-printapp-height, 100dvh) !important;
          min-height: 0 !important;
          grid-template-rows:
            64px
            minmax(0, 3fr)
            minmax(${EDITOR_PANEL_MIN_HEIGHT}px, 2fr) !important;
        }

        html.${EDITOR_CLASS} .main.mobile > .stage {
          min-width: 0;
          min-height: 0 !important;
          overflow: hidden !important;
        }

        html.${EDITOR_CLASS} .sidebar.mobile {
          min-width: 0;
          min-height: ${EDITOR_PANEL_MIN_HEIGHT}px !important;
          height: auto !important;
          grid-template-rows:
            minmax(0, 1fr)
            calc(58px + env(safe-area-inset-bottom)) !important;
          box-shadow: 0 -8px 24px rgb(0 0 0 / 10%);
        }

        html.${EDITOR_CLASS} .sidebar.mobile .panels,
        html.${EDITOR_CLASS} .sidebar.mobile .panels-sec,
        html.${EDITOR_CLASS} .sidebar.mobile .sidebar-panel,
        html.${EDITOR_CLASS} .sidebar.mobile .content {
          min-width: 0;
          min-height: 0 !important;
          height: auto !important;
        }

        html.${EDITOR_CLASS} .sidebar.mobile .content {
          overscroll-behavior: contain;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }

        html.${EDITOR_CLASS} .sidebar.mobile .tabs {
          height: auto !important;
          min-height: calc(58px + env(safe-area-inset-bottom));
          padding-bottom: env(safe-area-inset-bottom);
          gap: 4px;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          overscroll-behavior-x: contain;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }

        html.${EDITOR_CLASS} .sidebar.mobile .tabs::-webkit-scrollbar {
          display: none;
        }

        html.${EDITOR_CLASS} .sidebar.mobile .tabs > * {
          flex: 0 0 auto;
          scroll-snap-align: center;
        }

        html.${EDITOR_CLASS} button,
        html.${EDITOR_CLASS} [role='button'],
        html.${EDITOR_CLASS} .sidebar.mobile label,
        html.${EDITOR_CLASS} .sidebar.mobile select {
          min-height: 44px;
          touch-action: manipulation;
        }

        html.${EDITOR_CLASS} .sidebar.mobile button.square,
        html.${EDITOR_CLASS} .sidebar.mobile [role='button'] {
          min-width: 44px;
        }

        html.${EDITOR_CLASS} input,
        html.${EDITOR_CLASS} select,
        html.${EDITOR_CLASS} textarea {
          font-size: 16px !important;
        }

        html.${EDITOR_CLASS} input[type='range'] {
          min-height: 44px;
        }

        /* Keyboard shortcuts do not help touch users; keep configurations visible. */
        html.${EDITOR_CLASS} .sidebar-panel.help .form-section:has(.shortcuts) {
          display: none !important;
        }
      }
    `);

    const syncEditorViewport = () => {
      const viewport = window.visualViewport;
      const height = Math.round(viewport?.height || window.innerHeight);
      document.documentElement.style.setProperty('--devise-printapp-height', `${height}px`);
    };

    const revealFocusedControl = (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.matches('input, textarea, select, [contenteditable="true"]')) return;

      window.setTimeout(() => {
        event.target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }, 120);
    };

    syncEditorViewport();
    window.visualViewport?.addEventListener('resize', syncEditorViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', syncEditorViewport, { passive: true });
    window.addEventListener('orientationchange', syncEditorViewport, { passive: true });
    document.addEventListener('focusin', revealFocusedControl);
  }

  function enhanceStorefront() {
    addStyles(`
      @media (max-width: ${MOBILE_BREAKPOINT}px) {
        html.${HOST_OPEN_CLASS},
        html.${HOST_OPEN_CLASS} body {
          overscroll-behavior: none !important;
        }

        html.${HOST_OPEN_CLASS} body {
          position: fixed !important;
          inset-inline: 0 !important;
          top: calc(var(--devise-printapp-scroll-y, 0) * -1px) !important;
          width: 100% !important;
          overflow: hidden !important;
        }

        ${FRAME_SELECTOR}.${FRAME_VISIBLE_CLASS} {
          display: block !important;
          position: fixed !important;
          top: var(--devise-printapp-top, 0px) !important;
          left: var(--devise-printapp-left, 0px) !important;
          width: var(--devise-printapp-width, 100vw) !important;
          height: var(--devise-printapp-height, 100dvh) !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: none !important;
          max-height: none !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: #f7f7f4;
          z-index: 2147483646 !important;
          overscroll-behavior: none;
          transform: translateZ(0);
        }
      }
    `);

    let storedScrollY = 0;
    let isOpen = false;

    const syncHostViewport = () => {
      const viewport = window.visualViewport;
      const root = document.documentElement;
      const width = Math.round(viewport?.width || window.innerWidth);
      const height = Math.round(viewport?.height || window.innerHeight);
      const top = Math.round(viewport?.offsetTop || 0);
      const left = Math.round(viewport?.offsetLeft || 0);

      root.style.setProperty('--devise-printapp-width', `${width}px`);
      root.style.setProperty('--devise-printapp-height', `${height}px`);
      root.style.setProperty('--devise-printapp-top', `${top}px`);
      root.style.setProperty('--devise-printapp-left', `${left}px`);
    };

    const setOpen = (nextOpen) => {
      if (nextOpen === isOpen) {
        if (nextOpen) syncHostViewport();
        return;
      }

      isOpen = nextOpen;

      if (nextOpen) {
        storedScrollY = window.scrollY;
        document.documentElement.style.setProperty('--devise-printapp-scroll-y', storedScrollY.toString());
        document.documentElement.classList.add(HOST_OPEN_CLASS);
        syncHostViewport();
        return;
      }

      document.documentElement.classList.remove(HOST_OPEN_CLASS);
      document.documentElement.style.removeProperty('--devise-printapp-scroll-y');
      window.scrollTo({ top: storedScrollY, left: 0, behavior: 'auto' });
    };

    const prepareFrame = (frame) => {
      frame.setAttribute('title', frame.getAttribute('title') || 'Print.App designverktyg');
    };

    const refresh = () => {
      const frames = Array.from(document.querySelectorAll(FRAME_SELECTOR));
      frames.forEach(prepareFrame);

      const hasVisibleFrame = mobileMedia.matches && frames.some((frame) => frame.classList.contains(FRAME_VISIBLE_CLASS));
      setOpen(hasVisibleFrame);
    };

    const observer = new MutationObserver((mutations) => {
      const printAppChanged = mutations.some((mutation) => {
        if (mutation.type === 'childList') return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;

        return mutation.target instanceof HTMLIFrameElement && mutation.target.matches(FRAME_SELECTOR);
      });

      if (printAppChanged) refresh();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    mobileMedia.addEventListener('change', refresh);
    window.visualViewport?.addEventListener('resize', syncHostViewport, { passive: true });
    window.visualViewport?.addEventListener('scroll', syncHostViewport, { passive: true });
    window.addEventListener('orientationchange', syncHostViewport, { passive: true });
    window.addEventListener('pagehide', () => setOpen(false));

    refresh();
  }

  if (isPrintAppEditor()) {
    enhanceEditor();
  } else {
    enhanceStorefront();
  }
})();
