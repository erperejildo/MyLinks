const titleInput = document.getElementById('link-title');
const urlInput = document.getElementById('link-url');
const editIdInput = document.getElementById('edit-id');
const saveBtn = document.getElementById('save-btn');
const linksList = document.getElementById('links-list');
const emptyState = document.getElementById('empty-state');
const reorderBtn = document.getElementById('reorder-btn');
const addBtn = document.getElementById('add-btn');
const headerCancelBtn = document.getElementById('header-cancel-btn');
const addForm = document.getElementById('add-form');
const copyAllBtn = document.getElementById('copy-all-btn');

let links = [];
let isReorderMode = false;
let draggedItem = null;
let draggedIndex = -1;
let linksBeforeReorder = [];

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
    emptyState.classList.toggle('hidden', links.length > 0);
    reorderBtn.classList.toggle('hidden', links.length === 0);
    copyAllBtn.classList.toggle('hidden', links.length === 0 || isReorderMode);

    links.forEach((link, index) => {
        const li = document.createElement('li');
        li.className = 'link-item' + (isReorderMode ? ' reorder-mode' : '');
        li.dataset.index = index;
        li.draggable = isReorderMode;

        const dragHandle = isReorderMode
            ? `<div class="drag-handle" title="Drag to reorder">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
               </div>`
            : '';

        const actionsHtml = isReorderMode
            ? ''
            : `<div class="link-actions">
                <button class="icon-btn copy-btn" title="Copy" data-id="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="icon-btn edit-btn" title="Edit" data-id="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="icon-btn delete-btn" title="Delete" data-id="${link.id}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            </div>`;

        li.innerHTML = `
            <div class="link-info">
                <div class="link-title">${escapeHtml(link.title)}</div>
                <a class="link-url" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.url)}</a>
            </div>
            ${dragHandle}
            ${actionsHtml}
        `;
        linksList.appendChild(li);
    });

    if (isReorderMode) {
        attachDragListeners();
    }
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
    addForm.classList.add('hidden');
    addBtn.classList.remove('hidden');
    headerCancelBtn.classList.add('hidden');
}

function showForm() {
    addForm.classList.remove('hidden');
    addBtn.classList.add('hidden');
    headerCancelBtn.classList.remove('hidden');
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

function attachDragListeners() {
    const items = linksList.querySelectorAll('.link-item');

    items.forEach((item) => {
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragend', handleDragEnd);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('dragenter', handleDragEnter);
        item.addEventListener('dragleave', handleDragLeave);
        item.addEventListener('drop', handleDrop);
    });
}

function handleDragStart(e) {
    draggedItem = this;
    draggedIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const items = linksList.querySelectorAll('.link-item');
    items.forEach((item) => item.classList.remove('drag-over'));
    draggedItem = null;
    draggedIndex = -1;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    const fromIndex = draggedIndex;
    const toIndex = parseInt(this.dataset.index);

    if (fromIndex === toIndex) return;

    const [moved] = links.splice(fromIndex, 1);
    links.splice(toIndex, 0, moved);

    renderLinks();
}

function toggleReorderMode() {
    isReorderMode = !isReorderMode;

    if (isReorderMode) {
        linksBeforeReorder = links.map((l) => ({ ...l }));
        reorderBtn.textContent = 'Save';
        reorderBtn.classList.add('btn-active');
        reorderBtn.classList.remove('btn-reorder');
    } else {
        saveLinks();
        reorderBtn.textContent = 'Reorder';
        reorderBtn.classList.remove('btn-active');
        reorderBtn.classList.add('btn-reorder');
        showToast('Links saved');
    }

    renderLinks();
}

// Event listeners

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



addBtn.addEventListener('click', () => {
    resetForm();
    showForm();
});

headerCancelBtn.addEventListener('click', resetForm);

reorderBtn.addEventListener('click', toggleReorderMode);

copyAllBtn.addEventListener('click', () => {
    const text = links.map((link) => `${link.title}: ${link.url}`).join('\n');
    copyToClipboard(text);
});

linksList.addEventListener('click', (e) => {
    if (isReorderMode) return;

    const urlLink = e.target.closest('.link-url');
    if (urlLink) {
        e.stopPropagation();
        return;
    }

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
            showForm();
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

loadLinks();
