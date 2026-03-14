// Admin content management: link index.html sections to admin panel
import ApiClient from './apiClient.js';

// XSS-dən qorunmaq üçün mətn sanitizasiyası
function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str == null ? '' : str);
  return d.innerHTML;
}

// Make sure we don't initialize twice
if (window.adminContentInitialized) {
  console.warn('admin-content.js already initialized');
} else {
  window.adminContentInitialized = true;
  
  // Initialize API client with proper base URL
  const api = new ApiClient(CONFIG.API_BASE_URL.replace(/\/api$/, '') + '/api');

  // ----- ICON PICKER -----
  const ICON_LIST = [
    { cls: 'fas fa-tag',          label: 'Endirim'   },
    { cls: 'fas fa-bolt',         label: 'Sürət'     },
    { cls: 'fas fa-gift',         label: 'Hədiyyə'   },
    { cls: 'fas fa-star',         label: 'Ulduz'     },
    { cls: 'fas fa-fire',         label: 'İsti'      },
    { cls: 'fas fa-percent',      label: 'Faiz'      },
    { cls: 'fas fa-wifi',         label: 'WiFi'      },
    { cls: 'fas fa-phone',        label: 'Telefon'   },
    { cls: 'fas fa-home',         label: 'Ev'        },
    { cls: 'fas fa-users',        label: 'Ailə'      },
    { cls: 'fas fa-crown',        label: 'Premium'   },
    { cls: 'fas fa-rocket',       label: 'Sürətli'   },
    { cls: 'fas fa-clock',        label: 'Vaxt'      },
    { cls: 'fas fa-medal',        label: 'Medal'     },
    { cls: 'fas fa-globe',        label: 'İnternet'  },
    { cls: 'fas fa-tv',           label: 'TV'        },
    { cls: 'fas fa-mobile-alt',   label: 'Mobil'     },
    { cls: 'fas fa-shield-alt',   label: 'Güvənli'   },
    { cls: 'fas fa-infinity',     label: 'Limitsiz'  },
    { cls: 'fas fa-chart-line',   label: 'Artım'     },
    { cls: 'fas fa-thumbs-up',    label: 'Bəyən'     },
    { cls: 'fas fa-handshake',    label: 'Müqavilə'  },
    { cls: 'fas fa-check-circle', label: 'Yoxlama'   },
    { cls: 'fas fa-dollar-sign',  label: 'Qiymət'    },
  ];

  if (!window._iconPickerDocListener) {
    window._iconPickerDocListener = true;
    document.addEventListener('click', () => {
      document.querySelectorAll('.icon-picker-popup').forEach(p => { p.style.display = 'none'; });
    });
  }

  // Validate icon class against ICON_LIST whitelist to prevent stored XSS
  function sanitizeIconClass(cls) {
    const allowed = ICON_LIST.map(i => i.cls);
    return allowed.includes(cls) ? cls : '';
  }

  function createIconPicker(inputCls, currentValue) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;';

    const hidden = document.createElement('input');
    hidden.type  = 'hidden';
    hidden.className = inputCls;
    hidden.value = sanitizeIconClass(currentValue || '');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.cssText = 'display:flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;width:100%;font-size:12px;overflow:hidden;white-space:nowrap;';

    function refreshBtn() {
      const v = hidden.value;
      if (v) {
        const name = v.replace(/fa[srb] fa-/,'');
        btn.innerHTML = `<i class="${escHtml(v)}" style="font-size:15px;color:#1a237e;width:18px;text-align:center;flex-shrink:0;"></i><span style="flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;">${escHtml(name)}</span><span style="color:#aaa;font-size:10px;flex-shrink:0;">▾ dəyiş</span>`;
      } else {
        btn.innerHTML = `<span style="color:#aaa;flex:1;">İkon seç...</span><span style="color:#aaa;font-size:10px;">▾</span>`;
      }
    }
    refreshBtn();

    const popup = document.createElement('div');
    popup.className = 'icon-picker-popup';
    popup.style.cssText = 'display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:99999;background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.14);padding:10px;width:300px;max-height:260px;overflow-y:auto;';

    const search = document.createElement('input');
    search.type = 'text';
    search.placeholder = 'Axtar... (wifi, hədiyyə, sürət)';
    search.style.cssText = 'width:100%;padding:5px 8px;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;margin-bottom:8px;box-sizing:border-box;';
    popup.appendChild(search);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,1fr);gap:5px;';

    function drawIcons(q) {
      grid.innerHTML = '';
      const list = q ? ICON_LIST.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.cls.includes(q.toLowerCase())) : ICON_LIST;
      if (!list.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;font-size:12px;color:#999;text-align:center;padding:8px;">Tapılmadı</p>';
        return;
      }
      list.forEach(icon => {
        const cell = document.createElement('button');
        cell.type  = 'button';
        cell.title = icon.label;
        const sel  = hidden.value === icon.cls;
        cell.style.cssText = `display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 4px;border:1.5px solid ${sel?'#1a237e':'#e5e7eb'};border-radius:7px;background:${sel?'#eef0fb':'#fafafa'};cursor:pointer;transition:border-color .15s;`;
        cell.innerHTML = `<i class="${icon.cls}" style="font-size:17px;color:#1a237e;"></i><span style="font-size:9px;color:#555;text-align:center;line-height:1.2;">${icon.label}</span>`;
        cell.addEventListener('click', e => {
          e.stopPropagation();
          hidden.value = icon.cls;
          refreshBtn();
          popup.style.display = 'none';
        });
        grid.appendChild(cell);
      });
    }
    drawIcons('');
    popup.appendChild(grid);
    search.addEventListener('input', () => drawIcons(search.value.trim()));

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const wasOpen = popup.style.display !== 'none';
      document.querySelectorAll('.icon-picker-popup').forEach(p => { p.style.display = 'none'; });
      if (!wasOpen) {
        popup.style.display = 'block';
        search.value = '';
        drawIcons('');
        setTimeout(() => search.focus(), 50);
      }
    });

    wrapper.appendChild(hidden);
    wrapper.appendChild(btn);
    wrapper.appendChild(popup);
    return wrapper;
  }

  // Auth is handled via httpOnly cookie (credentials: 'include' set globally in admin.js)

  // ----- TARIFFS -----
  function renderFeatureItem(listEl, text) {
    const row = document.createElement('div');
    row.className = 'feature-item';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control feature-text';
    input.placeholder = 'Xüsusiyyət';
    input.value = text || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary remove-feature';
    btn.textContent = 'Sil';
    btn.addEventListener('click', () => row.remove());
    row.appendChild(input);
    row.appendChild(btn);
    listEl.appendChild(row);
  }

  function renderPlan(container, plan) {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML = `
      <div class="plan-header">
        <h4>Plan</h4>
        <button type="button" class="remove-plan">Sil</button>
      </div>
      <div class="plan-row">
        <div><label>Ad</label><input type="text" class="form-control plan-name"></div>
        <div><label>Qiymət (₼)</label><input type="text" class="form-control plan-price"></div>
      </div>
      <div class="plan-row">
        <div><label>Sürət</label><input type="text" class="form-control plan-speed"></div>
        <div><label>İkon</label><div class="icon-picker-slot"></div></div>
      </div>
      <div class="plan-row single">
        <label style="display:flex; align-items:center; gap:6px;">
          <input type="checkbox" class="plan-popular"> Populyar
        </label>
      </div>
      <div class="features-list"></div>
      <button type="button" class="add-feature">Xüsusiyyət əlavə et</button>
    `;
    card.querySelector('.plan-name').value = plan.name || '';
    card.querySelector('.plan-price').value = plan.price || '';
    card.querySelector('.plan-speed').value = plan.speed || '';
    card.querySelector('.plan-popular').checked = !!plan.popular;
    card.querySelector('.icon-picker-slot').appendChild(createIconPicker('plan-icon', plan.icon || ''));
    card.querySelector('.remove-plan').addEventListener('click', () => card.remove());
    const listEl = card.querySelector('.features-list');
    const feats = Array.isArray(plan.features) ? plan.features : [];
    feats.forEach(f => renderFeatureItem(listEl, f));
    card.querySelector('.add-feature').addEventListener('click', () => renderFeatureItem(listEl, ''));
    container.appendChild(card);
  }

  // Public helper: create a new tariff plan card in the UI
  function createNewTariff(plan = { name: '', price: '', speed: '', icon: '', popular: false, features: [] }) {
    const cont = document.getElementById('plans-container');
    if (!cont) { console.warn('plans-container not found'); return; }
    renderPlan(cont, plan);
    // Scroll into view for convenience
    try { cont.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(_) {}
  }

  // Public helper with simple signature
  function createNewTariffWithDefaults(name, price, speed, features = [], popular = false, icon = '') {
    createNewTariff({ name: name||'', price: price||'', speed: speed||'', features: Array.isArray(features)?features:[], popular: !!popular, icon: icon||'' });
  }

  async function loadTariffsForm() {
    try {
      const data = await api.get('/content/tariffs');
      const titleEl = document.getElementById('tariffs-title');
      const subEl = document.getElementById('tariffs-subtitle');
      if (titleEl) titleEl.value = data.title || 'Tariflər';
      if (subEl) subEl.value = data.subtitle || 'Sizə uyğun tarifdən seçin';
      const cont = document.getElementById('plans-container');
      if (cont) {
        cont.innerHTML = '';
        const plans = Array.isArray(data.plans) ? data.plans : [];
        if (plans.length > 0) {
          plans.forEach(p => renderPlan(cont, p));
        } else {
          // Auto-seed defaults if no plans exist
          seedTariffsUI();
        }
      }
    } catch (e) { console.error('Tariffs load failed', e); }
  }

  function bindTariffsForm() {
    const addBtn = document.getElementById('add-plan');
    const cont = document.getElementById('plans-container');
    if (addBtn && cont) addBtn.addEventListener('click', () => createNewTariff({ name:'', price:'', speed:'', features:[] }));

    // Bind reset to defaults
    const resetBtn = document.getElementById('reset-tariffs');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      seedTariffsUI();
    });

    const form = document.getElementById('tariffs-form');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const plans = Array.from(document.querySelectorAll('#plans-container .plan-card')).map(card => {
          const features = Array.from(card.querySelectorAll('.features-list .feature-text')).map(i => i.value).filter(Boolean);
          return {
            name: card.querySelector('.plan-name')?.value || '',
            price: card.querySelector('.plan-price')?.value || '',
            speed: card.querySelector('.plan-speed')?.value || '',
            icon: card.querySelector('.plan-icon')?.value || '',
            popular: !!card.querySelector('.plan-popular')?.checked,
            features
          };
        });
        const payload = {
          title: document.getElementById('tariffs-title')?.value || 'Tariflər',
          subtitle: document.getElementById('tariffs-subtitle')?.value || 'Sizə uyğun tarifdən seçin',
          plans
        };
        await api.post('/content/tariffs', payload);
        alert('Tariflər yadda saxlandı');
      } catch (e2) { console.error(e2); alert('Xəta: ' + (e2.message||'')); }
    });
  }

  // Defaults matching index.html fallback
  function getDefaultTariffPlans() {
    return [
      {
        name: 'Başlanğıc',
        price: '29',
        speed: '50 Mbps',
        icon: 'fas fa-rocket',
        popular: false,
        features: [
          '50 Mbps internet sürəti',
          'Limitsiz trafik',
          'Pulsuz Wi-Fi router',
          '24/7 texniki dəstək',
          'Pulsuz quraşdırma'
        ]
      },
      {
        name: 'Standart',
        price: '49',
        speed: '100 Mbps',
        icon: 'fas fa-star',
        popular: true,
        features: [
          '100 Mbps internet sürəti',
          'Limitsiz trafik',
          'Pulsuz Wi-Fi router',
          '50+ IPTV kanalı',
          '24/7 texniki dəstək',
          'Pulsuz quraşdırma'
        ]
      },
      {
        name: 'Premium',
        price: '79',
        speed: '500 Mbps',
        icon: 'fas fa-crown',
        popular: false,
        features: [
          '500 Mbps internet sürəti',
          'Limitsiz trafik',
          'Premium Wi-Fi router',
          '200+ IPTV kanalı',
          'VoIP telefon xidməti',
          '24/7 VIP dəstək',
          'Pulsuz quraşdırma'
        ]
      }
    ];
  }

  function renderHeroButtonRow(container, text) {
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.gap = '6px';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'form-control hero-button-text';
    input.placeholder = 'Düymə mətni';
    input.value = text || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary remove';
    btn.title = 'Sil';
    btn.style.padding = '4px 10px';
    btn.textContent = 'Sil';
    btn.addEventListener('click', () => row.remove());
    row.appendChild(input);
    row.appendChild(btn);
    container.appendChild(row);
  }

  function seedTariffsUI() {
    const cont = document.getElementById('plans-container');
    if (!cont) return;
    cont.innerHTML = '';
    const defaults = getDefaultTariffPlans();
    defaults.forEach(p => renderPlan(cont, p));
    // Also seed default headings if empty
    const titleEl = document.getElementById('tariffs-title');
    const subEl = document.getElementById('tariffs-subtitle');
    if (titleEl && !titleEl.value) titleEl.value = 'Tariflər';
    if (subEl && !subEl.value) subEl.value = 'Sizə uyğun tarifdən seçin';
  }

  // ----- HOMEPAGE -----
  // Removed Quill; use simple textarea `#hero-description` instead.

  async function loadHomepageForm() {
    try {
      const data = await api.get('/content/homepage');
      const hero = data.hero || {};
      const alert = data.alert || {};

      const titleEl = document.getElementById('hero-title');
      const subEl = document.getElementById('hero-subtitle');
      const urlEl = document.getElementById('hero-bg-url');
      const preview = document.getElementById('hero-bg-preview');
      const featuresList = document.getElementById('hero-features-list');

      if (titleEl) titleEl.value = hero.title || '';
      if (subEl) subEl.value = hero.subtitle || '';
      // Buttons list
      const btnsCont = document.getElementById('hero-buttons-container');
      if (btnsCont) {
        btnsCont.innerHTML = '';
        const buttons = Array.isArray(hero.buttons) ? hero.buttons : (hero.button_text ? [hero.button_text] : []);
        if (buttons.length) {
          buttons.forEach(text => renderHeroButtonRow(btnsCont, text));
        } else {
          renderHeroButtonRow(btnsCont, 'Tariflərə bax');
        }
      }

      const heroDescEl = document.getElementById('hero-description');
      if (heroDescEl) heroDescEl.value = (hero.description || '').replace(/<[^>]*>/g, '');

      const bg = hero.background_image || '';
      if (urlEl) urlEl.value = bg;
      if (preview) {
        preview.innerHTML = '';
        if (bg) {
          const img = document.createElement('img');
          img.src = bg;
          img.alt = 'bg';
          preview.appendChild(img);
        } else {
          preview.innerHTML = '<i class="fas fa-image"></i><p>Şəkil yüklənməyib</p>';
        }
      }

      // Hero features disabled
      if (featuresList) {
        featuresList.innerHTML = '';
      }

      // Alert section
      const alertText = document.getElementById('alert-text');
      const alertType = document.getElementById('alert-type');
      const prev = document.getElementById('alert-preview');
      const prevText = document.getElementById('alert-preview-text');
      if (alertText) alertText.value = alert.text || '';
      if (alertType) alertType.value = alert.type || '';
      updateAlertPreview();
    } catch (e) {
      console.error('Homepage load failed', e);
    }
  }

  function addHeroFeatureRow(icon, text) {
    const list = document.getElementById('hero-features-list');
    if (!list) return;
    const wrap = document.createElement('div');
    wrap.className = 'form-row';
    const iconInput = document.createElement('input');
    iconInput.type = 'text';
    iconInput.className = 'form-control';
    iconInput.placeholder = 'Icon class (məs. fas fa-bolt)';
    iconInput.value = icon || '';
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.className = 'form-control';
    textInput.placeholder = 'Mətn';
    textInput.value = text || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary remove';
    btn.title = 'Sil';
    btn.textContent = 'Sil';
    btn.addEventListener('click', () => wrap.remove());
    wrap.appendChild(iconInput);
    wrap.appendChild(textInput);
    wrap.appendChild(btn);
    list.appendChild(wrap);
  }

  function serializeHeroFeatures() { return []; }

  function updateAlertPreview() {
    const text = document.getElementById('alert-text')?.value || '';
    const type = document.getElementById('alert-type')?.value || '';
    const prev = document.getElementById('alert-preview');
    const prevText = document.getElementById('alert-preview-text');
    if (!prev || !prevText) return;
    if (!text || !type) { prev.style.display = 'none'; prev.className = 'alert-preview'; prevText.textContent=''; return; }
    prev.style.display = 'block';
    prev.className = 'alert-preview ' + type;
    prevText.textContent = text;
  }

  function bindHomepageForm() {
    const addBtn = document.getElementById('add-hero-feature');
    if (addBtn) addBtn.addEventListener('click', () => addHeroFeatureRow('', ''));

    // Add hero button rows
    const addHeroButton = document.getElementById('add-hero-button');
    const heroButtonsCont = document.getElementById('hero-buttons-container');
    if (addHeroButton && heroButtonsCont) {
      addHeroButton.addEventListener('click', () => renderHeroButtonRow(heroButtonsCont, ''));
    }

    const alertText = document.getElementById('alert-text');
    const alertType = document.getElementById('alert-type');
    if (alertText) alertText.addEventListener('input', updateAlertPreview);
    if (alertType) alertType.addEventListener('change', updateAlertPreview);

    const uploadBox = document.getElementById('hero-bg-upload');
    const fileInput = document.getElementById('hero-bg-input');
    const urlEl = document.getElementById('hero-bg-url');
    const preview = document.getElementById('hero-bg-preview');

    function setPreview(src) {
      if (!preview) return;
      preview.innerHTML = '';
      if (src) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'bg';
        preview.appendChild(img);
      } else {
        preview.innerHTML = '<i class="fas fa-image"></i><p>Şəkil yüklənməyib</p>';
      }
    }

    if (uploadBox && fileInput) {
      uploadBox.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          // upload to backend
          const form = new FormData();
          form.append('image', file);
          const res = await fetch(api.getBaseUrl() + (CONFIG.API?.ENDPOINTS?.UPLOAD?.IMAGE || '/upload/image'), { method: 'POST', body: form });
          const j = await res.json();
          if (res.ok && j.url) {
            if (urlEl) urlEl.value = j.url;
            setPreview(j.url);
          } else {
            console.error('Upload failed', j);
          }
        } catch (err) {
          console.error('Upload error', err);
        }
      });
    }

    const removeBtn = document.getElementById('remove-hero-bg');
    if (removeBtn) removeBtn.addEventListener('click', () => { if (urlEl) urlEl.value=''; setPreview(''); });

    const form = document.getElementById('homepage-form');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const title = document.getElementById('hero-title')?.value || '';
        const sub = document.getElementById('hero-subtitle')?.value || '';
        const buttons = Array.from(document.querySelectorAll('#hero-buttons-container .hero-button-text'))
          .map(i => (i.value || '').trim()).filter(Boolean);
        const desc = document.getElementById('hero-description')?.value || '';
        const bg = document.getElementById('hero-bg-url')?.value || '';
        const features = serializeHeroFeatures();
        const alertTextV = document.getElementById('alert-text')?.value || '';
        const alertTypeV = document.getElementById('alert-type')?.value || '';

        const payload = {
          hero: { title, subtitle: sub, description: desc, buttons, button_text: (buttons[0] || ''), background_image: bg, features },
          alert: { text: alertTextV, type: alertTypeV }
        };
        const res = await api.post('/content/homepage', payload);
        // small success feedback
        alert('Ana səhifə məlumatları yadda saxlandı');
      } catch (err) {
        console.error('Homepage save failed', err);
        alert('Xəta: ' + (err.message || 'yadda saxlanmadı'));
      }
    });
  }

  // ----- ABOUT -----

  async function loadAboutForm() {
    try {
      const data = await api.get('/content/about');
      console.log('[Admin] Loaded About data:', data);
      const aboutTitleEl = document.getElementById('about-title');
      const aboutContentEl = document.getElementById('about-content');
      const aboutMissionEl = document.getElementById('about-mission');
      const aboutVisionEl = document.getElementById('about-vision');
      const aboutValuesCont = document.getElementById('about-values-container');
      const aboutValuesText = document.getElementById('about-values-text');
      if (aboutTitleEl) aboutTitleEl.value = data.title || '';
      if (aboutContentEl) aboutContentEl.value = (data.content || '').replace(/<[^>]*>/g, '');
      if (aboutMissionEl) aboutMissionEl.value = data.mission || '';
      if (aboutVisionEl) aboutVisionEl.value = data.vision || '';
      if (aboutValuesText) aboutValuesText.value = data.values_text || '';
      if (aboutValuesCont) {
        aboutValuesCont.innerHTML = '';
        const values = Array.isArray(data.values) ? data.values : [];
        if (values.length) {
          values.forEach(v => renderAboutValueRow(aboutValuesCont, v.title || '', v.description || ''));
        } else {
          renderAboutValueRow(aboutValuesCont, '', '');
        }
      }
    } catch (e) { console.error('About load failed', e); }
  }

  function bindAboutForm() {
    const form = document.getElementById('about-form');
    const addValueBtn = document.getElementById('add-about-value');
    const aboutValuesCont = document.getElementById('about-values-container');
    if (addValueBtn && aboutValuesCont) {
      addValueBtn.addEventListener('click', () => renderAboutValueRow(aboutValuesCont, '', ''));
    }
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = Array.from(document.querySelectorAll('#about-values-container .about-value-row')).map(row => {
          return {
            title: row.querySelector('.about-value-title')?.value || '',
            description: row.querySelector('.about-value-desc')?.value || ''
          };
        }).filter(v => v.title || v.description);
        const payload = {
          title: document.getElementById('about-title')?.value || '',
          content: document.getElementById('about-content')?.value || '',
          mission: document.getElementById('about-mission')?.value || '',
          vision: document.getElementById('about-vision')?.value || '',
          values,
          values_text: document.getElementById('about-values-text')?.value || ''
        };
        await api.post('/content/about', payload);
        alert('Haqqımızda yadda saxlandı');
      } catch (e2) { console.error(e2); alert('Xəta: ' + (e2.message||'')); }
    });
  }

  function renderAboutValueRow(container, title, desc) {
    const row = document.createElement('div');
    row.className = 'about-value-row';
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr 2fr auto';
    row.style.gap = '6px';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'form-control about-value-title';
    titleInput.placeholder = 'Başlıq';
    titleInput.value = title || '';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.className = 'form-control about-value-desc';
    descInput.placeholder = 'Qısa təsvir';
    descInput.value = desc || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary remove-about-value';
    btn.style.padding = '4px 10px';
    btn.textContent = 'Sil';
    btn.addEventListener('click', () => row.remove());
    row.appendChild(titleInput);
    row.appendChild(descInput);
    row.appendChild(btn);
    container.appendChild(row);
  }

  // ----- CAMPAIGNS -----
  function renderCampaignItem(container, item) {
    const wrap = document.createElement('div');
    wrap.className = 'svc-item';
    wrap.style.cssText = 'border:1px solid #e5e7eb; border-radius:8px; padding:8px; background:#fff; display:flex; flex-direction:column; gap:6px;';
    wrap.innerHTML = `
      <div class="svc-grid" style="display:grid; grid-template-columns: 1fr 2fr 1fr; gap:6px; align-items:start;">
        <div class="icon-picker-slot" style="min-width:0;"></div>
        <input type="text" class="form-control svc-title" placeholder="Kampaniya adı" style="min-width:0;">
        <input type="text" class="form-control svc-badge" placeholder="Badge (Yeni, Endirim)" style="min-width:0;">
        <textarea class="form-control svc-desc" placeholder="Qısa təsvir" rows="1" style="grid-column: 1 / -1; resize: vertical; min-height:28px;"></textarea>
        <div class="svc-features" style="grid-column: 1 / -1; display:flex; flex-direction:column; gap:6px;"></div>
      </div>
      <div class="svc-actions" style="display:flex; gap:6px; justify-content:flex-end; width:100%; margin-top:2px;">
        <button type="button" class="btn btn-secondary svc-add-feature" style="padding:4px 10px;">Şərt əlavə et</button>
        <button type="button" class="btn btn-secondary remove" style="padding:4px 10px;">Sil</button>
      </div>
    `;
    wrap.querySelector('.icon-picker-slot').appendChild(createIconPicker('svc-icon', item.icon || ''));
    wrap.querySelector('.svc-title').value = item.title || '';
    wrap.querySelector('.svc-badge').value = item.badge || '';
    wrap.querySelector('.svc-desc').value = item.description || '';
    // Handlers
    const featsWrap = wrap.querySelector('.svc-features');
    const addFeatBtn = wrap.querySelector('.svc-add-feature');
    function renderSvcFeature(text) {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto';
      row.style.gap = '6px';
      const fi = document.createElement('input');
      fi.type = 'text';
      fi.className = 'form-control svc-feature-text';
      fi.placeholder = 'Şərt / üstünlük';
      fi.style.minWidth = '0';
      fi.value = text || '';
      const fb = document.createElement('button');
      fb.type = 'button';
      fb.className = 'btn btn-secondary svc-feature-remove';
      fb.style.padding = '4px 10px';
      fb.textContent = 'Sil';
      fb.addEventListener('click', () => row.remove());
      row.appendChild(fi);
      row.appendChild(fb);
      featsWrap.appendChild(row);
    }
    const featsArr = Array.isArray(item.features) ? item.features : [];
    if (featsArr.length) featsArr.forEach(f => renderSvcFeature(f)); else renderSvcFeature('');
    addFeatBtn.addEventListener('click', (e) => { e.preventDefault(); renderSvcFeature(''); });
    wrap.querySelector('.remove').addEventListener('click', () => wrap.remove());
    container.appendChild(wrap);
  }

  async function loadCampaignsForm() {
    try {
      const data = await api.get('/content/campaigns');
      document.getElementById('campaigns-title') && (document.getElementById('campaigns-title').value = data.title || 'Kampaniyalarımız');
      document.getElementById('campaigns-subtitle') && (document.getElementById('campaigns-subtitle').value = data.subtitle || 'Sizə təklif etdiyimiz kampaniyalar');
      const cont = document.getElementById('campaigns-container');
      if (cont) {
        cont.innerHTML = '';
        const items = Array.isArray(data.items) ? data.items : [];
        if (items.length) {
          items.forEach(it => renderCampaignItem(cont, it));
        } else {
          seedCampaignsUI();
        }
      }
    } catch (e) { console.error('Campaigns load failed', e); }
  }

  function bindCampaignsForm() {
    const addBtn = document.getElementById('add-campaign');
    const cont = document.getElementById('campaigns-container');
    if (addBtn && cont) addBtn.addEventListener('click', () => renderCampaignItem(cont, { icon:'fas fa-tag', title:'', description:'', badge:'' }));

    const form = document.getElementById('campaigns-form');
    if (form) {
      form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !(e.target && (e.target.tagName === 'TEXTAREA' || e.target.type === 'submit'))) {
          e.preventDefault();
        }
      });

      const resetTop = document.getElementById('reset-campaigns');
      const resetBottom = document.getElementById('reset-campaigns-bottom');
      const doReset = (e) => { e.preventDefault(); seedCampaignsUI(); };
      if (resetTop) resetTop.addEventListener('click', doReset);
      if (resetBottom) resetBottom.addEventListener('click', doReset);

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const items = Array.from(document.querySelectorAll('#campaigns-container .svc-item')).map(row => {
            const features = Array.from(row.querySelectorAll('.svc-feature-text')).map(i => (i.value || '').trim()).filter(Boolean);
            return {
              icon: row.querySelector('.svc-icon')?.value || '',
              title: row.querySelector('.svc-title')?.value || '',
              description: row.querySelector('.svc-desc')?.value || '',
              badge: (row.querySelector('.svc-badge')?.value || '').trim(),
              features
            };
          });
          const payload = {
            title: document.getElementById('campaigns-title')?.value || 'Kampaniyalarımız',
            subtitle: document.getElementById('campaigns-subtitle')?.value || 'Sizə təklif etdiyimiz kampaniyalar',
            items
          };
          await api.post('/content/campaigns', payload);
          alert('Kampaniyalar yadda saxlandı');
        } catch (e2) { console.error(e2); alert('Xəta: ' + (e2.message||'')); }
      });
    }
  }

  function getDefaultCampaigns() {
    return [
      { icon:'fas fa-tag',    title:'Yaz Endirimi',      description:'Yeni abunəçilər üçün ilk 3 ay 20% endirim.', badge:'Yeni',    features:['Qeydiyyat tələb olunur','1 il müqavilə','Pulsuz quraşdırma'] },
      { icon:'fas fa-gift',   title:'Ailəvi Paket',      description:'4 istifadəçiyə qədər eyni tarifə qoşulun.',  badge:'Populyar', features:['4-ə qədər istifadəçi','Ortaq internet paketi','Aylıq ödəniş'] },
      { icon:'fas fa-bolt',   title:'Sürət Yüksəltmə',  description:'Mövcud tarifinizdə sürəti 2 dəfə artırın.', badge:'',         features:['Mövcud abunəçilər üçün','Dərhal aktivləşmə','Əlavə ödəniş yoxdur'] }
    ];
  }

  function seedCampaignsUI() {
    const cont = document.getElementById('campaigns-container');
    if (!cont) return;
    cont.innerHTML = '';
    getDefaultCampaigns().forEach(it => renderCampaignItem(cont, it));
  }

  function bindContactForm() {
    // Add/remove phone rows
    const addBtn = document.getElementById('add-contact-phone');
    const phonesCont = document.getElementById('contact-phones-container');
    if (addBtn && phonesCont) {
      addBtn.addEventListener('click', () => renderPhoneRow(phonesCont, ''));
    }

    const form = document.getElementById('contact-form');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const phones = Array.from(document.querySelectorAll('#contact-phones-container .contact-phone-input'))
          .map(i => (i.value || '').trim())
          .filter(v => v);
        const payload = {
          address: document.getElementById('contact-address')?.value || '',
          // Backward compatibility: keep single phone as first item
          phone: phones[0] || '',
          phones,
          email: document.getElementById('contact-email')?.value || '',
          hours: document.getElementById('contact-hours')?.value || ''
        };
        await api.post('/content/contact', payload);
        alert('Əlaqə məlumatları yadda saxlandı');
      } catch (e2) { console.error(e2); alert('Xəta: ' + (e2.message||'')); }
    });
  }

  function renderPhoneRow(container, value) {
    const row = document.createElement('div');
    row.className = 'form-row';
    row.style.marginTop = '6px';
    const input = document.createElement('input');
    input.type = 'tel';
    input.className = 'form-control contact-phone-input';
    input.placeholder = '501234567';
    input.maxLength = 20;
    input.style.flex = '1';
    input.value = value || '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-secondary remove-phone';
    btn.style.flex = '0 0 auto';
    btn.textContent = 'Sil';
    btn.addEventListener('click', () => row.remove());
    row.appendChild(input);
    row.appendChild(btn);
    container.appendChild(row);
  }

  function getDefaultContact() {
    return {
      address: 'Sumqayıt şəhəri Mərkəz Plaza 412',
      phones: ['(+994) 50 123 45 67'],
      email: 'info@grandtelecom.az',
      hours: 'Hər gün'
    };
  }

  async function loadContactForm() {
    try {
      const data = await api.get('/content/contact');
      const contact = data && typeof data === 'object' ? data : {};
      const addressEl = document.getElementById('contact-address');
      const emailEl = document.getElementById('contact-email');
      const hoursEl = document.getElementById('contact-hours');
      const phonesCont = document.getElementById('contact-phones-container');
      if (addressEl) addressEl.value = contact.address || '';
      if (emailEl) emailEl.value = contact.email || '';
      if (hoursEl) hoursEl.value = contact.hours || '';
      if (phonesCont) {
        phonesCont.innerHTML = '';
        const phones = Array.isArray(contact.phones) ? contact.phones : (contact.phone ? [contact.phone] : []);
        if (phones.length) {
          phones.forEach(p => renderPhoneRow(phonesCont, p));
        } else {
          renderPhoneRow(phonesCont, '');
        }
      }
    } catch (e) {
      console.error('Contact load failed', e);
      // seed an empty row so UI is usable
      const phonesCont = document.getElementById('contact-phones-container');
      if (phonesCont) { phonesCont.innerHTML = ''; renderPhoneRow(phonesCont, ''); }
    }
  }

  // Initialize when DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    try {
      bindHomepageForm();
      bindAboutForm();
      bindCampaignsForm();
      bindTariffsForm();
      bindContactForm();
      loadHomepageForm();
      loadAboutForm();
      loadCampaignsForm();
      loadTariffsForm();
      loadContactForm();

      // Expose helpers globally for convenience (e.g., from console or other scripts)
      window.createNewTariff = createNewTariff;
      window.createNewTariffWithDefaults = createNewTariffWithDefaults;
    } catch (e) { console.error('Admin content init error', e); }
  });
} // End of initialization block
