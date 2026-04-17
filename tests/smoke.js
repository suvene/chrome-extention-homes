const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const contentPath = path.join(repoRoot, 'content.js');
const cssPath = path.join(repoRoot, 'content.css');
const docsPath = path.join(repoRoot, 'docs');

const requiredPatterns = [
  "const CONDITION1_ROOM_SELECTOR = 'tr.prg-roomInfo[data-kykey]'",
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
  'function parseImportPayload',
  'async function exportJson',
  'async function importJson',
  'const LOCAL_FILTER_STORAGE_KEY = \'homes_header_filter_v1\'',
  'async function loadStoredFilterValues',
  'async function persistFilterValues',
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
  const missingPatterns = requiredPatterns.filter(pattern => !content.includes(pattern));

  if (missingPatterns.length > 0) {
    throw new Error(`Required pattern missing from content.js:\n${missingPatterns.join('\n')}`);
  }
}

function main() {
  checkJavaScriptSyntax();
  checkLegacyHiddenReferences();
  checkRequiredPatterns();
  console.log('Smoke checks passed.');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
