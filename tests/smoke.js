const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const contentPath = path.join(repoRoot, 'content.js');
const cssPath = path.join(repoRoot, 'content.css');
const docsPath = path.join(repoRoot, 'docs');
const manifestPath = path.join(repoRoot, 'manifest.json');

const requiredPatterns = [
  "const APP_TITLE = '賃貸物件 条件一覧アシスタント'",
  "const EXPORT_FILENAME_PREFIX = 'rent-condition-notes'",
  "id: 'homes-condition1'",
  "id: 'homes-condition-list'",
  "id: 'suumo-fr301fc001'",
  "value: '1', label: '1. 要確認'",
  "value: '2', label: '2. 検討中'",
  "value: '3', label: '3. 本命'",
  "value: '8', label: '8. 除外候補'",
  'function getHomesLookupStorageIds',
  'function getHomesWriteStorageIds',
  'function getSuumoLookupStorageIds',
  'function getSuumoWriteStorageIds',
  'function getHomesCondition1BuildingContainer',
  'function getHomesConditionListBundle',
  'function getSuumoBundle',
  'function getHomesNextPageUrl',
  'function getSuumoNextPageUrl',
  'function createSuumoPageSeparator',
  'function mountSuumoPanel',
  'function syncBuildingVisibility',
  'async function loadNextPages',
  'function buildExportPayload',
  'function formatExportTimestamp',
  'function getExportFilename',
  'function parseImportPayload',
  'async function exportJson',
  'async function importJson',
  'const LOCAL_FILTER_STORAGE_KEY = \'homes_header_filter_v1\'',
  'async function loadStoredFilterValues',
  'async function persistFilterValues',
  'function getLastUpdatedAt',
  'function updateToolbarSyncStatus',
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
  console.log('Checking that required toolbar, site, and storage hooks still exist...');

  const content = fs.readFileSync(contentPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const missingPatterns = requiredPatterns.filter(pattern => !content.includes(pattern));

  if (missingPatterns.length > 0) {
    throw new Error(`Required pattern missing from content.js:\n${missingPatterns.join('\n')}`);
  }

  if (!css.includes('.kksearch.rentListPrDesign')) {
    throw new Error('Required PR hidden selector is missing from content.css');
  }

  if (!css.includes('table.cassetteitem_other > tbody.hc-filtered-out')) {
    throw new Error('Required SUUMO filtered selector is missing from content.css');
  }

  if (!css.includes('.hc-page-separator-item')) {
    throw new Error('Required SUUMO page separator selector is missing from content.css');
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

function main() {
  checkJavaScriptSyntax();
  checkLegacyHiddenReferences();
  checkRequiredPatterns();
  checkExportFilenameConvention();
  checkManifestSupport();
  console.log('Smoke checks passed.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
