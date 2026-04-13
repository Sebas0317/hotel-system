import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGES = [
  { name: 'Home', url: 'http://localhost:4173/' },
  { name: 'Admin', url: 'http://localhost:4173/admin' },
  { name: 'Check-in', url: 'http://localhost:4173/checkin' },
  { name: 'Reservaciones', url: 'http://localhost:4173/reservaciones' },
];

const OUTPUT_DIR = join(__dirname, 'lighthouse-reports');

if (!existsSync(OUTPUT_DIR)) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function runLighthouse(pageName, url) {
  console.log(`\n🔍 Testing: ${pageName} (${url})`);
  console.log('─'.repeat(60));

  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    output: ['json', 'html'],
  });

  try {
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: ['json', 'html'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });

    const jsonReport = JSON.stringify(runnerResult.lhr, null, 2);
    const htmlReport = runnerResult.report;

    const safeName = pageName.toLowerCase().replace(/\s+/g, '-');
    writeFileSync(join(OUTPUT_DIR, `${safeName}.report.json`), jsonReport);
    if (htmlReport && typeof htmlReport === 'string') {
      writeFileSync(join(OUTPUT_DIR, `${safeName}.report.html`), htmlReport);
    }

    const report = runnerResult.lhr;
    const categories = report.categories;
    const audits = report.audits;

    console.log(`\n📊 Results for: ${pageName}`);
    console.log('─'.repeat(60));

    // Performance
    const perf = categories.performance;
    console.log(`⚡ Performance:           ${(perf.score * 100).toFixed(0)}%`);
    console.log(`   • First Contentful Paint: ${(audits['first-contentful-paint'].displayValue || 'N/A')}`);
    console.log(`   • Speed Index: ${(audits['speed-index'].displayValue || 'N/A')}`);
    console.log(`   • Total Blocking Time: ${(audits['total-blocking-time'].displayValue || 'N/A')}`);
    console.log(`   • Cumulative Layout Shift: ${(audits['cumulative-layout-shift'].displayValue || 'N/A')}`);

    // Accessibility
    const a11y = categories.accessibility;
    console.log(`\n♿ Accessibility:         ${(a11y.score * 100).toFixed(0)}%`);

    // Best Practices
    const bp = categories['best-practices'];
    console.log(`✅ Best Practices:        ${(bp.score * 100).toFixed(0)}%`);

    // SEO
    const seo = categories.seo;
    console.log(`🔍 SEO:                    ${(seo.score * 100).toFixed(0)}%`);

    console.log(`\n📄 HTML Report: ${join(OUTPUT_DIR, `${safeName}.report.html`)}`);
    console.log('═'.repeat(60));

  } finally {
    await chrome.kill();
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Lighthouse Performance & Accessibility Tester        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  for (const page of PAGES) {
    try {
      await runLighthouse(page.name, page.url);
    } catch (error) {
      console.error(`❌ Failed to test ${page.name}:`, error.message);
    }
  }
  
  console.log('\n✅ All tests completed!');
  console.log(`📁 Reports saved to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
