(() => {
  'use strict';
  const config = window.SITE_CONFIG;
  document.querySelectorAll('[data-call], a[href^="tel:"]').forEach(a => { a.href = 'tel:' + config.phoneHref; });
  document.querySelectorAll('[data-text], a[href^="sms:"]').forEach(a => { a.href = 'sms:' + config.phoneHref; });
  document.querySelectorAll('[data-phone]').forEach(el => { el.textContent = config.phoneDisplay; });
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-menu');
  function closeMenu() {
    if (!menu) return;
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.querySelector('span').textContent = '+';
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menu.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.querySelector('span').textContent = open ? '−' : '+';
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu && !menu.hidden) { closeMenu(); menuButton.focus(); } });
  matchMedia('(min-width: 801px)').addEventListener('change', e => { if (e.matches) closeMenu(); });
  const dialog = document.getElementById('dispatchDialog');
  if (!dialog) return;
  const form = document.getElementById('dispatchForm');
  const submit = document.getElementById('submitBtn');
  const error = document.getElementById('formError');
  const confirmation = document.getElementById('formConfirmation');
  const smsConfirmation = document.getElementById('smsConfirmation');
  const hasEndpoint = !!config.formspreeEndpoint && !config.formspreeEndpoint.includes('YOUR_FORM_ID');
  let opener;
  if (!hasEndpoint) {
    submit.innerHTML = 'Continue to text message <span aria-hidden="true">↗</span>';
    document.getElementById('sendNote').textContent = 'Opens your messaging app with the details filled in. Review and send from there.';
  }
  document.querySelectorAll('[data-dispatch]').forEach(button => button.addEventListener('click', () => {
    opener = button;
    closeMenu();
    if (button.dataset.issue) form.elements.issue.value = button.dataset.issue;
    form.hidden = false;
    confirmation.hidden = true;
    smsConfirmation.hidden = true;
    error.hidden = true;
    dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.scrollTop = 0;
  }));
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); opener?.focus(); });
  const locationButton = document.querySelector('.locate-button');
  const locationStatus = document.getElementById('locationStatus');
  locationButton.addEventListener('click', () => {
    if (!navigator.geolocation) { locationStatus.textContent = 'Location is unavailable. Enter your address or a nearby landmark.'; return; }
    locationButton.disabled = true;
    locationStatus.textContent = 'Finding your location…';
    navigator.geolocation.getCurrentPosition(position => {
      form.elements.location.value = `https://www.google.com/maps?q=${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
      locationStatus.textContent = 'Location added. You can replace it with an address if you prefer.';
      locationButton.disabled = false;
    }, () => {
      locationStatus.textContent = 'Could not get your location. Enter your address or a nearby landmark instead.';
      locationButton.disabled = false;
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    error.hidden = true;
    const payload = Object.fromEntries(new FormData(form));
    if (!hasEndpoint) {
      const message = `Hi, I need help with: ${payload.issue}.\nName: ${payload.name}\nPhone: ${payload.phone}\nVehicle: ${payload.year} ${payload.makeModel}\nLocation: ${payload.location}${payload.notes ? '\nNotes: ' + payload.notes : ''}`;
      const url = 'sms:' + config.phoneHref + '?body=' + encodeURIComponent(message);
      document.getElementById('smsDraftLink').href = url;
      form.hidden = true;
      smsConfirmation.hidden = false;
      smsConfirmation.focus();
      window.location.href = url;
      return;
    }
    const original = submit.innerHTML;
    submit.disabled = true;
    submit.textContent = 'Sending…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(config.formspreeEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload), signal: controller.signal });
      if (!response.ok) throw new Error('Send failed');
      form.hidden = true;
      confirmation.hidden = false;
      confirmation.focus();
      form.reset();
      locationStatus.textContent = '';
    } catch { error.hidden = false; }
    finally { clearTimeout(timeout); submit.disabled = false; submit.innerHTML = original; }
  });
})();
