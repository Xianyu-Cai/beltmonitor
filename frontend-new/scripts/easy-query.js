/**
 * Returns the first element that matches the specified CSS selector.
 *
 * @param {string} elem - The CSS selector to match.
 * @returns {Element} - The first element that matches the selector.
 */
module.exports = function $(elem) {
    return document.querySelector(elem);
}