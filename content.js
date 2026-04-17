(() => {
  const LEGACY_STORAGE_KEY = 'homes_condition_notes_v1';
  const SYNC_KEY_PREFIX = 'homes_condition_note_v2:';
  const ITEM_SELECTOR = 'div.mod-newArrivalBuilding';
  const COMMENT_SAVE_DEBOUNCE_MS = 700;
  const COLOR_OPTIONS = new Set(['', 'red', 'yellow', 'green', 'blue']);

  let cache = {};
  const commentSaveTimers = new Map();

  async function loadAll() {
    cache = await migrateLegacyLocalData();
  }

  function getStorageKey(id) {
    return `${SYNC_KEY_PREFIX}${id}`;
  }

  function isManagedStorageKey(key) {
    return key.startsWith(SYNC_KEY_PREFIX);
  }

  function getIdFromStorageKey(key) {
    return key.slice(SYNC_KEY_PREFIX.length);
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
    return card?.querySelector('.bukkenName')?.textContent?.trim() || '名称不明';
  }

  function getDefaultState(card) {
    return {
      hidden: false,
      color: '',
      comment: '',
      title: getTitle(card),
      updatedAt: 0
    };
  }

  function normalizeState(state, card) {
    const fallback = getDefaultState(card);
    const updatedAt = Number(state?.updatedAt);
    const color = typeof state?.color === 'string' ? state.color : '';

    return {
      hidden: Boolean(state?.hidden),
      color: COLOR_OPTIONS.has(color) ? color : '',
      comment: typeof state?.comment === 'string' ? state.comment : '',
      title: typeof state?.title === 'string' && state.title.trim() ? state.title : fallback.title,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : fallback.updatedAt
    };
  }

  function getState(id, card) {
    return normalizeState(cache[id], card);
  }

  function isDefaultState(state) {
    return !state.hidden && !state.color && !state.comment.trim();
  }

  function statesEqual(left, right) {
    if (!left || !right) return false;

    return left.hidden === right.hidden
      && left.color === right.color
      && left.comment === right.comment
      && left.title === right.title
      && left.updatedAt === right.updatedAt;
  }

  function pickNewerState(current, incoming) {
    if (!current) return incoming;
    return incoming.updatedAt >= current.updatedAt ? incoming : current;
  }

  function extractManagedStates(storageItems) {
    const states = {};

    Object.entries(storageItems).forEach(([key, value]) => {
      if (!isManagedStorageKey(key)) return;

      states[getIdFromStorageKey(key)] = normalizeState(value);
    });

    return states;
  }

  async function loadSyncStates() {
    const syncItems = await chrome.storage.sync.get(null);
    return extractManagedStates(syncItems);
  }

  async function writeStatesToSync(states) {
    const payload = {};

    Object.entries(states).forEach(([id, rawState]) => {
      const state = normalizeState(rawState);
      if (isDefaultState(state)) return;
      payload[getStorageKey(id)] = state;
    });

    if (Object.keys(payload).length === 0) return;
    await chrome.storage.sync.set(payload);
  }

  async function migrateLegacyLocalData() {
    const [syncStates, legacyResult] = await Promise.all([
      loadSyncStates(),
      chrome.storage.local.get(LEGACY_STORAGE_KEY)
    ]);
    const legacyStates = legacyResult[LEGACY_STORAGE_KEY] || {};
    const mergedStates = { ...syncStates };
    let hasSyncChanges = false;

    Object.entries(legacyStates).forEach(([id, rawState]) => {
      const normalized = normalizeState(rawState);
      if (isDefaultState(normalized)) return;

      const merged = pickNewerState(mergedStates[id], normalized);
      if (!statesEqual(mergedStates[id], merged)) {
        mergedStates[id] = merged;
        hasSyncChanges = true;
      }
    });

    if (hasSyncChanges) {
      await writeStatesToSync(mergedStates);
    }

    if (Object.keys(legacyStates).length > 0) {
      await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
    }

    return mergedStates;
  }

  async function persistState(id) {
    const state = normalizeState(cache[id]);

    if (isDefaultState(state)) {
      delete cache[id];
      await chrome.storage.sync.remove(getStorageKey(id));
      return;
    }

    cache[id] = state;
    await chrome.storage.sync.set({ [getStorageKey(id)]: state });
  }

  function schedulePersist(id) {
    clearScheduledPersist(id);

    const timerId = window.setTimeout(async () => {
      commentSaveTimers.delete(id);
      await persistState(id);
    }, COMMENT_SAVE_DEBOUNCE_MS);

    commentSaveTimers.set(id, timerId);
  }

  function clearScheduledPersist(id) {
    const timerId = commentSaveTimers.get(id);
    if (timerId === undefined) return;

    window.clearTimeout(timerId);
    commentSaveTimers.delete(id);
  }

  async function flushScheduledPersist(id) {
    clearScheduledPersist(id);
    await persistState(id);
  }

  function getExportableCache() {
    return Object.fromEntries(
      Object.entries(cache)
        .map(([id, rawState]) => [id, normalizeState(rawState)])
        .filter(([, state]) => !isDefaultState(state))
    );
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
      const blob = new Blob([JSON.stringify(getExportableCache(), null, 2)], { type: 'application/json' });
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

  function syncPanel(card, state) {
    const panel = card.querySelector('.hc-panel');
    if (!panel) return;

    const hiddenCheckbox = panel.querySelector('.hc-hidden-checkbox');
    const colorSelect = panel.querySelector('.hc-color-select');
    const commentArea = panel.querySelector('.hc-comment');

    if (hiddenCheckbox && hiddenCheckbox.checked !== Boolean(state.hidden)) {
      hiddenCheckbox.checked = Boolean(state.hidden);
    }

    if (colorSelect && colorSelect.value !== (state.color || '')) {
      colorSelect.value = state.color || '';
    }

    if (commentArea && commentArea.value !== (state.comment || '')) {
      commentArea.value = state.comment || '';
    }
  }

  function refreshCard(card) {
    const id = card.dataset.hcId || getBuildingId(card);
    card.dataset.hcId = id;

    const state = getState(id, card);
    syncPanel(card, state);
    applyState(card, state);
  }

  function refreshAllCards() {
    document.querySelectorAll(ITEM_SELECTOR).forEach(refreshCard);
    filterCards();
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
        ...getState(id, card),
        hidden: hiddenCheckbox.checked,
        title: getTitle(card),
        updatedAt: Date.now()
      };
      applyState(card, cache[id]);
      await flushScheduledPersist(id);
    });

    colorSelect.addEventListener('change', async () => {
      cache[id] = {
        ...getState(id, card),
        color: colorSelect.value,
        title: getTitle(card),
        updatedAt: Date.now()
      };
      applyState(card, cache[id]);
      filterCards();
      await flushScheduledPersist(id);
    });

    commentArea.addEventListener('input', () => {
      cache[id] = {
        ...getState(id, card),
        comment: commentArea.value,
        title: getTitle(card),
        updatedAt: Date.now()
      };
      schedulePersist(id);
    });

    commentArea.addEventListener('blur', async () => {
      await flushScheduledPersist(id);
    });

    return panel;
  }

  function enhanceCard(card) {
    if (card.dataset.hcEnhanced === '1') return;
    card.dataset.hcEnhanced = '1';

    const id = getBuildingId(card);
    card.dataset.hcId = id;
    const state = getState(id, card);

    const mountPoint =
      card.querySelector('.moduleInner') ||
      card.querySelector('.moduleBody') ||
      card;

    const panel = createPanel(card, id, state);
    mountPoint.appendChild(panel);

    refreshCard(card);
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'sync') return;

    let shouldRefresh = false;

    Object.entries(changes).forEach(([key, change]) => {
      if (!isManagedStorageKey(key)) return;

      const id = getIdFromStorageKey(key);
      if (change.newValue) {
        cache[id] = normalizeState(change.newValue);
      } else {
        clearScheduledPersist(id);
        delete cache[id];
      }
      shouldRefresh = true;
    });

    if (shouldRefresh) {
      refreshAllCards();
    }
  }

  function scan() {
    createToolbar();
    document.querySelectorAll(ITEM_SELECTOR).forEach(enhanceCard);
    filterCards();
  }

  async function init() {
    await loadAll();
    chrome.storage.onChanged.addListener(handleStorageChange);
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
