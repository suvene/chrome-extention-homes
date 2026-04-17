(() => {
  const LEGACY_STORAGE_KEY = 'homes_condition_notes_v1';
  const SYNC_KEY_PREFIX = 'homes_condition_note_v2:';
  const ITEM_SELECTOR = 'div.mod-newArrivalBuilding, tr.prg-roomInfo[data-kykey]';
  const CONDITION1_ROOM_SELECTOR = 'tr.prg-roomInfo[data-kykey]';
  const CONDITION1_BUNDLE_SELECTOR = '.prg-bundle';
  const CONDITION1_PAGINATION_NEXT_SELECTOR = '.mod-listPaging li.nextPage a[href]';
  const COMMENT_SAVE_DEBOUNCE_MS = 700;
  const EXPORT_FILENAME = 'homes-condition-notes.json';
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
  let isCondition1NextPageLoading = false;

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

  function pushUnique(values, value) {
    if (typeof value !== 'string') return;

    const normalized = value.trim();
    if (!normalized || values.includes(normalized)) return;
    values.push(normalized);
  }

  function isCondition1Room(card) {
    return card.matches(CONDITION1_ROOM_SELECTOR);
  }

  function isCondition1Page() {
    return window.location.pathname.startsWith('/search/condition1/');
  }

  function getCondition1Rows(card) {
    if (!isCondition1Room(card)) return [card];

    const rows = [card];
    let next = card.nextElementSibling;

    while (next && next.matches('tr') && !next.matches(CONDITION1_ROOM_SELECTOR)) {
      rows.push(next);
      next = next.nextElementSibling;
    }

    return rows;
  }

  function parseRoomIdFromHref(href) {
    if (typeof href !== 'string') return '';

    const match = href.match(/\/chintai\/room\/([^/?#]+)\//);
    return match?.[1] || '';
  }

  function getRoomId(card) {
    const directKykey = card.dataset?.kykey;
    if (directKykey) return directKykey;

    const nestedKykey = card.querySelector('[data-kykey]')?.dataset?.kykey;
    if (nestedKykey) return nestedKykey;

    const directHrefId = parseRoomIdFromHref(card.dataset?.href);
    if (directHrefId) return directHrefId;

    const nestedHrefId = parseRoomIdFromHref(card.querySelector('[data-href]')?.dataset?.href);
    if (nestedHrefId) return nestedHrefId;

    const detailLinks = [
      ...card.querySelectorAll('a[href*="/chintai/room/"]')
    ];

    for (const link of detailLinks) {
      const roomId = parseRoomIdFromHref(link.href);
      if (roomId) return roomId;
    }

    return '';
  }

  function getTyKey(card) {
    const directTykey = card.dataset?.tykey;
    if (directTykey) return directTykey;

    const closestTykey = card.closest('[data-tykey]')?.dataset?.tykey;
    if (closestTykey) return closestTykey;

    return card.querySelector('[data-tykey]')?.dataset?.tykey || '';
  }

  function getLegacyStorageIds(card) {
    const ids = [];
    const bidLink = card.querySelector('a[data-bid]');
    const row = card.querySelector('tr[data-href]');
    const checkbox = card.querySelector('input.prg-bCheck[name="pkey[]"]');

    pushUnique(ids, bidLink?.dataset?.bid ? `bid:${bidLink.dataset.bid}` : '');
    pushUnique(ids, card.dataset?.href ? `href:${card.dataset.href}` : '');
    pushUnique(ids, row?.dataset?.href ? `href:${row.dataset.href}` : '');
    pushUnique(ids, checkbox?.value ? `pkey:${checkbox.value}` : '');

    return ids;
  }

  function getLookupStorageIds(card) {
    const ids = [];
    const roomId = getRoomId(card);
    const tykey = getTyKey(card);

    pushUnique(ids, roomId ? `room:${roomId}` : '');
    pushUnique(ids, tykey ? `tykey:${tykey}` : '');
    getLegacyStorageIds(card).forEach(id => pushUnique(ids, id));
    pushUnique(ids, `title:${getTitle(card)}`);

    return ids;
  }

  function getWriteStorageIds(card) {
    const lookupIds = getLookupStorageIds(card);
    const roomId = lookupIds.find(id => id.startsWith('room:'));
    if (roomId) return [roomId];

    const tykey = lookupIds.find(id => id.startsWith('tykey:'));
    if (tykey) return [tykey];

    return [lookupIds[0]];
  }

  function setCardStorageIds(card) {
    const writeIds = getWriteStorageIds(card).filter(Boolean);
    const lookupIds = getLookupStorageIds(card);

    card.dataset.hcId = writeIds[0] || '';
    card.dataset.hcWriteIds = JSON.stringify(writeIds);
    card.dataset.hcLookupIds = JSON.stringify(lookupIds);

    return { writeIds, lookupIds };
  }

  function getCardStorageIds(card) {
    const serializedWriteIds = card.dataset.hcWriteIds;
    const serializedLookupIds = card.dataset.hcLookupIds;

    if (serializedWriteIds && serializedLookupIds) {
      try {
        const writeIds = JSON.parse(serializedWriteIds);
        const lookupIds = JSON.parse(serializedLookupIds);

        if (
          Array.isArray(writeIds)
          && writeIds.length > 0
          && Array.isArray(lookupIds)
          && lookupIds.length > 0
        ) {
          return { writeIds, lookupIds };
        }
      } catch (error) {
        console.warn('Failed to parse cached storage ids', error);
      }
    }

    return setCardStorageIds(card);
  }

  function getTitle(card) {
    const title =
      card?.querySelector('.bukkenName')?.textContent?.trim()
      || card?.closest('.prg-unitListBody')?.querySelector('img[alt]')?.alt?.trim();

    if (title) return title;

    const floor = card?.querySelector('.roomKaisuu')?.textContent?.trim();
    const roomNumber = card?.querySelector('.roomNumber')?.textContent?.trim();
    const roomLabel = [floor, roomNumber].filter(Boolean).join(' ');

    return roomLabel || '物件名不明';
  }

  function getDefaultState(card) {
    return {
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
      color: normalizeStatusValue(state?.color),
      comment: typeof state?.comment === 'string' ? state.comment : '',
      title: typeof state?.title === 'string' && state.title.trim() ? state.title : fallback.title,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : fallback.updatedAt
    };
  }

  function getResolvedState(card, ids = getCardStorageIds(card).lookupIds) {
    for (const id of ids) {
      if (cache[id]) {
        return {
          id,
          state: normalizeState(cache[id], card)
        };
      }
    }

    return {
      id: ids[0] || '',
      state: getDefaultState(card)
    };
  }

  function syncCacheForIds(ids, rawState, card) {
    const normalized = normalizeState(rawState, card);

    ids.forEach(id => {
      cache[id] = normalized;
    });

    return normalized;
  }

  function isDefaultState(state) {
    return state.color === '0' && !state.comment.trim();
  }

  function statesEqual(left, right) {
    if (!left || !right) return false;

    return left.color === right.color
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

  function normalizeIds(idsOrId) {
    if (Array.isArray(idsOrId)) {
      return [...new Set(idsOrId.filter(Boolean))];
    }

    if (typeof idsOrId === 'string' && idsOrId.trim()) {
      const pendingIds = commentSaveTimers.get(idsOrId)?.ids;
      return pendingIds ? [...new Set(pendingIds.filter(Boolean))] : [idsOrId];
    }

    return [];
  }

  async function persistState(ids) {
    const normalizedIds = normalizeIds(ids);
    if (normalizedIds.length === 0) return;

    const primaryId = normalizedIds[0];
    const state = normalizeState(cache[primaryId]);

    if (isDefaultState(state)) {
      normalizedIds.forEach(id => {
        delete cache[id];
      });
      await chrome.storage.sync.remove(normalizedIds.map(getStorageKey));
      return;
    }

    const payload = {};

    normalizedIds.forEach(id => {
      cache[id] = state;
      payload[getStorageKey(id)] = state;
    });

    await chrome.storage.sync.set(payload);
  }

  function schedulePersist(ids) {
    const normalizedIds = normalizeIds(ids);
    const primaryId = normalizedIds[0];
    if (!primaryId) return;

    clearScheduledPersist(primaryId);

    const timerId = window.setTimeout(async () => {
      const pending = commentSaveTimers.get(primaryId);
      commentSaveTimers.delete(primaryId);
      await persistState(pending?.ids || normalizedIds);
    }, COMMENT_SAVE_DEBOUNCE_MS);

    commentSaveTimers.set(primaryId, { timerId, ids: normalizedIds });
  }

  function clearScheduledPersist(id) {
    const pending = commentSaveTimers.get(id);
    if (!pending) return;

    window.clearTimeout(pending.timerId);
    commentSaveTimers.delete(id);
  }

  async function flushScheduledPersist(ids) {
    const normalizedIds = normalizeIds(ids);
    const primaryId = normalizedIds[0];
    if (!primaryId) return;

    clearScheduledPersist(primaryId);
    await persistState(normalizedIds);
  }

  async function flushAllScheduledPersists() {
    const ids = [...commentSaveTimers.keys()];
    for (const id of ids) {
      await flushScheduledPersist(id);
    }
  }

  function getExportableCache() {
    return Object.fromEntries(
      Object.entries(cache)
        .map(([id, rawState]) => [id, normalizeState(rawState)])
        .filter(([, state]) => !isDefaultState(state))
    );
  }

  function buildExportPayload() {
    return {
      schemaVersion: 1,
      exportedAt: Date.now(),
      states: getExportableCache()
    };
  }

  function parseImportPayload(parsedJson) {
    const rawStates =
      parsedJson
      && typeof parsedJson === 'object'
      && !Array.isArray(parsedJson)
      && parsedJson.schemaVersion === 1
      && parsedJson.states
      && typeof parsedJson.states === 'object'
      && !Array.isArray(parsedJson.states)
        ? parsedJson.states
        : parsedJson;

    if (!rawStates || typeof rawStates !== 'object' || Array.isArray(rawStates)) {
      throw new Error('JSON format is invalid.');
    }

    return Object.fromEntries(
      Object.entries(rawStates)
        .filter(([id]) => typeof id === 'string' && id.trim())
        .map(([id, rawState]) => [id, normalizeState(rawState)])
        .filter(([, state]) => !isDefaultState(state))
    );
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportJson() {
    await flushAllScheduledPersists();
    downloadJson(EXPORT_FILENAME, buildExportPayload());
  }

  async function importJson(file) {
    if (!file) return;

    await flushAllScheduledPersists();

    const text = await file.text();
    const importedStates = parseImportPayload(JSON.parse(text));
    const changedStates = {};

    Object.entries(importedStates).forEach(([id, state]) => {
      const mergedState = pickNewerState(cache[id], state);
      if (!statesEqual(cache[id], mergedState)) {
        cache[id] = mergedState;
        changedStates[id] = mergedState;
      }
    });

    if (Object.keys(changedStates).length === 0) {
      window.alert('取り込める新しいステータスはありませんでした。');
      return;
    }

    await writeStatesToSync(changedStates);
    refreshAllCards();
    window.alert(`${Object.keys(changedStates).length} 件のステータスをJSONから取り込みました。`);
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

  function getPanel(card) {
    if (card.matches('.hc-panel')) return card;

    const directPanel = card.querySelector('.hc-panel');
    if (directPanel) return directPanel;

    if (!isCondition1Room(card)) return null;

    return getCondition1Rows(card)
      .map(row => row.querySelector('.hc-panel'))
      .find(Boolean) || null;
  }

  function getDecoratedElements(card) {
    return isCondition1Room(card) ? getCondition1Rows(card) : [card];
  }

  function getCondition1BuildingContainer(card) {
    if (!isCondition1Room(card)) return null;

    return (
      card.closest('.mod-mergeBuilding--rent--photo')
      || card.closest('.moduleInner.prg-building')
    );
  }

  function getCondition1Bundle(root = document) {
    return root.querySelector(CONDITION1_BUNDLE_SELECTOR);
  }

  function getCondition1BuildingBlocks(bundle) {
    if (!bundle) return [];

    return [...bundle.children].filter(child => child.querySelector('.moduleInner.prg-building'));
  }

  function getCondition1BundleInsertAnchor(bundle) {
    return bundle?.querySelector('.bukkenListAction.nocheck.bottom') || null;
  }

  function getCondition1NextPageUrl(root = document) {
    const nextLink = root.querySelector(CONDITION1_PAGINATION_NEXT_SELECTOR);
    const href = nextLink?.getAttribute('href');
    if (!href) return '';

    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      console.warn('Failed to resolve condition1 next page URL', error);
      return '';
    }
  }

  function getCondition1PageLabel(root = document) {
    const selectedPage =
      root.querySelector('.mod-listPaging li.selected [aria-current="page"]')
      || root.querySelector('.mod-listPaging li.selected span')
      || root.querySelector('.mod-listPaging li.selected a');

    const pageNumber = selectedPage?.textContent?.trim();
    if (!pageNumber) return '';

    return `Page ${pageNumber}`;
  }

  async function fetchHtmlDocument(url) {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const html = await response.text();
    return new DOMParser().parseFromString(html, 'text/html');
  }

  function createCondition1PageSeparator(pageLabel) {
    const separator = document.createElement('div');
    separator.className = 'hc-page-separator';
    separator.textContent = pageLabel;
    return separator;
  }

  function appendCondition1BuildingBlocks(buildingBlocks, pageLabel = '') {
    const bundle = getCondition1Bundle();
    if (!bundle || buildingBlocks.length === 0) return 0;

    const fragment = document.createDocumentFragment();
    if (pageLabel) {
      fragment.appendChild(createCondition1PageSeparator(pageLabel));
    }
    buildingBlocks.forEach(block => {
      fragment.appendChild(block);
    });

    const insertAnchor = getCondition1BundleInsertAnchor(bundle);
    if (insertAnchor) {
      bundle.insertBefore(fragment, insertAnchor);
    } else {
      bundle.appendChild(fragment);
    }

    return buildingBlocks.length;
  }

  async function loadCondition1NextPages() {
    if (!isCondition1Page() || isCondition1NextPageLoading) return;
    if (!getCondition1Bundle()) return;

    isCondition1NextPageLoading = true;

    const visitedUrls = new Set([new URL(window.location.href).href]);
    let nextUrl = getCondition1NextPageUrl();

    try {
      while (nextUrl && !visitedUrls.has(nextUrl)) {
        visitedUrls.add(nextUrl);

        const nextDocument = await fetchHtmlDocument(nextUrl);
        const nextBundle = getCondition1Bundle(nextDocument);
        const buildingBlocks = getCondition1BuildingBlocks(nextBundle);
        const pageLabel = getCondition1PageLabel(nextDocument);

        if (buildingBlocks.length === 0) {
          break;
        }

        appendCondition1BuildingBlocks(buildingBlocks, pageLabel);
        nextUrl = getCondition1NextPageUrl(nextDocument);
      }

      scan();
    } finally {
      isCondition1NextPageLoading = false;
    }
  }

  function syncCondition1BuildingVisibility(buildingContainers) {
    buildingContainers.forEach(container => {
      const hasVisibleRooms = [...container.querySelectorAll(CONDITION1_ROOM_SELECTOR)]
        .some(room => !room.classList.contains('hc-filtered-out'));

      container.classList.toggle('hc-building-filtered-out', !hasVisibleRooms);
    });
  }

  function applyState(card, state) {
    const decoratedElements = getDecoratedElements(card);

    decoratedElements.forEach(element => {
      element.classList.remove(
        'hc-color-red',
        'hc-color-orange',
        'hc-color-green',
        'hc-color-blue',
        'hc-color-gray'
      );
    });

    const option = getStatusOption(state.color);
    if (option.colorClass) {
      decoratedElements.forEach(element => {
        element.classList.add(`hc-color-${option.colorClass}`);
      });
    }

    const badge = getPanel(card)?.querySelector('.hc-status-badge');
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
        <button type="button" id="hc-import">JSON読み込み</button>
        <input type="file" id="hc-import-file" class="hc-import-file" accept="application/json,.json">
      </div>
    `;
    document.body.prepend(toolbar);

    const filterCheckboxes = toolbar.querySelectorAll('.hc-filter-checkbox');
    const exportBtn = toolbar.querySelector('#hc-export');
    const importBtn = toolbar.querySelector('#hc-import');
    const importFileInput = toolbar.querySelector('#hc-import-file');

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

    exportBtn.addEventListener('click', async () => {
      try {
        await exportJson();
      } catch (error) {
        console.error('Failed to export JSON', error);
        window.alert('JSON書き出しに失敗しました。');
      }
    });

    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', async () => {
      const [file] = importFileInput.files || [];

      try {
        await importJson(file);
      } catch (error) {
        console.error('Failed to import JSON', error);
        window.alert('JSON読み込みに失敗しました。JSON形式を確認してください。');
      } finally {
        importFileInput.value = '';
      }
    });
  }

  function filterCards() {
    const buildingContainers = new Set();

    document.querySelectorAll(ITEM_SELECTOR).forEach(card => {
      const state = getResolvedState(card, getCardStorageIds(card).lookupIds).state;
      const isVisible = activeFilterValues.has(state.color);

      getDecoratedElements(card).forEach(element => {
        element.classList.toggle('hc-filtered-out', !isVisible);
      });

      const buildingContainer = getCondition1BuildingContainer(card);
      if (buildingContainer) {
        buildingContainers.add(buildingContainer);
      }
    });

    syncCondition1BuildingVisibility(buildingContainers);
  }

  function syncPanel(card, state) {
    const panel = getPanel(card);
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
    const { writeIds, lookupIds } = setCardStorageIds(card);
    const resolved = getResolvedState(card, lookupIds);
    const state = resolved.state;

    if (
      resolved.id
      && resolved.id !== writeIds[0]
      && !resolved.id.startsWith('tykey:')
      && !isDefaultState(state)
    ) {
      syncCacheForIds(writeIds, state, card);
      void persistState(writeIds).catch(error => {
        console.error('Failed to backfill canonical status keys', error);
      });
    }

    syncPanel(card, state);
    applyState(card, state);
  }

  function refreshAllCards() {
    document.querySelectorAll(ITEM_SELECTOR).forEach(refreshCard);
    filterCards();
  }

  function createPanel(card, ids, state) {
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
    const primaryId = ids[0];

    colorSelect.value = state.color;
    commentArea.value = state.comment || '';

    colorSelect.addEventListener('change', async () => {
      const { lookupIds } = getCardStorageIds(card);
      const nextState = {
        ...getResolvedState(card, lookupIds).state,
        color: colorSelect.value,
        title: getTitle(card),
        updatedAt: Date.now()
      };
      syncCacheForIds(ids, nextState, card);
      applyState(card, cache[primaryId]);
      filterCards();
      await flushScheduledPersist(ids);
    });

    commentArea.addEventListener('input', () => {
      const { lookupIds } = getCardStorageIds(card);
      const nextState = {
        ...getResolvedState(card, lookupIds).state,
        comment: commentArea.value,
        title: getTitle(card),
        updatedAt: Date.now()
      };
      syncCacheForIds(ids, nextState, card);
      schedulePersist(ids);
    });

    commentArea.addEventListener('blur', async () => {
      await flushScheduledPersist(ids);
    });

    return panel;
  }

  function getPanelMountPoint(card) {
    if (isCondition1Room(card)) {
      const memberRow = getCondition1Rows(card)
        .find(row => row.matches('.memberDataRow, .prg-memberDataRow'));

      return memberRow?.querySelector('td')
        || card.querySelector('td.layout')
        || card.lastElementChild
        || card;
    }

    return (
      card.querySelector('.moduleInner')
      || card.querySelector('.moduleBody')
      || card
    );
  }

  function enhanceCard(card) {
    if (card.dataset.hcEnhanced === '1') return;
    card.dataset.hcEnhanced = '1';

    const { writeIds, lookupIds } = setCardStorageIds(card);
    const state = getResolvedState(card, lookupIds).state;
    const mountPoint = getPanelMountPoint(card);

    const panel = createPanel(card, writeIds, state);
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

    void loadCondition1NextPages().catch(error => {
      console.error('Failed to load condition1 next pages', error);
    });
  }

  init();
})();
