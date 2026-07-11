const PRODUCT_SELECT_EVENT = 'shopify:product:select';
const DESIGN_BUTTON_READY_EVENT = 'devise:design-button-ready';
const DESIGN_BUTTON_TEXT = /(anpassa|skapa)\s+design|designa\s+produkten/i;
const DESIGN_BUTTON_RENAME = /anpassa\s+design/gi;

function formatMoney(cents, currency = 'SEK') {
  const amount = (Number(cents) || 0) / 100;
  const locale = document.documentElement.lang || 'sv-SE';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2).replace('.', ',')} kr`;
  }
}

function getCandidateButtons(root) {
  const candidates = [];

  if (root instanceof Element && root.matches('a, button')) candidates.push(root);
  if (root.querySelectorAll) candidates.push(...root.querySelectorAll('.devise-product-page a, .devise-product-page button'));

  return candidates;
}

function replaceButtonText(node) {
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE && child.nodeValue) {
      child.nodeValue = child.nodeValue.replace(DESIGN_BUTTON_RENAME, 'Designa produkten');
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      replaceButtonText(child);
    }
  }
}

function enhanceDesignButtons(root = document) {
  for (const button of getCandidateButtons(root)) {
    if (!button.closest('.devise-product-page')) continue;
    if (button.closest('add-to-cart-component')) continue;

    const label = button.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!DESIGN_BUTTON_TEXT.test(label)) continue;

    replaceButtonText(button);
    button.classList.add('devise-product-design-button');

    if (button.dataset.deviseDesignEnhanced === 'true') continue;
    button.dataset.deviseDesignEnhanced = 'true';
    document.dispatchEvent(
      new CustomEvent(DESIGN_BUTTON_READY_EVENT, {
        detail: { button },
      })
    );
  }
}

function updateColorLabel(target) {
  const input = target instanceof HTMLInputElement ? target : null;
  if (!input?.matches('.devise-product-page variant-picker input[data-option-name]')) return;
  if (!input.checked) return;

  const fieldset = input.closest('fieldset');
  const selectedValue = fieldset?.querySelector('.variant-option__swatch-value');

  if (selectedValue) selectedValue.textContent = input.value;
}

function getSizeDropdown(productForm) {
  const formId = productForm.querySelector('form')?.id;
  if (!formId) return null;

  return document.querySelector(`size-quantity-dropdown[data-form-id="${formId}"]`);
}

function getSelectedOptionSummary(productRoot) {
  const values = new Map();

  for (const input of productRoot.querySelectorAll('variant-picker input[data-option-name]:checked')) {
    const name = input.dataset.optionName?.trim() || '';
    if (!name || /size|storlek/i.test(name)) continue;
    values.set(name, input.value);
  }

  for (const select of productRoot.querySelectorAll('variant-picker select')) {
    const option = select.selectedOptions[0];
    const name = option?.dataset.optionName?.trim() || '';
    if (!name || /size|storlek/i.test(name)) continue;
    values.set(name, option?.value || select.value);
  }

  return Array.from(values, ([name, value]) => `${name}: ${value}`).join(' · ');
}

function createPriceRow(item, currency) {
  const row = document.createElement('tr');
  const size = document.createElement('th');
  const quantity = document.createElement('td');
  const unitPrice = document.createElement('td');
  const linePrice = document.createElement('td');

  size.scope = 'row';
  size.textContent = item.size;
  quantity.textContent = item.quantity.toString();
  unitPrice.textContent = formatMoney(item.price, currency);
  linePrice.textContent = formatMoney(item.price * item.quantity, currency);

  row.append(size, quantity, unitPrice, linePrice);
  return row;
}

function syncPriceDialog(dropdown, summary) {
  const productRoot = dropdown.closest('.devise-product-page');
  if (!productRoot) return;

  const optionSummary = getSelectedOptionSummary(productRoot) || 'Välj färg och tryckteknik';

  for (const dialog of productRoot.querySelectorAll('[data-devise-price-dialog]')) {
    const currency = dialog.dataset.currency || 'SEK';
    const options = dialog.querySelector('[data-devise-price-options]');
    const empty = dialog.querySelector('[data-devise-price-empty]');
    const table = dialog.querySelector('[data-devise-price-table]');
    const lines = dialog.querySelector('[data-devise-price-lines]');
    const totalWrapper = dialog.querySelector('[data-devise-price-total-wrapper]');
    const total = dialog.querySelector('[data-devise-price-total]');
    const totalQuantity = dialog.querySelector('[data-devise-price-total-quantity]');
    const hasItems = summary.items.length > 0;

    if (options) options.textContent = optionSummary;
    if (empty) empty.hidden = hasItems;
    if (table) table.hidden = !hasItems;
    if (totalWrapper) totalWrapper.hidden = !hasItems;

    if (lines) {
      lines.replaceChildren(...summary.items.map((item) => createPriceRow(item, currency)));
    }

    if (total) total.textContent = formatMoney(summary.totalPrice, currency);
    if (totalQuantity) {
      totalQuantity.textContent = summary.totalQuantity === 1 ? '1 plagg' : `${summary.totalQuantity} plagg`;
    }
  }
}

function syncSingleVariantPrice(productForm, basePrice) {
  const priceBox = productForm.querySelector('[data-devise-cart-price]');
  if (!priceBox) return;

  const sizeDropdown = getSizeDropdown(productForm);
  if (sizeDropdown?.getPriceSummary) {
    const summary = sizeDropdown.getPriceSummary();
    syncPriceDialog(sizeDropdown, summary);
    return;
  }

  const quantityInput = productForm.querySelector('input[name="quantity"]');
  const quantity = Math.max(1, Number.parseInt(quantityInput?.value || '1', 10) || 1);
  const totalValue = (Number(basePrice) || Number(priceBox.dataset.basePrice) || 0) * quantity;
  const total = priceBox.querySelector('[data-devise-cart-price-total]');
  const detail = priceBox.querySelector('[data-devise-cart-price-detail]');

  if (basePrice) priceBox.dataset.basePrice = basePrice.toString();
  priceBox.dataset.totalQuantity = quantity.toString();
  priceBox.dataset.totalPrice = totalValue.toString();

  if (total) total.textContent = formatMoney(totalValue, priceBox.dataset.currency);
  if (detail) detail.textContent = quantity > 1 ? `${quantity} plagg totalt` : '1 plagg';
}

function syncAllPriceDialogs(root = document) {
  const dropdowns = [];

  if (root instanceof Element && root.matches('size-quantity-dropdown')) dropdowns.push(root);
  if (root.querySelectorAll) dropdowns.push(...root.querySelectorAll('size-quantity-dropdown'));

  for (const dropdown of dropdowns) {
    if (dropdown.getPriceSummary) syncPriceDialog(dropdown, dropdown.getPriceSummary());
  }
}

function handleProductSelect(event) {
  const source = event.target instanceof Element ? event.target : null;
  const productRoot = source?.closest('.devise-product-page');

  event.promise
    ?.then(({ detail }) => {
      const price = Number(detail?.resource?.price) || 0;
      const forms = productRoot
        ? productRoot.querySelectorAll('product-form-component')
        : document.querySelectorAll('.devise-product-page product-form-component');

      window.setTimeout(() => {
        for (const form of forms) syncSingleVariantPrice(form, price);
        if (productRoot) syncAllPriceDialogs(productRoot);
      }, 0);
    })
    .catch(() => {});
}

function handleQuantityInput(event) {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  if (!input?.matches('.devise-product-page product-form-component input[name="quantity"]')) return;

  const productForm = input.closest('product-form-component');
  const basePrice = Number(productForm?.querySelector('[data-devise-cart-price]')?.dataset.basePrice) || 0;

  if (productForm) syncSingleVariantPrice(productForm, basePrice);
}

function handleDialogTab(event) {
  const button = event.target instanceof Element ? event.target.closest('[data-devise-dialog-tab]') : null;
  if (!button) return;

  const tabs = button.closest('[data-devise-dialog-tabs]');
  const dialog = button.closest('dialog');
  const selected = button.dataset.deviseDialogTab;
  if (!tabs || !dialog || !selected) return;

  for (const tab of tabs.querySelectorAll('[data-devise-dialog-tab]')) {
    tab.setAttribute('aria-selected', tab === button ? 'true' : 'false');
  }

  for (const panel of dialog.querySelectorAll('[data-devise-dialog-panel]')) {
    panel.hidden = panel.dataset.deviseDialogPanel !== selected;
  }
}

function handlePrintComparison(event) {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  if (!input?.matches('[data-devise-print-range]')) return;

  input.closest('[data-devise-print-comparison]')?.style.setProperty('--devise-compare', `${input.value}%`);
}

document.addEventListener('click', handleDialogTab);
document.addEventListener('change', (event) => {
  updateColorLabel(event.target);

  const productRoot = event.target instanceof Element ? event.target.closest('.devise-product-page') : null;
  if (productRoot) syncAllPriceDialogs(productRoot);
});
document.addEventListener('input', (event) => {
  handleQuantityInput(event);
  handlePrintComparison(event);
});
document.addEventListener('size-quantity:price-update', (event) => {
  const dropdown = event.target instanceof Element ? event.target.closest('size-quantity-dropdown') : null;
  if (dropdown && event.detail) syncPriceDialog(dropdown, event.detail);
});
document.addEventListener(PRODUCT_SELECT_EVENT, handleProductSelect);

enhanceDesignButtons();

if (customElements.get('size-quantity-dropdown')) syncAllPriceDialogs();
else customElements.whenDefined('size-quantity-dropdown').then(() => syncAllPriceDialogs());

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      enhanceDesignButtons(node);
      syncAllPriceDialogs(node);
    }
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
