const PRODUCT_SELECT_EVENT = 'shopify:product:select';
const DESIGN_BUTTON_TEXT = /(anpassa|skapa)\s+design/i;

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

function enhanceDesignButtons(root = document) {
  const buttons = root.querySelectorAll?.('.devise-product-page a, .devise-product-page button') || [];

  for (const button of buttons) {
    const label = button.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!DESIGN_BUTTON_TEXT.test(label)) continue;
    if (button.closest('add-to-cart-component')) continue;

    button.classList.add('devise-product-design-button');
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

function syncSingleVariantPrice(productForm, basePrice) {
  const priceBox = productForm.querySelector('[data-devise-cart-price]');
  if (!priceBox) return;

  const sizeDropdown = document.querySelector(`size-quantity-dropdown[data-form-id="${productForm.querySelector('form')?.id}"]`);
  const hasSizeSelection = sizeDropdown?.getSelectedItems?.().length > 0;

  if (hasSizeSelection) return;

  const quantityInput = productForm.querySelector('input[name="quantity"]');
  const quantity = Math.max(1, Number.parseInt(quantityInput?.value || '1', 10) || 1);
  const total = (Number(basePrice) || Number(priceBox.dataset.basePrice) || 0) * quantity;
  const totalEl = priceBox.querySelector('[data-devise-cart-price-total]');
  const detailEl = priceBox.querySelector('[data-devise-cart-price-detail]');

  if (basePrice) priceBox.dataset.basePrice = basePrice.toString();
  priceBox.dataset.totalQuantity = quantity.toString();
  priceBox.dataset.totalPrice = total.toString();

  if (totalEl) totalEl.textContent = formatMoney(total, priceBox.dataset.currency);
  if (detailEl) detailEl.textContent = quantity > 1 ? `${quantity} plagg totalt` : '1 plagg';
}

function handleProductSelect(event) {
  const source = event.target instanceof Element ? event.target : null;
  const productRoot = source?.closest('.devise-product-page');

  event.promise
    ?.then(({ detail }) => {
      const price = Number(detail?.resource?.price) || 0;
      if (!price) return;

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

document.addEventListener('change', (event) => {
  updateColorLabel(event.target);
});

document.addEventListener('input', handleQuantityInput);
document.addEventListener(PRODUCT_SELECT_EVENT, handleProductSelect);

enhanceDesignButtons();

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) enhanceDesignButtons(node);
    }
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
