// Dependency-free local static preview; not a production backend.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png' };
http.createServer((req, res) => {
  let target, url;
  try { url = new URL(req.url, 'http://localhost'); target = path.resolve(root, '.' + decodeURIComponent(url.pathname)); }
  catch { res.writeHead(400); res.end(); return; }
  if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  if (target === root) target = path.join(root, 'index.html');
  const type = types[path.extname(target)];
  if (!type) { res.writeHead(404); res.end(); return; }
  fs.readFile(target, (err, content) => {
    if (err) { res.writeHead(404); res.end(); return; }
    // Test clock exists only in this opt-in localhost server, never in the shipped UI.
    if (process.argv.includes('--test-clock') && type.startsWith('text/html') && url.searchParams.has('at')) {
      const instant = new Date(url.searchParams.get('at'));
      if (!Number.isNaN(instant.getTime())) {
        const stamp = instant.getTime();
        const mock = '<script>(function(){const RealDate=Date;window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[' +
          stamp + ']));}static now(){return ' + stamp + ';}};})();</script>';
        content = Buffer.from(content.toString('utf8').replace('<head>', '<head>' + mock));
      }
    }
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(content);
  });
}).listen(8765, '127.0.0.1', () => console.log('本機預覽：http://127.0.0.1:8765/'));
