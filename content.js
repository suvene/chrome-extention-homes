(() => {
  const STORAGE_KEY = 'homes_condition_notes_v1';
  const ITEM_SELECTOR = 'div.mod-newArrivalBuilding';

  let cache = {};

  async function loadAll() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    cache = result[STORAGE_KEY] || {};
  }

  async function saveAll() {
    await chrome.storage.local.set({ [STORAGE_KEY]: cache });
  }

  function getBuildingId(card) {
    const bidLink = card.querySelector('a[data-bid]');
    if (bidLink?.dataset?.bid) return `bid:${bidLink.dataset.bid}`;

    const row = card.querySelector('tr[data-href]');
    if (row?.dataset?.href) return `href:${row.dataset.href}`;

    const checkbox = card.querySelector('input.prg-bCheck[name="pkey[]"]');
    if (checkbox?.value) return `pkey:${checkbox.value}`;

    const title = card.querySelector('.bukkenName')?.textContent?.trim() || 'unknown';
    return `title:${title}`;
  }

  function getTitle(card) {
    return card.querySelector('.bukkenName')?.textContent?.trim() || '名称不明';
  }

  function getDefaultState(card) {
    return {
      hidden: false,
      color: '',
      comment: '',
      title: getTitle(card),
      updatedAt: Date.now()
    };
  }

  function getState(id, card) {
    if (!cache[id]) cache[id] = getDefaultState(card);
    return cache[id];
  }

  function applyState(card, state) {
    card.classList.remove(
      'hc-color-red',
      'hc-color-yellow',
      'hc-color-green',
      'hc-color-blue',
      'hc-hidden'
    );

    if (state.color) {
      card.classList.add(`hc-color-${state.color}`);
    }

    if (state.hidden) {
      card.classList.add('hc-hidden');
    }

    const badge = card.querySelector('.hc-status-badge');
    if (badge) {
      const colorLabelMap = {
        red: '除外候補',
        yellow: '要確認',
        green: '本命',
        blue: '比較中'
      };
      badge.textContent = state.hidden
        ? '非表示'
        : (colorLabelMap[state.color] || '未分類');
    }
  }

  function createToolbar() {
    if (document.querySelector('.hc-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'hc-toolbar';
    toolbar.innerHTML = `
      <div class="hc-toolbar-inner">
        <strong>HOME'S 条件一覧アシスト</strong>
        <label><input type="checkbox" id="hc-toggle-hidden"> 非表示も表示</label>
        <select id="hc-filter-color">
          <option value="">全色</option>
          <option value="red">除外候補</option>
          <option value="yellow">要確認</option>
          <option value="green">本命</option>
          <option value="blue">比較中</option>
        </select>
        <button type="button" id="hc-export">JSON書き出し</button>
      </div>
    `;
    document.body.prepend(toolbar);

    const hiddenToggle = toolbar.querySelector('#hc-toggle-hidden');
    const colorFilter = toolbar.querySelector('#hc-filter-color');
    const exportBtn = toolbar.querySelector('#hc-export');

    hiddenToggle.addEventListener('change', () => {
      document.documentElement.classList.toggle('hc-show-hidden', hiddenToggle.checked);
    });

    colorFilter.addEventListener('change', () => {
      document.documentElement.dataset.hcFilterColor = colorFilter.value;
      filterCards();
    });

    exportBtn.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'homes-condition-notes.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function filterCards() {
    const color = document.documentElement.dataset.hcFilterColor || '';
    document.querySelectorAll(ITEM_SELECTOR).forEach(card => {
      const id = getBuildingId(card);
      const state = getState(id, card);

      const colorMatched = !color || state.color === color;
      card.classList.toggle('hc-filtered-out', !colorMatched);
    });
  }

  function createPanel(card, id, state) {
    const panel = document.createElement('div');
    panel.className = 'hc-panel';

    panel.innerHTML = `
      <div class="hc-panel-row">
        <label class="hc-inline">
          <input type="checkbox" class="hc-hidden-checkbox">
          非表示
        </label>

        <label class="hc-inline">
          色分け
          <select class="hc-color-select">
            <option value="">未分類</option>
            <option value="red">除外候補</option>
            <option value="yellow">要確認</option>
            <option value="green">本命</option>
            <option value="blue">比較中</option>
          </select>
        </label>

        <span class="hc-status-badge">未分類</span>
      </div>

      <div class="hc-panel-row">
        <textarea class="hc-comment" rows="2" placeholder="コメントを入力"></textarea>
      </div>
    `;

    const hiddenCheckbox = panel.querySelector('.hc-hidden-checkbox');
    const colorSelect = panel.querySelector('.hc-color-select');
    const commentArea = panel.querySelector('.hc-comment');

    hiddenCheckbox.checked = !!state.hidden;
    colorSelect.value = state.color || '';
    commentArea.value = state.comment || '';

    hiddenCheckbox.addEventListener('change', async () => {
      cache[id] = {
        ...state,
        ...cache[id],
        hidden: hiddenCheckbox.checked,
        updatedAt: Date.now()
      };
      applyState(card, cache[id]);
      await saveAll();
    });

    colorSelect.addEventListener('change', async () => {
      cache[id] = {
        ...state,
        ...cache[id],
        color: colorSelect.value,
        updatedAt: Date.now()
      };
      applyState(card, cache[id]);
      filterCards();
      await saveAll();
    });

    commentArea.addEventListener('input', async () => {
      cache[id] = {
        ...state,
        ...cache[id],
        comment: commentArea.value,
        title: getTitle(card),
        updatedAt: Date.now()
      };
      await saveAll();
    });

    return panel;
  }

  function enhanceCard(card) {
    if (card.dataset.hcEnhanced === '1') return;
    card.dataset.hcEnhanced = '1';

    const id = getBuildingId(card);
    const state = getState(id, card);

    const mountPoint =
      card.querySelector('.moduleInner') ||
      card.querySelector('.moduleBody') ||
      card;

    const panel = createPanel(card, id, state);
    mountPoint.appendChild(panel);

    applyState(card, state);
  }

  function scan() {
    createToolbar();
    document.querySelectorAll(ITEM_SELECTOR).forEach(enhanceCard);
    filterCards();
  }

  async function init() {
    await loadAll();
    scan();

    const observer = new MutationObserver(() => {
      scan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  init();
})();