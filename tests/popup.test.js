const { escapeHtml, generateId } = require('../src/utils');
global.escapeHtml = escapeHtml;
global.generateId = generateId;

function setupDom() {
  document.body.innerHTML = `
    <div class="container">
      <header>
        <h1>My Links</h1>
        <div class="header-actions">
          <button id="add-btn" class="btn btn-add">Add</button>
          <button id="header-cancel-btn" class="btn btn-cancel hidden">Cancel</button>
        </div>
      </header>
      <div id="add-form" class="form-section hidden">
        <input type="hidden" id="edit-id" value="">
        <input type="text" id="link-title">
        <input type="url" id="link-url">
        <button id="save-btn" class="btn btn-primary">Save</button>
      </div>
      <div id="links-section">
        <button id="reorder-btn" class="btn btn-reorder hidden">Reorder</button>
        <ul id="links-list"></ul>
        <p id="empty-state" class="empty-state"></p>
        <button id="copy-all-btn" class="btn btn-copy-all hidden">Copy All</button>
      </div>
    </div>
  `;
}

function setupChrome(links) {
  const getResponse = links ? { links } : {};
  global.chrome = {
    storage: {
      local: {
        get: jest.fn((keys, cb) => cb(getResponse)),
        set: jest.fn(),
      },
    },
  };
}

function setupClipboard() {
  Object.defineProperty(global, 'navigator', {
    value: {
      clipboard: {
        writeText: jest.fn(() => Promise.resolve()),
      },
    },
    writable: true,
    configurable: true,
  });
  document.execCommand = jest.fn();
}

function loadPopup(links) {
  jest.resetModules();
  setupDom();
  setupClipboard();
  setupChrome(links);
  require('../popup');
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('initial load', () => {
  it('should load without errors', () => {
    loadPopup();
    expect(true).toBe(true);
  });

  it('should render empty state when no links exist', () => {
    loadPopup();
    const emptyState = document.getElementById('empty-state');
    expect(emptyState.classList.contains('hidden')).toBe(false);
  });

  it('should hide empty state and show links when links exist', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);
    const emptyState = document.getElementById('empty-state');
    expect(emptyState.classList.contains('hidden')).toBe(true);
    const items = document.querySelectorAll('.link-item');
    expect(items).toHaveLength(1);
  });

  it('should render multiple links from storage', () => {
    loadPopup([
      { id: '1', title: 'Google', url: 'https://google.com' },
      { id: '2', title: 'GitHub', url: 'https://github.com' },
    ]);
    const items = document.querySelectorAll('.link-item');
    expect(items).toHaveLength(2);
  });

  it('should display link title and URL in rendered items', () => {
    loadPopup([{ id: '1', title: 'My Title', url: 'https://example.com' }]);
    expect(document.querySelector('.link-title').textContent).toBe('My Title');
    expect(document.querySelector('.link-url').textContent).toBe('https://example.com');
    expect(document.querySelector('.link-url').getAttribute('href')).toBe('https://example.com');
  });

  it('should escape HTML in link titles and URLs', () => {
    loadPopup([{ id: '1', title: '<b>XSS</b>', url: 'https://evil.com' }]);
    expect(document.querySelector('.link-title').innerHTML).toBe('&lt;b&gt;XSS&lt;/b&gt;');
  });

  it('should show reorder button when links exist', () => {
    loadPopup([{ id: '1', title: 'A', url: 'https://a.com' }]);
    const reorderBtn = document.getElementById('reorder-btn');
    expect(reorderBtn.classList.contains('hidden')).toBe(false);
  });

  it('should hide reorder button when no links exist', () => {
    loadPopup();
    const reorderBtn = document.getElementById('reorder-btn');
    expect(reorderBtn.classList.contains('hidden')).toBe(true);
  });

  it('should show copy-all button when links exist', () => {
    loadPopup([{ id: '1', title: 'A', url: 'https://a.com' }]);
    const copyAllBtn = document.getElementById('copy-all-btn');
    expect(copyAllBtn.classList.contains('hidden')).toBe(false);
  });

  it('should hide copy-all button when no links exist', () => {
    loadPopup();
    const copyAllBtn = document.getElementById('copy-all-btn');
    expect(copyAllBtn.classList.contains('hidden')).toBe(true);
  });

  it('should default to empty array when storage has no links key', () => {
    loadPopup(undefined);
    const items = document.querySelectorAll('.link-item');
    expect(items).toHaveLength(0);
  });
});

describe('add button', () => {
  beforeEach(() => loadPopup());

  it('should show form when Add is clicked', () => {
    const addBtn = document.getElementById('add-btn');
    const addForm = document.getElementById('add-form');
    addBtn.click();
    expect(addForm.classList.contains('hidden')).toBe(false);
  });

  it('should hide add button when form is shown', () => {
    const addBtn = document.getElementById('add-btn');
    addBtn.click();
    expect(addBtn.classList.contains('hidden')).toBe(true);
  });

  it('should show cancel button when form is shown', () => {
    const addBtn = document.getElementById('add-btn');
    const cancelBtn = document.getElementById('header-cancel-btn');
    addBtn.click();
    expect(cancelBtn.classList.contains('hidden')).toBe(false);
  });

  it('should reset form before showing', () => {
    const addBtn = document.getElementById('add-btn');
    const titleInput = document.getElementById('link-title');
    titleInput.value = 'leftover';
    addBtn.click();
    expect(titleInput.value).toBe('');
  });

  it('should focus title input when form is shown', () => {
    const addBtn = document.getElementById('add-btn');
    addBtn.click();
    expect(document.activeElement).toBe(document.getElementById('link-title'));
  });
});

describe('cancel button', () => {
  beforeEach(() => loadPopup());

  it('should hide form when Cancel is clicked', () => {
    document.getElementById('add-btn').click();
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('add-form').classList.contains('hidden')).toBe(true);
  });

  it('should clear form fields when Cancel is clicked', () => {
    document.getElementById('add-btn').click();
    document.getElementById('link-title').value = 'Test';
    document.getElementById('link-url').value = 'https://test.com';
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('link-title').value).toBe('');
    expect(document.getElementById('link-url').value).toBe('');
  });

  it('should reset edit-id when Cancel is clicked', () => {
    document.getElementById('add-btn').click();
    document.getElementById('edit-id').value = 'some-id';
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('edit-id').value).toBe('');
  });

  it('should restore save button text to Save', () => {
    document.getElementById('add-btn').click();
    document.getElementById('save-btn').textContent = 'Update';
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('save-btn').textContent).toBe('Save');
  });

  it('should show add button again after Cancel', () => {
    document.getElementById('add-btn').click();
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('add-btn').classList.contains('hidden')).toBe(false);
  });

  it('should hide cancel button after Cancel', () => {
    document.getElementById('add-btn').click();
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('header-cancel-btn').classList.contains('hidden')).toBe(true);
  });
});

describe('save button - new link', () => {
  beforeEach(() => loadPopup());

  it('should save a new link with valid inputs', () => {
    document.getElementById('link-title').value = 'Google Careers';
    document.getElementById('link-url').value = 'https://careers.google.com';
    document.getElementById('save-btn').click();

    expect(chrome.storage.local.set).toHaveBeenCalled();
    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links).toHaveLength(1);
    expect(saved.links[0].title).toBe('Google Careers');
    expect(saved.links[0].url).toBe('https://careers.google.com');
  });

  it('should generate a unique id for new links', () => {
    document.getElementById('link-title').value = 'Test';
    document.getElementById('link-url').value = 'https://test.com';
    document.getElementById('save-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links[0].id).toBeDefined();
    expect(typeof saved.links[0].id).toBe('string');
    expect(saved.links[0].id.length).toBeGreaterThan(0);
  });

  it('should show toast "Link saved" after saving', () => {
    document.getElementById('link-title').value = 'Test';
    document.getElementById('link-url').value = 'https://test.com';
    document.getElementById('save-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Link saved');
  });

  it('should render the new link in the list', () => {
    document.getElementById('link-title').value = 'Test';
    document.getElementById('link-url').value = 'https://test.com';
    document.getElementById('save-btn').click();

    const items = document.querySelectorAll('.link-item');
    expect(items).toHaveLength(1);
    expect(document.querySelector('.link-title').textContent).toBe('Test');
  });

  it('should hide empty state after saving first link', () => {
    document.getElementById('link-title').value = 'Test';
    document.getElementById('link-url').value = 'https://test.com';
    document.getElementById('save-btn').click();

    expect(document.getElementById('empty-state').classList.contains('hidden')).toBe(true);
  });

  it('should reset form after saving', () => {
    document.getElementById('link-title').value = 'Test';
    document.getElementById('link-url').value = 'https://test.com';
    document.getElementById('save-btn').click();

    expect(document.getElementById('link-title').value).toBe('');
    expect(document.getElementById('link-url').value).toBe('');
    expect(document.getElementById('edit-id').value).toBe('');
    expect(document.getElementById('save-btn').textContent).toBe('Save');
    expect(document.getElementById('add-form').classList.contains('hidden')).toBe(true);
  });

  it('should trim whitespace from title and url', () => {
    document.getElementById('link-title').value = '  Google  ';
    document.getElementById('link-url').value = '  https://google.com  ';
    document.getElementById('save-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links[0].title).toBe('Google');
    expect(saved.links[0].url).toBe('https://google.com');
  });

  it('should show toast when title is missing', () => {
    document.getElementById('link-title').value = '';
    document.getElementById('link-url').value = 'https://google.com';
    document.getElementById('save-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Title and URL are required');
  });

  it('should show toast when url is missing', () => {
    document.getElementById('link-title').value = 'Google';
    document.getElementById('link-url').value = '';
    document.getElementById('save-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Title and URL are required');
  });

  it('should show toast when both fields are empty', () => {
    document.getElementById('link-title').value = '';
    document.getElementById('link-url').value = '';
    document.getElementById('save-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Title and URL are required');
  });

  it('should not save when title is only whitespace', () => {
    document.getElementById('link-title').value = '   ';
    document.getElementById('link-url').value = 'https://google.com';
    document.getElementById('save-btn').click();

    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should not save when url is only whitespace', () => {
    document.getElementById('link-title').value = 'Google';
    document.getElementById('link-url').value = '   ';
    document.getElementById('save-btn').click();

    expect(chrome.storage.local.set).not.toHaveBeenCalled();
  });

  it('should save multiple links sequentially', () => {
    document.getElementById('link-title').value = 'First';
    document.getElementById('link-url').value = 'https://first.com';
    document.getElementById('save-btn').click();

    document.getElementById('link-title').value = 'Second';
    document.getElementById('link-url').value = 'https://second.com';
    document.getElementById('save-btn').click();

    expect(chrome.storage.local.set).toHaveBeenCalledTimes(2);
    const secondSave = chrome.storage.local.set.mock.calls[1][0];
    expect(secondSave.links).toHaveLength(2);
  });
});

describe('save button - edit existing link', () => {
  it('should populate form when edit button is clicked', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    const editBtn = document.querySelector('.edit-btn');
    editBtn.click();

    expect(document.getElementById('link-title').value).toBe('Google');
    expect(document.getElementById('link-url').value).toBe('https://google.com');
    expect(document.getElementById('edit-id').value).toBe('link1');
  });

  it('should change save button text to Update when editing', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    expect(document.getElementById('save-btn').textContent).toBe('Update');
  });

  it('should show form when edit button is clicked', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    expect(document.getElementById('add-form').classList.contains('hidden')).toBe(false);
  });

  it('should update existing link when save is clicked after edit', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    document.getElementById('link-title').value = 'Google Updated';
    document.getElementById('link-url').value = 'https://updated.com';
    document.getElementById('save-btn').click();

    expect(chrome.storage.local.set).toHaveBeenCalled();
    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links).toHaveLength(1);
    expect(saved.links[0].title).toBe('Google Updated');
    expect(saved.links[0].url).toBe('https://updated.com');
    expect(saved.links[0].id).toBe('link1');
  });

  it('should show toast "Link updated" after updating', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    document.getElementById('link-title').value = 'Updated';
    document.getElementById('link-url').value = 'https://updated.com';
    document.getElementById('save-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Link updated');
  });

  it('should reset form after updating', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    document.getElementById('link-title').value = 'Updated';
    document.getElementById('link-url').value = 'https://updated.com';
    document.getElementById('save-btn').click();

    expect(document.getElementById('edit-id').value).toBe('');
    expect(document.getElementById('save-btn').textContent).toBe('Save');
  });

  it('should preserve link id when updating', () => {
    loadPopup([
      { id: 'link1', title: 'First', url: 'https://first.com' },
      { id: 'link2', title: 'Second', url: 'https://second.com' },
    ]);

    document.querySelector('.edit-btn').click();
    document.getElementById('link-title').value = 'First Updated';
    document.getElementById('link-url').value = 'https://first-updated.com';
    document.getElementById('save-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links[0].id).toBe('link1');
    expect(saved.links[1].id).toBe('link2');
  });

  it('should not create a new link when editing', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    document.getElementById('link-title').value = 'Updated';
    document.getElementById('link-url').value = 'https://updated.com';
    document.getElementById('save-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links).toHaveLength(1);
  });
});

describe('copy button', () => {
  it('should copy link URL to clipboard', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.copy-btn').click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://google.com');
  });

  it('should show toast after copying', async () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.copy-btn').click();
    await Promise.resolve();

    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Copied!');
  });

  it('should use fallback copy when clipboard API fails', async () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('not supported'));

    document.querySelector('.copy-btn').click();
    await new Promise((r) => setTimeout(r, 10));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('should remove textarea after fallback copy', async () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('not supported'));

    document.querySelector('.copy-btn').click();
    await new Promise((r) => setTimeout(r, 10));

    const textareas = document.querySelectorAll('textarea');
    expect(textareas).toHaveLength(0);
  });

  it('should add "copied" class to button temporarily', () => {
    jest.useFakeTimers();
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    const copyBtn = document.querySelector('.copy-btn');
    copyBtn.click();
    expect(copyBtn.classList.contains('copied')).toBe(true);

    jest.advanceTimersByTime(1200);
    expect(copyBtn.classList.contains('copied')).toBe(false);

    jest.useRealTimers();
  });
});

describe('delete button', () => {
  it('should remove the link from storage', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.delete-btn').click();

    expect(chrome.storage.local.set).toHaveBeenCalled();
    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links).toHaveLength(0);
  });

  it('should remove the link element from the DOM', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.delete-btn').click();

    const items = document.querySelectorAll('.link-item');
    expect(items).toHaveLength(0);
  });

  it('should show toast "Link deleted"', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.delete-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Link deleted');
  });

  it('should show empty state after deleting last link', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.delete-btn').click();

    expect(document.getElementById('empty-state').classList.contains('hidden')).toBe(false);
  });

  it('should only delete the correct link when multiple exist', () => {
    loadPopup([
      { id: 'link1', title: 'Google', url: 'https://google.com' },
      { id: 'link2', title: 'GitHub', url: 'https://github.com' },
    ]);

    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns[0].click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links).toHaveLength(1);
    expect(saved.links[0].id).toBe('link2');
  });

  it('should reset form if editing the deleted link', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.querySelector('.edit-btn').click();
    expect(document.getElementById('edit-id').value).toBe('link1');

    document.querySelector('.delete-btn').click();
    expect(document.getElementById('edit-id').value).toBe('');
    expect(document.getElementById('add-form').classList.contains('hidden')).toBe(true);
  });
});

describe('copy all button', () => {
  it('should copy all links in "Title: URL" format', () => {
    loadPopup([
      { id: '1', title: 'Google', url: 'https://google.com' },
      { id: '2', title: 'GitHub', url: 'https://github.com' },
    ]);

    document.getElementById('copy-all-btn').click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'Google: https://google.com\nGitHub: https://github.com'
    );
  });

  it('should copy single link correctly', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('copy-all-btn').click();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Google: https://google.com');
  });
});

describe('reorder mode', () => {
  it('should enter reorder mode when Reorder button is clicked', () => {
    loadPopup([
      { id: '1', title: 'Google', url: 'https://google.com' },
      { id: '2', title: 'GitHub', url: 'https://github.com' },
    ]);

    document.getElementById('reorder-btn').click();

    expect(document.getElementById('reorder-btn').textContent).toBe('Save');
    expect(document.getElementById('reorder-btn').classList.contains('btn-active')).toBe(true);
  });

  it('should render drag handles in reorder mode', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();

    const handles = document.querySelectorAll('.drag-handle');
    expect(handles).toHaveLength(1);
  });

  it('should make items draggable in reorder mode', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();

    const item = document.querySelector('.link-item');
    expect(item.draggable).toBe(true);
  });

  it('should hide action buttons in reorder mode', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();

    expect(document.querySelector('.copy-btn')).toBeNull();
    expect(document.querySelector('.edit-btn')).toBeNull();
    expect(document.querySelector('.delete-btn')).toBeNull();
  });

  it('should hide copy-all button in reorder mode', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();

    expect(document.getElementById('copy-all-btn').classList.contains('hidden')).toBe(true);
  });

  it('should exit reorder mode and save when Save is clicked', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();
    document.getElementById('reorder-btn').click();

    expect(document.getElementById('reorder-btn').textContent).toBe('Reorder');
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('should show toast "Links saved" when exiting reorder mode', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();
    document.getElementById('reorder-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Links saved');
  });

  it('should restore link order after exiting reorder mode without changes', () => {
    loadPopup([
      { id: '1', title: 'First', url: 'https://first.com' },
      { id: '2', title: 'Second', url: 'https://second.com' },
    ]);

    document.getElementById('reorder-btn').click();
    document.getElementById('reorder-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links[0].title).toBe('First');
    expect(saved.links[1].title).toBe('Second');
  });

  it('should add reorder-mode class to items', () => {
    loadPopup([{ id: '1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();

    const item = document.querySelector('.link-item');
    expect(item.classList.contains('reorder-mode')).toBe(true);
  });
});

describe('drag and drop', () => {
  let items;

  function setupWithLinks() {
    loadPopup([
      { id: '1', title: 'First', url: 'https://first.com' },
      { id: '2', title: 'Second', url: 'https://second.com' },
      { id: '3', title: 'Third', url: 'https://third.com' },
    ]);
    document.getElementById('reorder-btn').click();
    items = Array.from(document.querySelectorAll('.link-item'));
  }

  function dispatchOn(element, eventType, extra) {
    const event = new Event(eventType, { bubbles: true });
    if (extra) Object.assign(event, extra);
    element.dispatchEvent(event);
    return event;
  }

  function createDropEvent(data) {
    const event = new Event('drop', { bubbles: true });
    event.preventDefault = jest.fn();
    event.dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: jest.fn(),
      getData: jest.fn().mockReturnValue(String(data)),
    };
    return event;
  }

  function createDragEvent(eventType) {
    const event = new Event(eventType, { bubbles: true });
    event.preventDefault = jest.fn();
    event.dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: jest.fn(),
      getData: jest.fn(),
    };
    return event;
  }

  it('should reorder links via drag and drop', () => {
    setupWithLinks();

    const dragStart = createDragEvent('dragstart');
    items[0].dispatchEvent(dragStart);

    const drop = createDropEvent(0);
    items[2].dispatchEvent(drop);

    document.getElementById('reorder-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links[0].title).toBe('Second');
    expect(saved.links[1].title).toBe('Third');
    expect(saved.links[2].title).toBe('First');
  });

  it('should not reorder when dropped on same position', () => {
    setupWithLinks();

    const dragStart = createDragEvent('dragstart');
    items[0].dispatchEvent(dragStart);

    const drop = createDropEvent(0);
    items[0].dispatchEvent(drop);

    document.getElementById('reorder-btn').click();

    const saved = chrome.storage.local.set.mock.calls[0][0];
    expect(saved.links[0].title).toBe('First');
    expect(saved.links[1].title).toBe('Second');
    expect(saved.links[2].title).toBe('Third');
  });

  it('should handle dragend and clean up classes', () => {
    setupWithLinks();

    const dragStart = createDragEvent('dragstart');
    items[0].dispatchEvent(dragStart);
    expect(items[0].classList.contains('dragging')).toBe(true);

    const dragEnd = createDragEvent('dragend');
    Object.defineProperty(dragEnd, 'target', { value: items[0] });
    items[0].dispatchEvent(dragEnd);
    expect(items[0].classList.contains('dragging')).toBe(false);
  });

  it('should handle dragover with preventDefault', () => {
    setupWithLinks();

    const dragOver = createDragEvent('dragover');
    items[1].dispatchEvent(dragOver);

    expect(dragOver.preventDefault).toHaveBeenCalled();
    expect(dragOver.dataTransfer.dropEffect).toBe('move');
  });

  it('should add drag-over class on dragenter', () => {
    setupWithLinks();

    const dragStart = createDragEvent('dragstart');
    items[0].dispatchEvent(dragStart);

    const dragEnter = createDragEvent('dragenter');
    items[1].dispatchEvent(dragEnter);

    expect(items[1].classList.contains('drag-over')).toBe(true);
  });

  it('should not add drag-over class on dragenter for same item', () => {
    setupWithLinks();

    const dragStart = createDragEvent('dragstart');
    items[0].dispatchEvent(dragStart);

    const dragEnter = createDragEvent('dragenter');
    items[0].dispatchEvent(dragEnter);

    expect(items[0].classList.contains('drag-over')).toBe(false);
  });

  it('should remove drag-over class on dragleave', () => {
    setupWithLinks();

    items[1].classList.add('drag-over');
    const dragLeave = createDragEvent('dragleave');
    items[1].dispatchEvent(dragLeave);

    expect(items[1].classList.contains('drag-over')).toBe(false);
  });
});

describe('URL link click', () => {
  it('should not propagate click when URL is clicked', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    const urlLink = document.querySelector('.link-url');
    const clickEvent = new Event('click', { bubbles: true });
    clickEvent.stopPropagation = jest.fn();
    urlLink.dispatchEvent(clickEvent);

    expect(clickEvent.stopPropagation).toHaveBeenCalled();
  });
});

describe('clicks ignored in reorder mode', () => {
  it('should not process link action clicks in reorder mode', () => {
    loadPopup([{ id: 'link1', title: 'Google', url: 'https://google.com' }]);

    document.getElementById('reorder-btn').click();

    const linksList = document.getElementById('links-list');
    const clickEvent = new Event('click', { bubbles: true });
    linksList.dispatchEvent(clickEvent);

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});

describe('toast', () => {
  it('should reuse existing toast element', () => {
    loadPopup();

    document.getElementById('link-title').value = '';
    document.getElementById('link-url').value = '';
    document.getElementById('save-btn').click();
    const firstToast = document.querySelector('.toast');

    document.getElementById('save-btn').click();
    const secondToast = document.querySelector('.toast');

    expect(firstToast).toBe(secondToast);
  });

  it('should remove "show" class after 1500ms', () => {
    jest.useFakeTimers();
    loadPopup();

    document.getElementById('link-title').value = '';
    document.getElementById('link-url').value = '';
    document.getElementById('save-btn').click();

    const toast = document.querySelector('.toast');
    expect(toast.classList.contains('show')).toBe(true);

    jest.advanceTimersByTime(1500);
    expect(toast.classList.contains('show')).toBe(false);

    jest.useRealTimers();
  });
});
