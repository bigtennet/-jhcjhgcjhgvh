/*
  Instant Invoice App - Vanilla JS
  Handles: items, totals, tax, discount, logo upload, localStorage, PDF export
*/

(function () {
  'use strict';

  /** DOM Helpers **/
  function byId(id) { return document.getElementById(id); }
  function create(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  /** State **/
  const STORAGE_KEY = 'invoice_app_v1';
  let state = {
    business: {
      name: '', email: '', phone: '', website: '', address: '', logoDataUrl: ''
    },
    client: { name: '', email: '', address: '' },
    meta: { number: '#0001', date: todayStr(), due: plusDaysStr(14) },
    currency: 'USD',
    items: [newItem()],
    discount: 0,
    taxRate: 0,
    notes: '',
    payment: { title: 'Pay via Link / Bank / UPI', value: '', showQr: false }
  };

  function newItem() { return { description: '', quantity: 1, price: 0 }; }
  function todayStr() { return new Date().toISOString().slice(0, 10); }
  function plusDaysStr(days) { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

  /** Currency **/
  function formatCurrency(value) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: state.currency }).format(value || 0);
    } catch (_) {
      return `$${(value || 0).toFixed(2)}`;
    }
  }

  /** Persistence **/
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      state = Object.assign({}, state, parsed);
      // ensure required fields
      if (!state.items || !Array.isArray(state.items) || state.items.length === 0) state.items = [newItem()];
    } catch (_) {}
  }

  /** Bind Inputs **/
  function bindInputs() {
    // Business
    attachInput('businessName', (v) => state.business.name = v, render);
    attachInput('businessEmail', (v) => state.business.email = v, render);
    attachInput('businessPhone', (v) => state.business.phone = v, render);
    attachInput('businessWebsite', (v) => state.business.website = v, render);
    attachInput('businessAddress', (v) => state.business.address = v, render);
    // Client
    attachInput('clientName', (v) => state.client.name = v, render);
    attachInput('clientEmail', (v) => state.client.email = v, render);
    attachInput('clientAddress', (v) => state.client.address = v, render);
    // Meta
    attachInput('invoiceNumber', (v) => state.meta.number = v, render, true);
    attachInput('invoiceDate', (v) => state.meta.date = v, render, true);
    attachInput('invoiceDue', (v) => state.meta.due = v, render, true);
    // Money
    attachNumber('discount', (n) => state.discount = n, renderTotals);
    attachNumber('taxRate', (n) => state.taxRate = n, renderTotals);
    // Currency
    const currency = byId('currency');
    currency.addEventListener('change', () => { state.currency = currency.value; saveState(); renderTotals(); });
    // Notes
    attachInput('notes', (v) => state.notes = v, renderNotes);
    // Payment
    attachInput('paymentTitle', (v) => state.payment.title = v, renderPayment);
    attachInput('paymentValue', (v) => state.payment.value = v, renderPayment);
    const showQr = byId('showQr');
    showQr.addEventListener('change', () => { state.payment.showQr = showQr.checked; saveState(); renderPayment(); });
    // Logo
    const logoInput = byId('logoInput');
    logoInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const dataUrl = await toDataUrl(file);
      state.business.logoDataUrl = dataUrl;
      saveState();
      renderBrand();
    });
  }

  function attachInput(id, onChange, afterChange, isPreviewInput) {
    const el = byId(id);
    el.addEventListener('input', () => {
      onChange(el.value);
      saveState();
      if (afterChange) afterChange();
    });
    if (isPreviewInput) el.addEventListener('change', () => { saveState(); if (afterChange) afterChange(); });
  }
  function attachNumber(id, onChange, afterChange) {
    const el = byId(id);
    el.addEventListener('input', () => {
      const n = parseFloat(el.value || '0') || 0;
      onChange(n);
      saveState();
      if (afterChange) afterChange();
    });
  }

  function toDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /** Items UI **/
  function renderItems() {
    const container = byId('items');
    container.innerHTML = '';

    state.items.forEach((item, index) => {
      const row = create('div', 'item-row');

      const desc = create('input');
      desc.placeholder = 'Description';
      desc.value = item.description;
      desc.addEventListener('input', () => { item.description = desc.value; saveState(); renderInvoiceTable(); });

      const qty = create('input');
      qty.type = 'number'; qty.min = '0'; qty.step = '1';
      qty.value = item.quantity;
      qty.addEventListener('input', () => { item.quantity = clampInt(qty.value); saveState(); renderRowTotal(row, item); renderTotals(); renderInvoiceTable(); });

      const price = create('input');
      price.type = 'number'; price.min = '0'; price.step = '0.01';
      price.value = item.price;
      price.addEventListener('input', () => { item.price = clampFloat(price.value); saveState(); renderRowTotal(row, item); renderTotals(); renderInvoiceTable(); });

      const total = create('div', 'total');
      total.textContent = formatCurrency(item.quantity * item.price);

      const actions = create('div', 'actions');
      const btnDel = create('button', 'btn danger small');
      btnDel.type = 'button';
      btnDel.textContent = '✕';
      btnDel.title = 'Remove item';
      btnDel.addEventListener('click', () => {
        state.items.splice(index, 1);
        if (state.items.length === 0) state.items.push(newItem());
        saveState();
        renderItems();
        renderTotals();
        renderInvoiceTable();
      });
      actions.appendChild(btnDel);

      row.appendChild(desc);
      row.appendChild(qty);
      row.appendChild(price);
      row.appendChild(total);
      row.appendChild(actions);

      container.appendChild(row);
    });
  }

  function renderRowTotal(row, item) {
    const totalDiv = row.querySelector('.total');
    if (totalDiv) totalDiv.textContent = formatCurrency(item.quantity * item.price);
  }

  function clampInt(value) { const n = parseInt(value || '0', 10); return isFinite(n) ? Math.max(0, n) : 0; }
  function clampFloat(value) { const n = parseFloat(value || '0'); return isFinite(n) ? Math.max(0, n) : 0; }

  /** Totals **/
  function calculateTotals() {
    const subtotal = state.items.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.price)), 0);
    const discount = Math.min(state.discount || 0, subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = (state.taxRate || 0) / 100 * taxable;
    const total = taxable + tax;
    return { subtotal, discount, tax, total };
  }

  function renderTotals() {
    const { subtotal, discount, tax, total } = calculateTotals();
    byId('subtotalDisplay').textContent = formatCurrency(subtotal);
    byId('discountDisplay').textContent = formatCurrency(discount);
    byId('taxDisplay').textContent = formatCurrency(tax);
    byId('totalDisplay').textContent = formatCurrency(total);

    byId('pSubtotal').textContent = formatCurrency(subtotal);
    byId('pDiscount').textContent = formatCurrency(discount);
    byId('pTax').textContent = formatCurrency(tax);
    byId('pTotal').textContent = formatCurrency(total);
  }

  /** Preview Bindings **/
  function renderBrand() {
    byId('businessNamePreview').textContent = state.business.name || 'Business Name';
    const contact = [state.business.email, state.business.phone, state.business.website]
      .filter(Boolean).join(' • ');
    byId('businessContactPreview').textContent = contact || 'email • phone • website';
    byId('businessAddressPreview').textContent = state.business.address || 'Address';
    const img = byId('logoPreview');
    if (state.business.logoDataUrl) { img.src = state.business.logoDataUrl; img.style.display = 'block'; }
    else { img.removeAttribute('src'); img.style.display = 'none'; }
  }

  function renderClient() {
    byId('clientNamePreview').textContent = state.client.name || 'Client Name';
    byId('clientEmailPreview').textContent = state.client.email || 'client@email.com';
    byId('clientAddressPreview').textContent = state.client.address || 'Client Address';
  }

  function renderInvoiceMeta() {
    byId('invoiceNumber').value = state.meta.number || '';
    byId('invoiceDate').value = state.meta.date || '';
    byId('invoiceDue').value = state.meta.due || '';
  }

  function renderEditorValues() {
    byId('businessName').value = state.business.name || '';
    byId('businessEmail').value = state.business.email || '';
    byId('businessPhone').value = state.business.phone || '';
    byId('businessWebsite').value = state.business.website || '';
    byId('businessAddress').value = state.business.address || '';

    byId('clientName').value = state.client.name || '';
    byId('clientEmail').value = state.client.email || '';
    byId('clientAddress').value = state.client.address || '';

    byId('currency').value = state.currency || 'USD';
    byId('discount').value = state.discount || 0;
    byId('taxRate').value = state.taxRate || 0;

    byId('notes').value = state.notes || '';

    byId('paymentTitle').value = state.payment.title || '';
    byId('paymentValue').value = state.payment.value || '';
    byId('showQr').checked = !!state.payment.showQr;
  }

  function renderNotes() { byId('notesPreview').textContent = state.notes || ''; }

  async function renderPayment() {
    byId('paymentTitlePreview').textContent = state.payment.title || '';
    const textPreview = byId('paymentTextPreview');
    textPreview.textContent = state.payment.value || '';
    const paymentBlock = document.getElementById('paymentBlock');
    const canvas = document.getElementById('qrCanvas');
    if (!paymentBlock || !canvas) return;

    if (state.payment.showQr && state.payment.value) {
      try {
        canvas.style.display = 'block';
        await QRCode.toCanvas(canvas, state.payment.value, { margin: 1, width: 148 });
      } catch (_) {
        canvas.style.display = 'none';
      }
    } else {
      canvas.style.display = 'none';
      const ctx = canvas.getContext('2d');
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  function renderInvoiceTable() {
    const tbody = byId('invoiceTableBody');
    tbody.innerHTML = '';
    state.items.forEach((it) => {
      const tr = document.createElement('tr');
      const tdDesc = document.createElement('td'); tdDesc.textContent = it.description || '';
      const tdQty = document.createElement('td'); tdQty.textContent = String(it.quantity || 0);
      const tdPrice = document.createElement('td'); tdPrice.textContent = formatCurrency(it.price || 0);
      const tdTotal = document.createElement('td'); tdTotal.textContent = formatCurrency((it.quantity || 0) * (it.price || 0));
      tr.appendChild(tdDesc); tr.appendChild(tdQty); tr.appendChild(tdPrice); tr.appendChild(tdTotal);
      tbody.appendChild(tr);
    });
  }

  /** Actions **/
  function bindActions() {
    byId('btn-add-item').addEventListener('click', () => {
      state.items.push(newItem());
      saveState();
      renderItems();
      renderTotals();
      renderInvoiceTable();
    });

    byId('btn-new').addEventListener('click', () => {
      if (!confirm('Start a new invoice? This will clear current data.')) return;
      state = {
        business: { name: '', email: '', phone: '', website: '', address: '', logoDataUrl: '' },
        client: { name: '', email: '', address: '' },
        meta: { number: '#0001', date: todayStr(), due: plusDaysStr(14) },
        currency: 'USD', items: [newItem()], discount: 0, taxRate: 0, notes: ''
      };
      saveState();
      hydrate();
    });

    byId('btn-save').addEventListener('click', () => {
      const name = prompt('Save as (name):', state.meta.number || 'invoice');
      if (!name) return;
      const key = STORAGE_KEY + ':' + name;
      try { localStorage.setItem(key, JSON.stringify(state)); alert('Saved as "' + name + '"'); } catch (_) { alert('Failed to save'); }
    });

    byId('btn-load').addEventListener('click', () => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_KEY + ':'));
      if (keys.length === 0) { alert('No saved invoices'); return; }
      const names = keys.map(k => k.split(':')[1]);
      const pick = prompt('Type a name to load:\n' + names.join('\n'));
      if (!pick) return;
      const key = STORAGE_KEY + ':' + pick;
      const raw = localStorage.getItem(key);
      if (!raw) { alert('Not found'); return; }
      try { state = JSON.parse(raw); saveState(); hydrate(); alert('Loaded "' + pick + '"'); } catch (_) { alert('Failed to load'); }
    });

    byId('btn-print').addEventListener('click', () => window.print());

    byId('btn-pdf').addEventListener('click', async () => { await downloadPdf(); });
  }

  async function downloadPdf() {
    const invoiceEl = byId('invoice');
    const opt = {
      margin:       [0.5, 0.5, 0.5, 0.5],
      filename:     (state.meta.number || 'invoice') + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    await html2pdf().set(opt).from(invoiceEl).save();
  }

  /** Hydrate and Render **/
  function hydrate() {
    renderEditorValues();
    renderItems();
    renderTotals();
    renderBrand();
    renderClient();
    renderInvoiceMeta();
    renderNotes();
    renderPayment();
    renderInvoiceTable();
  }

  function render() { renderBrand(); renderClient(); renderInvoiceMeta(); renderInvoiceTable(); renderTotals(); renderNotes(); renderPayment(); }

  /** Init **/
  function init() {
    loadState();
    bindInputs();
    bindActions();
    hydrate();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

