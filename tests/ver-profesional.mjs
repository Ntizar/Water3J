import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.setViewport({ width: 1400, height: 900 });
await page.goto('http://localhost:5199/studio.html', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise(r => setTimeout(r, 2000));

// 1) CSV: interceptar la descarga
const cliente = await page.target().createCDPSession();
await cliente.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: process.cwd() + '/tmp-descargas' });
await page.click('#btnCSV');
await new Promise(r => setTimeout(r, 1500));

// 2) Informe: se abre ventana con contenido
const pagesAbiertas = [];
page.on('popup', p => pagesAbiertas.push(p));
await page.click('#btnInforme');
await new Promise(r => setTimeout(r, 1500));
let informeOK = false;
if (pagesAbiertas[0]) {
  await pagesAbiertas[0].waitForTimeout?.(500);
  const contenido = await pagesAbiertas[0].evaluate(() => document.body.innerHTML);
  informeOK = contenido.includes('Estudio de propagación') && contenido.includes('Hecho con');
}

// 3) estado de la UI profesional: número de secciones
const ui = await page.evaluate(() => ({
  botones: ['btnBoya','btn2D','btnInforme','btnCSV','btnGuardar'].filter(id => document.getElementById(id)).length,
  secciones: document.querySelectorAll('aside h2').length,
}));
console.log('UI:', JSON.stringify(ui), '| informe abre:', informeOK, '| contenido informe OK:', informeOK, '| errores:', errs.length ? errs : 'ninguno');
await browser.close();
