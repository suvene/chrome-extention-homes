const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const contentPath = path.join(repoRoot, 'content.js');
const cssPath = path.join(repoRoot, 'content.css');
const docsPath = path.join(repoRoot, 'docs');
const manifestPath = path.join(repoRoot, 'manifest.json');
const homesCondition1SamplePath = path.join(repoRoot, "samples/home's/260418-0100_condition1-building.html");
const homesConditionListSamplePath = path.join(repoRoot, "samples/home's/260418-0100_condition-list-bundle.html");
const suumoSamplePath = path.join(repoRoot, 'samples/suumo/260418-2136_FR301FC001-list-bundle.html');
const athomeBundleSamplePath = path.join(repoRoot, 'samples/athome/260420-0339_tokyo-list_bundle.html');
const athomePagerSamplePath = path.join(repoRoot, 'samples/athome/260420-0339_tokyo-list_page-selector.html');
const airdoorBundleSamplePath = path.join(repoRoot, 'samples/airdoor/260423-1951_list_bundle.html');
const airdoorPagerSamplePath = path.join(repoRoot, 'samples/airdoor/260423-1951_list_page-selector.html');
const canaryBundleSamplePath = path.join(repoRoot, 'samples/canary/260421-1157_tokyo-list_bundle.html');
const canaryPage2SamplePath = path.join(repoRoot, 'samples/canary/260421-1159_tokyo-list_page2.html');

const requiredPatterns = [
  "const APP_TITLE = '賃貸物件 条件一覧アシスタント'",
  "const STATE_STORAGE_KEY = 'homes_state_v1'",
  "const LISTING_REGISTRY_STORAGE_KEY = 'homes_listing_registry_v1'",
  "const LINK_GROUP_STORAGE_KEY = 'homes_link_group_v1'",
  "const LOCAL_MIGRATION_FLAG_KEY = 'homes_local_migration_v1'",
  "const LOCAL_FILTER_STORAGE_KEY_PREFIX = 'homes_header_filter_v1'",
  "const EXPORT_FILENAME_PREFIX = 'rent-condition-notes'",
  "id: 'homes-detail'",
  "id: 'homes-condition1'",
  "id: 'homes-condition-list'",
  "id: 'suumo-detail'",
  "id: 'suumo-fr301fc001'",
  "id: 'athome-detail'",
  "id: 'athome-tokyo-list'",
  "id: 'airdoor-detail'",
  "id: 'airdoor-list'",
  "id: 'canary-detail'",
  "id: 'canary-tokyo-list'",
  'function buildListingFingerprint',
  'function normalizeAddressText',
  'function normalizeAddressPrefixToFirstNumber',
  'function normalizeRentText',
  'function isComposingEnterKey',
  'function normalizeDetailUrl',
  'function getCurrentDetailUrl',
  'function getStoredDetailRecord',
  'function getDetailPageTitle',
  'function getDetailPageName',
  'function getLocalFilterStorageKey',
  'function normalizeListingRegistry',
  'function normalizeLinkGroupMap',
  'function getHomesDetailListingId',
  'function getHomesDetailLookupStorageIds',
  'function getHomesDetailUrl',
  'function getSuumoDetailListingId',
  'function getSuumoDetailLookupStorageIds',
  'function getSuumoDetailUrl',
  'function getAthomeDetailListingId',
  'function getAthomeDetailLookupStorageIds',
  'function getAthomeDetailUrl',
  'function getAthomeCanonicalListingId',
  'function getAthomeLookupStorageIds',
  'function getAthomeNextPageUrl',
  'function getAirdoorDetailListingId',
  'function getAirdoorDetailLookupStorageIds',
  'function getAirdoorDetailUrl',
  'function getAirdoorCanonicalListingId',
  'function getAirdoorLookupStorageIds',
  'function getAirdoorNextPageUrl',
  'function buildAirdoorPageUrl',
  'function getCanaryDetailListingId',
  'function getCanaryDetailLookupStorageIds',
  'function getCanaryDetailUrl',
  'function getCanaryCanonicalListingId',
  'function getCanaryLookupStorageIds',
  'function getCanaryNextPageUrl',
  'function normalizeCanaryBundleLayout',
  'function getCandidateListingIds',
  'function getMaybeLinkListingIds',
  'function buildLinkGroupItems',
  'function getDuplicateLinkedListingIdsOnPage',
  'function findListingIdByDetailUrl',
  'function getDetailUrlSuggestions',
  'function joinSharedComments',
  'function getMergedLinkState',
  'function renderLinkMetadataBadges',
  'function renderLinkGroupListMarkup',
  'function buildDetailUrlSuggestionGroups',
  'function saveItemComment',
  'function syncDetailPanelPosition',
  'async function applySelectedLinkIds',
  'async function applyRowLinkAction',
  'async function applyDetailUrlLink',
  'function buildExportPayload',
  'function parseImportPayload',
  'schemaVersion: 2',
  'listings: getExportableListings()',
  'linkGroups: getExportableLinkGroups()',
  '紐づけ一覧',
  'class="hc-link-name"',
  'class="hc-link-state',
  'class="hc-link-comment-preview"',
  'class="hc-link-group',
  'class="hc-link-group-label"',
  'data-hc-item-comment-label',
  'data-hc-edit-item-comment',
  'data-hc-item-comment-input',
  'data-hc-detail-panel-toggle',
  'class="hc-link-url-input"',
  'data-hc-link-suggestions',
  'data-hc-link-action',
  'data-hc-link-group-action',
  'data-hc-link-group-id',
  'data-hc-link-group-toggle',
  'data-hc-link-group-body',
  'URLでリンク',
  'もしかして',
  'data-hc-maybe-list',
  'data-hc-last-updated',
  'id="hc-export"',
  'id="hc-import"'
];

function listTopLevelDocFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(directoryPath, entry.name));
}

function compactHtml(content) {
  return content.replace(/\s+/g, ' ');
}

function checkJavaScriptSyntax() {
  console.log('Checking JavaScript syntax...');
  execFileSync(process.execPath, ['--check', contentPath], { stdio: 'inherit' });
}

function checkLegacyHiddenReferences() {
  console.log('Checking that legacy hidden references are removed...');

  const hiddenPattern = /\bhidden\b|hc-hidden|isAutoHiddenStatus/;
  const targets = [contentPath, cssPath, ...listTopLevelDocFiles(docsPath)];
  const matches = [];

  targets.forEach(targetPath => {
    const content = fs.readFileSync(targetPath, 'utf8');
    content.split(/\r?\n/).forEach((line, index) => {
      if (!hiddenPattern.test(line)) return;
      matches.push(`${targetPath}:${index + 1}: ${line.trim()}`);
    });
  });

  if (matches.length > 0) {
    throw new Error(`Legacy hidden reference found:\n${matches.join('\n')}`);
  }
}

function checkRequiredPatterns() {
  console.log('Checking that required toolbar, local storage, and linking hooks still exist...');

  const content = fs.readFileSync(contentPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const missingPatterns = requiredPatterns.filter(pattern => !content.includes(pattern));

  if (missingPatterns.length > 0) {
    throw new Error(`Required pattern missing from content.js:\n${missingPatterns.join('\n')}`);
  }

  if (content.includes('chrome.storage.sync.set(') || content.includes('chrome.storage.sync.remove(')) {
    throw new Error('content.js must not write to chrome.storage.sync anymore.');
  }

  if (!content.includes("comments.join('\\n\\n')")) {
    throw new Error('Shared comments must be joined with a blank line when manual linking merges groups.');
  }

  if (!content.includes('event.isComposing') || !content.includes('event.keyCode === 229')) {
    throw new Error('IME composition guard is missing from Enter submit handlers.');
  }

  if (!css.includes('.hc-link-toolbar')) {
    throw new Error('Required link toolbar selector is missing from content.css');
  }

  if (!css.includes('.hc-link-item')) {
    throw new Error('Required link item selector is missing from content.css');
  }

  if (!css.includes('.hc-link-group')) {
    throw new Error('Required link group selector is missing from content.css');
  }

  if (!css.includes('.hc-link-group-toggle')) {
    throw new Error('Required link group toggle selector is missing from content.css');
  }

  if (!css.includes('.hc-link-group-indicator')) {
    throw new Error('Required link group indicator selector is missing from content.css');
  }

  if (!css.includes('.hc-link-group-body')) {
    throw new Error('Required link group body selector is missing from content.css');
  }

  if (!css.includes('.hc-link-group-comment')) {
    throw new Error('Required link group comment selector is missing from content.css');
  }

  if (!css.includes('.hc-link-subsection')) {
    throw new Error('Required maybe-link subsection selector is missing from content.css');
  }

  if (!css.includes('.hc-link-summary')) {
    throw new Error('Required compact link summary selector is missing from content.css');
  }

  if (!css.includes('.hc-link-state')) {
    throw new Error('Required link state badge selector is missing from content.css');
  }

  if (!css.includes('.hc-link-comment-preview')) {
    throw new Error('Required link comment preview selector is missing from content.css');
  }

  if (!css.includes('.hc-item-comment-label')) {
    throw new Error('Required item comment label selector is missing from content.css');
  }

  if (!css.includes('.hc-item-comment-edit')) {
    throw new Error('Required item comment edit selector is missing from content.css');
  }

  if (!css.includes('.hc-modal')) {
    throw new Error('Required modal selector is missing from content.css');
  }

  if (!css.includes('.hc-detail-panel-host')) {
    throw new Error('Required detail panel host selector is missing from content.css');
  }

  if (!css.includes('.hc-panel-detail')) {
    throw new Error('Required detail panel selector is missing from content.css');
  }

  if (!css.includes('.hc-detail-panel-toggle')) {
    throw new Error('Required detail panel toggle selector is missing from content.css');
  }

  if (!css.includes('.hc-link-url-input')) {
    throw new Error('Required detail URL input selector is missing from content.css');
  }

  if (!css.includes('.hc-link-row-button')) {
    throw new Error('Required row action button selector is missing from content.css');
  }

  if (css.includes('.hc-unlink-button')) {
    throw new Error('Legacy unlink button selector should be removed from content.css');
  }

  if (!css.includes('table.cassetteitem_other > tbody.hc-filtered-out')) {
    throw new Error('Required SUUMO filtered selector is missing from content.css');
  }

  if (!css.includes('.p-property__room--detailbox.hc-filtered-out')) {
    throw new Error('Required athome filtered selector is missing from content.css');
  }

  if (!css.includes('.hc-airdoor-room.hc-filtered-out')) {
    throw new Error('Required airdoor filtered selector is missing from content.css');
  }

  if (!css.includes('.hc-canary-room.hc-filtered-out')) {
    throw new Error('Required Canary filtered selector is missing from content.css');
  }

  if (!css.includes('.hc-canary-column')) {
    throw new Error('Required Canary normalized column selector is missing from content.css');
  }

  if (!css.includes('#contents .sec-mainContents')) {
    throw new Error('Required HOME\'S condition1 outer layout selector is missing from content.css');
  }

  if (!css.includes('width: max(1100px, min(1320px, calc(100vw - 32px))) !important;')) {
    throw new Error('Required HOME\'S condition1 outer width adjustment is missing from content.css');
  }

  if (!css.includes('width: calc(100% - 292px) !important;')) {
    throw new Error('Required HOME\'S condition1 main column width adjustment is missing from content.css');
  }

  if (!css.includes('width: 280px !important;')) {
    throw new Error('Required HOME\'S condition1 sidebar width adjustment is missing from content.css');
  }

  if (!css.includes('#freeword_form #prg-mod-bukkenList')) {
    throw new Error('Required HOME\'S condition1 result width selector is missing from content.css');
  }
}

function checkExportFilenameConvention() {
  console.log('Checking JSON export filename convention...');

  const content = fs.readFileSync(contentPath, 'utf8');

  if (!content.includes("const EXPORT_FILENAME_PREFIX = 'rent-condition-notes'")) {
    throw new Error('JSON export filename prefix is missing or changed unexpectedly.');
  }

  if (!content.includes('return `${year}${month}${day}-${hours}${minutes}${seconds}`;')) {
    throw new Error('JSON export timestamp format is not YYMMDD-HHMMSS.');
  }

  if (!content.includes('return `${EXPORT_FILENAME_PREFIX}-${formatExportTimestamp(new Date(timestamp))}.json`;')) {
    throw new Error('JSON export filename must include the timestamp suffix.');
  }

  if (!content.includes('const lastUpdatedAt = getLastUpdatedAt();')) {
    throw new Error('JSON export filename must be based on the last updated time.');
  }

  if (!content.includes('const filenameTimestamp = lastUpdatedAt > 0 ? lastUpdatedAt : Date.now();')) {
    throw new Error('JSON export filename fallback must be explicit when no updated state exists.');
  }
}

function checkManifestSupport() {
  console.log('Checking manifest matches and metadata...');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const homesListMatch = 'https://www.homes.co.jp/list/*';
  const homesDetailMatch = 'https://www.homes.co.jp/chintai/room/*';
  const expectedMatch = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/*';
  const suumoDetailMatch = 'https://suumo.jp/chintai/*';
  const athomeMatch = 'https://www.athome.co.jp/chintai/tokyo/list/*';
  const athomeDetailMatch = 'https://www.athome.co.jp/chintai/*';
  const airdoorMatch = 'https://airdoor.jp/list*';
  const airdoorDetailMatch = 'https://airdoor.jp/detail/*';
  const canaryMatch = 'https://web.canary-app.jp/chintai/tokyo/list/*';
  const canaryDetailMatch = 'https://web.canary-app.jp/chintai/rooms/*';

  if (manifest.name !== '賃貸物件 条件一覧アシスタント') {
    throw new Error('Manifest name was not updated to the generic assistant name.');
  }

  if (!manifest.description.includes('一覧・詳細画面')) {
    throw new Error('Manifest description does not mention detail page support.');
  }

  if (!manifest.host_permissions.includes(expectedMatch)) {
    throw new Error('Manifest host permissions do not include the SUUMO list URL.');
  }

  if (!manifest.host_permissions.includes(homesListMatch)) {
    throw new Error('Manifest host permissions do not include the HOME\'S /list/ URL.');
  }

  if (!manifest.host_permissions.includes(homesDetailMatch)) {
    throw new Error('Manifest host permissions do not include the HOME\'S detail URL.');
  }

  if (!manifest.host_permissions.includes(athomeMatch)) {
    throw new Error('Manifest host permissions do not include the athome list URL.');
  }

  if (!manifest.host_permissions.includes(suumoDetailMatch)) {
    throw new Error('Manifest host permissions do not include the SUUMO detail URL.');
  }

  if (!manifest.host_permissions.includes(athomeDetailMatch)) {
    throw new Error('Manifest host permissions do not include the athome detail URL.');
  }

  if (!manifest.host_permissions.includes(airdoorMatch)) {
    throw new Error('Manifest host permissions do not include the airdoor list URL.');
  }

  if (!manifest.host_permissions.includes(airdoorDetailMatch)) {
    throw new Error('Manifest host permissions do not include the airdoor detail URL.');
  }

  if (!manifest.host_permissions.includes(canaryMatch)) {
    throw new Error('Manifest host permissions do not include the Canary list URL.');
  }

  if (!manifest.host_permissions.includes(canaryDetailMatch)) {
    throw new Error('Manifest host permissions do not include the Canary detail URL.');
  }

  const matches = manifest.content_scripts.flatMap(script => script.matches || []);
  if (!matches.includes(homesListMatch)) {
    throw new Error('Content script matches do not include the HOME\'S /list/ URL.');
  }

  if (!matches.includes(homesDetailMatch)) {
    throw new Error('Content script matches do not include the HOME\'S detail URL.');
  }

  if (!matches.includes(expectedMatch)) {
    throw new Error('Content script matches do not include the SUUMO list URL.');
  }

  if (!matches.includes(suumoDetailMatch)) {
    throw new Error('Content script matches do not include the SUUMO detail URL.');
  }

  if (!matches.includes(athomeMatch)) {
    throw new Error('Content script matches do not include the athome list URL.');
  }

  if (!matches.includes(athomeDetailMatch)) {
    throw new Error('Content script matches do not include the athome detail URL.');
  }

  if (!matches.includes(airdoorMatch)) {
    throw new Error('Content script matches do not include the airdoor list URL.');
  }

  if (!matches.includes(airdoorDetailMatch)) {
    throw new Error('Content script matches do not include the airdoor detail URL.');
  }

  if (!matches.includes(canaryMatch)) {
    throw new Error('Content script matches do not include the Canary list URL.');
  }

  if (!matches.includes(canaryDetailMatch)) {
    throw new Error('Content script matches do not include the Canary detail URL.');
  }
}

function checkHomesListRoutingSupport() {
  console.log('Checking HOME\'S /list/ routing support...');

  const content = fs.readFileSync(contentPath, 'utf8');

  if (!content.includes("location.pathname.startsWith('/list/')")) {
    throw new Error('HOME\'S condition1 matcher does not support the /list/ URL.');
  }
}

function checkSampleFixtures() {
  console.log('Checking sample fixtures for linking selectors...');

  const homesCondition1 = compactHtml(fs.readFileSync(homesCondition1SamplePath, 'utf8'));
  const homesConditionList = compactHtml(fs.readFileSync(homesConditionListSamplePath, 'utf8'));
  const suumo = compactHtml(fs.readFileSync(suumoSamplePath, 'utf8'));
  const athome = compactHtml(fs.readFileSync(athomeBundleSamplePath, 'utf8'));
  const athomePager = compactHtml(fs.readFileSync(athomePagerSamplePath, 'utf8'));
  const airdoor = compactHtml(fs.readFileSync(airdoorBundleSamplePath, 'utf8'));
  const airdoorPager = compactHtml(fs.readFileSync(airdoorPagerSamplePath, 'utf8'));
  const canary = compactHtml(fs.readFileSync(canaryBundleSamplePath, 'utf8'));
  const canaryPage2 = compactHtml(fs.readFileSync(canaryPage2SamplePath, 'utf8'));

  if (!homesCondition1.includes('class="bukkenName prg-detailLinkTrigger">アサノ荘</span>')) {
    throw new Error('HOME\'S condition1 sample is missing the property name selector used for linking.');
  }

  if (!homesCondition1.includes('<th>所在地</th><td>東京都品川区南大井6丁目12-4</td>')) {
    throw new Error('HOME\'S condition1 sample is missing the address selector used for linking.');
  }

  if (!homesCondition1.includes('class="priceLabel"><span class="num">5</span>万円</span>')) {
    throw new Error('HOME\'S condition1 sample is missing the rent selector used for linking.');
  }

  if (!homesConditionList.includes('class="tableContent">東京都品川区南大井3丁目9-7</td>')) {
    throw new Error('HOME\'S condition-list sample is missing the address selector used for linking.');
  }

  if (!homesConditionList.includes('<td class="price"><span>7</span>万円</td>')) {
    throw new Error('HOME\'S condition-list sample is missing the rent selector used for linking.');
  }

  if (!suumo.includes('class="cassetteitem_content-title">グレイス大森海岸</div>')) {
    throw new Error('SUUMO sample is missing the property name selector used for linking.');
  }

  if (!suumo.includes('class="cassetteitem_detail-col1">東京都品川区南大井３</li>')) {
    throw new Error('SUUMO sample is missing the address selector used for linking.');
  }

  if (!suumo.includes('class="cassetteitem_price cassetteitem_price--rent"><span class="cassetteitem_other-emphasis ui-text--bold">5.5万円</span>')) {
    throw new Error('SUUMO sample is missing the rent selector used for linking.');
  }

  if (!athome.includes('class="p-property__title--building">ハイタウン大森第２ 10階建</h2>')) {
    throw new Error('athome sample is missing the property name selector used for linking.');
  }

  if (!athome.includes('<dd><strong>大田区大森北３丁目</strong></dd>')) {
    throw new Error('athome sample is missing the address selector used for linking.');
  }

  if (!athome.includes('class="p-property__information-rent">6.2</b>万円')) {
    throw new Error('athome sample is missing the rent selector used for linking.');
  }

  if (!athome.includes('class="p-property__room-more-inner"')) {
    throw new Error('athome sample is missing the detail URL selector used for linking.');
  }

  if (!athomePager.includes("class=\"c-paging__pagenavi-item\" onclick=\"javascript:pushGapCustomForPagingPost('2');\">2</a>")) {
    throw new Error('athome page selector sample is missing the page 2 link.');
  }

  if (!athomePager.includes("class=\"c-paging__pagenavi-item\" onclick=\"javascript:pushGapCustomForPagingPost('next');\">&gt;</a>")) {
    throw new Error('athome page selector sample is missing the next page link.');
  }

  if (!airdoor.includes('class="PropertyPanelBuilding_buildingTitle__tuPqN">【空室4件】 D Paina 今井南町</h3>')) {
    throw new Error('airdoor sample is missing the building title selector used for linking.');
  }

  if (!airdoor.includes('神奈川県川崎市中原区今井南町33-30')) {
    throw new Error('airdoor sample is missing the address selector used for linking.');
  }

  if (!airdoor.includes('class="mb-2 font-semibold md:text-xl PropertyPanelRoom_rentPrice__mYBSX text-base">17.3万円')) {
    throw new Error('airdoor sample is missing the rent selector used for linking.');
  }

  if (!airdoor.includes('href="/detail/147602/563194"')) {
    throw new Error('airdoor sample is missing the detail URL selector used for linking.');
  }

  if (!airdoorPager.includes('Search_isActive__rcdcR') || !airdoorPager.includes('>2</div>')) {
    throw new Error('airdoor page selector sample is missing the active page marker.');
  }

  if (!airdoorPager.includes('href="/list?p=3"')) {
    throw new Error('airdoor page selector sample is missing the next page link.');
  }

  if (!canary.includes('href="/chintai/buildings/fbcc6a5f-1c6b-4cef-bb61-f5b60ba559c9/"')) {
    throw new Error('Canary sample is missing the building link selector used for linking.');
  }

  if (!canary.includes('data-testid="search-result-room-thumbail"')) {
    throw new Error('Canary sample is missing the room selector used for linking.');
  }

  if (!canary.includes('東京都新宿区河田町10-14')) {
    throw new Error('Canary sample is missing the address selector used for linking.');
  }

  if (!canary.includes('24.2</span>万円')) {
    throw new Error('Canary sample is missing the rent selector used for linking.');
  }

  if (!canaryPage2.includes('"page":"2"') && !canaryPage2.includes('"page":2')) {
    throw new Error('Canary page 2 sample is missing the page number metadata.');
  }

  if (!canaryPage2.includes('"nextOffset":"40"')) {
    throw new Error('Canary page 2 sample is missing the next offset metadata.');
  }
}

function checkStorageDocVersion() {
  console.log('Checking storage documentation version...');

  const latestDocPath = path.join(docsPath, 'storage_sync_v1.14.md');
  if (!fs.existsSync(latestDocPath)) {
    throw new Error('Latest storage sync doc must be versioned as docs/storage_sync_v1.14.md.');
  }

  if (fs.existsSync(path.join(docsPath, 'storage_sync_v1.13.md'))) {
    throw new Error('Older latest storage sync doc should have been removed after version bump.');
  }
}

function main() {
  checkJavaScriptSyntax();
  checkLegacyHiddenReferences();
  checkRequiredPatterns();
  checkExportFilenameConvention();
  checkManifestSupport();
  checkHomesListRoutingSupport();
  checkSampleFixtures();
  checkStorageDocVersion();
  console.log('Smoke checks passed.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
