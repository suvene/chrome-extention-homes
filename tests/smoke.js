const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const contentPath = path.join(repoRoot, 'content.js');
const cssPath = path.join(repoRoot, 'content.css');
const docsPath = path.join(repoRoot, 'docs');
const manifestPath = path.join(repoRoot, 'manifest.json');
const homesCondition1SamplePath = path.join(repoRoot, "samples/home's/condition1-building.html");
const homesConditionListSamplePath = path.join(repoRoot, "samples/home's/condition-list-bundle.html");
const suumoSamplePath = path.join(repoRoot, 'samples/suumo/FR301FC001-list-bundle.html');

const requiredPatterns = [
  "const APP_TITLE = '賃貸物件 条件一覧アシスタント'",
  "const STATE_STORAGE_KEY = 'homes_state_v1'",
  "const LISTING_REGISTRY_STORAGE_KEY = 'homes_listing_registry_v1'",
  "const LINK_GROUP_STORAGE_KEY = 'homes_link_group_v1'",
  "const LOCAL_MIGRATION_FLAG_KEY = 'homes_local_migration_v1'",
  "const EXPORT_FILENAME_PREFIX = 'rent-condition-notes'",
  "id: 'homes-condition1'",
  "id: 'homes-condition-list'",
  "id: 'suumo-fr301fc001'",
  'function buildListingFingerprint',
  'function normalizeAddressText',
  'function normalizeRentText',
  'function normalizeListingRegistry',
  'function normalizeLinkGroupMap',
  'function getHomesDetailUrl',
  'function getSuumoDetailUrl',
  'function getCandidateListingIds',
  'async function unlinkCurrentListing',
  'async function applyLinkSelection',
  'const resolvedState = getResolvedState(card).state;',
  'function buildExportPayload',
  'function parseImportPayload',
  'schemaVersion: 2',
  'listings: getExportableListings()',
  'linkGroups: getExportableLinkGroups()',
  'ローカルに保存済み',
  '紐づけ一覧',
  'class="hc-link-name"',
  'data-hc-last-updated',
  'data-hc-sync-state',
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

  if (!css.includes('.hc-link-toolbar')) {
    throw new Error('Required link toolbar selector is missing from content.css');
  }

  if (!css.includes('.hc-link-item')) {
    throw new Error('Required link item selector is missing from content.css');
  }

  if (!css.includes('.hc-link-summary')) {
    throw new Error('Required compact link summary selector is missing from content.css');
  }

  if (!css.includes('table.cassetteitem_other > tbody.hc-filtered-out')) {
    throw new Error('Required SUUMO filtered selector is missing from content.css');
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
  const expectedMatch = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/*';

  if (manifest.name !== '賃貸物件 条件一覧アシスタント') {
    throw new Error('Manifest name was not updated to the generic assistant name.');
  }

  if (!manifest.description.includes('HOME\'S / SUUMO')) {
    throw new Error('Manifest description does not mention HOME\'S / SUUMO support.');
  }

  if (!manifest.host_permissions.includes(expectedMatch)) {
    throw new Error('Manifest host permissions do not include the SUUMO list URL.');
  }

  const matches = manifest.content_scripts.flatMap(script => script.matches || []);
  if (!matches.includes(expectedMatch)) {
    throw new Error('Content script matches do not include the SUUMO list URL.');
  }
}

function checkSampleFixtures() {
  console.log('Checking sample fixtures for linking selectors...');

  const homesCondition1 = compactHtml(fs.readFileSync(homesCondition1SamplePath, 'utf8'));
  const homesConditionList = compactHtml(fs.readFileSync(homesConditionListSamplePath, 'utf8'));
  const suumo = compactHtml(fs.readFileSync(suumoSamplePath, 'utf8'));

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
}

function checkStorageDocVersion() {
  console.log('Checking storage documentation version...');

  const latestDocPath = path.join(docsPath, 'storage_sync_v1.6.md');
  if (!fs.existsSync(latestDocPath)) {
    throw new Error('Latest storage sync doc must be versioned as docs/storage_sync_v1.6.md.');
  }

  if (fs.existsSync(path.join(docsPath, 'storage_sync_v1.5.md'))) {
    throw new Error('Older latest storage sync doc should have been removed after version bump.');
  }
}

function main() {
  checkJavaScriptSyntax();
  checkLegacyHiddenReferences();
  checkRequiredPatterns();
  checkExportFilenameConvention();
  checkManifestSupport();
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
