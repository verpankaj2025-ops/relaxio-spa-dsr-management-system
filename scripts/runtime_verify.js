import fs from 'fs';
import path from 'path';
import child from 'child_process';

const OUT = path.join(process.cwd(),'tmp','verify_results');
const HOST = 'http://127.0.0.1:3000';
fs.mkdirSync(OUT,{recursive:true});

async function post(pathname, body){
  const res = await fetch(HOST+pathname,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const text = await res.text();
  try{ return JSON.parse(text);}catch(e){return {status:res.status,text};}
}
async function get(pathname, token){
  const headers = {};
  if(token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(HOST+pathname,{headers});
  const text = await res.text();
  try{ return JSON.parse(text);}catch(e){return {status:res.status,text};}
}

(async()=>{
  try{
    // login
    const login = await post('/api/auth/login',{email:'admin@thecloudspa.in',password:'CloudSpa-Admin-2026!'});
    fs.writeFileSync(path.join(OUT,'login.json'),JSON.stringify(login,null,2),'utf8');
    const token = login?.token || '';
    fs.writeFileSync(path.join(OUT,'jwt.token'),token,'utf8');

    const me = await get('/api/auth/me',token); fs.writeFileSync(path.join(OUT,'me.json'),JSON.stringify(me,null,2),'utf8');
    const users = await get('/api/users',token); fs.writeFileSync(path.join(OUT,'users.json'),JSON.stringify(users,null,2),'utf8');
    const settings = await get('/api/settings',token); fs.writeFileSync(path.join(OUT,'settings.json'),JSON.stringify(settings,null,2),'utf8');
    const entries_before = await get('/api/entries',token); fs.writeFileSync(path.join(OUT,'entries_before.json'),JSON.stringify(entries_before,null,2),'utf8');

    const entryCreate = await post('/api/entries',{visit_date:'2026-08-17',customer_name:'VERIFY_PERSIST',amount:9999,remarks:'VERIFY_PERSIST'});
    fs.writeFileSync(path.join(OUT,'entry_create.json'),JSON.stringify(entryCreate,null,2),'utf8');

    const entries_after = await get('/api/entries',token); fs.writeFileSync(path.join(OUT,'entries_after_create.json'),JSON.stringify(entries_after,null,2),'utf8');

    // find id
    let entryId = '';
    if(Array.isArray(entries_after)){
      const found = entries_after.find(e=>e.remarks==='VERIFY_PERSIST');
      if(found) entryId = found.id || found._id || found.entry_id || '';
    }
    fs.writeFileSync(path.join(OUT,'entry_id.txt'),String(entryId),'utf8');

    const dashboard = await get('/api/dashboard/summary',token); fs.writeFileSync(path.join(OUT,'dashboard.json'),JSON.stringify(dashboard,null,2),'utf8');

    // run exports
    try{ child.execSync('node scripts/verify_exports.js',{stdio:'inherit'}); }catch(e){ /* ignore */ }
    fs.copyFileSync(path.join(process.cwd(),'data','spa_database.json'),path.join(OUT,'db_before.json'));

    console.log('runtime_verify: done pre-restart');
    process.exit(0);
  }catch(err){ console.error(err); process.exit(2);} })();
