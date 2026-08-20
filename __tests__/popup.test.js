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
});

describe('popup.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load without errors', () => {
    require('../popup');
    expect(true).toBe(true);
  });

  it('should render empty state initially', () => {
    const emptyState = document.getElementById('empty-state');
    expect(emptyState.classList.contains('hidden')).toBe(false);
  });

  it('should show form when Add is clicked', () => {
    const addBtn = document.getElementById('add-btn');
    const addForm = document.getElementById('add-form');

    addBtn.click();

    expect(addForm.classList.contains('hidden')).toBe(false);
    expect(addBtn.classList.contains('hidden')).toBe(true);
  });

  it('should save a new link when form is submitted', () => {
    const titleInput = document.getElementById('link-title');
    const urlInput = document.getElementById('link-url');
    const saveBtn = document.getElementById('save-btn');

    titleInput.value = 'Google Careers';
    urlInput.value = 'https://careers.google.com';

    saveBtn.click();

    expect(chrome.storage.local.set).toHaveBeenCalled();
    const savedData = chrome.storage.local.set.mock.calls[0][0];
    expect(savedData.links).toHaveLength(1);
    expect(savedData.links[0].title).toBe('Google Careers');
    expect(savedData.links[0].url).toBe('https://careers.google.com');
  });

  it('should show toast for missing fields', () => {
    const saveBtn = document.getElementById('save-btn');
    const titleInput = document.getElementById('link-title');
    const urlInput = document.getElementById('link-url');

    titleInput.value = '';
    urlInput.value = '';

    saveBtn.click();

    const toast = document.querySelector('.toast');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Title and URL are required');
  });
});
