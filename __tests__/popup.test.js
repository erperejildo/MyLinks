let clipboardSpy;

beforeAll(() => {
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

  global.chrome = {
    storage: {
      local: {
        get: jest.fn((keys, cb) => cb({})),
        set: jest.fn(),
      },
    },
  };

  clipboardSpy = {
    writeText: jest.fn(() => Promise.resolve()),
  };
  global.navigator.clipboard = clipboardSpy;

  require('../popup');
});

function addLink(title, url) {
  document.getElementById('link-title').value = title;
  document.getElementById('link-url').value = url;
  document.getElementById('save-btn').click();
}

function getLinksFromStorage() {
  const calls = chrome.storage.local.set.mock.calls;
  return calls.length > 0 ? calls[calls.length - 1][0].links : [];
}

describe('popup.js', () => {
  beforeEach(() => {
    clipboardSpy.writeText.mockClear();
    document.execCommand = jest.fn();
    document.getElementById('link-title').value = '';
    document.getElementById('link-url').value = '';
    document.getElementById('edit-id').value = '';
  });

  it('should render empty state initially', () => {
    const emptyState = document.getElementById('empty-state');
    expect(emptyState.classList.contains('hidden')).toBe(false);
  });

  it('should show and hide form', () => {
    document.getElementById('add-btn').click();
    expect(document.getElementById('add-form').classList.contains('hidden')).toBe(false);
    document.getElementById('header-cancel-btn').click();
    expect(document.getElementById('add-form').classList.contains('hidden')).toBe(true);
  });

  it('should validate required fields', () => {
    document.getElementById('save-btn').click();
    const toast = document.querySelector('.toast');
    expect(toast.textContent).toBe('Title and URL are required');
  });

  it('should save a new link', () => {
    addLink('TestLink', 'https://test.com');
    const links = getLinksFromStorage();
    const saved = links.find((l) => l.title === 'TestLink');
    expect(saved).toBeDefined();
    expect(saved.url).toBe('https://test.com');
  });

  it('should edit an existing link', () => {
    addLink('EditTarget', 'https://edit.com');
    const links = getLinksFromStorage();
    const target = links.find((l) => l.title === 'EditTarget');

    document.getElementById('link-title').value = 'Edited';
    document.getElementById('link-url').value = 'https://edited.com';
    document.getElementById('edit-id').value = target.id;
    document.getElementById('save-btn').click();

    const updated = getLinksFromStorage().find((l) => l.id === target.id);
    expect(updated.title).toBe('Edited');
    expect(updated.url).toBe('https://edited.com');
  });

  it('should copy a link via copy button', () => {
    addLink('CopyTarget', 'https://copy.com');
    const links = getLinksFromStorage();
    const target = links.find((l) => l.title === 'CopyTarget');
    const copyBtn = document.querySelector(`button.copy-btn[data-id="${target.id}"]`);
    copyBtn.click();
    expect(clipboardSpy.writeText).toHaveBeenCalledWith('https://copy.com');
  });

  it('should delete a link via delete button', () => {
    addLink('DeleteTarget', 'https://delete.com');
    const linksBefore = getLinksFromStorage();
    const target = linksBefore.find((l) => l.title === 'DeleteTarget');
    const deleteBtn = document.querySelector(`button.delete-btn[data-id="${target.id}"]`);
    deleteBtn.click();
    const linksAfter = getLinksFromStorage();
    expect(linksAfter.find((l) => l.id === target.id)).toBeUndefined();
  });

  it('should populate form for editing', () => {
    addLink('PopTarget', 'https://pop.com');
    const links = getLinksFromStorage();
    const target = links.find((l) => l.title === 'PopTarget');
    const editBtn = document.querySelector(`button.edit-btn[data-id="${target.id}"]`);
    editBtn.click();

    expect(document.getElementById('link-title').value).toBe('PopTarget');
    expect(document.getElementById('link-url').value).toBe('https://pop.com');
    expect(document.getElementById('save-btn').textContent).toBe('Update');
  });

  it('should copy all links', () => {
    const currentLinks = getLinksFromStorage();
    const text = currentLinks.map((l) => `${l.title}: ${l.url}`).join('\n');
    document.getElementById('copy-all-btn').click();
    expect(clipboardSpy.writeText).toHaveBeenCalledWith(text);
  });

  it('should toggle reorder mode', () => {
    addLink('ReorderLink', 'https://reorder.com');
    const reorderBtn = document.getElementById('reorder-btn');
    reorderBtn.click();
    expect(reorderBtn.textContent).toBe('Save');
    reorderBtn.click();
    expect(reorderBtn.textContent).toBe('Reorder');
  });

  it('should handle drag and drop reorder', () => {
    addLink('DragA', 'https://a.com');
    addLink('DragB', 'https://b.com');

    const reorderBtn = document.getElementById('reorder-btn');
    reorderBtn.click();

    const items = document.querySelectorAll('.link-item');
    const firstItem = items[0];
    const secondItem = items[1];

    const dataStore = {};
    const mockDataTransfer = {
      setData: jest.fn((type, val) => { dataStore[type] = val; }),
      effectAllowed: '',
    };

    firstItem.dispatchEvent(Object.assign(new Event('dragstart', { bubbles: true }), { dataTransfer: mockDataTransfer }));

    const dragOverEvent = Object.assign(new Event('dragover', { bubbles: true }), {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer,
    });
    secondItem.dispatchEvent(dragOverEvent);

    const dragEnterEvent = Object.assign(new Event('dragenter', { bubbles: true }), {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer,
    });
    secondItem.dispatchEvent(dragEnterEvent);

    const dragLeaveEvent = new Event('dragleave', { bubbles: true });
    secondItem.dispatchEvent(dragLeaveEvent);

    const dropEvent = Object.assign(new Event('drop', { bubbles: true }), {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer,
    });
    secondItem.dispatchEvent(dropEvent);

    firstItem.dispatchEvent(new Event('dragend', { bubbles: true }));

    reorderBtn.click();
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('should handle clipboard fallback', () => {
    clipboardSpy.writeText.mockRejectedValueOnce(new Error('no clipboard'));

    addLink('FallbackLink', 'https://fallback.com');
    const links = getLinksFromStorage();
    const target = links.find((l) => l.title === 'FallbackLink');
    const copyBtn = document.querySelector(`button.copy-btn[data-id="${target.id}"]`);

    copyBtn.click();

    return new Promise((r) => setTimeout(r, 50)).then(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
  });

  it('should not trigger button action when clicking a link url', () => {
    addLink('UrlClick', 'https://urlclick.com');
    const urlLink = document.querySelector('.link-url');
    urlLink.click();
    expect(clipboardSpy.writeText).not.toHaveBeenCalled();
  });

  it('should do nothing when clicking empty area in links list', () => {
    addLink('EmptyArea', 'https://empty.com');
    const linksList = document.getElementById('links-list');
    linksList.click();
    expect(clipboardSpy.writeText).not.toHaveBeenCalled();
  });

  it('should reset form when deleting link currently being edited', () => {
    addLink('ResetEdit', 'https://reset.com');
    const links = getLinksFromStorage();
    const target = links.find((l) => l.title === 'ResetEdit');

    document.getElementById('link-title').value = 'Something';
    document.getElementById('link-url').value = 'https://something.com';
    document.getElementById('edit-id').value = target.id;

    const deleteBtn = document.querySelector(`button.delete-btn[data-id="${target.id}"]`);
    deleteBtn.click();

    expect(document.getElementById('edit-id').value).toBe('');
    expect(document.getElementById('save-btn').textContent).toBe('Save');
  });

  it('should ignore clicks in reorder mode', () => {
    addLink('ReorderIgnore', 'https://reorder.com');
    const reorderBtn = document.getElementById('reorder-btn');
    reorderBtn.click();

    const linksList = document.getElementById('links-list');
    const clickEvent = new Event('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: linksList });
    linksList.dispatchEvent(clickEvent);

    reorderBtn.click();
  });

  it('should handle drag enter on same item', () => {
    addLink('DragSame', 'https://same.com');
    const reorderBtn = document.getElementById('reorder-btn');
    reorderBtn.click();

    const items = document.querySelectorAll('.link-item');
    const firstItem = items[0];

    const dataStore = {};
    const mockDataTransfer = {
      setData: jest.fn((type, val) => { dataStore[type] = val; }),
      effectAllowed: '',
    };

    firstItem.dispatchEvent(Object.assign(new Event('dragstart', { bubbles: true }), { dataTransfer: mockDataTransfer }));

    const dragEnterEvent = Object.assign(new Event('dragenter', { bubbles: true }), {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer,
    });
    firstItem.dispatchEvent(dragEnterEvent);

    firstItem.dispatchEvent(new Event('dragend', { bubbles: true }));
    reorderBtn.click();
  });

  it('should drop on same position without reordering', () => {
    addLink('SamePos', 'https://samepos.com');
    const reorderBtn = document.getElementById('reorder-btn');
    reorderBtn.click();

    const items = document.querySelectorAll('.link-item');
    const firstItem = items[0];

    const dataStore = {};
    const mockDataTransfer = {
      setData: jest.fn((type, val) => { dataStore[type] = val; }),
      effectAllowed: '',
    };

    firstItem.dispatchEvent(Object.assign(new Event('dragstart', { bubbles: true }), { dataTransfer: mockDataTransfer }));

    const dropEvent = Object.assign(new Event('drop', { bubbles: true }), {
      preventDefault: jest.fn(),
      dataTransfer: mockDataTransfer,
    });
    firstItem.dispatchEvent(dropEvent);

    firstItem.dispatchEvent(new Event('dragend', { bubbles: true }));
    reorderBtn.click();
  });
});
