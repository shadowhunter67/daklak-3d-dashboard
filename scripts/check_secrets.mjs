import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bghp_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
const excluded = new Set(['package-lock.json', 'scripts/check_secrets.mjs']);
const files = execFileSync('git', ['ls-files', '-z']).toString('utf8').split('\0').filter(Boolean);
const findings = [];
for (const file of files) {
  if (excluded.has(file) || /\.(?:png|jpe?g|zip)$/.test(file)) continue;
  if (!existsSync(file)) continue;
  const content = readFileSync(file, 'utf8');
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file);
}
if (findings.length) {
  console.error(`Potential secrets detected in: ${findings.join(', ')}`);
  process.exitCode = 1;
} else console.log(`Secret pattern scan passed (${files.length} tracked files).`);
