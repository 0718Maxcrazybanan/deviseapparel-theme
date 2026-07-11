const DESIGN_BUTTON_TEXT = /(anpassa|skapa)\s+design/i;

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

document.addEventListener('change', (event) => {
  updateColorLabel(event.target);
});

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
