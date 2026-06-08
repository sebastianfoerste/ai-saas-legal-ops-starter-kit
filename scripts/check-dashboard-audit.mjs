import { spawnSync } from 'child_process';

const allowedAdvisories = new Set(['GHSA-qx2v-qp2m-jg93']);
const allowedVulnerablePackages = new Set(['next', 'postcss']);

const result = spawnSync('npm', ['--prefix', 'dashboard', 'audit', '--omit=dev', '--json'], {
  encoding: 'utf8'
});
const stdout = result.stdout.trim();
const stderr = result.stderr.trim();

if (!stdout) {
  throw new Error(`Dashboard audit produced no JSON output.${stderr ? ` stderr: ${stderr}` : ''}`);
}

const audit = JSON.parse(stdout);
const vulnerabilities = Object.values(audit.vulnerabilities ?? {});
const unexpected = [];
const allowed = [];

for (const vulnerability of vulnerabilities) {
  if (!allowedVulnerablePackages.has(vulnerability.name)) {
    unexpected.push(`${vulnerability.name}: unexpected package`);
    continue;
  }

  const advisoryIds = advisoryUrls(vulnerability).map(url => url.split('/').pop()).filter(Boolean);
  const hasAllowedAdvisory = advisoryIds.some(id => allowedAdvisories.has(id));
  const isTransitiveNextPath = vulnerability.name === 'next' && vulnerability.via?.includes('postcss');
  const isModerate = vulnerability.severity === 'moderate';

  if ((hasAllowedAdvisory || isTransitiveNextPath) && isModerate) {
    allowed.push(vulnerability.name);
  } else {
    unexpected.push(`${vulnerability.name}: ${JSON.stringify(vulnerability.via)}`);
  }
}

if (unexpected.length > 0) {
  throw new Error(`Dashboard production audit found unapproved advisories: ${unexpected.join('; ')}`);
}

if (allowed.length > 0) {
  console.log(`Dashboard audit has documented temporary advisories: ${allowed.join(', ')}.`);
  console.log('Do not run npm audit fix --force. Resolve through a safe Next/PostCSS upgrade when available.');
} else {
  console.log('Dashboard production audit passed with no vulnerabilities.');
}

function advisoryUrls(vulnerability) {
  return (vulnerability.via ?? [])
    .filter(item => typeof item === 'object' && item !== null && typeof item.url === 'string')
    .map(item => item.url);
}
