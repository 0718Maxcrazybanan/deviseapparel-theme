const PRODUCT_SELECT_EVENT = 'shopify:product:select';
const SIZE_QUANTITY_ADD_EVENT = 'size-quantity:add-to-cart';

class SizeQuantityDropdown extends HTMLElement {
  #relocating = false;

  connectedCallback() {
    if (this.dataset.initialized === 'true') return;
    this.dataset.initialized = 'true';

    this.sizeOptionIndex = Number(this.dataset.sizeOptionIndex || 0);
    this.optionNames = this.#readJson('[data-size-quantity-options]', []);
    this.variants = this.#readJson('[data-size-quantity-variants]', []);

    this.toggle = this.querySelector('[data-size-quantity-toggle]');
    this.menu = this.querySelector('[data-size-quantity-menu]');
    this.label = this.querySelector('[data-size-quantity-label]');
    this.summary = this.querySelector('[data-size-quantity-summary]');
    this.status = this.querySelector('[data-size-quantity-status]');
    this.rows = Array.from(this.querySelectorAll('[data-size-quantity-row]')).map((row) => ({
      row,
      size: row.dataset.sizeValue || '',
      state: row.querySelector('[data-size-quantity-state]'),
      input: row.querySelector('[data-size-quantity-input]'),
      minus: row.querySelector('[data-size-quantity-minus]'),
      plus: row.querySelector('[data-size-quantity-plus]'),
      variant: null,
    }));

    this.#placeAfterVariantPicker();
    this.#bindEvents();
    this.#hideThemeControls();
    this.#refreshVariants();
    this.#updateLabel();

    window.setTimeout(() => this.#placeAfterVariantPicker(), 300);
    window.setTimeout(() => this.#placeAfterVariantPicker(), 1000);
    window.setTimeout(() => this.#hideThemeControls(), 300);
    window.setTimeout(() => this.#hideThemeControls(), 1000);
  }

  disconnectedCallback() {
    if (this.#relocating) return;

    document.removeEventListener('click', this.handleOutsideClick);
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('submit', this.handleFormSubmit, true);
    document.removeEventListener(PRODUCT_SELECT_EVENT, this.handleProductSelect);
  }

  getSelectedItems() {
    const baseOptions = this.#getBaseOptions();
    const itemsByVariant = new Map();

    for (const item of this.rows) {
      const quantity = this.#getQuantity(item);
      const variant = this.#findVariantForSize(item.size, baseOptions);
      const variantId = variant?.id?.toString() || '';

      if (!variantId || quantity <= 0 || variant?.available === false) continue;

      itemsByVariant.set(variantId, (itemsByVariant.get(variantId) || 0) + quantity);
    }

    return Array.from(itemsByVariant, ([variantId, quantity]) => ({ variantId, quantity }));
  }

  getPriceSummary() {
    const baseOptions = this.#getBaseOptions();
    const selectedRows = this.rows
      .map((item) => {
        const variant = this.#findVariantForSize(item.size, baseOptions);
        return {
          size: item.size,
          quantity: this.#getQuantity(item),
          variant,
        };
      })
      .filter((item) => item.quantity > 0 && item.variant?.available !== false);

    if (!selectedRows.length) {
      const fallbackVariant = this.#getCurrentVariant();
      return {
        totalQuantity: 1,
        totalPrice: Number(fallbackVariant?.price) || 0,
        items: [],
      };
    }

    return {
      totalQuantity: selectedRows.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: selectedRows.reduce((sum, item) => sum + (Number(item.variant?.price) || 0) * item.quantity, 0),
      items: selectedRows.map((item) => ({
        size: item.size,
        quantity: item.quantity,
        variantId: item.variant?.id?.toString() || '',
        price: Number(item.variant?.price) || 0,
      })),
    };
  }

  validate() {
    const selectedItems = this.getSelectedItems();

    if (selectedItems.length > 0) {
      this.#setStatus('');
      return true;
    }

    this.open();
    this.#setStatus(this.dataset.errorEmpty || 'Välj minst en storlek.');
    this.toggle?.focus();
    return false;
  }

  open() {
    if (!this.menu || !this.toggle) return;

    this.menu.hidden = false;
    this.toggle.setAttribute('aria-expanded', 'true');
  }

  close() {
    if (!this.menu || !this.toggle) return;

    this.menu.hidden = true;
    this.toggle.setAttribute('aria-expanded', 'false');
  }

  #bindEvents() {
    this.toggle?.addEventListener('click', () => {
      if (this.menu?.hidden) this.open();
      else this.close();
    });

    for (const item of this.rows) {
      item.minus?.addEventListener('click', () => this.#setQuantity(item, this.#getQuantity(item) - 1, true));
      item.plus?.addEventListener('click', () => this.#setQuantity(item, this.#getQuantity(item) + 1, true));
      item.input?.addEventListener('input', () => this.#setQuantity(item, this.#getQuantity(item), true));
    }

    this.handleOutsideClick = (event) => {
      if (!this.contains(event.target)) this.close();
    };

    this.handleKeydown = (event) => {
      if (event.key === 'Escape') this.close();
    };

    this.handleFormSubmit = (event) => {
      if (event.target !== this.#getForm()) return;
      if (event.target instanceof HTMLFormElement && !event.target.checkValidity()) return;

      const productForm = this.#getProductForm();
      if (!productForm) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const selectedItems = this.getSelectedItems();
      if (!selectedItems.length) {
        this.validate();
        return;
      }

      productForm.dispatchEvent(
        new CustomEvent(SIZE_QUANTITY_ADD_EVENT, {
          detail: {
            items: selectedItems,
            sourceEvent: event,
          },
        })
      );
    };

    this.handleProductSelect = (event) => {
      const target = event.target;
      if (target instanceof Element && !this.#isRelatedProductElement(target)) return;

      this.#refreshVariants();
      event.promise?.finally(() => {
        this.#placeAfterVariantPicker();
        this.#hideThemeControls();
        this.#refreshVariants();
      });
    };

    document.addEventListener('click', this.handleOutsideClick);
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('submit', this.handleFormSubmit, true);
    document.addEventListener(PRODUCT_SELECT_EVENT, this.handleProductSelect);
  }

  #placeAfterVariantPicker() {
    const variantPicker = this.#getVariantPicker();
    if (!variantPicker || variantPicker.nextElementSibling === this) return;

    this.#relocating = true;
    variantPicker.insertAdjacentElement('afterend', this);
    const clearRelocating = () => {
      this.#relocating = false;
    };

    if (window.queueMicrotask) {
      window.queueMicrotask(clearRelocating);
    } else {
      window.setTimeout(clearRelocating, 0);
    }
  }

  #readJson(selector, fallback) {
    const script = this.querySelector(selector);
    if (!script?.textContent) return fallback;

    try {
      return JSON.parse(script.textContent);
    } catch {
      return fallback;
    }
  }

  #getForm() {
    if (!this.dataset.formId) return null;
    return document.getElementById(this.dataset.formId);
  }

  #getProductForm() {
    const form = this.#getForm();
    return form?.closest('product-form-component') || null;
  }

  #getVariantPicker() {
    return document.querySelector(`variant-picker[data-product-id="${this.dataset.productId}"]`);
  }

  #isRelatedProductElement(element) {
    const productForm = this.#getProductForm();
    const variantPicker = this.#getVariantPicker();

    return Boolean(productForm?.contains(element) || variantPicker?.contains(element));
  }

  #hideThemeControls() {
    const variantPicker = this.#getVariantPicker();
    const sizeOptionName = this.optionNames[this.sizeOptionIndex];

    if (variantPicker && sizeOptionName) {
      for (const control of variantPicker.querySelectorAll('[data-option-name]')) {
        if (this.#normalize(control.dataset.optionName) !== this.#normalize(sizeOptionName)) continue;

        const option = control.closest('.variant-option');
        option?.classList.add('size-quantity-dropdown-hidden');
        option?.setAttribute('aria-hidden', 'true');
      }
    }

    const productForm = this.#getProductForm();
    const quantityInput = productForm?.querySelector('input[name="quantity"]');
    quantityInput?.closest('.quantity-selector-wrapper')?.classList.add('size-quantity-dropdown-hidden');
    productForm?.querySelector('.quantity-label')?.classList.add('size-quantity-dropdown-hidden');
    productForm?.querySelector('.quantity-rules')?.classList.add('size-quantity-dropdown-hidden');
  }

  #refreshVariants() {
    const baseOptions = this.#getBaseOptions();

    for (const item of this.rows) {
      item.variant = this.#findVariantForSize(item.size, baseOptions);
      const unavailable = !item.variant || item.variant.available === false;

      item.row.classList.toggle('is-unavailable', unavailable);
      if (item.state) {
        item.state.textContent = unavailable
          ? this.dataset.unavailableLabel || 'Ej tillgänglig'
          : this.dataset.availableLabel || 'Tillgänglig';
      }
      if (item.input) item.input.disabled = unavailable;
      if (item.minus) item.minus.disabled = unavailable;
      if (item.plus) item.plus.disabled = unavailable;

      if (unavailable) this.#setQuantity(item, 0, false);
    }

    this.#syncFormToFirstSelection();
    this.#updateLabel();
  }

  #getBaseOptions() {
    const currentVariant = this.#getCurrentVariant();
    const baseOptions = currentVariant?.options ? [...currentVariant.options] : new Array(this.optionNames.length);
    const selectedOptions = this.#getSelectedOptionsFromPicker();

    selectedOptions.forEach((value, index) => {
      if (value) baseOptions[index] = value;
    });

    return baseOptions;
  }

  #getSelectedOptionsFromPicker() {
    const selectedOptions = new Array(this.optionNames.length);
    const variantPicker = this.#getVariantPicker();
    if (!variantPicker) return selectedOptions;

    for (const input of variantPicker.querySelectorAll('fieldset input:checked')) {
      const index = this.#optionIndexForName(input.dataset.optionName);
      if (index > -1) selectedOptions[index] = input.value;
    }

    for (const select of variantPicker.querySelectorAll('select')) {
      const option = select.selectedOptions[0];
      const index = this.#optionIndexForName(option?.dataset.optionName);
      if (index > -1) selectedOptions[index] = option.value;
    }

    return selectedOptions;
  }

  #getCurrentVariant() {
    const formVariantId = this.#getForm()?.querySelector('input[name="id"]')?.value;
    const urlVariantId = new URL(window.location.href).searchParams.get('variant');
    const variantId = formVariantId || urlVariantId;

    return (
      this.variants.find((variant) => variant.id?.toString() === variantId?.toString()) ||
      this.variants.find((variant) => variant.available) ||
      this.variants[0]
    );
  }

  #findVariantForSize(size, baseOptions) {
    const wantedOptions = [...baseOptions];
    wantedOptions[this.sizeOptionIndex] = size;

    return this.variants.find((variant) =>
      variant.options.every((option, index) => this.#normalize(option) === this.#normalize(wantedOptions[index]))
    );
  }

  #optionIndexForName(optionName) {
    return this.optionNames.findIndex((name) => this.#normalize(name) === this.#normalize(optionName));
  }

  #getQuantity(item) {
    return Math.max(0, Number.parseInt(item.input?.value || '0', 10) || 0);
  }

  #setQuantity(item, quantity, syncTheme) {
    const nextQuantity = Math.max(0, Number.parseInt(quantity, 10) || 0);

    if (item.input) item.input.value = nextQuantity.toString();
    item.row.classList.toggle('is-selected', nextQuantity > 0);

    if (syncTheme) {
      this.#setStatus('');
    }

    this.#syncFormToFirstSelection();
    this.#updateLabel();
  }

  #syncFormToFirstSelection() {
    const selectedItem = this.getSelectedItems()[0];
    const form = this.#getForm();
    if (!selectedItem || !form) return;

    const variantInput = form.querySelector('input[name="id"]');
    const quantityInput = form.querySelector('input[name="quantity"]');

    if (variantInput) variantInput.value = selectedItem.variantId;
    if (quantityInput) quantityInput.value = selectedItem.quantity.toString();
  }

  #updateLabel() {
    const selectedRows = this.rows
      .map((item) => ({
        size: item.size,
        quantity: this.#getQuantity(item),
        variant: item.variant,
      }))
      .filter((item) => item.quantity > 0 && item.variant);

    const total = selectedRows.reduce((sum, item) => sum + item.quantity, 0);
    this.classList.toggle('has-selection', total > 0);

    if (this.label) this.label.textContent = this.dataset.labelPrefix || 'Storlekar:';

    if (!total) {
      this.#setSummaryText(this.dataset.emptySummary || 'Välj storlek och antal');
      this.#syncPriceSummary();
      return;
    }

    this.#setSummaryChips(selectedRows);
    this.#syncPriceSummary();
  }

  #setSummaryText(text) {
    if (!this.summary) return;

    this.summary.textContent = text;
  }

  #setSummaryChips(selectedRows) {
    if (!this.summary) return;

    this.summary.textContent = '';

    for (const item of selectedRows) {
      const chip = document.createElement('span');
      chip.className = 'size-quantity-dropdown__chip';
      chip.textContent = `${item.size} x${item.quantity}`;
      this.summary.appendChild(chip);
    }
  }

  #setStatus(message) {
    if (this.status) this.status.textContent = message;
  }

  #syncPriceSummary() {
    const summary = this.getPriceSummary();
    const productForm = this.#getProductForm();
    const priceBox = productForm?.querySelector('[data-devise-cart-price]');

    if (priceBox) {
      const total = priceBox.querySelector('[data-devise-cart-price-total]');
      const detail = priceBox.querySelector('[data-devise-cart-price-detail]');

      priceBox.dataset.totalQuantity = summary.totalQuantity.toString();
      priceBox.dataset.totalPrice = summary.totalPrice.toString();

      if (total) total.textContent = this.#formatMoney(summary.totalPrice, priceBox.dataset.currency);
      if (detail) {
        detail.textContent = summary.totalQuantity > 1 ? `${summary.totalQuantity} plagg totalt` : '1 plagg';
      }
    }

    this.dispatchEvent(
      new CustomEvent('size-quantity:price-update', {
        bubbles: true,
        detail: summary,
      })
    );
  }

  #formatMoney(cents, currency) {
    const amount = (Number(cents) || 0) / 100;
    const currencyCode = currency || 'SEK';
    const locale = document.documentElement.lang || 'sv-SE';

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2).replace('.', ',')} kr`;
    }
  }

  #normalize(value) {
    return String(value || '').trim().toLowerCase();
  }
}

if (!customElements.get('size-quantity-dropdown')) {
  customElements.define('size-quantity-dropdown', SizeQuantityDropdown);
}
