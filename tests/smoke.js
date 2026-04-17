const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const contentPath = path.join(repoRoot, 'content.js');
const cssPath = path.join(repoRoot, 'content.css');
const docsPath = path.join(repoRoot, 'docs');

const requiredPatterns = [
  "const CONDITION1_ROOM_SELECTOR = 'tr.prg-roomInfo[data-kykey]'",
  "value: '1', label: '1. 要確認'",
  "value: '2', label: '2. 検討中'",
  "value: '3', label: '3. 本命'",
  "value: '8', label: '8. 除外候補'",
  'function getRoomId',
  'function getTyKey',
  'function getPanelMountPoint',
  'function getCondition1BuildingContainer',
  'function getCondition1NextPageUrl',
  'function appendCondition1BuildingBlocks',
  'async function loadCondition1NextPages',
  'function getConditionListBundle',
  'function appendConditionListBuildingBlocks',
  'async function loadConditionListNextPages',
  'function syncCondition1BuildingVisibility',
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
  console.log('Checking that required toolbar and storage hooks still exist...');

  const content = fs.readFileSync(contentPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const missingPatterns = requiredPatterns.filter(pattern => !content.includes(pattern));

  if (missingPatterns.length > 0) {
    throw new Error(`Required pattern missing from content.js:\n${missingPatterns.join('\n')}`);
  }

  if (!css.includes('.kksearch.rentListPrDesign')) {
    throw new Error('Required PR hidden selector is missing from content.css');
  }
}

function checkExportFilenameConvention() {
  console.log('Checking JSON export filename convention...');

  const content = fs.readFileSync(contentPath, 'utf8');

  if (!content.includes("const EXPORT_FILENAME_PREFIX = 'homes-condition-notes'")) {
    throw new Error('JSON export filename prefix is missing or changed unexpectedly.');
  }

  if (!content.includes('return `${year}${month}${day}-${hours}${minutes}${seconds}`;')) {
    throw new Error('JSON export timestamp format is not YYMMDD-HHMMSS.');
  }

  if (!content.includes('return `${EXPORT_FILENAME_PREFIX}-${formatExportTimestamp(date)}.json`;')) {
    throw new Error('JSON export filename must include the timestamp suffix.');
  }
}

function main() {
  checkJavaScriptSyntax();
  checkLegacyHiddenReferences();
  checkRequiredPatterns();
  checkExportFilenameConvention();
  console.log('Smoke checks passed.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
