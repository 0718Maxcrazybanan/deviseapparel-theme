const PRODUCT_SELECT_EVENT = 'shopify:product:select';
const QUANTITY_SELECTOR_UPDATE_EVENT = 'quantity-selector:update';
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

function getSelectedOptionSummary(productRoot) {
  const values = new Map();

  for (const input of productRoot.querySelectorAll('variant-picker input[data-option-name]:checked')) {
    const name = input.dataset.optionName?.trim();
    if (name) values.set(name, input.value);
  }

  for (const select of productRoot.querySelectorAll('variant-picker select')) {
    const option = select.selectedOptions[0];
    const name = option?.dataset.optionName?.trim() || select.name?.replace(/^options\[|\]$/g, '').trim();
    if (name) values.set(name, option?.value || select.value);
  }

  for (const row of productRoot.querySelectorAll(
    "variant-picker .variant-option[data-testid='variant-option-single'], variant-picker .variant-option--buttons"
  )) {
    const label = row.querySelector('legend > span, :scope > span');
    const value = row.querySelector('.variant-option__swatch-value');
    if (!label || !value) continue;

    const valueText = value.textContent?.trim();
    const labelText = label.textContent?.replace(valueText || '', '').trim();
    if (labelText && valueText && !values.has(labelText)) values.set(labelText, valueText);
  }

  return Array.from(values, ([name, value]) => `${name}: ${value}`).join(' / ');
}

function syncPriceDialog(productForm, summary) {
  const productRoot = productForm.closest('.devise-product-page');
  if (!productRoot) return;

  const optionSummary = getSelectedOptionSummary(productRoot) || 'Vald variant';
  const quantityText = summary.quantity === 1 ? '1 plagg' : `${summary.quantity} plagg`;

  for (const dialog of productRoot.querySelectorAll('[data-devise-price-dialog]')) {
    const options = dialog.querySelector('[data-devise-price-options]');
    const lineOptions = dialog.querySelector('[data-devise-price-line-options]');
    const lineQuantity = dialog.querySelector('[data-devise-price-line-quantity]');
    const lineUnit = dialog.querySelector('[data-devise-price-line-unit]');
    const lineTotal = dialog.querySelector('[data-devise-price-line-total]');
    const totalQuantity = dialog.querySelector('[data-devise-price-total-quantity]');
    const total = dialog.querySelector('[data-devise-price-total]');

    if (options) options.textContent = optionSummary;
    if (lineOptions) lineOptions.textContent = optionSummary;
    if (lineQuantity) lineQuantity.textContent = summary.quantity.toString();
    if (lineUnit) lineUnit.textContent = formatMoney(summary.unitPrice, summary.currency);
    if (lineTotal) lineTotal.textContent = formatMoney(summary.totalPrice, summary.currency);
    if (totalQuantity) totalQuantity.textContent = quantityText;
    if (total) total.textContent = formatMoney(summary.totalPrice, summary.currency);
  }
}

function syncSingleVariantPrice(productForm, basePrice) {
  const priceBox = productForm.querySelector('[data-devise-cart-price]');
  if (!priceBox) return;

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

  syncPriceDialog(productForm, {
    quantity,
    unitPrice: Number(priceBox.dataset.basePrice) || 0,
    totalPrice: totalValue,
    currency: priceBox.dataset.currency,
  });
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

function handleQuantitySelectorUpdate(event) {
  const target = event.target instanceof Element ? event.target : null;
  const productForm = target?.closest('.devise-product-page product-form-component');
  const basePrice = Number(productForm?.querySelector('[data-devise-cart-price]')?.dataset.basePrice) || 0;

  if (productForm) syncSingleVariantPrice(productForm, basePrice);
}

function handlePrintComparison(event) {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  if (!input?.matches('[data-devise-print-range]')) return;

  input.closest('[data-devise-print-comparison]')?.style.setProperty('--devise-compare', `${input.value}%`);
}

document.addEventListener('change', (event) => {
  updateColorLabel(event.target);
});
document.addEventListener('input', (event) => {
  handleQuantityInput(event);
  handlePrintComparison(event);
});
document.addEventListener(QUANTITY_SELECTOR_UPDATE_EVENT, handleQuantitySelectorUpdate);
document.addEventListener(PRODUCT_SELECT_EVENT, handleProductSelect);

enhanceDesignButtons();


const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;
      enhanceDesignButtons(node);
    }
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
