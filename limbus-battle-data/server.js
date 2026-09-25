import http from "node:http";
import { readFile, readdir, mkdir, writeFile, rename, unlink } from "node:fs/promises";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, "data"));
const port = Number(process.env.PORT || 3000);
const adminPassword = process.env.ADMIN_PASSWORD;
const viewerPassword = process.env.VIEWER_PASSWORD;
const secret = process.env.SESSION_SECRET;
if (!adminPassword || !viewerPassword || !secret || secret.length < 32) {
  console.error("ADMIN_PASSWORD, VIEWER_PASSWORD and SESSION_SECRET (32+ characters) are required.");
  process.exit(1);
}
if (!Number.isInteger(port) || port < 0 || port > 65535) throw Error("Invalid PORT");
await mkdir(path.join(dataDir, "identities"), { recursive: true });

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeId = id => /^[a-z0-9][a-z0-9_-]{0,79}$/.test(id);
const fileFor = id => path.join(dataDir, "identities", id + ".json");
const sign = payload => createHmac("sha256", secret).update(payload).digest("base64url");
const equal = (a,b) => {const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);};
const session = req => {
  const token = /(?:^|;\s*)session=([^;]+)/.exec(req.headers.cookie || "")?.[1];
  if (!token) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac || !equal(mac, sign(payload))) return null;
  try {const s=JSON.parse(Buffer.from(payload,"base64url").toString());return s.exp>Date.now()&&["admin","viewer"].includes(s.role)?s:null;} catch{return null;}
};
const csrf = s => sign("csrf:"+s.nonce);
const setSession = (res, role) => {
  const payload=Buffer.from(JSON.stringify({role,nonce:randomBytes(16).toString("hex"),exp:Date.now()+7*864e5})).toString("base64url");
  res.setHeader("Set-Cookie", `session=${payload}.${sign(payload)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`);
};
const html = (title,body) => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)} | リンバスバトルデータ</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css"></head><body><main class="shell">${body}</main></body></html>`;
const send = (res,status,content,headers={}) => {res.writeHead(status,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'self'; img-src 'self' https:; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",...headers});res.end(content);};
const jump = (res,to) => {res.writeHead(303,{"Location":to,"Cache-Control":"no-store"});res.end();};
const error = (res,status,message) => send(res,status,html("エラー",`<a class="back" href="/">← 一覧</a><h1>${esc(message)}</h1>`));
const readBody = async req => {let raw="";for await(const part of req){raw+=part;if(raw.length>20000)throw Error("too large");}return new URLSearchParams(raw);};
const readOne = async id => {try{return JSON.parse(await readFile(fileFor(id),"utf8"));}catch(e){if(e.code==="ENOENT")return null;throw e;}};
const all = async () => {const files=(await readdir(path.join(dataDir,"identities"))).filter(f=>f.endsWith(".json"));return (await Promise.all(files.map(f=>readOne(f.slice(0,-5))))).filter(Boolean).sort((a,b)=>b.rating.score-a.rating.score||a.name.localeCompare(b.name,"ja"));};
const save = async record => {
  const target=fileFor(record.id),tmp=target+"."+randomBytes(8).toString("hex")+".tmp";
  try {await writeFile(tmp,JSON.stringify(record,null,2)+"\n",{flag:"wx"});await rename(tmp,target);}catch(e){await unlink(tmp).catch(()=>{});throw e;}
};
const header = (s,count) => `<header class="topbar"><div class="brand"><span class="brandmark">L</span>リンバスバトルデータ</div><span>人格評点 / ${count}件</span></header>`;
const image = (r,klass) => `<div class="${klass}">${r.image_url?`<img src="${esc(r.image_url)}" alt="">`:"画像未登録"}</div>`;
const login = (res,failed=false) => send(res,200,html("ログイン",`<header class="topbar"><div class="brand"><span class="brandmark">L</span>リンバスバトルデータ</div></header><section class="login"><p class="eyebrow">PRIVATE ACCESS</p><h1>ログイン</h1><p class="muted">閲覧用または管理者用のパスワードを入力してください。</p><form method="post" action="/login" class="form"><label>パスワード<input type="password" name="password" required autocomplete="current-password"></label>${failed?'<p class="error">パスワードが違います。</p>':""}<button class="button">ログイン</button></form></section>`));
const field = (label,name,value="",type="text",extra="") => `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const editor = (r,s,message="") => html(r?"評点を編集":"人格を登録",`<a href="${r?"/identities/"+encodeURIComponent(r.id):"/"}" class="back">← 戻る</a><p class="eyebrow">EDITOR</p><h1>${r?"評点を編集":"人格を登録"}</h1><form action="/save" method="post" class="form"><input type="hidden" name="csrf" value="${csrf(s)}"><div class="formgrid">${field("ID","id",r?.id,"text",r?'readonly':'required pattern="[a-z0-9_-]+"')}${field("囚人名","character",r?.character,"text",r?"readonly":"required")}</div>${field("人格名","name",r?.name,"text",r?"readonly":"required")}<div class="formgrid">${field("評点（0〜10）","score",r?.rating.score,"number",'required min="0" max="10" step="0.1"')}${field("画像URL（任意）","image_url",r?.image_url,"url")}</div><label>評価コメント<textarea name="comment" rows="5" required>${esc(r?.rating.comment)}</textarea></label>${r?'<label>変更理由（評価を変える場合）<textarea name="reason" rows="2"></textarea></label>':""}${message?`<p class="error">${esc(message)}</p>`:""}<button class="button">保存</button></form>`);

const attempts=new Map();
const server=http.createServer(async (req,res)=>{
  try {
    const u=new URL(req.url,"http://localhost"),s=session(req),admin=s?.role==="admin",readable=Boolean(s)||process.env.PUBLIC_READ==="true";
    if(req.method==="GET"&&["/style.css","/favicon.svg"].includes(u.pathname)){const file=path.join(root,"public",u.pathname.slice(1));res.writeHead(200,{"Content-Type":u.pathname.endsWith(".css")?"text/css; charset=utf-8":"image/svg+xml","Cache-Control":"public, max-age=3600"});res.end(await readFile(file));return;}
    if(req.method==="GET"&&u.pathname==="/login"){login(res);return;}
    if(req.method==="POST"&&u.pathname==="/login"){
      const ip=req.socket.remoteAddress||"unknown",item=attempts.get(ip)||{count:0,until:0};
      if(item.count>=10&&item.until>Date.now()){error(res,429,"しばらくしてから再試行してください");return;}
      const f=await readBody(req),p=f.get("password")||"",role=equal(p,adminPassword)?"admin":equal(p,viewerPassword)?"viewer":null;
      if(!role){attempts.set(ip,{count:item.count+1,until:Date.now()+15*60_000});login(res,true);return;}
      attempts.delete(ip);setSession(res,role);jump(res,"/");return;
    }
    if(req.method==="POST"&&u.pathname==="/logout"){res.setHeader("Set-Cookie","session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");jump(res,"/login");return;}
    if(!readable){jump(res,"/login");return;}
    if(req.method==="GET"&&u.pathname==="/"){
      const rows=await all();
      const items=rows.map(r=>`<a href="/identities/${encodeURIComponent(r.id)}" class="item">${image(r,"portrait")}<div class="itemcopy"><span class="character">${esc(r.character)}</span><strong>${esc(r.name)}</strong><small>更新 ${esc(r.rating.updated_at)}</small></div><div class="score"><span>評点</span><strong>${Number(r.rating.score).toFixed(1)}</strong></div></a>`).join("");
      send(res,200,html("人格一覧",`${header(s,rows.length)}<div class="heading"><div><p class="eyebrow">IDENTITY RATINGS</p><h1>人格一覧</h1><p class="muted">独自評点と、その評価の記録。</p></div>${admin?'<a class="button" href="/admin/new">＋ 人格を登録</a>':""}</div>${rows.length?`<div class="list">${items}</div>`:`<section class="empty"><span>◇</span><h2>人格はまだ登録されていません</h2><p>評点を登録すると、ここに一覧が表示されます。</p>${admin?'<a class="button" href="/admin/new">最初の人格を登録</a>':""}</section>`}<footer>評点は個人の評価です。${s?'<form method="post" action="/logout"><button class="textbutton">ログアウト</button></form>':""}</footer>`));return;
    }
    const detail=/^\/identities\/([^/]+)$/.exec(u.pathname),edit=/^\/admin\/([^/]+)$/.exec(u.pathname);
    if(req.method==="GET"&&detail){
      const id=decodeURIComponent(detail[1]),r=safeId(id)?await readOne(id):null;if(!r){error(res,404,"人格が見つかりません");return;}
      const hist=[...(r.rating_history||[])].reverse().map(h=>`<li><time>${esc(h.date)}</time><strong>${Number(h.score).toFixed(1)} → ${Number(h.changed_to).toFixed(1)}</strong><p>${esc(h.reason)}</p><small>変更前: ${esc(h.comment)}</small></li>`).join("");
      send(res,200,html(r.name,`<a href="/" class="back">← 人格一覧</a><section class="detailhead">${image(r,"detailimage")}<div><p class="eyebrow">${esc(r.character)} / IDENTITY</p><h1>${esc(r.name)}</h1><p class="muted">最終更新 ${esc(r.rating.updated_at)}</p></div></section><section class="ratingbox"><div class="score big"><span>総合評点</span><strong>${Number(r.rating.score).toFixed(1)}</strong><small>/ 10</small></div><div><h2>評価コメント</h2><p class="comment">${esc(r.rating.comment)}</p></div></section>${admin?`<a class="button editlink" href="/admin/${encodeURIComponent(id)}">評点・コメントを編集</a>`:""}<section class="history"><h2>評点変更履歴</h2>${hist?`<ol>${hist}</ol>`:'<p class="muted">変更履歴はありません。</p>'}</section>`));return;
    }
    if(req.method==="GET"&&(u.pathname==="/admin/new"||edit)){if(!admin){error(res,403,"編集権限がありません");return;}const id=u.pathname==="/admin/new"?null:decodeURIComponent(edit[1]),r=id&&safeId(id)?await readOne(id):null;if(id&&!r){error(res,404,"人格が見つかりません");return;}send(res,200,editor(r,s));return;}
    if(req.method==="POST"&&u.pathname==="/save"){
      if(!admin){error(res,403,"編集権限がありません");return;}
      if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){error(res,403,"送信元を確認できません");return;}
      const f=await readBody(req);if(!equal(f.get("csrf")||"",csrf(s))){error(res,403,"操作を確認できません");return;}
      const id=(f.get("id")||"").trim(),character=(f.get("character")||"").trim(),name=(f.get("name")||"").trim(),comment=(f.get("comment")||"").trim(),reason=(f.get("reason")||"").trim(),image_url=(f.get("image_url")||"").trim(),score=Number(f.get("score"));
      const old=safeId(id)?await readOne(id):null;
      let problem=!safeId(id)?"IDの形式が正しくありません":!character||!name||!comment||!Number.isFinite(score)||score<0||score>10?"必須項目を確認してください":"";
      if(old&&(old.character!==character||old.name!==name))problem="登録済みのIDです";
      if(image_url){try{if(new URL(image_url).protocol!=="https:")throw Error();}catch{problem="画像URLはhttps://で入力してください";}}
      const changed=old&&(old.rating.score!==score||old.rating.comment!==comment);
      if(changed&&!reason)problem="変更理由を入力してください";
      if(problem){send(res,400,editor(old||{id,character,name,image_url,rating:{score:Number.isFinite(score)?score:0,comment},rating_history:[]},s,problem));return;}
      const date=new Date().toISOString().slice(0,10),record={...(old||{}),id,character,name,...(image_url?{image_url}:{}),rating:changed||!old?{...(old?.rating||{}),score,comment,updated_at:date}:old.rating,rating_history:changed?[...(old.rating_history||[]),{date,score:old.rating.score,comment:old.rating.comment,updated_at:old.rating.updated_at,changed_to:score,reason}]:old?.rating_history||[]};
      await save(record);jump(res,"/identities/"+encodeURIComponent(id));return;
    }
    error(res,404,"ページが見つかりません");
  }catch(e){console.error(e);error(res,500,"処理できませんでした");}
});
server.listen(port,()=>console.log(`Listening on http://localhost:${server.address().port}`));
