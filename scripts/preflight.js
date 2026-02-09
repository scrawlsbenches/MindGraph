#!/usr/bin/env node

/* === Session Preflight Check ===
 *
 * Runs the session start checklist from CLAUDE.md as a single command.
 * Usage: npm run preflight
 *
 * Steps:
 *   1. npm install (skipped if node_modules is current)
 *   2. git fetch origin
 *   3. git status (uncommitted changes)
 *   4. git branch --no-merged origin/main (orphan branch work, local + remote)
 *   5. npm run check (lint + typecheck + test + build)
 *   6. Parse ROADMAP.md for next incomplete item
 */

const { execSync } = require('child_process');
const { readFileSync, statSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const results = { warnings: [], errors: [] };

function run(cmd, opts = {}) {
  try {
    const result = execSync(cmd, { cwd: root, encoding: 'utf8', stdio: opts.stdio || 'pipe', ...opts });
    return result ? result.trim() : '';
  } catch (e) {
    if (opts.allowFail) return e.stdout ? e.stdout.trim() : '';
    throw e;
  }
}

function heading(text) {
  console.log(`\n\x1b[1m${text}\x1b[0m`);
}

/* Step 1: npm install (skip if node_modules is current) */
heading('1. Dependencies');
try {
  const lockMtime = statSync(join(root, 'package-lock.json')).mtimeMs;
  const nmMtime = statSync(join(root, 'node_modules', '.package-lock.json')).mtimeMs;
  if (lockMtime > nmMtime) {
    console.log('   package-lock.json newer than node_modules — running npm install...');
    execSync('npm install', { cwd: root, stdio: 'inherit' });
  } else {
    console.log('   node_modules is current — skipped npm install.');
  }
} catch {
  console.log('   node_modules missing — running npm install...');
  execSync('npm install', { cwd: root, stdio: 'inherit' });
}

/* Step 2: git fetch */
heading('2. Fetch remote');
try {
  run('git fetch origin');
  console.log('   Done.');
} catch {
  console.log('   \x1b[33mFetch failed — working offline.\x1b[0m');
  results.warnings.push('git fetch failed.');
}

/* Step 3: git status */
heading('3. Working tree');
const status = run('git status --porcelain');
if (status) {
  console.log('   Uncommitted changes:');
  status.split('\n').forEach((line) => console.log(`     ${line}`));
  results.warnings.push('Uncommitted changes detected.');
} else {
  console.log('   Clean.');
}

/* Step 4: orphan branches (local + remote) */
heading('4. Orphan branch work');
const currentBranch = run('git branch --show-current', { allowFail: true });
const unmergedRemote = run('git branch -r --no-merged origin/main', { allowFail: true });
const unmergedLocal = run('git branch --no-merged origin/main', { allowFail: true });
const remoteBranches = unmergedRemote
  .split('\n')
  .map((b) => b.trim())
  .filter((b) => b && !b.includes('origin/main') && !b.includes('->'));
const localBranches = unmergedLocal
  .split('\n')
  .map((b) => b.trim().replace(/^\* /, ''))
  .filter((b) => b && b !== currentBranch);
// Deduplicate: remove local branches that have a remote tracking counterpart
const remoteNames = new Set(remoteBranches.map((b) => b.replace('origin/', '')));
const localOnly = localBranches.filter((b) => !remoteNames.has(b));
const branches = [...remoteBranches, ...localOnly.map((b) => `${b} (local only)`)];
if (branches.length) {
  console.log('   Branches with unmerged commits:');
  branches.forEach((b) => console.log(`     ${b}`));
  results.warnings.push(`${branches.length} branch(es) with unmerged work.`);
} else {
  console.log('   None — all branches merged to main.');
}

/* Step 5: npm run check */
heading('5. Full check (lint + typecheck + test + build)');
let checkPassed = false;
try {
  execSync('npm run check', { cwd: root, stdio: 'inherit' });
  checkPassed = true;
  console.log('   All checks passed.');
} catch {
  results.errors.push('npm run check failed.');
  console.log('   \x1b[31mFAILED — see output above.\x1b[0m');
}

/* Step 6: next roadmap item */
heading('6. Next roadmap item');
try {
  const roadmap = readFileSync(join(root, 'ROADMAP.md'), 'utf8');
  const lines = roadmap.split('\n');
  let nextItem = null;
  for (const line of lines) {
    // Match table rows that are NOT struck through (~~) — all completed items use strikethrough
    if (line.startsWith('|') && !line.startsWith('|---') && !line.startsWith('| #')) {
      const isComplete = /~~/.test(line);
      if (!isComplete) {
        nextItem = line;
        break;
      }
    }
  }
  if (nextItem) {
    console.log(`   ${nextItem.trim()}`);
  } else {
    console.log('   All roadmap items complete!');
  }
} catch {
  console.log('   Could not read ROADMAP.md');
}

/* Summary */
heading('--- Summary ---');
if (results.errors.length) {
  results.errors.forEach((e) => console.log(`  \x1b[31mERROR: ${e}\x1b[0m`));
}
if (results.warnings.length) {
  results.warnings.forEach((w) => console.log(`  \x1b[33mWARN: ${w}\x1b[0m`));
}
if (!results.errors.length && !results.warnings.length) {
  console.log('  All clear.');
}
if (!checkPassed) {
  console.log('\n  \x1b[31mFix check failures before starting new work.\x1b[0m');
  process.exit(1);
}
console.log('');
