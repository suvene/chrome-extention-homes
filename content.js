(() => {
  const LEGACY_STORAGE_KEY = 'homes_condition_notes_v1';
  const SYNC_KEY_PREFIX = 'homes_condition_note_v2:';
  const LOCAL_FILTER_STORAGE_KEY = 'homes_header_filter_v1';
  const COMMENT_SAVE_DEBOUNCE_MS = 700;
  const EXPORT_FILENAME_PREFIX = 'rent-condition-notes';
  const APP_TITLE = '賃貸物件 条件一覧アシスタント';
  const STATUS_OPTIONS = [
    { value: '0', label: '0. 未検討', badgeLabel: '0. 未検討', colorClass: '', defaultChecked: true },
    { value: '1', label: '1. 要確認', badgeLabel: '1. 要確認', colorClass: 'orange', defaultChecked: true },
    { value: '2', label: '2. 検討中', badgeLabel: '2. 検討中', colorClass: 'green', defaultChecked: true },
    { value: '3', label: '3. 本命', badgeLabel: '3. 本命', colorClass: 'blue', defaultChecked: true },
    { value: '8', label: '8. 除外候補', badgeLabel: '8. 除外候補', colorClass: 'red', defaultChecked: true },
    { value: '9', label: '9. 除外', badgeLabel: '9. 除外', colorClass: 'gray', defaultChecked: false }
  ];
  const STATUS_VALUES = new Set(STATUS_OPTIONS.map(option => option.value));
  const LEGACY_STATUS_MAP = {
    '': '0',
    red: '8',
    yellow: '1',
    orange: '1',
    green: '3',
    blue: '2',
    gray: '9'
  };
  const DEFAULT_FILTER_VALUES = new Set(
    STATUS_OPTIONS.filter(option => option.defaultChecked).map(option => option.value)
  );
  const SITE_CONFIGS = [
    {
      id: 'homes-condition1',
      itemSelector: 'tr.prg-roomInfo[data-kykey]',
      matches: location =>
        location.hostname === 'www.homes.co.jp'
        && location.pathname.startsWith('/search/condition1/'),
      getLookupStorageIds: getHomesLookupStorageIds,
      getWriteStorageIds: getHomesWriteStorageIds,
      getTitle: getHomesTitle,
      getDecoratedElements: getHomesCondition1Rows,
      getPanel: getHomesCondition1Panel,
      mountPanel: mountHomesCondition1Panel,
      getBuildingContainer: getHomesCondition1BuildingContainer,
      getContainerCards: getHomesCondition1ContainerCards,
      getBundle: getHomesCondition1Bundle,
      getBuildingBlocks: getHomesCondition1BuildingBlocks,
      getBundleInsertAnchor: getHomesCondition1BundleInsertAnchor,
      getNextPageUrl: getHomesNextPageUrl,
      getPageLabel: getHomesPageLabel,
      createPageSeparator: createDefaultPageSeparator
    },
    {
      id: 'homes-condition-list',
      itemSelector: 'div.mod-newArrivalBuilding',
      matches: location =>
        location.hostname === 'www.homes.co.jp'
        && location.pathname.startsWith('/search/condition-list/'),
      getLookupStorageIds: getHomesLookupStorageIds,
      getWriteStorageIds: getHomesWriteStorageIds,
      getTitle: getHomesTitle,
      getDecoratedElements: card => [card],
      getPanel: getDefaultPanel,
      mountPanel: mountHomesDefaultPanel,
      getBundle: getHomesConditionListBundle,
      getBuildingBlocks: getHomesConditionListBuildingBlocks,
      getBundleInsertAnchor: getHomesConditionListBundleInsertAnchor,
      getNextPageUrl: getHomesNextPageUrl,
      getPageLabel: getHomesPageLabel,
      createPageSeparator: createDefaultPageSeparator
    },
    {
      id: 'suumo-fr301fc001',
      itemSelector: 'table.cassetteitem_other > tbody',
      matches: location =>
        location.hostname === 'suumo.jp'
        && location.pathname.startsWith('/jj/chintai/ichiran/FR301FC001/'),
      getLookupStorageIds: getSuumoLookupStorageIds,
      getWriteStorageIds: getSuumoWriteStorageIds,
      getTitle: getSuumoTitle,
      getDecoratedElements: card => [card],
      getPanel: getDefaultPanel,
      mountPanel: mountSuumoPanel,
      getBuildingContainer: getSuumoBuildingContainer,
      getContainerCards: getSuumoContainerCards,
      getBundle: getSuumoBundle,
      getBuildingBlocks: getSuumoBuildingBlocks,
      getNextPageUrl: getSuumoNextPageUrl,
      getPageLabel: getSuumoPageLabel,
      createPageSeparator: createSuumoPageSeparator
    }
  ];
  const currentSite = detectCurrentSite();
  let cache = {};
  let activeFilterValues = new Set(DEFAULT_FILTER_VALUES);
  const commentSaveTimers = new Map();
  let isNextPageLoading = false;

  if (!currentSite) {
    return;
  }

  async function loadAll() {
    const [migratedCache, storedFilterValues] = await Promise.all([
      migrateLegacyLocalData(),
      loadStoredFilterValues()
    ]);

    cache = migratedCache;
    activeFilterValues = storedFilterValues;
  }

  function detectCurrentSite() {
    return SITE_CONFIGS.find(site => site.matches(window.location)) || null;
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

  function getHomesCondition1Rows(card) {
    if (!card.matches('tr.prg-roomInfo[data-kykey]')) {
      return [card];
    }

    const rows = [card];
    let next = card.nextElementSibling;

    while (next && next.matches('tr') && !next.matches('tr.prg-roomInfo[data-kykey]')) {
      rows.push(next);
      next = next.nextElementSibling;
    }

    return rows;
  }

  function parseHomesRoomIdFromHref(href) {
    if (typeof href !== 'string') return '';

    const match = href.match(/\/chintai\/room\/([^/?#]+)\//);
    return match?.[1] || '';
  }

  function parseSuumoBcFromHref(href) {
    if (typeof href !== 'string' || !href.trim()) return '';

    try {
      return new URL(href, window.location.href).searchParams.get('bc') || '';
    } catch (error) {
      console.warn('Failed to parse SUUMO room id from href', error);
      return '';
    }
  }

  function getHomesRoomId(card) {
    const directKykey = card.dataset?.kykey;
    if (directKykey) return directKykey;

    const nestedKykey = card.querySelector('[data-kykey]')?.dataset?.kykey;
    if (nestedKykey) return nestedKykey;

    const directHrefId = parseHomesRoomIdFromHref(card.dataset?.href);
    if (directHrefId) return directHrefId;

    const nestedHrefId = parseHomesRoomIdFromHref(card.querySelector('[data-href]')?.dataset?.href);
    if (nestedHrefId) return nestedHrefId;

    const detailLinks = [
      ...card.querySelectorAll('a[href*="/chintai/room/"]')
    ];

    for (const link of detailLinks) {
      const roomId = parseHomesRoomIdFromHref(link.href);
      if (roomId) return roomId;
    }

    return '';
  }

  function getHomesTyKey(card) {
    const directTykey = card.dataset?.tykey;
    if (directTykey) return directTykey;

    const closestTykey = card.closest('[data-tykey]')?.dataset?.tykey;
    if (closestTykey) return closestTykey;

    return card.querySelector('[data-tykey]')?.dataset?.tykey || '';
  }

  function getHomesLegacyStorageIds(card) {
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

  function getHomesTitle(card) {
    const title =
      card?.querySelector('.bukkenName')?.textContent?.trim()
      || card?.closest('.prg-unitListBody')?.querySelector('img[alt]')?.alt?.trim();

    if (title) return title;

    const floor = card?.querySelector('.roomKaisuu')?.textContent?.trim();
    const roomNumber = card?.querySelector('.roomNumber')?.textContent?.trim();
    const roomLabel = [floor, roomNumber].filter(Boolean).join(' ');

    return roomLabel || '物件名不明';
  }

  function getHomesLookupStorageIds(card) {
    const ids = [];
    const roomId = getHomesRoomId(card);
    const tykey = getHomesTyKey(card);

    pushUnique(ids, roomId ? `room:${roomId}` : '');
    pushUnique(ids, tykey ? `tykey:${tykey}` : '');
    getHomesLegacyStorageIds(card).forEach(id => pushUnique(ids, id));
    pushUnique(ids, `title:${getHomesTitle(card)}`);

    return ids;
  }

  function getHomesWriteStorageIds(card) {
    const lookupIds = getHomesLookupStorageIds(card);
    const roomId = lookupIds.find(id => id.startsWith('room:'));
    if (roomId) return [roomId];

    const tykey = lookupIds.find(id => id.startsWith('tykey:'));
    if (tykey) return [tykey];

    return [lookupIds[0]].filter(Boolean);
  }

  function getSuumoClipKey(card) {
    return card.querySelector('.js-clipkey')?.value?.trim() || '';
  }

  function getSuumoDetailLink(card) {
    return card.querySelector('.js-cassette_link_href[href]') || null;
  }

  function getSuumoRoomStorageId(card) {
    const clipKey = getSuumoClipKey(card);
    if (clipKey) return `suumo-room:${clipKey}`;

    const bc = parseSuumoBcFromHref(getSuumoDetailLink(card)?.getAttribute('href'));
    return bc ? `suumo-room:${bc}` : '';
  }

  function getSuumoTitle(card) {
    const buildingTitle = card?.closest('li')?.querySelector('.cassetteitem_content-title')?.textContent?.trim();
    const firstRow = card?.querySelector('tr.js-cassette_link');
    const floor = firstRow?.children?.[2]?.textContent?.trim() || '';
    const layout = card?.querySelector('.cassetteitem_madori')?.textContent?.trim() || '';
    const title = [buildingTitle, floor, layout].filter(Boolean).join(' ');

    return title || buildingTitle || '物件名不明';
  }

  function getSuumoLookupStorageIds(card) {
    const ids = [];
    const canonicalId = getSuumoRoomStorageId(card);
    const detailLink = getSuumoDetailLink(card);
    const bc = parseSuumoBcFromHref(detailLink?.getAttribute('href'));
    const detailHref = detailLink?.href || '';

    pushUnique(ids, canonicalId);
    pushUnique(ids, bc ? `suumo-bc:${bc}` : '');
    pushUnique(ids, detailHref ? `suumo-href:${detailHref}` : '');
    pushUnique(ids, `suumo-title:${getSuumoTitle(card)}`);

    return ids;
  }

  function getSuumoWriteStorageIds(card) {
    const canonicalId = getSuumoRoomStorageId(card);
    if (canonicalId) return [canonicalId];

    return [getSuumoLookupStorageIds(card)[0]].filter(Boolean);
  }

  function getLookupStorageIds(card) {
    return currentSite.getLookupStorageIds(card);
  }

  function getWriteStorageIds(card) {
    return currentSite.getWriteStorageIds(card);
  }

  function setCardStorageIds(card) {
    const writeIds = getWriteStorageIds(card).filter(Boolean);
    const lookupIds = getLookupStorageIds(card).filter(Boolean);

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
    return currentSite.getTitle(card);
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

  function normalizeStoredFilterValues(rawValues) {
    if (!Array.isArray(rawValues)) {
      return new Set(DEFAULT_FILTER_VALUES);
    }

    return new Set(
      rawValues
        .map(value => (typeof value === 'string' ? value : String(value)))
        .filter(value => STATUS_VALUES.has(value))
    );
  }

  async function loadStoredFilterValues() {
    const stored = await chrome.storage.local.get(LOCAL_FILTER_STORAGE_KEY);
    return normalizeStoredFilterValues(stored[LOCAL_FILTER_STORAGE_KEY]);
  }

  async function persistFilterValues() {
    await chrome.storage.local.set({
      [LOCAL_FILTER_STORAGE_KEY]: [...activeFilterValues]
    });
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

  function formatExportTimestamp(date) {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}${seconds}`;
  }

  function getExportFilename(timestamp = Date.now()) {
    return `${EXPORT_FILENAME_PREFIX}-${formatExportTimestamp(new Date(timestamp))}.json`;
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
    const lastUpdatedAt = getLastUpdatedAt();
    const filenameTimestamp = lastUpdatedAt > 0 ? lastUpdatedAt : Date.now();
    downloadJson(getExportFilename(filenameTimestamp), buildExportPayload());
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
            ${activeFilterValues.has(option.value) ? 'checked' : ''}
          >
          ${option.label}
        </label>
      `)
      .join('');
  }

  function getLastUpdatedAt() {
    return Object.values(cache).reduce((latest, rawState) => {
      const normalized = normalizeState(rawState);
      return normalized.updatedAt > latest ? normalized.updatedAt : latest;
    }, 0);
  }

  function padDatePart(value) {
    return String(value).padStart(2, '0');
  }

  function formatUpdatedAt(timestamp) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return '未更新';
    }

    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = padDatePart(date.getMonth() + 1);
    const day = padDatePart(date.getDate());
    const hours = padDatePart(date.getHours());
    const minutes = padDatePart(date.getMinutes());
    const seconds = padDatePart(date.getSeconds());

    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  }

  function getToolbarSyncStatus() {
    if (commentSaveTimers.size > 0) {
      return '保存待ちの変更があります';
    }

    return '同期ストレージに保存済み';
  }

  function updateToolbarSyncStatus() {
    const toolbar = document.querySelector('.hc-toolbar');
    if (!toolbar) return;

    const updatedAtValue = toolbar.querySelector('[data-hc-last-updated]');
    const syncStateValue = toolbar.querySelector('[data-hc-sync-state]');
    if (!updatedAtValue || !syncStateValue) return;

    const nextUpdatedAt = formatUpdatedAt(getLastUpdatedAt());
    const nextSyncState = getToolbarSyncStatus();

    if (updatedAtValue.textContent !== nextUpdatedAt) {
      updatedAtValue.textContent = nextUpdatedAt;
    }

    if (syncStateValue.textContent !== nextSyncState) {
      syncStateValue.textContent = nextSyncState;
    }
  }

  function getDefaultPanel(card) {
    return card.querySelector('.hc-panel') || null;
  }

  function getHomesCondition1Panel(card) {
    if (card.matches('.hc-panel')) return card;

    const directPanel = card.querySelector('.hc-panel');
    if (directPanel) return directPanel;

    return getHomesCondition1Rows(card)
      .map(row => row.querySelector('.hc-panel'))
      .find(Boolean) || null;
  }

  function getDecoratedElements(card) {
    return currentSite.getDecoratedElements(card);
  }

  function getHomesCondition1BuildingContainer(card) {
    return (
      card.closest('.mod-mergeBuilding--rent--photo')
      || card.closest('.moduleInner.prg-building')
    );
  }

  function getHomesCondition1ContainerCards(container) {
    return [...container.querySelectorAll('tr.prg-roomInfo[data-kykey]')];
  }

  function getHomesCondition1Bundle(root = document) {
    return root.querySelector('.prg-bundle');
  }

  function getHomesConditionListBundle(root = document) {
    return root.querySelector('.bundle');
  }

  function getSuumoBundle(root = document) {
    return root.querySelector('ul.l-cassetteitem');
  }

  function getHomesCondition1BuildingBlocks(bundle) {
    if (!bundle) return [];

    return [...bundle.children].filter(child => child.querySelector('.moduleInner.prg-building'));
  }

  function getHomesConditionListBuildingBlocks(bundle) {
    if (!bundle) return [];

    return [...bundle.children].filter(child => child.matches('.mod-newArrivalBuilding'));
  }

  function getSuumoBuildingBlocks(bundle) {
    if (!bundle) return [];

    return [...bundle.children].filter(child => child.matches('li'));
  }

  function getHomesCondition1BundleInsertAnchor(bundle) {
    return bundle?.querySelector('.bukkenListAction.nocheck.bottom') || null;
  }

  function getHomesConditionListBundleInsertAnchor(bundle) {
    return bundle?.querySelector('.bundleAction.is-positionBottom') || null;
  }

  function getHomesNextPageUrl(root = document) {
    const nextLink = root.querySelector('.mod-listPaging li.nextPage a[href]');
    const href = nextLink?.getAttribute('href');
    if (!href) return '';

    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      console.warn('Failed to resolve HOME\'S next page URL', error);
      return '';
    }
  }

  function getHomesPageLabel(root = document) {
    const selectedPage =
      root.querySelector('.mod-listPaging li.selected [aria-current="page"]')
      || root.querySelector('.mod-listPaging li.selected span')
      || root.querySelector('.mod-listPaging li.selected a');

    const pageNumber = selectedPage?.textContent?.trim();
    if (!pageNumber) return '';

    return `Page ${pageNumber}`;
  }

  function getSuumoNextPageUrl(root = document) {
    const nextLink = [...root.querySelectorAll('.pagination_set-nav a[href]')]
      .find(link => link.textContent?.trim() === '次へ');
    const href = nextLink?.getAttribute('href');
    if (!href) return '';

    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      console.warn('Failed to resolve SUUMO next page URL', error);
      return '';
    }
  }

  function getSuumoPageLabel(root = document) {
    const pageNumber = root.querySelector('.pagination_set-nav .pagination-current')?.textContent?.trim();
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

  function createDefaultPageSeparator(pageLabel) {
    const separator = document.createElement('div');
    separator.className = 'hc-page-separator';
    separator.textContent = pageLabel;
    return separator;
  }

  function createSuumoPageSeparator(pageLabel) {
    const item = document.createElement('li');
    item.className = 'hc-page-separator-item';
    item.appendChild(createDefaultPageSeparator(pageLabel));
    return item;
  }

  function appendNextPageBlocks(buildingBlocks, pageLabel = '') {
    const bundle = currentSite.getBundle();
    if (!bundle || buildingBlocks.length === 0) return 0;

    const fragment = document.createDocumentFragment();
    if (pageLabel) {
      fragment.appendChild(currentSite.createPageSeparator(pageLabel));
    }
    buildingBlocks.forEach(block => {
      fragment.appendChild(block);
    });

    const insertAnchor = currentSite.getBundleInsertAnchor?.(bundle);
    if (insertAnchor) {
      bundle.insertBefore(fragment, insertAnchor);
    } else {
      bundle.appendChild(fragment);
    }

    return buildingBlocks.length;
  }

  async function loadNextPages() {
    if (isNextPageLoading || !currentSite.getBundle || !currentSite.getNextPageUrl) return;
    if (!currentSite.getBundle()) return;

    isNextPageLoading = true;

    const visitedUrls = new Set([new URL(window.location.href).href]);
    let nextUrl = currentSite.getNextPageUrl();

    try {
      while (nextUrl && !visitedUrls.has(nextUrl)) {
        visitedUrls.add(nextUrl);

        const nextDocument = await fetchHtmlDocument(nextUrl);
        const nextBundle = currentSite.getBundle(nextDocument);
        const buildingBlocks = currentSite.getBuildingBlocks(nextBundle);
        const pageLabel = currentSite.getPageLabel(nextDocument);

        if (buildingBlocks.length === 0) {
          break;
        }

        appendNextPageBlocks(buildingBlocks, pageLabel);
        nextUrl = currentSite.getNextPageUrl(nextDocument);
      }

      scan();
    } finally {
      isNextPageLoading = false;
    }
  }

  function getBuildingContainer(card) {
    return currentSite.getBuildingContainer?.(card) || null;
  }

  function isCardVisible(card) {
    return getDecoratedElements(card).some(element => !element.classList.contains('hc-filtered-out'));
  }

  function syncBuildingVisibility(buildingContainers) {
    if (!currentSite.getContainerCards) return;

    buildingContainers.forEach(container => {
      const hasVisibleCards = currentSite.getContainerCards(container).some(isCardVisible);
      container.classList.toggle('hc-building-filtered-out', !hasVisibleCards);
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

    const badge = currentSite.getPanel(card)?.querySelector('.hc-status-badge');
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
        <strong>${APP_TITLE}</strong>
        <div class="hc-filter-group">
          ${renderFilterCheckboxes()}
        </div>
        <div class="hc-sync-summary">
          <span class="hc-sync-item">
            <span class="hc-sync-label">最終更新日時</span>
            <strong class="hc-sync-value" data-hc-last-updated>未更新</strong>
          </span>
          <span class="hc-sync-item">
            <span class="hc-sync-label">保存状態</span>
            <strong class="hc-sync-value" data-hc-sync-state>確認中</strong>
          </span>
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
        void persistFilterValues().catch(error => {
          console.error('Failed to persist filter values', error);
        });
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

    updateToolbarSyncStatus();
  }

  function filterCards() {
    const buildingContainers = new Set();

    document.querySelectorAll(currentSite.itemSelector).forEach(card => {
      const state = getResolvedState(card, getCardStorageIds(card).lookupIds).state;
      const isVisible = activeFilterValues.has(state.color);

      getDecoratedElements(card).forEach(element => {
        element.classList.toggle('hc-filtered-out', !isVisible);
      });

      const buildingContainer = getBuildingContainer(card);
      if (buildingContainer) {
        buildingContainers.add(buildingContainer);
      }
    });

    syncBuildingVisibility(buildingContainers);
  }

  function syncPanel(card, state) {
    const panel = currentSite.getPanel(card);
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
    document.querySelectorAll(currentSite.itemSelector).forEach(refreshCard);
    filterCards();
    updateToolbarSyncStatus();
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
      updateToolbarSyncStatus();
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
      updateToolbarSyncStatus();
    });

    commentArea.addEventListener('blur', async () => {
      await flushScheduledPersist(ids);
    });

    return panel;
  }

  function mountHomesCondition1Panel(card, panel) {
    const memberRow = getHomesCondition1Rows(card)
      .find(row => row.matches('.memberDataRow, .prg-memberDataRow'));

    const mountPoint = memberRow?.querySelector('td')
      || card.querySelector('td.layout')
      || card.lastElementChild
      || card;

    mountPoint.appendChild(panel);
  }

  function mountHomesDefaultPanel(card, panel) {
    const mountPoint = (
      card.querySelector('.moduleInner')
      || card.querySelector('.moduleBody')
      || card
    );

    mountPoint.appendChild(panel);
  }

  function getSuumoPanelColSpan(card) {
    return card.closest('table')?.querySelector('thead tr')?.children.length
      || card.querySelector('tr')?.children.length
      || 1;
  }

  function mountSuumoPanel(card, panel) {
    const row = document.createElement('tr');
    row.className = 'hc-panel-host';

    const cell = document.createElement('td');
    cell.className = 'hc-panel-cell';
    cell.colSpan = getSuumoPanelColSpan(card);
    cell.appendChild(panel);

    row.appendChild(cell);
    card.appendChild(row);
  }

  function getSuumoBuildingContainer(card) {
    return card.closest('li');
  }

  function getSuumoContainerCards(container) {
    return [...container.querySelectorAll('table.cassetteitem_other > tbody')];
  }

  function enhanceCard(card) {
    if (card.dataset.hcEnhanced === '1') return;
    card.dataset.hcEnhanced = '1';

    const { writeIds, lookupIds } = setCardStorageIds(card);
    const state = getResolvedState(card, lookupIds).state;
    const panel = createPanel(card, writeIds, state);

    currentSite.mountPanel(card, panel);
    refreshCard(card);
  }

  function handleStorageChange(changes, areaName) {
    if (areaName === 'local' && changes[LOCAL_FILTER_STORAGE_KEY]) {
      activeFilterValues = normalizeStoredFilterValues(changes[LOCAL_FILTER_STORAGE_KEY].newValue);

      document.querySelectorAll('.hc-filter-checkbox').forEach(checkbox => {
        checkbox.checked = activeFilterValues.has(checkbox.value);
      });

      filterCards();
      return;
    }

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
    document.querySelectorAll(currentSite.itemSelector).forEach(enhanceCard);
    filterCards();
    updateToolbarSyncStatus();
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

    void loadNextPages().catch(error => {
      console.error('Failed to load next pages', error);
    });
  }

  init();
})();
