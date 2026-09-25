import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("認証、JSON保存、評点履歴と編集権限", async () => {
  const dir=await mkdtemp(path.join(os.tmpdir(),"limbus-data-"));
  const child=spawn(process.execPath,["server.js"],{cwd:path.dirname(fileURLToPath(import.meta.url)),env:{...process.env,PORT:"0",DATA_DIR:dir,ADMIN_PASSWORD:"test-admin-password",VIEWER_PASSWORD:"test-viewer-password",SESSION_SECRET:"a".repeat(48)},stdio:["ignore","pipe","pipe"]});
  try {
    const port=await new Promise((resolve,reject)=>{
      let output="";
      const timer=setTimeout(()=>reject(Error("Server did not start")),10000);
      child.stdout.on("data",chunk=>{output+=chunk;if(/Listening on http:\/\/localhost:(\d+)/.test(output)){clearTimeout(timer);resolve(Number(RegExp.$1));}});
      child.once("error",reject);child.once("exit",code=>reject(Error("Server exited: "+code)));
    });
    const url="http://127.0.0.1:"+port;
    const request=(p,options={})=>fetch(url+p,{redirect:"manual",...options});
    let r=await request("/");assert.equal(r.status,303);assert.equal(r.headers.get("location"),"/login");
    r=await request("/login",{method:"POST",body:new URLSearchParams({password:"test-admin-password"})});
    assert.equal(r.status,303);const adminCookie=r.headers.get("set-cookie").split(";")[0];
    r=await request("/admin/new",{headers:{cookie:adminCookie}});
    assert.equal(r.status,200);
    const form=await r.text(),csrf=/name="csrf" value="([^"]+)"/.exec(form)?.[1];assert.ok(csrf);
    const fields={csrf,id:"identity_001",character:"イサン",name:"テスト人格",score:"8.5",comment:"初回評価"};
    r=await request("/save",{method:"POST",headers:{cookie:adminCookie},body:new URLSearchParams(fields)});
    assert.equal(r.status,303);
    let saved=JSON.parse(await readFile(path.join(dir,"identities","identity_001.json"),"utf8"));
    assert.equal(saved.rating.score,8.5);assert.equal(saved.rating_history.length,0);
    r=await request("/save",{method:"POST",headers:{cookie:adminCookie},body:new URLSearchParams({...fields,score:"9",comment:"上方修正"})});
    assert.equal(r.status,400);
    r=await request("/save",{method:"POST",headers:{cookie:adminCookie},body:new URLSearchParams({...fields,score:"9",comment:"上方修正",reason:"再評価"})});
    assert.equal(r.status,303);
    saved=JSON.parse(await readFile(path.join(dir,"identities","identity_001.json"),"utf8"));
    assert.equal(saved.rating.score,9);assert.deepEqual(saved.rating_history.map(h=>[h.score,h.changed_to,h.reason]),[[8.5,9,"再評価"]]);
    r=await request("/login",{method:"POST",body:new URLSearchParams({password:"test-viewer-password"})});
    const viewerCookie=r.headers.get("set-cookie").split(";")[0];
    r=await request("/identities/identity_001",{headers:{cookie:viewerCookie}});
    assert.equal(r.status,200);assert.match(await r.text(),/8.5 → 9.0/);
    r=await request("/admin/identity_001",{headers:{cookie:viewerCookie}});assert.equal(r.status,403);
    r=await request("/save",{method:"POST",headers:{cookie:viewerCookie},body:new URLSearchParams(fields)});assert.equal(r.status,403);
  } finally {child.kill();await rm(dir,{recursive:true,force:true});}
});
