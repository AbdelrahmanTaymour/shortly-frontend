/**
 * Show error message
 * @param {Object|HTMLElement} target - The Page object (this) or the actual DOM element
 */


export function showError(target, message) {
    // If the target is the page object, get its errorBox property.
    // Otherwise, assume the target IS the error box.
    const box = target.errorBox || target;

    if (!box) return console.warn("showError: No error box found.");

    box.textContent = message;
    box.classList.add('show');
}

/**
 * Clear form-level error message
 */
export function clearError(target) {
    const box = target.errorBox || target;
    if (!box) return;

    box.textContent = '';
    box.classList.remove('show');
}

/**
 * Show form-level success message
 */
export function showSuccess(input, message) {
    if (!input.successBox) return;
    input.successBox.textContent = message;
    input.successBox.classList.add('show');
}

/**
 * Clear all messages
 */
export function clearMessages(...inputboxes) {
    for (const box of inputboxes) {
        box.textContent = '';
        box.classList.remove('show');
    }
}