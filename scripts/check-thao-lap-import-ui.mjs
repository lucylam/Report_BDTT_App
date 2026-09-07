import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Browser fixture test: every /api request is intercepted. No live data is read or written.
const base = "http://localhost:3001";
const output = path.resolve(".next/thao-lap-qa");
fs.mkdirSync(output, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "bdtt-import-qa-"));
const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
  "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`, "--no-first-run", "--disable-gpu", "about:blank"
], { stdio: "ignore", windowsHide: true });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let ws;
const pending = new Map();
let sequence = 0;
let failPreview = false;
let importCount = 0;
let previewCount = 0;
const account = {
  id: "user-vinhlpp", username: "vinhlpp", email: "local@test.invalid", employeeCode: "TEST", fullName: "Người báo cáo local",
  resourceName: "Người báo cáo local", role: "admin", orgGroup: "", subgroup: "", orgRole: "supervisor", orgTitle: "DATA admin",
  orgAssignment: "", managedGroups: [], managedSubgroups: [], isPlaceholder: false, canLogin: true, mustChangePassword: false
};
const appData = { accounts: [account], profiles: [], tasks: [], progress: [], dailySnapshots: [], offlineQueue: [], activeUserId: account.id };
const fixture = {
  checksum: "fixture", sheetName: "IMPORT_THAO_LAP", groupName: "Tháo/Lắp TB ĐK", hasBlockingErrors: false, errors: [],
  stats: { total: 2, added: 1, updated: 1, unchanged: 0, cancelled: 1, progress: 2, missing: 1 },
  changes: [
    { sheetRow: 3, wo: "WO-2026-NEW", tagname: "TAG-THAO-LAP-2026-PN1", taskName: "Tháo lắp thiết bị điều khiển phát sinh tại phân xưởng, kiểm tra và bàn giao sau bảo dưỡng", kind: "new", fields: [], reports: [{ date: "2026-09-07", before: null, after: 50 }], cancelled: false },
    { sheetRow: 4, wo: "WO-2026-CANCEL", tagname: "TAG-PLAN", taskName: "Công việc kế hoạch được hủy do không còn nhu cầu thực hiện", kind: "updated", fields: ["Trạng thái hủy", "Lý do hủy"], reports: [{ date: "2026-09-07", before: 25, after: 50 }], cancelled: true }
  ], missingTasks: [{ wo: "WO-MISSING", tagname: "TAG-MISSING", taskName: "Công việc vắng khỏi Sheet vẫn giữ nguyên trên web" }]
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 15000);
  pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const waitFor = async (expression) => {
  for (let index = 0; index < 100; index += 1) { if (await evaluate(expression)) return; await delay(200); }
  throw new Error(`Condition timed out: ${expression}`);
};
const click = async (label) => evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()===${JSON.stringify(label)})?.click()`);
try {
  const portFile = path.join(profileDir, "DevToolsActivePort");
  for (let index = 0; index < 100 && !fs.existsSync(portFile); index += 1) await delay(100);
  const port = fs.readFileSync(portFile, "utf8").split(/\r?\n/)[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const callback = pending.get(message.id);
      if (callback) { pending.delete(message.id); if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result); }
    }
    if (message.method === "Fetch.requestPaused") {
      const { requestId, request } = message.params;
      const url = new URL(request.url);
      let payload = { ok: true, notifications: [], unreadCount: 0, modules: [] };
      let status = 200;
      if (url.pathname === "/api/app-data") payload = { ok: true, data: appData };
      if (url.pathname === "/api/google-sheets/import-thao-lap") {
        const body = JSON.parse(request.postData || "{}");
        if (body.action === "preview") {
          previewCount += 1;
          if (failPreview) { status = 500; payload = { error: "Lỗi kết nối Sheet thử nghiệm" }; }
          else payload = { ok: true, ...fixture };
        } else if (body.action === "apply") {
          importCount += 1;
          assert.equal(body.expectedChecksum, "fixture");
          payload = { ok: true, ...fixture, applied: { added: 1, updated: 1, progress: 2, cancelled: 1 } };
        } else { status = 503; payload = { error: "Mẫu Excel chưa sẵn sàng trong fixture" }; }
      }
      void send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(payload)).toString("base64") });
    }
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: `${base}/admin/upload` });
  await waitFor("document.body.innerText.includes('Import riêng · Tháo lắp TB HTĐK')");
  await waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Đã hiểu, bắt đầu')");
  await click("Đã hiểu, bắt đầu");
  await waitFor("!document.body.innerText.includes('Bắt đầu làm việc với BDTT')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Xác nhận import nhóm').disabled"), true);
  await click("Tải mẫu Excel của nhóm");
  await waitFor("document.body.innerText.includes('Mẫu Excel chưa sẵn sàng trong fixture')");
  assert.equal(await evaluate("location.pathname"), "/admin/upload");
  await click("Đọc và xem trước import nhóm");
  await waitFor("document.body.innerText.includes('WO-2026-NEW')");
  await evaluate("window.panel = Array.from(document.querySelectorAll('h2')).find(h=>h.textContent.includes('Import riêng')).closest('section'); void 0;");
  fs.writeFileSync(path.join(output, "desktop.png"), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Xác nhận import nhóm').disabled"), false);

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate("panel.querySelectorAll('details').forEach(d=>d.open=true); panel.scrollIntoView();");
  await delay(200);
  fs.writeFileSync(path.join(output, "mobile.png"), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  await evaluate(`(() => {
    const sizes = Array.from(panel.querySelectorAll('*')).map(el => ({el, size: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight)}));
    sizes.forEach(({el,size,line}) => { el.style.setProperty('font-size', size*2+'px', 'important'); if(Number.isFinite(line)) el.style.setProperty('line-height', line*2+'px', 'important'); });
  })()`);
  await delay(200);
  const issues = await evaluate(`Array.from(panel.querySelectorAll('p, li, button, summary, strong, h2')).filter(el => {
    if(!el.getClientRects().length || !el.textContent.trim()) return false;
    return el.scrollWidth > el.clientWidth + 2;
  }).map(el=>({tag:el.tagName,text:el.textContent.trim().slice(0,90),scroll:el.scrollWidth,width:el.clientWidth}))`);
  assert.deepEqual(issues, [], `Overflow at 200%: ${JSON.stringify(issues)}`);
  fs.writeFileSync(path.join(output, "mobile-200.png"), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
  await click("Xác nhận import nhóm");
  await waitFor("document.body.innerText.includes('Đã import: 1 công việc mới')");
  await waitFor("Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Xác nhận import nhóm')");
  assert.equal(importCount, 1);
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Xác nhận import nhóm').disabled"), true);
  failPreview = true;
  await click("Đọc và xem trước import nhóm");
  await waitFor("document.body.innerText.includes('Lỗi kết nối Sheet thử nghiệm')");
  assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Xác nhận import nhóm').disabled"), true);
  failPreview = false;
  await click("Đọc và xem trước import nhóm");
  await waitFor("document.body.innerText.includes('WO-2026-NEW')");
  assert.equal(previewCount, 3);
  console.log(`PASS: preview/apply/refresh, stale preview cleared on error, download error stays inline, desktop/mobile/200% layout. Screenshots: ${output}`);
} finally {
  ws?.close();
  chrome.kill();
}
