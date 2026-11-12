/*!
 * Synx visual editing: include this on your site so editors can click text and images in the CMS live
 * preview and edit them in the panel next to it. It does nothing outside the CMS preview frame, so it is
 * safe to leave in production.
 *
 *   <script src="https://YOUR-CMS/sdk/visual-editing.js"></script>
 *
 * Mark up your page:
 *   data-synx-edit="<target>.<field>"    text the editor can click to edit
 *   data-synx-image="<target>.<field>"   an image the editor can click to replace
 *   data-synx-key="<section _key>"       a whole section, so clicking it selects it
 * <target> is "page" for page fields, or the section's _key. Items of a list field: "<target>.items.2.title".
 *
 * Render the draft the CMS sends (window "message", source "synx-cms", kind "preview"), or listen for the
 * "synx:preview" event this script dispatches.
 */
(function () {
  if (window.parent === window) return; // not inside the CMS preview

  var editing = false;
  function post(msg) { msg.source = 'synx-site'; window.parent.postMessage(msg, '*'); }

  var css = document.createElement('style');
  css.textContent =
    '.synx-on [data-synx-edit],.synx-on [data-synx-image],.synx-on [data-synx-key]{cursor:pointer}' +
    '.synx-on [data-synx-edit]:hover,.synx-on [data-synx-image]:hover{outline:2px solid rgba(47,129,247,.55);outline-offset:3px}' +
    '.synx-on [data-synx-key]:hover{box-shadow:inset 0 0 0 1px rgba(47,129,247,.45)}' +
    '.synx-on .synx-selected{box-shadow:inset 0 0 0 3px #2f81f7}' +
    '.synx-on .synx-selected-field{outline:2px solid #2f81f7;outline-offset:3px}';
  document.head.appendChild(css);

  function highlight(key, path) {
    var secs = document.querySelectorAll('[data-synx-key]');
    for (var i = 0; i < secs.length; i++) secs[i].classList.toggle('synx-selected', !!key && secs[i].getAttribute('data-synx-key') === key);
    var fields = document.querySelectorAll('[data-synx-edit],[data-synx-image]');
    for (var j = 0; j < fields.length; j++) {
      var p = fields[j].getAttribute('data-synx-edit') || fields[j].getAttribute('data-synx-image');
      fields[j].classList.toggle('synx-selected-field', !!path && p === path);
    }
  }

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.source !== 'synx-cms' || m.kind !== 'preview') return;
    editing = !!m.editable;
    document.documentElement.classList.toggle('synx-on', editing);
    try { window.dispatchEvent(new CustomEvent('synx:preview', { detail: m })); } catch (err) { /* old browsers */ }
    if (typeof window.onSynxPreview === 'function') window.onSynxPreview(m);
    highlight(m.selectedKey, m.selectedPath);
  });

  // The page a link leads to, when it is another page of this same site (else null).
  function internalPath(a) {
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return null;
    try { var u = new URL(a.href, location.href); return u.origin === location.origin ? u.pathname : null; } catch (err) { return null; }
  }

  // Click-to-edit. In edit mode a click on text or an image you can edit selects it. A click on a link to another page of the
  // site opens that page (and tells the CMS, so its editor follows). Anything else in edit mode selects the section.
  document.addEventListener('click', function (e) {
    if (!e.target || !e.target.closest) return;
    var field = editing ? e.target.closest('[data-synx-edit],[data-synx-image]') : null;
    var path = field ? null : internalPath(e.target.closest('a[href]'));
    if (path !== null) { post({ kind: 'navigate', path: path }); return; }
    if (!editing) return;
    var sec = e.target.closest('[data-synx-key]');
    if (!field && !sec) return;
    e.preventDefault();
    e.stopPropagation();
    if (field) {
      var path = field.getAttribute('data-synx-edit') || field.getAttribute('data-synx-image');
      post({ kind: 'select', path: path, image: field.hasAttribute('data-synx-image') });
    } else {
      post({ kind: 'select', key: sec.getAttribute('data-synx-key') });
    }
  }, true);

  post({ kind: 'ready' });
})();
