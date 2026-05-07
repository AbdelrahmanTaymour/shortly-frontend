
import BasePage from '../BasePage.js';
import {isValidUrl} from '../../../utils/validation.js';
import apiConfig from '../../../config/api.config.js';

class LandingPage extends BasePage {
    async mount() {
        await super.mount();

        this.header = document.querySelector('header');

        // Cache elements
        this.urlTabBtn = this.querySelector('[data-tab="url"]');
        this.qrTabBtn = this.querySelector('[data-tab="qr"]');
        this.urlTab = document.getElementById('urlTab');
        this.qrTab = this.querySelector('#qrTab');

        this.urlInput = document.getElementById('urlInput');
        this.qrInput = document.getElementById('qrUrlInput');


        this.result = document.getElementById('result');
        this.shortUrlEl = document.getElementById('shortUrl');

        this.qrResult = document.getElementById('qrResult');
        this.qrCanvas = document.querySelector('#qrCode canvas');

        this.bindTabs();
        this.bindUrlShortener();
        this.bindQRGenerator();
        this.initHeaderScroll();
        this.setupSmoothScroll();
        this.setupUserMenu();
    }

    setLoading(tab, loading) {
        const btnText = tab.querySelector('.btn-text');
        const loader = tab.querySelector('.loading-inline');

        if (!btnText || !loader) return;

        btnText.style.display = loading ? 'none' : 'block';
        loader.style.display = loading ? 'block' : 'none';
    }

    showError(input, message) {
        input.style.borderColor = '#f5576c';
        input.value = '';
        input.focus();

        // Find the closest tab-content parent
        const tab = input.closest('.tab-content');
        if (!tab) return;

        // Find the error-message inside that tab
        const errorElement = tab.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.classList.add('show');

            setTimeout(() => {
                errorElement.style.display = 'none';
                input.style.borderColor = '';
            }, 3000);
        }
    }

    resetInputStates() {
        const inputs = document.querySelectorAll('input[type="text"], input[type="url"]');
        inputs.forEach(input => {
            input.style.borderColor = '';
            input.value = '';
        });
    }

    /* -------------------------
     * Tabs (URL / QR)
     * ------------------------- */
    bindTabs() {
        if (this.urlTabBtn) {
            this.urlTabBtn.addEventListener('click', () => this.switchTab('url'));
        }

        if (this.qrTabBtn) {
            this.qrTabBtn.addEventListener('click', () => this.switchTab('qr'));
        }

        // Default tab
        this.switchTab('url');
    }

    switchTab(tab) {
        this.urlTabBtn?.classList.toggle('active', tab === 'url');
        this.qrTabBtn?.classList.toggle('active', tab === 'qr');

        if (this.urlTab) this.urlTab.style.display = tab === 'url' ? 'block' : 'none';
        if (this.qrTab) this.qrTab.style.display = tab === 'qr' ? 'block' : 'none';

        // Reset any error states
        this.resetInputStates();
    }

    /* -------------------------
     * URL Shortener
     * ------------------------- */
    bindUrlShortener() {
        if (!this.urlInput) return;

        const button = document.getElementById('urlShortenButton');

        button?.addEventListener('click', () => this.shortenUrl());
    }

    async shortenUrl() {
        const value = this.urlInput.value.trim();

        if (!value) {
            this.showError(this.urlInput, 'Please enter a URL');
            return;
        }

        if (!isValidUrl(value)) {
            this.showError(this.urlInput, 'Please enter a valid URL (including http:// or https://)');
            return;
        }

        this.setLoading(this.urlTab, true);

        try {
            const linksService = this.getService('links');

            const payload = {
                originalUrl: value
            };
            const response = await linksService.createLink(payload);

            const finalUrl = response?.shortUrl;
            if (!finalUrl) {
                throw new Error('Invalid response from server: Missing shortUrl');
            }

            this.renderShortUrl(finalUrl);
            this.urlInput.value = '';

        } catch (error) {
            console.error('Shorten URL error:', error);
            this.showError(this.urlInput, error.message || 'Failed to shorten URL');
        } finally {
            this.setLoading(this.urlTab, false);
        }
    }

    renderShortUrl(shortValue) {
        const shortUrl = shortValue.startsWith('http')
            ? shortValue
            : `${apiConfig.baseUrl}/${shortValue}`;

        // Show the result card
        if (this.result) {
            this.result.style.display = 'block';
            this.result.classList.add('animate-fade-in');
        }

        if (this.shortUrlEl) {
            this.shortUrlEl.textContent = shortUrl;
        }

        const copyBtn = this.querySelector('.copy-btn');
        if (copyBtn) {
            const newBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newBtn, copyBtn);

            newBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shortUrl);
                    const originalHtml = newBtn.innerHTML;
                    newBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                    setTimeout(() => {
                        newBtn.innerHTML = originalHtml;
                    }, 2000);
                } catch (err) {
                    console.error('Copy failed', err);
                }
            });
        }
    }

    /* -------------------------
     * QR Generator
     * ------------------------- */
    bindQRGenerator() {
        if (!this.qrInput) return;

        const button = document.getElementById('qrGenerateButton');
        button?.addEventListener('click', () => this.generateQR());

        const downloadBtn = document.getElementById('qrDownload');
        downloadBtn?.addEventListener('click', () => this.downloadQR());
    }

    generateQR() {
        const value = this.qrInput?.value?.trim();
        if (!value || !this.qrCanvas) return;

        // QRious is loaded globally from CDN (_legacy)
        new window.QRious({
            element: this.qrCanvas,
            value,
            size: 200,
            level: 'H',
            background: 'white',
            foreground: 'black'
        });

        this.qrInput.dataset.lastQrValue = value;
        this.qrResult.style.display = 'block';
        this.qrInput.value = '';
    }

    downloadQR() {
        if (!this.qrCanvas) return;

        // Get the URL value to use as filename, fallback to 'qrcode'
        const rawUrl = this.qrInput?.dataset?.lastQrValue || 'qrcode';
        const filename = rawUrl
            .replace(/^https?:\/\//, '')   // strip protocol
            .replace(/[^a-zA-Z0-9._-]/g, '_') // sanitize
            .slice(0, 50);

        const link = document.createElement('a');
        link.href = this.qrCanvas.toDataURL('image/png');
        link.download = `${filename}.png`;
        link.click();
    }

    /* -------------------------
     * Header scroll effect
     * ------------------------- */
    initHeaderScroll() {
        let ticking = false;
        const header = document.querySelector('header');
        if (!header) return;

        // This is the function that actually updates the DOM
        const updateHeader = () => {
            const isScrolled = window.scrollY > 100;
            header.classList.toggle('scrolled', isScrolled);
            ticking = false;
        };

        // This function handles the "Tick" to save performance
        this._headerScrollHandler = () => {
            if (!ticking) {
                window.requestAnimationFrame(updateHeader);
                ticking = true;
            }
        };

        // Attach the listener to the window
        window.addEventListener('scroll', this._headerScrollHandler);

        // Run once on load to check the current position
        updateHeader();
    }

    /* -------------------------
     * Smooth scroll for anchors
     * ------------------------- */
    // --------------------
    // Smooth Scroll
    // --------------------
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    /* -------------------------
     * User menu (public header)
     * ------------------------- */
    setupUserMenu() {
        document.addEventListener('click', (e) => {
            const avatar = e.target.closest('.user-avatar');
            const dropdown = document.getElementById('userDropdown');

            if (avatar && dropdown) {
                dropdown.style.display =
                    dropdown.style.display === 'block' ? 'none' : 'block';
                return;
            }

            if (dropdown && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    async unmount() {

        // Remove the global scroll listener
        if (this._headerScrollHandler) {
            window.removeEventListener('scroll', this._headerScrollHandler);
        }


        await super.unmount();
    }
}

export default LandingPage;