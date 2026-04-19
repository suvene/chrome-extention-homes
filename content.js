(() => {
  const LEGACY_STORAGE_KEY = 'homes_condition_notes_v1';
  const LEGACY_SYNC_KEY_PREFIX = 'homes_condition_note_v2:';
  const STATE_STORAGE_KEY = 'homes_state_v1';
  const LISTING_REGISTRY_STORAGE_KEY = 'homes_listing_registry_v1';
  const LINK_GROUP_STORAGE_KEY = 'homes_link_group_v1';
  const LOCAL_FILTER_STORAGE_KEY_PREFIX = 'homes_header_filter_v1';
  const LOCAL_MIGRATION_FLAG_KEY = 'homes_local_migration_v1';
  const COMMENT_SAVE_DEBOUNCE_MS = 700;
  const REGISTRY_PERSIST_DEBOUNCE_MS = 400;
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
      label: 'HOME\'S',
      itemSelector: 'tr.prg-roomInfo[data-kykey]',
      matches: location =>
        location.hostname === 'www.homes.co.jp'
        && location.pathname.startsWith('/search/condition1/'),
      getListingId: getHomesCanonicalListingId,
      getLegacyLookupIds: getHomesLookupStorageIds,
      getTitle: getHomesTitle,
      getName: getHomesName,
      getAddress: getHomesAddress,
      getRent: getHomesRent,
      getDetailUrl: getHomesDetailUrl,
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
      label: 'HOME\'S',
      itemSelector: 'div.mod-newArrivalBuilding',
      matches: location =>
        location.hostname === 'www.homes.co.jp'
        && location.pathname.startsWith('/search/condition-list/'),
      getListingId: getHomesCanonicalListingId,
      getLegacyLookupIds: getHomesLookupStorageIds,
      getTitle: getHomesTitle,
      getName: getHomesName,
      getAddress: getHomesAddress,
      getRent: getHomesRent,
      getDetailUrl: getHomesDetailUrl,
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
      label: 'SUUMO',
      itemSelector: 'table.cassetteitem_other > tbody',
      matches: location =>
        location.hostname === 'suumo.jp'
        && location.pathname.startsWith('/jj/chintai/ichiran/FR301FC001/'),
      getListingId: getSuumoCanonicalListingId,
      getLegacyLookupIds: getSuumoLookupStorageIds,
      getTitle: getSuumoTitle,
      getName: getSuumoName,
      getAddress: getSuumoAddress,
      getRent: getSuumoRent,
      getDetailUrl: getSuumoDetailUrl,
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
  let stateCache = {};
  let listingRegistry = {};
  let linkGroupCache = {};
  let activeFilterValues = new Set(DEFAULT_FILTER_VALUES);
  const commentSaveTimers = new Map();
  let isNextPageLoading = false;
  let registryPersistTimerId = 0;

  if (!currentSite) {
    return;
  }

  async function loadAll() {
    const localFilterStorageKey = getLocalFilterStorageKey();
    await migrateLegacyStateIfNeeded();

    const stored = await chrome.storage.local.get([
      STATE_STORAGE_KEY,
      LISTING_REGISTRY_STORAGE_KEY,
      LINK_GROUP_STORAGE_KEY,
      localFilterStorageKey
    ]);

    stateCache = normalizeStateMap(stored[STATE_STORAGE_KEY]);
    listingRegistry = normalizeListingRegistry(stored[LISTING_REGISTRY_STORAGE_KEY]);
    linkGroupCache = normalizeLinkGroupMap(stored[LINK_GROUP_STORAGE_KEY]);
    activeFilterValues = normalizeStoredFilterValues(stored[localFilterStorageKey]);
  }

  function detectCurrentSite() {
    return SITE_CONFIGS.find(site => site.matches(window.location)) || null;
  }

  function getLocalFilterStorageKey(siteId = currentSite?.id || '') {
    return `${LOCAL_FILTER_STORAGE_KEY_PREFIX}:${siteId || 'default'}`;
  }

  function pushUnique(values, value) {
    if (typeof value !== 'string') return;

    const normalized = value.trim();
    if (!normalized || values.includes(normalized)) return;
    values.push(normalized);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll('\'', '&#39;');
  }

  function normalizeSpaces(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function normalizeText(value) {
    if (typeof value !== 'string') return '';
    return normalizeSpaces(value.normalize('NFKC'));
  }

  function normalizePropertyName(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeAddressText(value) {
    const normalized = normalizeText(value)
      .replace(/\s+/g, '')
      .replace(/[‐‑‒–—―ー－ｰ]/g, '-')
      .replace(/丁目/g, '-')
      .replace(/番地/g, '-')
      .replace(/番/g, '-')
      .replace(/号/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return normalized.toLowerCase();
  }

  function normalizeRentText(value) {
    const normalized = normalizeText(value).replace(/,/g, '');
    const match = normalized.match(/(\d+(?:\.\d+)?)/);
    return match?.[1] || '';
  }

  function normalizeDetailUrl(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return '';
    }

    try {
      const url = new URL(value, window.location.href);
      url.hash = '';
      url.searchParams.sort();
      return url.toString();
    } catch (error) {
      console.warn('Failed to normalize detail URL', error);
      return '';
    }
  }

  function buildListingFingerprint(name, address, rent) {
    const normalizedName = normalizePropertyName(name);
    const normalizedAddress = normalizeAddressText(address);
    const normalizedRent = normalizeRentText(rent);

    if (!normalizedName || !normalizedAddress || !normalizedRent) {
      return '';
    }

    return `${normalizedName}|${normalizedAddress}|${normalizedRent}`;
  }

  function getSiteLabel(siteId) {
    return SITE_CONFIGS.find(site => site.id === siteId)?.label || siteId || '不明';
  }

  function findDefinitionValue(root, labelText) {
    if (!root) return '';

    const rows = root.querySelectorAll('tr');
    for (const row of rows) {
      const heading = row.querySelector('th');
      const value = row.querySelector('td');
      if (!heading || !value) continue;
      if (normalizeText(heading.textContent) !== labelText) continue;
      return normalizeSpaces(value.textContent || '');
    }

    return '';
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

    for (const link of card.querySelectorAll('a[href*="/chintai/room/"]')) {
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

  function getHomesCanonicalListingId(card) {
    const roomId = getHomesRoomId(card);
    if (roomId) return `room:${roomId}`;

    const tykey = getHomesTyKey(card);
    if (tykey) return `tykey:${tykey}`;

    return getHomesLegacyStorageIds(card)[0] || '';
  }

  function getHomesLookupStorageIds(card) {
    const ids = [];
    pushUnique(ids, getHomesCanonicalListingId(card));
    getHomesLegacyStorageIds(card).forEach(id => pushUnique(ids, id));
    return ids;
  }

  function getHomesName(card) {
    const root =
      card.closest('.moduleInner.prg-building')
      || card.closest('.mod-newArrivalBuilding')
      || card;

    return normalizeSpaces(root?.querySelector('.bukkenName')?.textContent || '');
  }

  function getHomesTitle(card) {
    const title = getHomesName(card);
    if (title) return title;

    const floor = normalizeSpaces(card?.querySelector('.roomKaisuu, .floar')?.textContent || '');
    const layout = normalizeSpaces(card?.querySelector('.layout')?.textContent || '');
    const roomLabel = [floor, layout].filter(Boolean).join(' ');

    return roomLabel || '物件名不明';
  }

  function getHomesAddress(card) {
    const root =
      card.closest('.moduleInner.prg-building')
      || card.closest('.mod-newArrivalBuilding')
      || card;

    return findDefinitionValue(root, '所在地');
  }

  function getHomesRent(card) {
    const priceLabel = normalizeSpaces(card.querySelector('.priceLabel')?.textContent || '');
    if (priceLabel) return priceLabel;

    const priceCell = normalizeSpaces(card.querySelector('.price')?.textContent || '');
    const match = priceCell.match(/(\d+(?:\.\d+)?)\s*万円/);
    if (match) return `${match[1]}万円`;

    return '';
  }

  function getHomesDetailUrl(card) {
    const link = card.querySelector('a.prg-detailAnchor[href], td.detail a[href], .moduleHead a[href]');
    const href = link?.getAttribute('href') || card.dataset?.href || card.querySelector('tr[data-href]')?.dataset?.href || '';
    if (!href) return '';

    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      console.warn('Failed to resolve HOME\'S detail URL', error);
      return '';
    }
  }

  function getSuumoClipKey(card) {
    return card.querySelector('.js-clipkey')?.value?.trim() || '';
  }

  function getSuumoDetailLink(card) {
    return card.querySelector('.js-cassette_link_href[href]') || null;
  }

  function getSuumoCanonicalListingId(card) {
    const clipKey = getSuumoClipKey(card);
    if (clipKey) return `suumo-room:${clipKey}`;

    const bc = parseSuumoBcFromHref(getSuumoDetailLink(card)?.getAttribute('href'));
    return bc ? `suumo-room:${bc}` : '';
  }

  function getSuumoLookupStorageIds(card) {
    const ids = [];
    const canonicalId = getSuumoCanonicalListingId(card);
    const detailLink = getSuumoDetailLink(card);
    const bc = parseSuumoBcFromHref(detailLink?.getAttribute('href'));
    const detailHref = detailLink?.href || '';

    pushUnique(ids, canonicalId);
    pushUnique(ids, bc ? `suumo-bc:${bc}` : '');
    pushUnique(ids, detailHref ? `suumo-href:${detailHref}` : '');

    return ids;
  }

  function getSuumoName(card) {
    return normalizeSpaces(card?.closest('li')?.querySelector('.cassetteitem_content-title')?.textContent || '');
  }

  function getSuumoTitle(card) {
    const title = getSuumoName(card);
    if (title) return title;

    const floor = normalizeSpaces(card.querySelector('tr.js-cassette_link td:nth-child(3)')?.textContent || '');
    const layout = normalizeSpaces(card.querySelector('.cassetteitem_madori')?.textContent || '');

    return [title, floor, layout].filter(Boolean).join(' ') || '物件名不明';
  }

  function getSuumoAddress(card) {
    return normalizeSpaces(card.closest('li')?.querySelector('.cassetteitem_detail-col1')?.textContent || '');
  }

  function getSuumoRent(card) {
    return normalizeSpaces(card.querySelector('.cassetteitem_price--rent')?.textContent || '');
  }

  function getSuumoDetailUrl(card) {
    const href = getSuumoDetailLink(card)?.getAttribute('href') || '';
    if (!href) return '';

    try {
      return new URL(href, window.location.href).href;
    } catch (error) {
      console.warn('Failed to resolve SUUMO detail URL', error);
      return '';
    }
  }

  function buildCardIdentity(card) {
    const listingId = currentSite.getListingId(card);
    const lookupIds = unique([listingId, ...currentSite.getLegacyLookupIds(card)]);
    const name = currentSite.getName(card);
    const address = currentSite.getAddress(card);
    const rent = currentSite.getRent(card);

    return {
      listingId,
      lookupIds,
      title: currentSite.getTitle(card),
      record: {
        site: currentSite.id,
        name,
        address,
        rent,
        detailUrl: currentSite.getDetailUrl(card),
        fingerprint: buildListingFingerprint(name, address, rent),
        lastSeenAt: Date.now()
      }
    };
  }

  function setCardIdentity(card) {
    const identity = buildCardIdentity(card);
    card.dataset.hcListingId = identity.listingId || '';
    card.dataset.hcLookupIds = JSON.stringify(identity.lookupIds);
    return identity;
  }

  function getCardIdentity(card) {
    const listingId = card.dataset.hcListingId;
    const serializedLookupIds = card.dataset.hcLookupIds;

    if (listingId && serializedLookupIds) {
      try {
        const lookupIds = JSON.parse(serializedLookupIds);
        if (Array.isArray(lookupIds) && lookupIds.length > 0) {
          const record = buildCardIdentity(card).record;
          return {
            listingId,
            lookupIds,
            title: currentSite.getTitle(card),
            record
          };
        }
      } catch (error) {
        console.warn('Failed to parse cached card identity', error);
      }
    }

    return setCardIdentity(card);
  }

  function normalizeStatusValue(rawColor) {
    if (typeof rawColor !== 'string') return '0';
    if (STATUS_VALUES.has(rawColor)) return rawColor;
    return LEGACY_STATUS_MAP[rawColor] || '0';
  }

  function normalizeState(rawState, defaultTitle = '物件名不明') {
    const updatedAt = Number(rawState?.updatedAt);

    return {
      color: normalizeStatusValue(rawState?.color),
      comment: typeof rawState?.comment === 'string' ? rawState.comment : '',
      title: typeof rawState?.title === 'string' && rawState.title.trim()
        ? rawState.title
        : defaultTitle,
      updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0
    };
  }

  function normalizeStateMap(rawStates) {
    if (!rawStates || typeof rawStates !== 'object' || Array.isArray(rawStates)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(rawStates)
        .filter(([id]) => typeof id === 'string' && id.trim())
        .map(([id, rawState]) => [id, normalizeState(rawState)])
        .filter(([, state]) => !isDefaultState(state))
    );
  }

  function normalizeListingRecord(record) {
    const normalized = {
      site: typeof record?.site === 'string' ? record.site : '',
      name: typeof record?.name === 'string' ? record.name.trim() : '',
      address: typeof record?.address === 'string' ? record.address.trim() : '',
      rent: typeof record?.rent === 'string' ? record.rent.trim() : '',
      detailUrl: normalizeDetailUrl(record?.detailUrl),
      fingerprint: typeof record?.fingerprint === 'string' ? record.fingerprint.trim() : '',
      lastSeenAt: Number.isFinite(Number(record?.lastSeenAt)) ? Number(record.lastSeenAt) : 0
    };

    if (!normalized.fingerprint) {
      normalized.fingerprint = buildListingFingerprint(normalized.name, normalized.address, normalized.rent);
    }

    return normalized;
  }

  function normalizeListingRegistry(rawRegistry) {
    if (!rawRegistry || typeof rawRegistry !== 'object' || Array.isArray(rawRegistry)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(rawRegistry)
        .filter(([listingId]) => typeof listingId === 'string' && listingId.trim())
        .map(([listingId, record]) => [listingId, normalizeListingRecord(record)])
    );
  }

  function normalizeLinkGroupMap(rawGroups) {
    if (!rawGroups || typeof rawGroups !== 'object' || Array.isArray(rawGroups)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(rawGroups)
        .filter(([listingId, groupId]) => typeof listingId === 'string' && listingId.trim() && typeof groupId === 'string' && groupId.trim())
        .map(([listingId, groupId]) => [listingId, groupId.trim()])
    );
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

  function pickNewerListingRecord(current, incoming) {
    if (!current) return incoming;
    return incoming.lastSeenAt >= current.lastSeenAt ? incoming : current;
  }

  function buildStoredStateMap(states = stateCache) {
    return Object.fromEntries(
      Object.entries(states)
        .map(([listingId, rawState]) => [listingId, normalizeState(rawState)])
        .filter(([, state]) => !isDefaultState(state))
    );
  }

  function buildStoredLinkGroupMap(groups = linkGroupCache) {
    return normalizeLinkGroupMap(groups);
  }

  function buildStoredListingRegistry(registry = listingRegistry) {
    return normalizeListingRegistry(registry);
  }

  function extractLegacySyncStates(storageItems) {
    const states = {};

    Object.entries(storageItems).forEach(([key, value]) => {
      if (!key.startsWith(LEGACY_SYNC_KEY_PREFIX)) return;
      states[key.slice(LEGACY_SYNC_KEY_PREFIX.length)] = normalizeState(value);
    });

    return states;
  }

  async function migrateLegacyStateIfNeeded() {
    const stored = await chrome.storage.local.get([
      LOCAL_MIGRATION_FLAG_KEY,
      STATE_STORAGE_KEY,
      LEGACY_STORAGE_KEY
    ]);

    if (stored[LOCAL_MIGRATION_FLAG_KEY]) {
      return;
    }

    let mergedStates = normalizeStateMap(stored[STATE_STORAGE_KEY]);
    let hasChanges = Object.keys(mergedStates).length > 0;

    try {
      const syncItems = await chrome.storage.sync.get(null);
      Object.entries(extractLegacySyncStates(syncItems)).forEach(([listingId, state]) => {
        const merged = pickNewerState(mergedStates[listingId], state);
        if (!statesEqual(mergedStates[listingId], merged)) {
          mergedStates[listingId] = merged;
          hasChanges = true;
        }
      });
    } catch (error) {
      console.warn('Failed to read legacy sync states', error);
    }

    const legacyStates = normalizeStateMap(stored[LEGACY_STORAGE_KEY]);
    Object.entries(legacyStates).forEach(([listingId, state]) => {
      const merged = pickNewerState(mergedStates[listingId], state);
      if (!statesEqual(mergedStates[listingId], merged)) {
        mergedStates[listingId] = merged;
        hasChanges = true;
      }
    });

    const payload = {
      [LOCAL_MIGRATION_FLAG_KEY]: true
    };

    if (hasChanges) {
      payload[STATE_STORAGE_KEY] = buildStoredStateMap(mergedStates);
    }

    await chrome.storage.local.set(payload);

    if (stored[LEGACY_STORAGE_KEY]) {
      await chrome.storage.local.remove(LEGACY_STORAGE_KEY);
    }
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

  async function persistFilterValues() {
    const localFilterStorageKey = getLocalFilterStorageKey();
    await chrome.storage.local.set({
      [localFilterStorageKey]: [...activeFilterValues]
    });
  }

  async function persistStateCache() {
    await chrome.storage.local.set({
      [STATE_STORAGE_KEY]: buildStoredStateMap()
    });
  }

  async function persistLinkGroupCache() {
    await chrome.storage.local.set({
      [LINK_GROUP_STORAGE_KEY]: buildStoredLinkGroupMap()
    });
  }

  function scheduleRegistryPersist() {
    window.clearTimeout(registryPersistTimerId);
    registryPersistTimerId = window.setTimeout(() => {
      void chrome.storage.local.set({
        [LISTING_REGISTRY_STORAGE_KEY]: buildStoredListingRegistry()
      }).catch(error => {
        console.error('Failed to persist listing registry', error);
      });
    }, REGISTRY_PERSIST_DEBOUNCE_MS);
  }

  function upsertListingRecord(listingId, record) {
    if (!listingId) return;

    const normalized = normalizeListingRecord(record);
    const merged = pickNewerListingRecord(listingRegistry[listingId], normalized);
    const current = listingRegistry[listingId];

    if (
      current
      && current.site === merged.site
      && current.name === merged.name
      && current.address === merged.address
      && current.rent === merged.rent
      && current.detailUrl === merged.detailUrl
      && current.fingerprint === merged.fingerprint
      && current.lastSeenAt === merged.lastSeenAt
    ) {
      return;
    }

    listingRegistry[listingId] = merged;
    scheduleRegistryPersist();
  }

  function getDefaultState(card) {
    return normalizeState({}, currentSite.getTitle(card));
  }

  function getAutoGroupId(fingerprint) {
    return fingerprint ? `auto:${fingerprint}` : '';
  }

  function getSoloGroupId(listingId) {
    return listingId ? `solo:${listingId}` : '';
  }

  function getEffectiveGroupId(listingId) {
    if (!listingId) return '';

    const manualGroupId = linkGroupCache[listingId];
    if (manualGroupId) return manualGroupId;

    const fingerprint = listingRegistry[listingId]?.fingerprint || '';
    return getAutoGroupId(fingerprint) || getSoloGroupId(listingId);
  }

  function getGroupMembersByGroupId(groupId) {
    if (!groupId) return [];

    if (groupId.startsWith('solo:')) {
      const listingId = groupId.slice('solo:'.length);
      return listingId ? [listingId] : [];
    }

    return Object.keys(listingRegistry)
      .filter(listingId => getEffectiveGroupId(listingId) === groupId);
  }

  function getLinkedListingIds(listingId) {
    return unique(getGroupMembersByGroupId(getEffectiveGroupId(listingId)));
  }

  function getDuplicateLinkedListingIdsOnPage() {
    const seenManualGroups = new Set();
    const duplicateListingIds = new Set();

    document.querySelectorAll(currentSite.itemSelector).forEach(card => {
      const listingId = getCardIdentity(card).listingId;
      const manualGroupId = linkGroupCache[listingId];
      if (!manualGroupId) return;

      if (seenManualGroups.has(manualGroupId)) {
        duplicateListingIds.add(listingId);
        return;
      }

      seenManualGroups.add(manualGroupId);
    });

    return duplicateListingIds;
  }

  function getCandidateListingIds(listingId) {
    const currentRecord = listingRegistry[listingId];
    const linkedIds = new Set(getLinkedListingIds(listingId));
    const candidateIds = [];

    if (currentRecord?.fingerprint) {
      Object.entries(listingRegistry).forEach(([candidateId, record]) => {
        if (candidateId === listingId) return;
        if (!record.fingerprint || record.fingerprint !== currentRecord.fingerprint) return;
        if (linkedIds.has(candidateId)) return;
        candidateIds.push(candidateId);
      });
    }

    return unique(candidateIds);
  }

  function findListingIdByDetailUrl(detailUrl, currentListingId = '') {
    const normalizedUrl = normalizeDetailUrl(detailUrl);
    if (!normalizedUrl) return '';

    return Object.entries(listingRegistry).find(([listingId, record]) => {
      if (listingId === currentListingId) return false;
      return normalizeDetailUrl(record?.detailUrl) === normalizedUrl;
    })?.[0] || '';
  }

  function getDetailUrlSuggestions(listingId, rawQuery) {
    const query = normalizeText(rawQuery).toLowerCase();
    if (!query) return [];

    const linkedIds = new Set(getLinkedListingIds(listingId));

    return Object.entries(listingRegistry)
      .filter(([candidateId, record]) => {
        if (candidateId === listingId) return false;
        if (linkedIds.has(candidateId)) return false;
        if (!record?.detailUrl) return false;

        const haystacks = [
          record.detailUrl,
          record.name,
          record.address,
          record.rent
        ]
          .map(value => normalizeText(value).toLowerCase())
          .filter(Boolean);

        return haystacks.some(value => value.includes(query));
      })
      .map(([candidateId, record]) => {
        const normalizedUrl = normalizeText(record.detailUrl).toLowerCase();
        const normalizedName = normalizeText(record.name).toLowerCase();
        const normalizedAddress = normalizeText(record.address).toLowerCase();
        let score = 0;

        if (normalizedUrl.startsWith(query)) score += 6;
        else if (normalizedUrl.includes(query)) score += 4;

        if (normalizedName.includes(query)) score += 3;
        if (normalizedAddress.includes(query)) score += 2;

        return {
          listingId: candidateId,
          record,
          score
        };
      })
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return (right.record?.lastSeenAt || 0) - (left.record?.lastSeenAt || 0);
      })
      .slice(0, 6);
  }

  function getBestResolvedState(ids, defaultTitle) {
    let resolvedId = '';
    let resolvedState = normalizeState({}, defaultTitle);

    ids.forEach(id => {
      const candidate = stateCache[id];
      if (!candidate) return;

      const normalized = normalizeState(candidate, defaultTitle);
      if (!resolvedId || normalized.updatedAt >= resolvedState.updatedAt) {
        resolvedId = id;
        resolvedState = normalized;
      }
    });

    return {
      id: resolvedId,
      state: resolvedState
    };
  }

  function getResolvedState(card) {
    const identity = getCardIdentity(card);
    const linkedIds = getLinkedListingIds(identity.listingId);
    const candidateIds = unique([...linkedIds, ...identity.lookupIds]);

    return getBestResolvedState(candidateIds, identity.title);
  }

  async function writeStateForListingIds(listingIds, rawState, defaultTitle = '物件名不明') {
    const normalizedIds = unique(listingIds);
    if (normalizedIds.length === 0) return;

    const state = normalizeState(rawState, defaultTitle);

    if (isDefaultState(state)) {
      normalizedIds.forEach(id => {
        delete stateCache[id];
      });
    } else {
      normalizedIds.forEach(id => {
        stateCache[id] = state;
      });
    }

    await persistStateCache();
  }

  async function persistStateForListingId(listingId, defaultTitle) {
    if (!listingId) return;

    const state = normalizeState(stateCache[listingId], defaultTitle);
    const linkedIds = getLinkedListingIds(listingId);
    const targetIds = linkedIds.length > 0 ? linkedIds : [listingId];

    await writeStateForListingIds(targetIds, state, defaultTitle);
  }

  function schedulePersist(listingId) {
    if (!listingId) return;

    clearScheduledPersist(listingId);

    const timerId = window.setTimeout(async () => {
      const pending = commentSaveTimers.get(listingId);
      commentSaveTimers.delete(listingId);
      await persistStateForListingId(listingId, pending?.defaultTitle || '物件名不明');
    }, COMMENT_SAVE_DEBOUNCE_MS);

    commentSaveTimers.set(listingId, {
      timerId,
      defaultTitle: listingRegistry[listingId]?.name || '物件名不明'
    });
  }

  function clearScheduledPersist(listingId) {
    const pending = commentSaveTimers.get(listingId);
    if (!pending) return;

    window.clearTimeout(pending.timerId);
    commentSaveTimers.delete(listingId);
  }

  async function flushScheduledPersist(listingId, defaultTitle = '物件名不明') {
    if (!listingId) return;

    clearScheduledPersist(listingId);
    await persistStateForListingId(listingId, defaultTitle);
  }

  async function flushAllScheduledPersists() {
    const listingIds = [...commentSaveTimers.keys()];
    for (const listingId of listingIds) {
      await flushScheduledPersist(listingId, listingRegistry[listingId]?.name || '物件名不明');
    }
  }

  function getExportableStates() {
    return buildStoredStateMap();
  }

  function getExportableListings() {
    return buildStoredListingRegistry();
  }

  function getExportableLinkGroups() {
    return buildStoredLinkGroupMap();
  }

  function buildExportPayload() {
    return {
      schemaVersion: 2,
      exportedAt: Date.now(),
      states: getExportableStates(),
      listings: getExportableListings(),
      linkGroups: getExportableLinkGroups()
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
    if (
      parsedJson
      && typeof parsedJson === 'object'
      && !Array.isArray(parsedJson)
      && parsedJson.schemaVersion === 2
    ) {
      return {
        schemaVersion: 2,
        states: normalizeStateMap(parsedJson.states),
        listings: normalizeListingRegistry(parsedJson.listings),
        linkGroups: normalizeLinkGroupMap(parsedJson.linkGroups)
      };
    }

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

    return {
      schemaVersion: 1,
      states: normalizeStateMap(rawStates),
      listings: {},
      linkGroups: {}
    };
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
    const imported = parseImportPayload(JSON.parse(text));
    const nextStates = { ...stateCache };
    const nextListings = { ...listingRegistry };
    const nextLinkGroups = { ...linkGroupCache };
    let changedStateCount = 0;
    let changedListingCount = 0;
    let changedLinkCount = 0;

    Object.entries(imported.states).forEach(([listingId, state]) => {
      const merged = pickNewerState(nextStates[listingId], state);
      if (!statesEqual(nextStates[listingId], merged)) {
        nextStates[listingId] = merged;
        changedStateCount += 1;
      }
    });

    Object.entries(imported.listings).forEach(([listingId, record]) => {
      const merged = pickNewerListingRecord(nextListings[listingId], record);
      const current = nextListings[listingId];

      if (
        !current
        || current.site !== merged.site
        || current.name !== merged.name
        || current.address !== merged.address
        || current.rent !== merged.rent
        || current.detailUrl !== merged.detailUrl
        || current.fingerprint !== merged.fingerprint
        || current.lastSeenAt !== merged.lastSeenAt
      ) {
        nextListings[listingId] = merged;
        changedListingCount += 1;
      }
    });

    Object.entries(imported.linkGroups).forEach(([listingId, groupId]) => {
      if (nextLinkGroups[listingId] !== groupId) {
        nextLinkGroups[listingId] = groupId;
        changedLinkCount += 1;
      }
    });

    if (changedStateCount === 0 && changedListingCount === 0 && changedLinkCount === 0) {
      window.alert('取り込める新しい状態や紐づきはありませんでした。');
      return;
    }

    stateCache = nextStates;
    listingRegistry = nextListings;
    linkGroupCache = nextLinkGroups;

    await chrome.storage.local.set({
      [STATE_STORAGE_KEY]: buildStoredStateMap(stateCache),
      [LISTING_REGISTRY_STORAGE_KEY]: buildStoredListingRegistry(listingRegistry),
      [LINK_GROUP_STORAGE_KEY]: buildStoredLinkGroupMap(linkGroupCache)
    });

    refreshAllCards();
    window.alert(
      `${changedStateCount} 件の状態、${changedListingCount} 件の掲載台帳、${changedLinkCount} 件の紐づきをJSONから取り込みました。`
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
            ${activeFilterValues.has(option.value) ? 'checked' : ''}
          >
          ${option.label}
        </label>
      `)
      .join('');
  }

  function getLastUpdatedAt() {
    return Object.values(stateCache).reduce((latest, rawState) => {
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

  function updateToolbarSummary() {
    const toolbar = document.querySelector('.hc-toolbar');
    if (!toolbar) return;

    const updatedAtValue = toolbar.querySelector('[data-hc-last-updated]');
    if (!updatedAtValue) return;

    const nextUpdatedAt = formatUpdatedAt(getLastUpdatedAt());

    if (updatedAtValue.textContent !== nextUpdatedAt) {
      updatedAtValue.textContent = nextUpdatedAt;
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
    const statusColorClasses = [
      'hc-status-badge-red',
      'hc-status-badge-orange',
      'hc-status-badge-green',
      'hc-status-badge-blue',
      'hc-status-badge-gray'
    ];

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
      badge.classList.remove(...statusColorClasses);
      if (option.colorClass) {
        badge.classList.add(`hc-status-badge-${option.colorClass}`);
      }
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

    updateToolbarSummary();
  }

  function filterCards() {
    const buildingContainers = new Set();
    const duplicateListingIds = getDuplicateLinkedListingIdsOnPage();

    document.querySelectorAll(currentSite.itemSelector).forEach(card => {
      const listingId = getCardIdentity(card).listingId;
      const state = getResolvedState(card).state;
      const isVisible = activeFilterValues.has(state.color) && !duplicateListingIds.has(listingId);

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

  function buildLinkListRows(card) {
    const identity = getCardIdentity(card);
    const linkedIds = getLinkedListingIds(identity.listingId);
    const linkedListingIds = linkedIds.filter(listingId => listingId !== identity.listingId);
    const candidateIds = getCandidateListingIds(identity.listingId);
    const rows = [];

    linkedListingIds.forEach(listingId => {
      rows.push({
        listingId,
        record: listingRegistry[listingId],
        status: '紐づき中',
        actionLabel: '解除',
        actionValue: 'unlink'
      });
    });

    candidateIds.forEach(listingId => {
      rows.push({
        listingId,
        record: listingRegistry[listingId],
        status: '候補',
        actionLabel: 'リンク',
        actionValue: 'link'
      });
    });

    return {
      linkedCount: linkedListingIds.length,
      rows
    };
  }

  function renderLinkListMarkup(card) {
    const { rows } = buildLinkListRows(card);

    if (rows.length === 0) {
      return '<p class="hc-link-empty">候補はまだありません。</p>';
    }

    return rows.map(row => {
      const record = row.record || {};
      const siteLabel = getSiteLabel(record.site);
      const name = record.name || '物件名不明';
      const address = record.address || '住所不明';
      const rent = record.rent || '家賃不明';
      const detailUrl = record.detailUrl || '';
      const nameMarkup = detailUrl
        ? `<a href="${escapeHtml(detailUrl)}" target="_blank" rel="noopener" class="hc-link-name">${escapeHtml(name)}</a>`
        : `<span class="hc-link-name is-static">${escapeHtml(name)}</span>`;

      return `
        <div class="hc-link-item ${row.actionValue === 'unlink' ? 'is-linked' : 'is-candidate'}">
          <span class="hc-link-meta">
            <span class="hc-link-badges">
              <span class="hc-link-status">${escapeHtml(row.status)}</span>
              <span class="hc-link-site">${escapeHtml(siteLabel)}</span>
            </span>
            <span class="hc-link-summary">
              ${nameMarkup}
              <span class="hc-link-rent">${escapeHtml(rent)}</span>
              <span class="hc-link-address">${escapeHtml(address)}</span>
            </span>
          </span>
          <button
            type="button"
            class="hc-link-row-button"
            data-hc-link-action="${escapeHtml(row.actionValue)}"
            data-hc-link-id="${escapeHtml(row.listingId)}"
          >
            ${escapeHtml(row.actionLabel)}
          </button>
        </div>
      `;
    }).join('');
  }

  function renderDetailUrlSuggestionsMarkup(card, rawQuery) {
    const suggestions = getDetailUrlSuggestions(getCardIdentity(card).listingId, rawQuery);

    if (!rawQuery.trim()) {
      return '';
    }

    if (suggestions.length === 0) {
      return '<p class="hc-link-suggestion-empty">一致する候補はありません。</p>';
    }

    return suggestions.map(suggestion => {
      const record = suggestion.record || {};
      const siteLabel = getSiteLabel(record.site);
      const name = record.name || '物件名不明';
      const address = record.address || '住所不明';
      const rent = record.rent || '家賃不明';
      const detailUrl = record.detailUrl || '';

      return `
        <button
          type="button"
          class="hc-link-suggestion-item"
          data-hc-suggest-url="${escapeHtml(detailUrl)}"
        >
          <span class="hc-link-suggestion-top">
            <span class="hc-link-suggestion-name">${escapeHtml(name)}</span>
            <span class="hc-link-site">${escapeHtml(siteLabel)}</span>
          </span>
          <span class="hc-link-suggestion-meta">
            <span class="hc-link-rent">${escapeHtml(rent)}</span>
            <span class="hc-link-address">${escapeHtml(address)}</span>
          </span>
          <span class="hc-link-suggestion-url">${escapeHtml(detailUrl)}</span>
        </button>
      `;
    }).join('');
  }

  function syncDetailUrlSuggestions(card) {
    const panel = currentSite.getPanel(card);
    if (!panel) return;

    const detailUrlInput = panel.querySelector('.hc-link-url-input');
    const suggestionList = panel.querySelector('[data-hc-link-suggestions]');
    if (!detailUrlInput || !suggestionList) return;

    suggestionList.innerHTML = renderDetailUrlSuggestionsMarkup(card, detailUrlInput.value || '');
    suggestionList.classList.toggle('is-empty', !detailUrlInput.value.trim());
  }

  function syncLinkPanel(card) {
    const identity = getCardIdentity(card);
    const panel = currentSite.getPanel(card);
    if (!panel) return;

    const linkCount = buildLinkListRows(card).linkedCount;
    const linkCountElement = panel.querySelector('[data-hc-link-count]');
    const linkListElement = panel.querySelector('[data-hc-link-list]');

    if (linkCountElement) {
      linkCountElement.textContent = `紐づき ${linkCount}件`;
    }

    if (linkListElement) {
      linkListElement.innerHTML = renderLinkListMarkup(card);
    }
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

    syncLinkPanel(card);
  }

  function refreshCard(card) {
    const identity = getCardIdentity(card);
    const resolved = getResolvedState(card);
    const state = normalizeState(resolved.state, identity.title);

    if (
      resolved.id
      && resolved.id !== identity.listingId
      && identity.lookupIds.includes(resolved.id)
      && !isDefaultState(state)
    ) {
      stateCache[identity.listingId] = state;
      void persistStateCache().catch(error => {
        console.error('Failed to backfill canonical local state key', error);
      });
    }

    syncPanel(card, state);
    applyState(card, state);
  }

  function refreshAllCards() {
    document.querySelectorAll(currentSite.itemSelector).forEach(refreshCard);
    filterCards();
    updateToolbarSummary();
  }

  function createManualGroupId() {
    return `manual:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
  }

  async function applySelectedLinkIds(card, selectedIdsInput) {
    const identity = getCardIdentity(card);
    const selectedIds = new Set(selectedIdsInput);
    const currentLinkedIds = getLinkedListingIds(identity.listingId);
    const currentLinkedOthers = currentLinkedIds.filter(listingId => listingId !== identity.listingId);
    const retainedCurrentIds = currentLinkedOthers.filter(listingId => selectedIds.has(listingId));
    const detachedCurrentIds = currentLinkedOthers.filter(listingId => !selectedIds.has(listingId));
    const candidateIds = [...selectedIds].filter(listingId => !currentLinkedOthers.includes(listingId));
    const nextCurrentGroupIds = new Set([identity.listingId, ...retainedCurrentIds]);

    candidateIds.forEach(listingId => {
      getLinkedListingIds(listingId).forEach(memberId => {
        nextCurrentGroupIds.add(memberId);
      });
      nextCurrentGroupIds.add(listingId);
    });

    const nextCurrentGroupList = [...nextCurrentGroupIds];
    const mergedState = getBestResolvedState(nextCurrentGroupList, identity.title).state;
    const nextLinkGroups = { ...linkGroupCache };

    nextCurrentGroupList.forEach(listingId => {
      delete nextLinkGroups[listingId];
    });
    detachedCurrentIds.forEach(listingId => {
      delete nextLinkGroups[listingId];
    });

    if (nextCurrentGroupList.length > 1 || detachedCurrentIds.length > 0) {
      const nextGroupId = createManualGroupId();
      nextCurrentGroupList.forEach(listingId => {
        nextLinkGroups[listingId] = nextGroupId;
      });
    }

    if (detachedCurrentIds.length > 0) {
      const detachedGroupId = createManualGroupId();
      detachedCurrentIds.forEach(listingId => {
        nextLinkGroups[listingId] = detachedGroupId;
      });
    }

    linkGroupCache = nextLinkGroups;
    await persistLinkGroupCache();
    await writeStateForListingIds(nextCurrentGroupList, mergedState, identity.title);
    refreshAllCards();
  }

  async function applyDetailUrlLink(card, detailUrlInput) {
    const identity = getCardIdentity(card);
    const targetListingId = findListingIdByDetailUrl(detailUrlInput.value, identity.listingId);

    if (!targetListingId) {
      window.alert('入力した詳細URLに一致する掲載がローカル台帳に見つかりませんでした。先にその掲載を一度読み込んでください。');
      return;
    }

    const selectedIds = new Set(getLinkedListingIds(identity.listingId).filter(listingId => listingId !== identity.listingId));
    selectedIds.add(targetListingId);
    detailUrlInput.value = '';
    await applySelectedLinkIds(card, selectedIds);
    syncDetailUrlSuggestions(card);
  }

  async function applyRowLinkAction(card, targetListingId, action) {
    const selectedIds = new Set(getLinkedListingIds(getCardIdentity(card).listingId).filter(listingId => listingId !== getCardIdentity(card).listingId));

    if (action === 'unlink') {
      selectedIds.delete(targetListingId);
    } else {
      selectedIds.add(targetListingId);
    }

    await applySelectedLinkIds(card, selectedIds);
  }

  function createPanel(card, listingId, state) {
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

      <div class="hc-panel-row hc-panel-row-links">
        <div class="hc-link-toolbar">
          <strong data-hc-link-count>紐づき 0件</strong>
        </div>
        <div class="hc-link-direct">
          <input
            type="url"
            class="hc-link-url-input"
            placeholder="詳細URLを貼り付けてリンク"
            inputmode="url"
          >
          <button type="button" class="hc-link-url-button">URLでリンク</button>
        </div>
        <div class="hc-link-suggestions is-empty" data-hc-link-suggestions></div>
      </div>

      <div class="hc-panel-row hc-panel-row-links-list">
        <div class="hc-link-list-heading">紐づけ一覧</div>
        <div class="hc-link-list" data-hc-link-list></div>
      </div>
    `;

    const colorSelect = panel.querySelector('.hc-color-select');
    const commentArea = panel.querySelector('.hc-comment');
    const linkList = panel.querySelector('[data-hc-link-list]');
    const detailUrlInput = panel.querySelector('.hc-link-url-input');
    const detailUrlButton = panel.querySelector('.hc-link-url-button');
    const detailUrlSuggestions = panel.querySelector('[data-hc-link-suggestions]');

    colorSelect.value = state.color;
    commentArea.value = state.comment || '';

    colorSelect.addEventListener('change', async () => {
      const identity = getCardIdentity(card);
      const nextState = {
        ...getResolvedState(card).state,
        color: colorSelect.value,
        title: identity.title,
        updatedAt: Date.now()
      };

      stateCache[identity.listingId] = normalizeState(nextState, identity.title);
      applyState(card, stateCache[identity.listingId]);
      filterCards();
      updateToolbarSummary();
      await flushScheduledPersist(identity.listingId, identity.title);
    });

    commentArea.addEventListener('input', () => {
      const identity = getCardIdentity(card);
      const nextState = {
        ...getResolvedState(card).state,
        comment: commentArea.value,
        title: identity.title,
        updatedAt: Date.now()
      };

      stateCache[identity.listingId] = normalizeState(nextState, identity.title);
      schedulePersist(identity.listingId);
      updateToolbarSummary();
    });

    commentArea.addEventListener('blur', async () => {
      const identity = getCardIdentity(card);
      await flushScheduledPersist(identity.listingId, identity.title);
    });

    linkList.addEventListener('click', async event => {
      const actionButton = event.target.closest('[data-hc-link-action]');
      if (!actionButton) return;

      await applyRowLinkAction(
        card,
        actionButton.getAttribute('data-hc-link-id') || '',
        actionButton.getAttribute('data-hc-link-action') || ''
      );
    });

    detailUrlButton.addEventListener('click', async () => {
      await applyDetailUrlLink(card, detailUrlInput);
    });

    detailUrlInput.addEventListener('input', () => {
      syncDetailUrlSuggestions(card);
    });

    detailUrlInput.addEventListener('keydown', async event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      await applyDetailUrlLink(card, detailUrlInput);
    });

    detailUrlSuggestions.addEventListener('click', async event => {
      const suggestionButton = event.target.closest('[data-hc-suggest-url]');
      if (!suggestionButton) return;

      detailUrlInput.value = suggestionButton.getAttribute('data-hc-suggest-url') || '';
      await applyDetailUrlLink(card, detailUrlInput);
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

    const identity = setCardIdentity(card);
    upsertListingRecord(identity.listingId, identity.record);

    const state = normalizeState(getResolvedState(card).state, identity.title);
    const panel = createPanel(card, identity.listingId, state);

    currentSite.mountPanel(card, panel);
    refreshCard(card);
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;

    const localFilterStorageKey = getLocalFilterStorageKey();

    if (changes[localFilterStorageKey]) {
      activeFilterValues = normalizeStoredFilterValues(changes[localFilterStorageKey].newValue);

      document.querySelectorAll('.hc-filter-checkbox').forEach(checkbox => {
        checkbox.checked = activeFilterValues.has(checkbox.value);
      });

      filterCards();
      return;
    }

    let shouldRefresh = false;

    if (changes[STATE_STORAGE_KEY]) {
      stateCache = normalizeStateMap(changes[STATE_STORAGE_KEY].newValue);
      shouldRefresh = true;
    }

    if (changes[LISTING_REGISTRY_STORAGE_KEY]) {
      listingRegistry = normalizeListingRegistry(changes[LISTING_REGISTRY_STORAGE_KEY].newValue);
      shouldRefresh = true;
    }

    if (changes[LINK_GROUP_STORAGE_KEY]) {
      linkGroupCache = normalizeLinkGroupMap(changes[LINK_GROUP_STORAGE_KEY].newValue);
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      refreshAllCards();
    }
  }

  function scan() {
    createToolbar();
    document.querySelectorAll(currentSite.itemSelector).forEach(enhanceCard);
    filterCards();
    updateToolbarSummary();
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
