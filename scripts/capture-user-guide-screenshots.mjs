import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const outDir = process.env.BDTT_SCREENSHOT_DIR
  ? path.resolve(process.env.BDTT_SCREENSHOT_DIR)
  : path.join(root, "docs", "user-guide-assets");
fs.mkdirSync(outDir, { recursive: true });

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.BDTT_BASE_URL ?? "http://localhost:3007";
const profileDir = path.join(os.tmpdir(), `bdtt-guide-chrome-${Date.now()}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chrome = spawn(chromePath, [
  "--headless=new",
  "--remote-debugging-port=0",
  `--user-data-dir=${profileDir}`,
  "--no-first-run",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=390,844",
  "about:blank"
], { stdio: "ignore" });

const waitForDevtoolsPort = async () => {
  const portFile = path.join(profileDir, "DevToolsActivePort");
  for (let i = 0; i < 100; i += 1) {
    if (fs.existsSync(portFile)) {
      const lines = fs.readFileSync(portFile, "utf8").trim().split(/\r?\n/);
      if (lines[0]) return Number(lines[0]);
    }
    await sleep(100);
  }
  throw new Error("Chrome DevTools port not available");
};

const getJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.events = new Map();
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          reject(new Error(`${message.error.message}: ${JSON.stringify(message.error.data ?? "")}`));
        } else {
          resolve(message.result ?? {});
        }
        return;
      }

      const handlers = this.events.get(message.method);
      if (handlers) {
        handlers.forEach((handler) => handler(message.params ?? {}));
      }
    });
  }

  open() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("WebSocket open timeout")), 10000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 20000);
    });
    this.ws.send(JSON.stringify({ id, method, params }));
    return promise;
  }

  on(method, handler) {
    const handlers = this.events.get(method) ?? [];
    handlers.push(handler);
    this.events.set(method, handlers);
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // no-op
    }
  }
}

const connectPage = async (port) => {
  for (let i = 0; i < 50; i += 1) {
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    if (page) return new CdpClient(page.webSocketDebuggerUrl);
    await sleep(100);
  }
  throw new Error("No debuggable page target");
};

const setMobile = async (cdp) => {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
    isMobile: true,
    screenWidth: 390,
    screenHeight: 844
  });
  await cdp.send("Emulation.setUserAgentOverride", {
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });
};

const navigate = async (cdp, url) => {
  let loaded = false;
  cdp.on("Page.loadEventFired", () => {
    loaded = true;
  });
  await cdp.send("Page.navigate", { url });
  for (let i = 0; i < 120 && !loaded; i += 1) {
    await sleep(100);
  }
  await sleep(900);
};

const evaluate = async (cdp, expression, awaitPromise = true) => {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");
  }
  return result.result?.value;
};

const screenshot = async (cdp, fileName) => {
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  const outPath = path.join(outDir, fileName);
  fs.writeFileSync(outPath, Buffer.from(result.data, "base64"));
  console.log(outPath);
};

const seedSession = async (cdp, mode) => {
  await navigate(cdp, `${baseUrl}/login`);
  await evaluate(cdp, `
    (() => {
      localStorage.setItem('bdtt-remember-login', 'true');
      localStorage.setItem('bdtt-theme', 'light');
      document.cookie = 'bdtt-theme=light; path=/; max-age=31536000';
      document.documentElement.classList.remove('dark');
    })();
  `);
  await sleep(500);
  await evaluate(cdp, `
    (() => {
      const key = 'bdtt-progress-demo-v4';
      const raw = localStorage.getItem(key);
      if (!raw) return { ok: false, reason: 'missing storage' };
      const data = JSON.parse(raw);
      const setReady = (id) => {
        data.accounts = data.accounts.map((account) => account.id === id ? { ...account, canLogin: true, mustChangePassword: false } : account);
        data.profiles = data.profiles.map((profile) => profile.id === id ? { ...profile, mustChangePassword: false } : profile);
        data.activeUserId = id;
      };
      if (${JSON.stringify(mode)} === 'admin') {
        const admin = data.accounts.find((account) => account.username === 'vinhlpp') || data.accounts.find((account) => account.role === 'admin');
        if (!admin) return { ok: false, reason: 'admin missing' };
        setReady(admin.id);
      } else {
        const preferred = data.accounts.find((account) => account.username === 'thanhcm');
        const worker = preferred || data.accounts.find((account) => data.tasks.some((task) => task.assignedTo === account.id));
        if (!worker) return { ok: false, reason: 'worker missing' };
        setReady(worker.id);
      }
      localStorage.setItem(key, JSON.stringify(data));
      return { ok: true, activeUserId: data.activeUserId };
    })();
  `);
};

const clickVisibleByText = async (cdp, patternSource) => {
  return evaluate(cdp, `
    (() => {
      const pattern = new RegExp(${JSON.stringify(patternSource)}, 'i');
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const target = nodes.find((node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && pattern.test((node.textContent || '').trim());
      });
      if (!target) return false;
      target.click();
      return true;
    })();
  `);
};

try {
  const port = await waitForDevtoolsPort();
  const cdp = await connectPage(port);
  await cdp.open();
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await setMobile(cdp);

  await navigate(cdp, `${baseUrl}/login`);
  await evaluate(cdp, "document.documentElement.classList.remove('dark'); document.body.classList.remove('dark');");
  await sleep(1000);
  await screenshot(cdp, "mobile-login.png");

  await seedSession(cdp, "worker");
  await navigate(cdp, `${baseUrl}/worker`);
  await evaluate(cdp, "document.documentElement.classList.remove('dark'); document.body.classList.remove('dark');");
  await sleep(1000);
  await screenshot(cdp, "mobile-worker-tasks.png");

  await evaluate(cdp, "window.scrollTo({ top: Math.max(0, document.querySelector('article')?.offsetTop - 24), behavior: 'instant' });");
  await sleep(400);
  await evaluate(cdp, `
    (() => {
      const visible = (node) => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && style.display !== 'none' && style.visibility !== 'hidden';
      };
      const buttons = Array.from(document.querySelectorAll('button')).filter((button) => visible(button) && /^(25|50|75)%$/.test(button.textContent.trim()));
      const target = buttons.find((button) => button.textContent.trim() === '25%') || buttons[0];
      if (target) target.click();
      return Boolean(target);
    })();
  `);
  await sleep(600);
  await screenshot(cdp, "mobile-worker-pending-update.png");

  await clickVisibleByText(cdp, "Tổng quan");
  await sleep(700);
  await screenshot(cdp, "mobile-worker-overview.png");

  await clickVisibleByText(cdp, "Lịch sử");
  await sleep(700);
  await screenshot(cdp, "mobile-worker-history.png");

  await seedSession(cdp, "admin");
  await navigate(cdp, `${baseUrl}/admin`);
  await evaluate(cdp, "document.documentElement.classList.remove('dark'); document.body.classList.remove('dark');");
  await sleep(1200);
  await screenshot(cdp, "mobile-admin-dashboard.png");

  await navigate(cdp, `${baseUrl}/admin/tasks`);
  await sleep(1200);
  await screenshot(cdp, "mobile-admin-workorder.png");

  cdp.close();
  chrome.kill();
} catch (error) {
  console.error(error);
  try {
    chrome.kill();
  } catch {
    // no-op
  }
  process.exit(1);
}
