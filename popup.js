const titleInput = document.getElementById('link-title');
const urlInput = document.getElementById('link-url');
const editIdInput = document.getElementById('edit-id');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const linksList = document.getElementById('links-list');
const emptyState = document.getElementById('empty-state');
const copyAllBtn = document.getElementById('copy-all-btn');

let links = [];

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadLinks() {
    chrome.storage.local.get(['links'], (result) => {
        links = result.links || [];
        renderLinks();
    });
}

function saveLinks() {
    chrome.storage.local.set({ links });
}

function renderLinks() {
    linksList.innerHTML = '';
    emptyState.style.display = links.length === 0 ? 'block' : 'none';
    copyAllBtn.style.display = links.length > 0 ? 'inline-block' : 'none';

    links.forEach((link) => {
        const li = document.createElement('li');
        li.className = 'link-item';
        li.innerHTML = `
            <div class="link-info">
                <div class="link-title">${escapeHtml(link.title)}</div>
                <div class="link-url">${escapeHtml(link.url)}</div>
            </div>
            <div class="link-actions">
                <button class="icon-btn copy-btn" title="Copy" data-id="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="icon-btn edit-btn" title="Edit" data-id="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn delete-btn" title="Delete" data-id="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>
        `;
        linksList.appendChild(li);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function resetForm() {
    titleInput.value = '';
    urlInput.value = '';
    editIdInput.value = '';
    saveBtn.textContent = 'Save';
    cancelBtn.style.display = 'none';
    titleInput.focus();
}

function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied!');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copied!');
    });
}

saveBtn.addEventListener('click', () => {
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) {
        showToast('Title and URL are required');
        return;
    }

    const editId = editIdInput.value;
    if (editId) {
        const idx = links.findIndex((l) => l.id === editId);
        if (idx !== -1) {
            links[idx].title = title;
            links[idx].url = url;
        }
    } else {
        links.push({ id: generateId(), title, url });
    }

    saveLinks();
    renderLinks();
    resetForm();
    showToast(editId ? 'Link updated' : 'Link saved');
});

cancelBtn.addEventListener('click', resetForm);

linksList.addEventListener('click', (e) => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;

    const id = btn.dataset.id;

    if (btn.classList.contains('copy-btn')) {
        const link = links.find((l) => l.id === id);
        if (link) {
            copyToClipboard(link.url);
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1200);
        }
    }

    if (btn.classList.contains('edit-btn')) {
        const link = links.find((l) => l.id === id);
        if (link) {
            titleInput.value = link.title;
            urlInput.value = link.url;
            editIdInput.value = link.id;
            saveBtn.textContent = 'Update';
            cancelBtn.style.display = 'inline-block';
            titleInput.focus();
        }
    }

    if (btn.classList.contains('delete-btn')) {
        links = links.filter((l) => l.id !== id);
        saveLinks();
        renderLinks();
        showToast('Link deleted');
        if (editIdInput.value === id) resetForm();
    }
});

copyAllBtn.addEventListener('click', () => {
    const allUrls = links.map((l) => l.url).join('\n');
    copyToClipboard(allUrls);
});

loadLinks();
