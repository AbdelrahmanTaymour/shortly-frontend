/**
 * DOM Utilities - Safe DOM manipulation helpers
 *
 * RESPONSIBILITY: Provide DOM helper functions
 *
 * ALLOWED:
 * ✅ Create/query/manipulate DOM elements
 * ✅ Attach event listeners safely
 * ✅ Handle DOM transitions
 *
 * FORBIDDEN:
 * ❌ Know about business logic
 * ❌ Know about ProfileHeaderCard or pages
 * ❌ Make DOM decisions based on state
 */

/**
 * Safely create an element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {*} content - Element content
 * @returns {Element}
 */
export function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'class') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else if (key === 'events' && typeof value === 'object') {
            Object.entries(value).forEach(([event, handler]) => {
                element.addEventListener(event, handler);
            });
        } else if (key !== 'children') {
            element.setAttribute(key, value);
        }
    });

    // Set content
    if (content) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (content instanceof Element) {
            element.appendChild(content);
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Element) {
                    element.appendChild(child);
                }
            });
        }
    }

    // Add children from attributes
    if (attributes.children && Array.isArray(attributes.children)) {
        attributes.children.forEach(child => {
            if (child instanceof Element) {
                element.appendChild(child);
            }
        });
    }

    return element;
}

/**
 * Query element safely
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element (default: document)
 * @returns {Element|null}
 */
export function querySelector(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (error) {
        console.error(`Invalid selector: ${selector}`, error);
        return null;
    }
}

/**
 * Query all elements
 * @param {string} selector - CSS selector
 * @param {Element} parent - Parent element (default: document)
 * @returns {Element[]}
 */
export function querySelectorAll(selector, parent = document) {
    try {
        return Array.from(parent.querySelectorAll(selector));
    } catch (error) {
        console.error(`Invalid selector: ${selector}`, error);
        return [];
    }
}

/**
 * Safely remove all children from element
 * @param {Element} element - Element to clear
 */
export function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Add class safely
 * @param {Element} element - Element
 * @param {...string} classes - Classes to add
 */
export function addClass(element, ...classes) {
    if (!element) return;
    element.classList.add(...classes.filter(c => c));
}

/**
 * Remove class safely
 * @param {Element} element - Element
 * @param {...string} classes - Classes to remove
 */
export function removeClass(element, ...classes) {
    if (!element) return;
    element.classList.remove(...classes.filter(c => c));
}

/**
 * Toggle class
 * @param {Element} element - Element
 * @param {string} className - Class name
 * @param {boolean} force - Force add or remove
 */
export function toggleClass(element, className, force) {
    if (!element) return;
    element.classList.toggle(className, force);
}

/**
 * Check if element has class
 * @param {Element} element - Element
 * @param {string} className - Class name
 * @returns {boolean}
 */
export function hasClass(element, className) {
    return element?.classList.contains(className) || false;
}

/**
 * Set multiple attributes
 * @param {Element} element - Element
 * @param {Object} attributes - Attributes to set
 */
export function setAttributes(element, attributes) {
    if (!element) return;
    Object.entries(attributes).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            element.removeAttribute(key);
        } else {
            element.setAttribute(key, value);
        }
    });
}

/**
 * Get attribute value
 * @param {Element} element - Element
 * @param {string} attribute - Attribute name
 * @returns {string|null}
 */
export function getAttribute(element, attribute) {
    return element?.getAttribute(attribute) || null;
}

/**
 * Trigger a custom event
 * @param {Element} element - Element
 * @param {string} eventName - Event name
 * @param {*} detail - Event detail
 */
export function triggerEvent(element, eventName, detail = {}) {
    if (!element) return;
    const event = new CustomEvent(eventName, {detail, bubbles: true});
    element.dispatchEvent(event);
}

/**
 * Attach event listener with auto-cleanup
 * @param {Element} element - Element
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @returns {Function} Unsubscribe function
 */
export function addEventListener(element, event, handler) {
    if (!element) return () => {
    };
    element.addEventListener(event, handler);
    return () => element.removeEventListener(event, handler);
}

/**
 * Smooth scroll to element
 * @param {Element} element - Element to scroll to
 * @param {Object} options - Scroll options
 */
export function scrollToElement(element, options = {}) {
    if (!element) return;
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        ...options
    });
}

/**
 * Disable element
 * @param {Element} element - Element to disable
 */
export function disableElement(element) {
    if (!element) return;
    element.disabled = true;
    addClass(element, 'disabled');
    setAttribute(element, 'aria-disabled', 'true');
}

/**
 * Enable element
 * @param {Element} element - Element to enable
 */
export function enableElement(element) {
    if (!element) return;
    element.disabled = false;
    removeClass(element, 'disabled');
    element.removeAttribute('aria-disabled');
}

/**
 * Set attribute safely
 * @param {Element} element - Element
 * @param {string} attribute - Attribute name
 * @param {string} value - Attribute value
 */
export function setAttribute(element, attribute, value) {
    if (!element) return;
    element.setAttribute(attribute, value);
}

/**
 * Get element's computed style
 * @param {Element} element - Element
 * @param {string} property - CSS property name
 * @returns {string}
 */
export function getComputedStyle(element, property) {
    if (!element) return '';
    return window.getComputedStyle(element).getPropertyValue(property);
}

/**
 * Check if element is visible
 * @param {Element} element - Element
 * @returns {boolean}
 */
export function isVisible(element) {
    return !!(element && element.offsetParent !== null);
}

/**
 * Escape HTML
 */
export function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
