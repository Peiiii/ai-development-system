import assert from "node:assert/strict";
import test from "node:test";
import {promises as fs} from "node:fs";
import path from "node:path";
import os from "node:os";
import {startDashboard} from "../lib/dashboard.mjs";

test("preview stream requires auth and explicit watch mode, reports changes and closes cleanly", async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "qingtian-watch-"));
  t.after(() => fs.rm(directory,{recursive:true,force:true}));
  const plain = await startDashboard({roots:[],configDir:path.join(directory,"config")});
  t.after(() => plain.server.listening ? plain.close() : undefined);
  assert.equal((await fetch(plain.origin+"/api/preview",{headers:{Authorization:`Bearer ${plain.token}`}})).status,404);
  await plain.close();
  const assets = path.join(directory,"assets");await fs.mkdir(assets);await fs.writeFile(path.join(assets,"styles.css"),"body {}\n");
  const watched = await startDashboard({roots:[],configDir:path.join(directory,"config"),livePreview:true,assetsDirectory:assets});
  t.after(() => watched.server.listening ? watched.close() : undefined);
  assert.equal((await fetch(watched.origin+"/api/preview")).status,401);
  const response=await fetch(watched.origin+"/api/preview",{headers:{Authorization:`Bearer ${watched.token}`},signal:AbortSignal.timeout(5000)});
  assert.equal(response.status,200);assert.match(response.headers.get("content-type"),/text\/event-stream/);
  const reader=response.body.getReader();const decoder=new TextDecoder();let data="";
  while(!data.includes('"type":"ready"'))data+=decoder.decode((await reader.read()).value);
  await fs.appendFile(path.join(assets,"styles.css"),"body {color:red}\n");
  while(!data.includes('"type":"change"'))data+=decoder.decode((await reader.read()).value);
  assert.match(data,/styles\.css/);
  await watched.close();
  while(!(await reader.read()).done) { /* Drain the final queued event. */ }
});
