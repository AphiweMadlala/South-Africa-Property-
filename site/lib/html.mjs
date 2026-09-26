// Tiny HTML templating: `html` escapes interpolated values unless they are
// already-rendered markup (a SafeHTML instance or an array of them).

class SafeHTML {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export const raw = (value) => new SafeHTML(String(value ?? ''));

export function escape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(value) {
  if (value == null || value === false) return '';
  if (value instanceof SafeHTML) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escape(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new SafeHTML(out);
}

// Attribute helper: attrs({ href, hidden: true, 'aria-current': cond && 'page' })
export function attrs(map) {
  return raw(
    Object.entries(map)
      .filter(([, v]) => v !== false && v != null)
      .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escape(v)}"`))
      .join(''),
  );
}
