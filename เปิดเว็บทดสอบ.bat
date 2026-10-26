@echo off
chcp 65001 >nul
rem เปิดเว็บทดสอบในเครื่องที่ http://localhost:8080 (ต้องเปิดผ่านนี้เท่านั้น ตัวตั้งค่าเว็บ VIP ถึงจะแสดงจอตัวอย่างได้ — ห้ามดับเบิลคลิกเปิด owner.html ตรงๆ)
cd /d "%~dp0"
where node >nul 2>nul || (echo ไม่พบ Node.js - ติดตั้งที่ https://nodejs.org ก่อน & pause & exit /b 1)
echo กำลังเปิดเซิร์ฟเวอร์ที่ http://localhost:8080 ... ปิดหน้าต่างนี้เมื่อใช้งานเสร็จ
start "" "http://localhost:8080/owner.html#/admin/vipsite"
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';const f=path.normalize(path.join(root,p));if(!f.startsWith(root)){s.writeHead(403);return s.end();}fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end('not found');}s.writeHead(200,{'Content-Type':T[path.extname(f).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});s.end(d);});}).listen(8080,'127.0.0.1');"
