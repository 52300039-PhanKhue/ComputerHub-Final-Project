'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;
const read = file => { try { return fs.readFileSync(path.join(root, file), 'utf8'); } catch { return ''; } };
const server = read('src/server.js');
const seed = read('src/seed.js');
const models = read('src/models/index.js');
const home = read('views/home.ejs');
const compose = read('docker-compose.yml');
const env = read('.env');
const pkg = read('package.json');
const things = [];
const ok = (label, test, detail = '') => things.push({ result: test ? 'PASS' : 'FAIL', label, detail });
const warn = (label, detail) => things.push({ result: 'CHECK', label, detail });

ok('Da mo dung thu muc du an', !!pkg && !!server && !!seed && !!models, 'Can dat 2 file test cung cap vao thu muc co package.json.');
ok('Trang chu New Products, Best Sellers va 3 nhom san pham', /Sản phẩm mới/.test(home) && /Bán chạy/.test(home) && /'laptops',\s*'monitors',\s*'storage'/.test(server));
ok('Danh sach catalog co phan trang va 4 che do sap xep', /pages:\s*Math\.max\(1/.test(server) && ['name_asc', 'name_desc', 'price_asc', 'price_desc'].every(x => server.includes(x)));
ok('Co loc category, brand, min, max, rating', ['req.query.category', 'req.query.brand', 'req.query.min', 'req.query.max', 'req.query.rating'].every(x => server.includes(x)));
ok('Du lieu mau 2 bien the Standard Premium + 3 anh', /\['Standard'/.test(seed) && /\['Premium'/.test(seed) && /i<=3/.test(seed));
ok('Co API tao don + MongoDB transaction', /app\.post\('\/api\/checkout'/.test(server) && server.includes('session.withTransaction'));
ok('Tinh diem 10% (1 diem = 1000d)', /POINT_VALUE_VND\s*=\s*1000/.test(server) && /Math\.floor\(total\s*\/\s*10000\)/.test(server));
ok('Ma giam gia dung 5 ky tu chu/so', /\^\[A-Z0-9\]\{5\}\$/.test(server));
ok('API checkout chan so luong thap phan / 0 / am', /Number\.is(?:Safe)?Integer\(\s*qty\s*\)/.test(server), 'Co the tao don voi so luong 1.5; can them validate nguyen duong truoc khi giao dich.');
ok('Dang ky chi nhap email, ho ten, dia chi', /name="full_name"/.test(read('views/auth.ejs')) && /name="address"/.test(read('views/auth.ejs')) && /name="email"/.test(read('views/auth.ejs')));
ok('Co realtime review qua Socket.IO', server.includes("'review:new'") && server.includes('product:join'));
ok('Co quan tri dashboard, san pham, khach, don, coupon', ['/admin', '/admin/products', '/admin/users', '/admin/orders', '/admin/discounts'].every(x => server.includes(x)));
ok('Co Docker Compose + nginx + 2 web + Redis + Mailpit', ['  web1:', '  web2:', '  nginx:', '  redis:', '  mailpit:'].every(x => compose.includes(x)));

const getEnv = name => {
  const line = env.split(/\r?\n/).find(x => x.startsWith(name + '='));
  return line ? line.slice(name.length+1).trim() : '';
};
const mongoUri = getEnv('MONGODB_URI');
warn('MONGODB_URI', mongoUri ? 'Da co URI trong .env; can thu ket noi Atlas khi chay npm test.' : 'ZIP an toan khong kem .env; tren Windows can tao .env rieng theo .env.example de chay npm start/npm test. Docker mac dinh dung MongoDB container.');
if (!getEnv('GOOGLE_CLIENT_ID') || !getEnv('GOOGLE_CLIENT_SECRET')) warn('Google OAuth', 'Chua thiet lap credentials; nut Google se bi vo hieu, mat muc diem Social Login neu khong bo sung.');
else warn('Google OAuth', 'Co credentials; van phai thu dang nhap Google tren browser.');
if (!getEnv('SMTP_HOST')) warn('Email xac nhan + quen mat khau', 'Chay Docker Mailpit/SMTP va thu email; npm test hien tai KHONG kiem tra email.');
else warn('Email xac nhan + quen mat khau', 'Co SMTP_HOST; can thu gui email de chung minh.');
if (/^mongodb(?:\+srv)?:\/\/[^:\/@]+:[^@]+@/i.test(mongoUri)) warn('BAO MAT: .env', 'URI trong .env co thong tin xac thuc; khong nop file .env co credential vao ZIP/chia se cong khai. Khong in gia tri bi mat.');
if (/MONGODB_URI:\s*\$\{MONGODB_URI/.test(compose) && !/^\s*mongodb:\s*$/m.test(compose)) warn('Docker', 'Dang su dung MongoDB Atlas BEN NGOAI Docker; can doi chieu yeu cau database container cua thay va thu docker compose up -d tren may cham.');
if (!fs.existsSync(path.join(root,'demo.mp4'))) warn('demo.mp4', 'Chua tim thay trong thu muc source; can dua vao thu muc nop bai cap tren.');
if (!fs.existsSync(path.join(root,'Rubrik.docx'))) warn('Rubrik.docx', 'Chua tim thay trong thu muc source; can dua vao thu muc nop bai cap tren.');
if (!fs.existsSync(path.join(root,'git'))) warn('git/ proof', 'Chua tim thay trong thu muc source; can dua vao thu muc nop bai cap tren.');
warn('Trinh duyet / mobile / Docker THUC TE', 'Khong the ket luan bang kiem tra tinh: can demo browser, OAuth, email, scaling, mobile va checklist nop bai.');

console.log('\n========== RUBRIC CODE PREFLIGHT (KHONG PHA DU LIEU) ==========');
for (const x of things) console.log(`${x.result.padEnd(5)} | ${x.label}${x.detail ? '\n      '+x.detail : ''}`);
const totals = { PASS: things.filter(x=>x.result==='PASS').length, FAIL:things.filter(x=>x.result==='FAIL').length, CHECK:things.filter(x=>x.result==='CHECK').length };
const report = [
  'KET QUA KIEM TRA SO BO CODE THEO RUBRIC (khong thay the chay browser)',
  `PASS: ${totals.PASS}  FAIL: ${totals.FAIL}  CAN THU THEM: ${totals.CHECK}`,
  '',
  ...things.map(x => `[${x.result}] ${x.label}${x.detail?' - '+x.detail:''}`),
  '',
  'NOTE: Automated smoke test la npm test; no dung MongoDB tam va xoa database test sau khi chay.',
  'NOTE: Thu nghiem tren browser va Docker + day du file nop bai can xac nhan rieng.',
];
fs.writeFileSync(path.join(root, 'BAO_CAO_RUBRIC_CODE.txt'), report.join('\r\n')+'\r\n', 'utf8');
console.log(`\nPASS=${totals.PASS}; FAIL=${totals.FAIL}; CAN_THU_THEM=${totals.CHECK}`);
console.log('Luu bao cao: BAO_CAO_RUBRIC_CODE.txt');
process.exitCode = totals.FAIL ? 1 : 0;
