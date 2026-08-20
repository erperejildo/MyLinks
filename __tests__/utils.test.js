const { escapeHtml, generateId } = require('../src/utils');

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });

  it('should return plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });

  it('should escape ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should handle single quotes', () => {
    expect(escapeHtml("it's")).toBe("it's");
  });
});

describe('generateId', () => {
  it('should return a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('should return unique ids', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});
