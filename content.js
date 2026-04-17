(() => {
  const LEGACY_STORAGE_KEY = 'homes_condition_notes_v1';
  const SYNC_KEY_PREFIX = 'homes_condition_note_v2:';
  const ITEM_SELECTOR = 'div.mod-newArrivalBuilding';
  const COMMENT_SAVE_DEBOUNCE_MS = 700;
  const STATUS_OPTIONS = [
    { value: '0', label: '0. 未検討', badgeLabel: '0. 未検討', colorClass: '', defaultChecked: true },
    { value: '1', label: '1. 除外候補', badgeLabel: '1. 除外候補', colorClass: 'red', defaultChecked: true },
    { value: '2', label: '2. 要確認', badgeLabel: '2. 要確認', colorClass: 'orange', defaultChecked: true },
    { value: '3', label: '3. 検討中', badgeLabel: '3. 検討中', colorClass: 'green', defaultChecked: true },
    { value: '4', label: '4. 本命', badgeLabel: '4. 本命', colorClass: 'blue', defaultChecked: true },
    { value: '9', label: '9. 除外', badgeLabel: '9. 除外', colorClass: 'gray', defaultChecked: false }
  ];
  const STATUS_VALUES = new Set(STATUS_OPTIONS.map(option => option.value));
  const LEGACY_STATUS_MAP = {
    '': '0',
    red: '1',
    yellow: '2',
    orange: '2',
    green: '4',
    blue: '3',
    gray: '9'
  };
  const DEFAULT_FILTER_VALUES = new Set(
    STATUS_OPTIONS.filter(option => option.defaultChecked).map(option => option.value)
  );

  let cache = {};
  let activeFilterValues = new Set(DEFAULT_FILTER_VALUES);
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
    return card?.querySelector('.bukkenName')?.textContent?.trim() || '物件名不明';
  }

  function getDefaultState(card) {
    return {
      hidden: false,
      color: '0',
      comment: '',
      title: getTitle(card),
      updatedAt: 0
    };
  }

  function normalizeStatusValue(rawColor) {
    if (typeof rawColor !== 'string') return '0';
    if (STATUS_VALUES.has(rawColor)) return rawColor;
    return LEGACY_STATUS_MAP[rawColor] || '0';
  }

  function normalizeState(state, card) {
    const fallback = getDefaultState(card);
    const updatedAt = Number(state?.updatedAt);

    return {
      hidden: Boolean(state?.hidden),
      color: normalizeStatusValue(state?.color),
      comment: typeof state?.comment === 'string' ? state.comment : '',
      title: typeof state?.title === 'string' && state.title.trim() ? state.title : fallback.title,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : fallback.updatedAt
    };
  }

  function getState(id, card) {
    return normalizeState(cache[id], card);
  }

  function isDefaultState(state) {
    return state.color === '0' && !state.comment.trim();
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

  function getStatusOption(value) {
    return STATUS_OPTIONS.find(option => option.value === value) || STATUS_OPTIONS[0];
  }

  function renderStatusSelectOptions() {
    return STATUS_OPTIONS
      .map(option => `<option value="${option.value}">${option.label}</option>`)
      .join('');
  }

  function renderFilterCheckboxes() {
    return STATUS_OPTIONS
      .map(option => `
        <label class="hc-filter-option">
          <input
            type="checkbox"
            class="hc-filter-checkbox"
            value="${option.value}"
            ${option.defaultChecked ? 'checked' : ''}
          >
          ${option.label}
        </label>
      `)
      .join('');
  }

  function isAutoHiddenStatus(state) {
    return state.color === '9';
  }

  function applyState(card, state) {
    card.classList.remove(
      'hc-color-red',
      'hc-color-orange',
      'hc-color-green',
      'hc-color-blue',
      'hc-color-gray',
      'hc-hidden'
    );

    const option = getStatusOption(state.color);
    if (option.colorClass) {
      card.classList.add(`hc-color-${option.colorClass}`);
    }

    if (isAutoHiddenStatus(state)) {
      card.classList.add('hc-hidden');
    }

    const badge = card.querySelector('.hc-status-badge');
    if (badge) {
      badge.textContent = option.badgeLabel;
    }
  }

  function createToolbar() {
    if (document.querySelector('.hc-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.className = 'hc-toolbar';
    toolbar.innerHTML = `
      <div class="hc-toolbar-inner">
        <strong>HOME'S 条件一覧アシスト</strong>
        <div class="hc-filter-group">
          ${renderFilterCheckboxes()}
        </div>
        <button type="button" id="hc-export">JSON書き出し</button>
      </div>
    `;
    document.body.prepend(toolbar);

    const filterCheckboxes = toolbar.querySelectorAll('.hc-filter-checkbox');
    const exportBtn = toolbar.querySelector('#hc-export');

    filterCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        activeFilterValues = new Set(
          [...filterCheckboxes]
            .filter(input => input.checked)
            .map(input => input.value)
        );
        filterCards();
      });
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
    document.querySelectorAll(ITEM_SELECTOR).forEach(card => {
      const id = getBuildingId(card);
      const state = getState(id, card);
      const isVisible = activeFilterValues.has(state.color);

      card.classList.toggle('hc-filtered-out', !isVisible);
    });
  }

  function syncPanel(card, state) {
    const panel = card.querySelector('.hc-panel');
    if (!panel) return;

    const colorSelect = panel.querySelector('.hc-color-select');
    const commentArea = panel.querySelector('.hc-comment');

    if (colorSelect && colorSelect.value !== state.color) {
      colorSelect.value = state.color;
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
          ステータス
          <select class="hc-color-select">
            ${renderStatusSelectOptions()}
          </select>
        </label>

        <span class="hc-status-badge">0. 未検討</span>
      </div>

      <div class="hc-panel-row">
        <textarea class="hc-comment" rows="2" placeholder="コメントを入力"></textarea>
      </div>
    `;

    const colorSelect = panel.querySelector('.hc-color-select');
    const commentArea = panel.querySelector('.hc-comment');

    colorSelect.value = state.color;
    commentArea.value = state.comment || '';

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
