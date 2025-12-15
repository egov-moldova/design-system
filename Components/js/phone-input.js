class PhoneInput {
  constructor(container, options = {}) {
    this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

    this.options = {
      locale: 'ro',
      defaultCountry: 'MD',
      countriesPath: 'assets/data/countries.json',
      onChange: null,
      onValidate: null,
      ...options
    };

    this.countries = [];
    this.selectedCountry = null;

    this.messages = {
      ro: {
        required: 'Numărul de telefon este obligatoriu',
        invalid: 'Număr de telefon invalid',
        tooShort: 'Numărul este prea scurt',
        tooLong: 'Numărul este prea lung',
        searchPlaceholder: 'Caută țara...'
      },
      en: {
        required: 'Phone number is required',
        invalid: 'Invalid phone number',
        tooShort: 'Number is too short',
        tooLong: 'Number is too long',
        searchPlaceholder: 'Search country...'
      }
    };

    this.init();
  }
  async init() {
    await this.loadCountries();
    this.render();
    this.bindEvents();
    this.setCountry(this.options.defaultCountry);
    window.addEventListener('resize', () => this.syncDropdownWidth());
    this.applyInitialState();
  }
  applyInitialState() {
    const el = this.container;
    
    if (el.hasAttribute('readonly') || el.dataset.readonly === 'true') {
      this.setReadonly(true);
    }
    
    if (el.hasAttribute('disabled') || el.dataset.disabled === 'true') {
      this.disable();
    }
  }

  async loadCountries() {
    try {
      const response = await fetch(this.options.countriesPath);
      const data = await response.json();
      this.countries = data.countries;
    } catch (error) {
      console.error('Failed to load countries:', error);
      this.countries = [];
    }
  }

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  render() {
    // Options pentru custom dropdown cu flag-icons
    const options = this.countries.map(country =>
        `<div class="phone-dropdown__option" data-code="${country.code}" data-dial="${country.dial}">
          <span class="fi fi-${country.code.toLowerCase()}"></span>
          <span class="phone-dropdown__dial">${country.dial}</span>
          <span class="phone-dropdown__name">${country.name}</span>
        </div>`
    ).join('');

    
    this.container.innerHTML = `
      <div class="phone-field-container">
        <div class="phone-field">
          <div class="phone-field__country">
            <span class="phone-field__flag fi fi-md"></span>
            <span class="phone-field__code">+373</span>
          </div>
          <input type="tel" class="phone-field__input" inputmode="numeric" placeholder="">
        </div>
        <div class="phone-dropdown">
          <div class="phone-dropdown__search">
            <input type="text" class="phone-dropdown__search-input" placeholder="${this.msg('searchPlaceholder')}">
          </div>
          <div class="phone-dropdown__options">
            ${options}
          </div>
        </div>
      </div>
    `;
    
    
    this.elements = {
      container: this.container.querySelector('.phone-field-container'),
      wrapper: this.container.querySelector('.phone-field'),
      countryWrapper: this.container.querySelector('.phone-field__country'),
      flag: this.container.querySelector('.phone-field__flag'),
      code: this.container.querySelector('.phone-field__code'),
      dropdown: this.container.querySelector('.phone-dropdown'),
      dropdownSearch: this.container.querySelector('.phone-dropdown__search-input'),
      dropdownOptions: this.container.querySelector('.phone-dropdown__options'),
      input: this.container.querySelector('.phone-field__input')
    };
    
    this.syncDropdownWidth();
  }

  bindEvents() {
    // Toggle dropdown
    this.elements.countryWrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Search in dropdown
    this.elements.dropdownSearch.addEventListener('input', (e) => {
      this.filterCountries(e.target.value);
    });

    // Select country from dropdown
    this.elements.dropdownOptions.addEventListener('click', (e) => {
      const option = e.target.closest('.phone-dropdown__option');
      if (option) {
        this.setCountry(option.dataset.code);
        this.closeDropdown();
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });

    // Phone input events
    this.elements.input.addEventListener('input', (e) => {
      e.target.value = this.formatInput(e.target.value);
      this.validate();
      this.options.onChange?.(this.getValue());
    });

    this.elements.input.addEventListener('blur', () => {
      this.validate(true);
    });

    // Close dropdown on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elements.dropdown.classList.contains('is-open')) {
        this.closeDropdown();
      }
    });
  }

  toggleDropdown() {
    const isOpen = this.elements.dropdown.classList.contains('is-open');
    if (isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  openDropdown() {
    this.elements.dropdown.classList.add('is-open');
    this.elements.countryWrapper.classList.add('is-active');
    this.elements.dropdownSearch.value = '';
    this.filterCountries('');
    setTimeout(() => {
      this.elements.dropdownSearch.focus();
    }, 100);
  }

  closeDropdown() {
    this.elements.dropdown.classList.remove('is-open');
    this.elements.countryWrapper.classList.remove('is-active');
  }

  filterCountries(query) {
    const searchTerm = query.toLowerCase().trim();
    const options = this.elements.dropdownOptions.querySelectorAll('.phone-dropdown__option');
    
    options.forEach(option => {
      const code = option.dataset.code.toLowerCase();
      const dial = option.dataset.dial;
      const name = option.querySelector('.phone-dropdown__name').textContent.toLowerCase();
      
      const matches = name.includes(searchTerm) || 
                      code.includes(searchTerm) || 
                      dial.includes(searchTerm);
      
      option.style.display = matches ? 'flex' : 'none';
    });
  }

  // ═══════════════════════════════════════════
  // SETARE ȚARĂ
  // ═══════════════════════════════════════════

  setCountry(code) {
    const country = this.countries.find(c => c.code === code);
    if (!country) return;

    this.selectedCountry = country;

    // Update flag and dial code display
    this.elements.flag.className = `phone-field__flag fi fi-${code.toLowerCase()}`;
    this.elements.code.textContent = country.dial;
    this.elements.input.maxLength = Math.max(...country.length);
    this.elements.input.placeholder = this.getPlaceholder(country);

    // Highlight selected option in dropdown
    const options = this.elements.dropdownOptions.querySelectorAll('.phone-dropdown__option');
    options.forEach(option => {
      option.classList.toggle('is-selected', option.dataset.code === code);
    });

    this.validate();
  }

  getPlaceholder(country) {
    const len = country.length[0];
    const digits = '0'.repeat(len);

    if (len >= 9) {
      return digits.replace(/(\d{2})(\d{3})(\d+)/, '$1 $2 $3');
    } else if (len >= 7) {
      return digits.replace(/(\d{3})(\d+)/, '$1 $2');
    }
    return digits;
  }

  formatInput(value) {
    return value.replace(/[^0-9]/g, '');
  }

  validate(showError = false) {
    const number = this.elements.input.value;
    const result = this.getValidationResult(number);

    this.elements.wrapper.classList.remove(
        'phone-field--warning',
        'phone-field--destructive',
        'phone-field--success'
    );

    if (result.state !== 'default') {
      this.elements.wrapper.classList.add(`phone-field--${result.state}`);
    }

    this.options.onValidate?.(result);
    return result;
  }

  getValidationResult(number) {
    if (!this.selectedCountry) {
      return { valid: false, state: 'default', message: '' };
    }

    const { length, pattern } = this.selectedCountry;
    const digits = number.replace(/\D/g, '');

    if (!digits) {
      return { valid: false, state: 'default', message: '' };
    }

    if (digits.length < Math.min(...length)) {
      return { valid: false, state: 'warning', message: this.msg('tooShort') };
    }

    if (digits.length > Math.max(...length)) {
      return { valid: false, state: 'destructive', message: this.msg('tooLong') };
    }

    const regex = new RegExp(pattern);
    if (!regex.test(digits)) {
      return { valid: false, state: 'destructive', message: this.msg('invalid') };
    }

    return { valid: true, state: 'success', message: '' };
  }
  
  getValue() {
    if (!this.selectedCountry) return null;

    const number = this.elements.input.value.replace(/\D/g, '');
    return {
      country: this.selectedCountry.code,
      dialCode: this.selectedCountry.dial,
      number: number,
      e164: `${this.selectedCountry.dial}${number}`,
      isValid: this.getValidationResult(number).valid
    };
  }

  setValue(e164Number) {
    const country = this.countries.find(c => e164Number.startsWith(c.dial));
    if (country) {
      this.setCountry(country.code);
      this.elements.input.value = e164Number.replace(country.dial, '');
      this.validate();
    }
  }

  reset() {
    this.elements.input.value = '';
    this.setCountry(this.options.defaultCountry);
    this.elements.wrapper.classList.remove(
        'phone-field--warning',
        'phone-field--destructive',
        'phone-field--success'
    );
  }

  setLocale(locale) {
    this.options.locale = locale;
  }

  msg(key) {
    return this.messages[this.options.locale]?.[key] || this.messages.en[key];
  }

  disable() {
    this.elements.input.disabled = true;
    this.elements.countryWrapper.style.pointerEvents = 'none';
    this.elements.wrapper.classList.add('phone-field--disabled');
  }

  enable() {
    this.elements.input.disabled = false;
    this.elements.countryWrapper.style.pointerEvents = '';
    this.elements.wrapper.classList.remove('phone-field--disabled');
  }

  setLoading(isLoading) {
    this.elements.wrapper.classList.toggle('is-loading', isLoading);
  }

  setReadonly(isReadonly) {
    this.elements.input.readOnly = isReadonly;
    this.elements.countryWrapper.style.pointerEvents = isReadonly ? 'none' : '';
    this.elements.wrapper.classList.toggle('phone-field--readonly', isReadonly);
  }

  syncDropdownWidth() {
    const container = this.container.querySelector('.phone-field-container');
    const dropdown = this.container.querySelector('.phone-dropdown');
    if (container && dropdown) {
      dropdown.style.width = container.offsetWidth + 'px';
    }
  }
}

// ═══════════════════════════════════════════
// AUTO-INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-phone-input]').forEach(el => {
    new PhoneInput(el, {
      locale: el.dataset.locale || 'ro',
      defaultCountry: el.dataset.country || 'MD',
      countriesPath: el.dataset.countriesPath || 'assets/data/countries.json'
    });
  });
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PhoneInput;
}