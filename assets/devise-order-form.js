(function () {
  function initDeviseOrderForm(root) {
    const scope = root || document;
    const form =
      scope.querySelector("#devise-custom-order-form") ||
      document.getElementById("devise-custom-order-form");

    if (!form) return;
    if (form.dataset.deviseInitialized === "true") return;

    form.dataset.deviseInitialized = "true";

    const PRICING = window.DEVISE_PRICING || {};
    const MOCKUPS = window.DEVISE_MOCKUPS || {};

    let currentStep = 1;
    const totalSteps = 4;
    let currentPreviewSide = "front";
    let uploadedPreviewSrc = "";

    function q(selector) {
      return form.querySelector(selector) || document.querySelector(selector);
    }

    function qa(selector) {
      return Array.from(form.querySelectorAll(selector));
    }

    function byId(id) {
      return form.querySelector("#" + id) || document.getElementById(id);
    }

    const steps = qa(".devise-step");
    const progressItems = qa(".devise-progress-item");

    const currentStepEl = byId("deviseCurrentStep");
    const prevBtn = byId("devisePrev");
    const nextBtn = byId("deviseNext");
    const submitBtn = byId("deviseSubmit");

    const idea = byId("deviseIdea");
    const charCount = byId("deviseCharCount");
    const fileInput = byId("deviseFileInput");
    const fileName = byId("deviseFileName");
    const hiddenFileName = byId("deviseUploadedFileName");
    const hiddenOtherColor = byId("deviseOtherColorHidden");
    const otherColorInput = byId("deviseOtherColor");
    const otherColorWrap = byId("deviseOtherColorWrap");

    const previewStage = byId("devisePreviewStage");
    const mockupImage = byId("deviseMockupImage");
    const mockupTint = byId("deviseMockupTint");
    const fallbackGarment = q(".devise-fallback-garment");

    const previewBadge = byId("devisePreviewBadge");
    const previewSideButtons = qa("[data-preview-side]");
    const printLayer = byId("devisePrintLayer");
    const previewImg = byId("devisePreviewImage");
    const printPlaceholder = byId("devisePrintPlaceholder");
    const previewText = byId("devisePreviewText");
    const sideNote = byId("deviseSideNote");

    const previewProduct = byId("devisePreviewProduct");
    const previewColor = byId("devisePreviewColor");
    const previewPlacement = byId("devisePreviewPlacement");

    const summary = byId("deviseSummary");
    const orderBody = byId("deviseOrderBody");
    const estimateTotal = byId("deviseEstimateTotal");
    const estimateField = byId("devisePriceEstimateField");
    const priceBreakdown = byId("devisePriceBreakdown");

    if (!nextBtn || !prevBtn || !submitBtn || !currentStepEl || !idea) return;

    const errors = {
      idea: q('[data-error="idea"]'),
      product: q('[data-error="product"]'),
      color: q('[data-error="color"]'),
      othercolor: q('[data-error="othercolor"]'),
      size: q('[data-error="size"]'),
      quantity: q('[data-error="quantity"]'),
      placement: q('[data-error="placement"]'),
      name: q('[data-error="name"]'),
      email: q('[data-error="email"]'),
      phone: q('[data-error="phone"]')
    };

    function formatPrice(value) {
      return Math.round(Number(value) || 0) + " kr";
    }

    function getValue(name) {
      const checked = form.querySelector('[name="' + name + '"]:checked');
      if (checked) return checked.value;

      const field = form.querySelector('[name="' + name + '"]');
      if (!field) return "";

      return field.value ? field.value.trim() : "";
    }

    function getProduct() {
      return getValue("contact[Produkt]") || "Hoodie";
    }

    function getPlacement() {
      return getValue("contact[Tryckplacering]") || "Fram";
    }

    function getColorName() {
      return getValue("contact[Färg]") || "Svart";
    }

    function getColorHex() {
      const selected = form.querySelector('[name="contact[Färg]"]:checked');
      return selected ? selected.dataset.color : "#050505";
    }

    function clearErrors() {
      Object.keys(errors).forEach(function (key) {
        if (errors[key]) errors[key].textContent = "";
      });
    }

    function showStep(step) {
      if (step < 1) step = 1;
      if (step > totalSteps) step = totalSteps;

      currentStep = step;

      steps.forEach(function (panel) {
        panel.classList.toggle("active", Number(panel.dataset.step) === currentStep);
      });

      progressItems.forEach(function (item) {
        const index = Number(item.dataset.progress);
        const number = item.querySelector("span");

        item.classList.toggle("active", index === currentStep);
        item.classList.toggle("done", index < currentStep);

        if (number) {
          number.textContent = index < currentStep ? "✓" : index;
        }
      });

      currentStepEl.textContent = currentStep;

      prevBtn.classList.toggle("is-hidden", currentStep === 1);
      nextBtn.style.display = currentStep === totalSteps ? "none" : "inline-flex";
      submitBtn.style.display = currentStep === totalSteps ? "inline-flex" : "none";

      if (currentStep === totalSteps) {
        updateSummary();
      }
    }

    function validateStep(step) {
      clearErrors();

      let valid = true;

      if (step === 1) {
        if (!idea.value.trim()) {
          if (errors.idea) errors.idea.textContent = "Beskriv idén innan du går vidare.";
          valid = false;
        }
      }

      if (step === 2) {
        if (!getValue("contact[Produkt]")) {
          if (errors.product) errors.product.textContent = "Välj produkt.";
          valid = false;
        }

        if (!getValue("contact[Färg]")) {
          if (errors.color) errors.color.textContent = "Välj färg.";
          valid = false;
        }

        if (
          getValue("contact[Färg]") === "Annan färg" &&
          otherColorInput &&
          !otherColorInput.value.trim()
        ) {
          if (errors.othercolor) errors.othercolor.textContent = "Skriv vilken färg du vill ha.";
          valid = false;
        }

        if (!getValue("contact[Storlek]")) {
          if (errors.size) errors.size.textContent = "Välj storlek.";
          valid = false;
        }

        const quantityInput = byId("deviseQuantity");
        const qty = quantityInput ? Number(quantityInput.value) : 0;

        if (!qty || qty < 1) {
          if (errors.quantity) errors.quantity.textContent = "Ange minst 1 i antal.";
          valid = false;
        }
      }

      if (step === 3) {
        if (!getValue("contact[Tryckplacering]")) {
          if (errors.placement) errors.placement.textContent = "Välj tryckplacering.";
          valid = false;
        }
      }

      if (step === 4) {
        const name = byId("deviseName") ? byId("deviseName").value.trim() : "";
        const email = byId("deviseEmail") ? byId("deviseEmail").value.trim() : "";
        const phone = byId("devisePhone") ? byId("devisePhone").value.trim() : "";

        if (!name) {
          if (errors.name) errors.name.textContent = "Skriv ditt namn.";
          valid = false;
        }

        if (!email || !email.includes("@")) {
          if (errors.email) errors.email.textContent = "Skriv en giltig email.";
          valid = false;
        }

        if (!phone) {
          if (errors.phone) errors.phone.textContent = "Skriv telefonnummer.";
          valid = false;
        }
      }

      return valid;
    }

    function getMockupUrl(product, side) {
      if (MOCKUPS[product] && MOCKUPS[product][side]) {
        return MOCKUPS[product][side];
      }

      return "";
    }

    function setPreviewSide(side) {
      currentPreviewSide = side;

      previewSideButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-preview-side") === side);
      });

      updateFullPreview(false);
    }

    function updateFallbackClass(product) {
      if (!fallbackGarment) return;

      fallbackGarment.classList.remove("is-hoodie", "is-tshirt", "is-zip", "is-sweatshirt");

      if (product === "T-shirt") fallbackGarment.classList.add("is-tshirt");
      else if (product === "Zip Hoodie") fallbackGarment.classList.add("is-zip");
      else if (product === "Sweatshirt") fallbackGarment.classList.add("is-sweatshirt");
      else fallbackGarment.classList.add("is-hoodie");
    }

    function updateMockupImage(product, side, colorHex) {
      if (!previewStage || !mockupImage || !mockupTint) return;

      const url = getMockupUrl(product, side);

      previewStage.style.setProperty("--garment-color", colorHex);
      updateFallbackClass(product);

      if (!url) {
        previewStage.classList.add("is-fallback");
        if (fallbackGarment) fallbackGarment.style.setProperty("--garment-color", colorHex);
        return;
      }

      previewStage.classList.remove("is-fallback");
      mockupImage.src = url;
      mockupTint.style.setProperty("--mockup-url", 'url("' + url + '")');

      mockupImage.onerror = function () {
        previewStage.classList.add("is-fallback");
        if (fallbackGarment) fallbackGarment.style.setProperty("--garment-color", colorHex);
      };

      mockupImage.onload = function () {
        previewStage.classList.remove("is-fallback");
      };
    }

    function updateFullPreview(autoSide) {
      const product = getProduct();
      const placement = getPlacement();
      const colorName = getColorName();
      const colorHex = getColorHex();

      if (autoSide !== false) {
        if (placement === "Bak") currentPreviewSide = "back";
        if (placement === "Fram") currentPreviewSide = "front";
      }

      previewSideButtons.forEach(function (btn) {
        btn.classList.toggle(
          "is-active",
          btn.getAttribute("data-preview-side") === currentPreviewSide
        );
      });

      updateMockupImage(product, currentPreviewSide, colorHex);

      if (previewBadge) {
        previewBadge.textContent =
          product + " · " + (currentPreviewSide === "front" ? "Fram" : "Bak");
      }

      if (previewProduct) previewProduct.textContent = product;

      if (previewColor) {
        previewColor.textContent =
          colorName === "Annan färg" && otherColorInput && otherColorInput.value.trim()
            ? otherColorInput.value.trim()
            : colorName;
      }

      if (previewPlacement) previewPlacement.textContent = placement || "Ej valt";

      if (!printLayer) return;

      printLayer.classList.remove("is-back", "is-tshirt", "is-sweatshirt", "is-hidden-print");

      if (currentPreviewSide === "back") printLayer.classList.add("is-back");
      if (product === "T-shirt") printLayer.classList.add("is-tshirt");
      if (product === "Sweatshirt") printLayer.classList.add("is-sweatshirt");

      const shouldShowPrint =
        placement === "Fram och bak" ||
        (placement === "Fram" && currentPreviewSide === "front") ||
        (placement === "Bak" && currentPreviewSide === "back") ||
        (!getValue("contact[Tryckplacering]") && currentPreviewSide === "front");

      printLayer.classList.toggle("is-hidden-print", !shouldShowPrint);

      if (sideNote) {
        sideNote.textContent = shouldShowPrint
          ? "Tryck visas på denna sida"
          : "Trycket är valt på andra sidan";
      }

      const textInput = byId("devisePrintText");
      const printText = textInput ? textInput.value.trim() : "";

      if (uploadedPreviewSrc && shouldShowPrint && previewImg) {
        previewImg.src = uploadedPreviewSrc;
        previewImg.style.display = "block";
        if (printPlaceholder) printPlaceholder.style.display = "none";
      } else {
        if (previewImg) previewImg.style.display = "none";

        if (printPlaceholder) {
          printPlaceholder.style.display = "block";
          printPlaceholder.textContent =
            printText && shouldShowPrint ? printText : "YOUR DESIGN HERE";
        }
      }

      if (previewText) {
        previewText.textContent =
          uploadedPreviewSrc && printText && shouldShowPrint ? printText : "";
      }
    }

    function toggleOtherColorField() {
      const color = getValue("contact[Färg]");
      const visible = color === "Annan färg";

      if (otherColorWrap) otherColorWrap.classList.toggle("is-visible", visible);

      if (hiddenOtherColor && otherColorInput) {
        hiddenOtherColor.value = visible ? otherColorInput.value.trim() : "";
      }
    }

    function getEstimateData() {
      const product = getValue("contact[Produkt]");
      const color = getValue("contact[Färg]");
      const size = getValue("contact[Storlek]");
      const placement = getValue("contact[Tryckplacering]");
      const quantity = Math.max(1, Number(getValue("contact[Antal]") || 1));

      const basePrice = (PRICING.baseProducts && PRICING.baseProducts[product]) || 0;
      const placementFee = (PRICING.placementFees && PRICING.placementFees[placement]) || 0;
      const sizeFee = (PRICING.sizeFees && PRICING.sizeFees[size]) || 0;
      const colorFee = (PRICING.colorFees && PRICING.colorFees[color]) || 0;

      const uploadFee =
        hiddenFileName &&
        hiddenFileName.value &&
        hiddenFileName.value !== "Ingen fil uppladdad"
          ? PRICING.uploadFee || 0
          : 0;

      const perItem = basePrice + placementFee + sizeFee + colorFee + uploadFee;
      const total = perItem * quantity;

      return {
        product,
        color,
        size,
        placement,
        quantity,
        basePrice,
        placementFee,
        sizeFee,
        colorFee,
        uploadFee,
        perItem,
        total
      };
    }

    function updateEstimate() {
      const estimate = getEstimateData();

      if (estimateTotal) estimateTotal.textContent = formatPrice(estimate.total);
      if (estimateField) estimateField.value = formatPrice(estimate.total);

      if (!priceBreakdown) return;

      const rows = [
        { label: "Baspris", value: estimate.basePrice },
        { label: "Tryckplacering", value: estimate.placementFee },
        { label: "Storlek", value: estimate.sizeFee },
        { label: "Färg", value: estimate.colorFee },
        { label: "Designfil", value: estimate.uploadFee },
        { label: "Antal", value: "x " + estimate.quantity }
      ];

      priceBreakdown.innerHTML = rows.map(function (row) {
        return '<div class="devise-price-row"><span>' + row.label + '</span><strong>' +
          (typeof row.value === "number" ? formatPrice(row.value) : row.value) +
          '</strong></div>';
      }).join("");
    }

    function updateSummary() {
      if (!summary || !orderBody) return;

      const chosenColor =
        getValue("contact[Färg]") === "Annan färg"
          ? "Annan färg: " + (otherColorInput && otherColorInput.value.trim() ? otherColorInput.value.trim() : "Ej angiven")
          : getValue("contact[Färg]") || "Ej valt";

      const data = {
        "Idé": getValue("contact[Idébeskrivning]"),
        "Designlänk": getValue("contact[Designlänk]") || "Ingen länk",
        "Uppladdad fil": hiddenFileName ? hiddenFileName.value : "Ingen fil",
        "Produkt": getValue("contact[Produkt]") || "Ej valt",
        "Färg": chosenColor,
        "Storlek": getValue("contact[Storlek]") || "Ej valt",
        "Antal": getValue("contact[Antal]") || "1",
        "Tryckplacering": getValue("contact[Tryckplacering]") || "Ej valt",
        "Text på plagget": getValue("contact[Text på plagget]") || "Ingen text",
        "Extra information": getValue("contact[Extra information]") || "Ingen extra information",
        "Prisestimat": estimateField ? estimateField.value : "0 kr"
      };

      summary.innerHTML = Object.keys(data).map(function (key) {
        return '<div class="devise-summary-row"><span>' + key + '</span><strong>' + data[key] + '</strong></div>';
      }).join("");

      orderBody.value =
        "NY CUSTOM BESTÄLLNING - DEVISEAPPAREL\n\n" +
        Object.keys(data).map(function (key) {
          return key + ": " + data[key];
        }).join("\n") +
        "\n\nKund: " + getValue("contact[name]") +
        "\nEmail: " + getValue("contact[email]") +
        "\nTelefon: " + getValue("contact[phone]") +
        "\nFöretag: " + (getValue("contact[Företag]") || "Ej angivet");
    }

    idea.addEventListener("input", function () {
      if (charCount) charCount.textContent = idea.value.length;
    });

    qa('[name="contact[Produkt]"]').forEach(function (input) {
      input.addEventListener("change", function () {
        updateFullPreview(true);
        updateEstimate();
      });
    });

    qa('[name="contact[Färg]"]').forEach(function (input) {
      input.addEventListener("change", function () {
        toggleOtherColorField();
        updateFullPreview(true);
        updateEstimate();
      });
    });

    qa('[name="contact[Storlek]"]').forEach(function (input) {
      input.addEventListener("change", updateEstimate);
    });

    qa('[name="contact[Tryckplacering]"]').forEach(function (input) {
      input.addEventListener("change", function () {
        updateFullPreview(true);
        updateEstimate();
      });
    });

    const printTextInput = byId("devisePrintText");
    if (printTextInput) {
      printTextInput.addEventListener("input", function () {
        updateFullPreview(false);
      });
    }

    const quantityInput = byId("deviseQuantity");
    if (quantityInput) {
      quantityInput.addEventListener("input", updateEstimate);
    }

    previewSideButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        setPreviewSide(button.getAttribute("data-preview-side"));
      });
    });

    if (otherColorInput) {
      otherColorInput.addEventListener("input", function () {
        if (hiddenOtherColor) hiddenOtherColor.value = otherColorInput.value.trim();
        updateFullPreview(false);
        updateEstimate();
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        const file = fileInput.files[0];
        if (!file) return;

        if (fileName) fileName.textContent = file.name;
        if (hiddenFileName) hiddenFileName.value = file.name;

        updateEstimate();

        if (file.type.startsWith("image/")) {
          const reader = new FileReader();

          reader.onload = function (event) {
            uploadedPreviewSrc = event.target.result;
            updateFullPreview(false);
          };

          reader.readAsDataURL(file);
        } else {
          uploadedPreviewSrc = "";
          updateFullPreview(false);
        }
      });
    }

    nextBtn.addEventListener("click", function () {
      if (!validateStep(currentStep)) return;
      showStep(currentStep + 1);
    });

    prevBtn.addEventListener("click", function () {
      showStep(currentStep - 1);
    });

    form.addEventListener("submit", function (event) {
      for (let i = 1; i <= totalSteps; i++) {
        if (!validateStep(i)) {
          event.preventDefault();
          showStep(i);
          return;
        }
      }

      updateSummary();
    });

    toggleOtherColorField();
    updateEstimate();
    updateFullPreview(true);
    showStep(1);
  }

  function startDeviseOrderForm() {
    initDeviseOrderForm(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startDeviseOrderForm);
  } else {
    startDeviseOrderForm();
  }

  document.addEventListener("shopify:section:load", function (event) {
    initDeviseOrderForm(event.target);
  });
})();