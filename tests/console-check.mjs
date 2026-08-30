import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
const logs = [];
page.on('console', m => logs.push(m.type() + ': ' + m.text().slice(0, 300)));
await page.goto('http://localhost:5199/demo.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 3000));
console.log(logs.filter(l => l.includes('error') || l.includes('warn') || l.includes('ERROR')).join('\n---\n') || 'sin logs de error');
await browser.close();
