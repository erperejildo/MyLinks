function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { escapeHtml, generateId };
}
