export interface BrowserCaptureOptions {
  browser?: string;
  width?: number;
  height?: number;
  timeoutMs?: number;
}

export interface IframeCaptureOptions extends BrowserCaptureOptions {
  url: string;
  selector?: string;
}

interface JsonObject {
  [key: string]: unknown;
}

interface CdpMessage {
  id?: number;
  method?: string;
  params?: JsonObject;
  sessionId?: string;
  result?: JsonObject;
  error?: { message?: string };
}

interface PendingCall {
  resolve(value: JsonObject): void;
  reject(error: Error): void;
}

interface EventWaiter {
  method: string;
  sessionId?: string;
  predicate?: (params: JsonObject) => boolean;
  resolve(params: JsonObject): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}

export async function capturePajaIframePng(
  options: IframeCaptureOptions,
): Promise<Uint8Array> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const width = options.width ?? 1280;
  const height = options.height ?? 800;
  const browser = await launchBrowser({
    browser: options.browser,
    width,
    height,
    timeoutMs,
  });
  const connection = await CdpConnection.connect(browser.webSocketUrl, timeoutMs);
  try {
    const target = await connection.send("Target.createTarget", { url: "about:blank" });
    const targetId = stringField(target, "targetId");
    const attached = await connection.send("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
    const sessionId = stringField(attached, "sessionId");
    await connection.send("Page.enable", {}, sessionId);
    await connection.send("Runtime.enable", {}, sessionId);
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);

    const loaded = connection.waitFor("Page.loadEventFired", sessionId, undefined, timeoutMs);
    await connection.send("Page.navigate", { url: options.url }, sessionId);
    await loaded;

    const rect = await waitForPajaIframeReady(
      connection,
      sessionId,
      options.selector ?? "#napplet-frame",
      timeoutMs,
    );
    const captured = await connection.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: true,
      clip: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        scale: 1,
      },
    }, sessionId);
    const data = stringField(captured, "data");
    return decodeBase64(data);
  } finally {
    connection.close();
    await browser.close();
  }
}

async function waitForPajaIframeReady(
  connection: CdpConnection,
  sessionId: string,
  selector: string,
  timeoutMs: number,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const deadline = Date.now() + timeoutMs;
  let lastReason = "not ready";
  while (Date.now() < deadline) {
    const value = await evaluateReadyState(connection, sessionId, selector);
    if (isReadyRect(value)) return value.rect;
    lastReason = typeof value.reason === "string" ? value.reason : JSON.stringify(value);
    await delay(250);
  }
  throw new Error(`Timed out waiting for Paja iframe readiness: ${lastReason}`);
}

async function evaluateReadyState(
  connection: CdpConnection,
  sessionId: string,
  selector: string,
): Promise<JsonObject> {
  const result = await connection.send("Runtime.evaluate", {
    expression: `(() => {
      const frame = document.querySelector(${JSON.stringify(selector)});
      const state = window.__KEHTO_PAJA__?.getState?.();
      if (!frame || !state) return { ready: false, reason: "missing-paja-frame-or-state" };
      const rect = frame.getBoundingClientRect();
      return {
        ready: state.status === "ready" && state.initSent && rect.width > 0 && rect.height > 0,
        reason: state.status,
        initSent: state.initSent,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      };
    })()`,
    returnByValue: true,
  }, sessionId);
  const remote = objectField(result, "result");
  return objectField(remote, "value");
}

function isReadyRect(
  value: JsonObject,
): value is { ready: true; rect: { x: number; y: number; width: number; height: number } } {
  if (value.ready !== true || typeof value.rect !== "object" || value.rect === null) return false;
  const rect = value.rect as Record<string, unknown>;
  const width = rect.width;
  const height = rect.height;
  return ["x", "y", "width", "height"].every((key) => typeof rect[key] === "number") &&
    typeof width === "number" && typeof height === "number" && width > 0 && height > 0;
}

class CdpConnection {
  #nextId = 1;
  #pending = new Map<number, PendingCall>();
  #eventWaiters = new Set<EventWaiter>();

  private constructor(private readonly ws: WebSocket) {
    ws.onmessage = (event) => this.handleMessage(event.data);
    ws.onclose = () => this.rejectAll(new Error("Browser DevTools connection closed"));
    ws.onerror = () => this.rejectAll(new Error("Browser DevTools connection failed"));
  }

  static async connect(url: string, timeoutMs: number): Promise<CdpConnection> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Timed out connecting to browser")),
        timeoutMs,
      );
      ws.onopen = () => {
        clearTimeout(timer);
        resolve();
      };
      ws.onerror = () => {
        clearTimeout(timer);
        reject(new Error("Could not connect to browser"));
      };
    });
    return new CdpConnection(ws);
  }

  send(method: string, params: JsonObject = {}, sessionId?: string): Promise<JsonObject> {
    const id = this.#nextId++;
    const message: CdpMessage = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(message));
    });
  }

  waitFor(
    method: string,
    sessionId: string | undefined,
    predicate: ((params: JsonObject) => boolean) | undefined,
    timeoutMs: number,
  ): Promise<JsonObject> {
    return new Promise((resolve, reject) => {
      const waiter: EventWaiter = {
        method,
        sessionId,
        predicate,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.#eventWaiters.delete(waiter);
          reject(new Error(`Timed out waiting for ${method}`));
        }, timeoutMs),
      };
      this.#eventWaiters.add(waiter);
    });
  }

  close(): void {
    this.ws.close();
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "string") return;
    const message = JSON.parse(data) as CdpMessage;
    if (typeof message.id === "number") {
      const pending = this.#pending.get(message.id);
      if (!pending) return;
      this.#pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? "Browser command failed"));
        return;
      }
      pending.resolve(message.result ?? {});
      return;
    }
    if (!message.method) return;
    for (const waiter of this.#eventWaiters) {
      if (waiter.method !== message.method) continue;
      if (waiter.sessionId && waiter.sessionId !== message.sessionId) continue;
      const params = message.params ?? {};
      if (waiter.predicate && !waiter.predicate(params)) continue;
      clearTimeout(waiter.timer);
      this.#eventWaiters.delete(waiter);
      waiter.resolve(params);
      return;
    }
  }

  private rejectAll(error: Error): void {
    for (const pending of this.#pending.values()) pending.reject(error);
    this.#pending.clear();
    for (const waiter of this.#eventWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
    this.#eventWaiters.clear();
  }
}

interface LaunchedBrowser {
  webSocketUrl: string;
  close(): Promise<void>;
}

async function launchBrowser(
  options: BrowserCaptureOptions & { width: number; height: number; timeoutMs: number },
): Promise<LaunchedBrowser> {
  const browser = await resolveBrowserExecutable(options.browser);
  const userDataDir = await Deno.makeTempDir({ prefix: "napplet-browser-" });
  const command = new Deno.Command(browser, {
    args: [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--no-sandbox",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      `--window-size=${options.width},${options.height}`,
      "about:blank",
    ],
    stdin: "null",
    stdout: "null",
    stderr: "piped",
  });
  const child = command.spawn();
  const webSocketUrl = await waitForDevToolsUrl(child, options.timeoutMs);
  return {
    webSocketUrl,
    async close() {
      try {
        child.kill("SIGTERM");
      } catch {
        // Already exited.
      }
      await child.status.catch(() => undefined);
      await Deno.remove(userDataDir, { recursive: true }).catch(() => undefined);
    },
  };
}

async function resolveBrowserExecutable(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  const env = Deno.env.get("NAPPLET_CHROME") ?? Deno.env.get("CHROME_BIN");
  if (env) return env;
  for (
    const candidate of [
      "chromium",
      "chromium-browser",
      "google-chrome",
      "google-chrome-stable",
      "microsoft-edge",
    ]
  ) {
    if (await commandExists(candidate)) return candidate;
  }
  throw new Error("No Chromium-compatible browser found. Set --browser or NAPPLET_CHROME.");
}

async function commandExists(command: string): Promise<boolean> {
  try {
    const result = await new Deno.Command(command, {
      args: ["--version"],
      stdout: "null",
      stderr: "null",
    }).output();
    return result.code === 0;
  } catch {
    return false;
  }
}

async function waitForDevToolsUrl(
  child: Deno.ChildProcess,
  timeoutMs: number,
): Promise<string> {
  const reader = child.stderr.getReader();
  const decoder = new TextDecoder();
  let output = "";
  const deadline = Date.now() + timeoutMs;
  try {
    while (Date.now() < deadline) {
      const timeout = delay(Math.min(250, deadline - Date.now())).then(() => null);
      const chunk = await Promise.race([reader.read(), timeout]);
      if (chunk === null) {
        const status = await Promise.race([child.status, delay(0).then(() => null)]);
        if (status && status.code !== 0) break;
        continue;
      }
      if (chunk.done) break;
      output += decoder.decode(chunk.value, { stream: true });
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match?.[1]) return match[1];
    }
  } finally {
    reader.releaseLock();
  }
  throw new Error(`Timed out waiting for browser DevTools URL${output ? `: ${output}` : ""}`);
}

function stringField(value: JsonObject, field: string): string {
  const entry = value[field];
  if (typeof entry !== "string") throw new Error(`Browser response missing ${field}`);
  return entry;
}

function objectField(value: JsonObject, field: string): JsonObject {
  const entry = value[field];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`Browser response missing ${field}`);
  }
  return entry as JsonObject;
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
