(() => {
  const POPUP_SELECTOR = '[data-devise-email-popup]';
  const CLOSE_SELECTOR = '[data-devise-email-popup-close]';
  const DIALOG_SELECTOR = '[data-devise-email-popup-dialog]';
  const SUCCESS_SELECTOR = '[data-devise-email-popup-success]';
  const ERROR_SELECTOR = '[data-devise-email-popup-error]';
  const OPEN_CLASS = 'is-visible';
  const IMMEDIATE_CLASS = 'is-immediate';
  const BODY_LOCK_CLASS = 'devise-email-popup-is-open';

  // Timing controls: Shopify section settings write these values to data attributes.
  const DEFAULT_DELAY_MS = 5000;
  const DEFAULT_HIDE_DAYS = 7;

  // Storage controls: change these keys only if you intentionally want to reset popup history.
  const CLOSED_UNTIL_KEY = 'devise_email_popup_closed_until';
  const SUBMITTED_KEY = 'devise_email_popup_submitted';
  const DAY_IN_MS = 24 * 60 * 60 * 1000;

  const isDesignMode = () =>
    document.documentElement.classList.contains('shopify-design-mode') || Boolean(window.Shopify?.designMode);

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const readNumber = (value, fallback) => {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : fallback;
  };

  const storageGet = (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const storageSet = (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Ignore private browsing or storage-disabled environments.
    }
  };

  const storageRemove = (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore private browsing or storage-disabled environments.
    }
  };

  const isClosed = () => {
    const closedUntil = Number.parseInt(storageGet(CLOSED_UNTIL_KEY) || '0', 10);

    if (!closedUntil) return false;
    if (Date.now() < closedUntil) return true;

    storageRemove(CLOSED_UNTIL_KEY);
    return false;
  };

  const markClosed = (hideDays) => {
    storageSet(CLOSED_UNTIL_KEY, String(Date.now() + hideDays * DAY_IN_MS));
  };

  const markSubmitted = () => {
    storageSet(SUBMITTED_KEY, 'true');
  };

  const hasSubmitted = () => storageGet(SUBMITTED_KEY) === 'true';

  const lockBody = () => {
    document.body.classList.add(BODY_LOCK_CLASS);
  };

  const unlockBody = () => {
    if (!document.querySelector(`${POPUP_SELECTOR}.${OPEN_CLASS}`)) {
      document.body.classList.remove(BODY_LOCK_CLASS);
    }
  };

  const focusDialog = (root, immediate) => {
    const dialog = root.querySelector(DIALOG_SELECTOR);
    const email = root.querySelector('input[type="email"]');
    const target = email || dialog;
    if (!target) return;

    const focusDelay = immediate || prefersReducedMotion() ? 40 : 1760;

    window.setTimeout(() => {
      if (!root.classList.contains(OPEN_CLASS)) return;
      target.focus({ preventScroll: true });
    }, focusDelay);
  };

  const openPopup = (root, options = {}) => {
    const immediate = Boolean(options.immediate);

    root.classList.toggle(IMMEDIATE_CLASS, immediate);
    root.classList.add(OPEN_CLASS);
    root.setAttribute('aria-hidden', 'false');
    lockBody();
    focusDialog(root, immediate);
  };

  const closePopup = (root, options = {}) => {
    const hideDays = readNumber(root.dataset.hideDays, DEFAULT_HIDE_DAYS);
    const persist = options.persist !== false;

    root.classList.remove(OPEN_CLASS);
    root.classList.remove(IMMEDIATE_CLASS);
    root.setAttribute('aria-hidden', 'true');

    if (persist && !isDesignMode()) {
      markClosed(hideDays);
    }

    unlockBody();
  };

  const initPopup = (root) => {
    if (!root || root.dataset.deviseEmailPopupInitialized === 'true') return;
    root.dataset.deviseEmailPopupInitialized = 'true';

    const delay = Math.max(readNumber(root.dataset.delay, DEFAULT_DELAY_MS), DEFAULT_DELAY_MS);
    const form = root.querySelector('form');
    const hasSuccess = Boolean(root.querySelector(SUCCESS_SELECTOR));
    const hasError = Boolean(root.querySelector(ERROR_SELECTOR));
    let openTimer = null;

    root.addEventListener('click', (event) => {
      const closeTrigger = event.target.closest(CLOSE_SELECTOR);
      if (!closeTrigger || !root.contains(closeTrigger)) return;
      closePopup(root);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && root.classList.contains(OPEN_CLASS)) {
        closePopup(root);
      }
    });

    form?.addEventListener('submit', () => {
      markSubmitted();
    });

    if (hasSuccess) {
      markSubmitted();
      openPopup(root, { immediate: true });
      return;
    }

    if (hasError) {
      openPopup(root, { immediate: true });
      return;
    }

    if (!isDesignMode() && (hasSubmitted() || isClosed())) return;

    openTimer = window.setTimeout(() => {
      openPopup(root);
    }, delay);

    root.addEventListener('devise-email-popup:cancel', () => {
      window.clearTimeout(openTimer);
    });
  };

  const initPopups = (scope = document) => {
    scope.querySelectorAll(POPUP_SELECTOR).forEach(initPopup);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initPopups());
  } else {
    initPopups();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initPopups(event.target);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    const root = event.target.querySelector(POPUP_SELECTOR);
    if (!root) return;

    root.dispatchEvent(new CustomEvent('devise-email-popup:cancel'));
    closePopup(root, { persist: false });
  });
})();
