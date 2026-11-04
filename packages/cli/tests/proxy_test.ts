import { assert, assertEquals } from "./assert.ts";
import { proxyFor } from "../src/cli.ts";
import { parseCommand } from "../src/cli-args.ts";
import { parseProxyUrl, redactProxyUrl } from "../src/network.ts";

const CLI_DIR = new URL("..", import.meta.url);

function throwsMessage(work: () => unknown): string {
  try {
    work();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected an error");
}

Deno.test("parseProxyUrl accepts HTTP, HTTPS, SOCKS5 and SOCKS5h proxies, with or without credentials", () => {
  for (const value of ["http://127.0.0.1:8080", "https://proxy.example:443", "socks5://127.0.0.1:1080", "socks5h://127.0.0.1:9050/", "socks5://user:p%40ss@127.0.0.1:1080"]) {
    assertEquals(parseProxyUrl(value).href.startsWith(value.split(":")[0]), true, value);
  }
});

Deno.test("parseProxyUrl rejects other schemes, paths and malformed values without echoing credentials", () => {
  assert(throwsMessage(() => parseProxyUrl("ftp://user:secret@127.0.0.1:21")).includes("Unsupported --proxy scheme ftp:"));
  assert(!throwsMessage(() => parseProxyUrl("ftp://user:secret@127.0.0.1:21")).includes("secret"));
  assert(throwsMessage(() => parseProxyUrl("http://127.0.0.1:8080/path")).includes("only scheme"));
  assert(throwsMessage(() => parseProxyUrl("localhost:9050")).includes("Unsupported --proxy scheme localhost:"));
  assert(throwsMessage(() => parseProxyUrl("127.0.0.1:9050")).includes("Invalid --proxy URL"));
  assert(throwsMessage(() => parseProxyUrl("not a url")).includes("Invalid --proxy URL"));
});

Deno.test("redactProxyUrl hides credentials", () => {
  assertEquals(redactProxyUrl(new URL("socks5://user:secret@127.0.0.1:1080")), "socks5://***@127.0.0.1:1080");
  assertEquals(redactProxyUrl(new URL("http://127.0.0.1:8080")), "http://127.0.0.1:8080");
});

Deno.test("--proxy is accepted only by commands that reach Blossom servers or relays", () => {
  const read = (argv: string[]) => {
    const parsed = parseCommand(argv);
    return proxyFor(parsed, parsed.rest);
  };
  assertEquals(read(["deploy", "--proxy", "socks5h://127.0.0.1:9050"]), "socks5h://127.0.0.1:9050");
  assertEquals(read(["init", "--proxy", "http://127.0.0.1:8080"]), "http://127.0.0.1:8080");
  assertEquals(read(["keys", "connect", "--name", "remote", "--proxy", "http://127.0.0.1:8080"]), "http://127.0.0.1:8080");
  assertEquals(read(["deploy", "--dry-run"]), undefined);
  for (const argv of [["discover", "--proxy", "http://127.0.0.1:8080"], ["keys", "store", "--proxy", "http://127.0.0.1:8080"], ["conformance", "--proxy", "http://127.0.0.1:8080"]]) {
    assert(throwsMessage(() => read(argv)).includes("--proxy applies only to"), argv.join(" "));
  }
  assert(throwsMessage(() => read(["deploy", "--proxy", "http://a:1", "--proxy", "http://b:2"])).includes("Pass --proxy once"));
  assert(throwsMessage(() => read(["deploy", "--proxy"])).includes("Missing value for --proxy"));
});

Deno.test("the proxy lifecycle holds and every Blossom and relay call site goes through HTTP and SOCKS5 proxies, and none connects directly", async () => {
  // The fixture's services resolve only inside its proxies, so a direct connection fails instead of succeeding.
  const output = await new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-net=127.0.0.1,blossom.proxy.test,relay.proxy.test", "--allow-read", "--allow-env", "tests/fixtures/proxy-routing.ts"],
    cwd: CLI_DIR,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const stdout = new TextDecoder().decode(output.stdout);
  assertEquals(output.code, 0, new TextDecoder().decode(output.stderr));
  const { report, lifecycle } = JSON.parse(stdout.trim().split("\n").at(-1)!);
  // configureProxy reports the redacted proxy, swaps in the proxied WebSocket, and closeProxy restores direct connections.
  assertEquals(lifecycle, { configured: "socks5h://***@127.0.0.1:9050", active: "socks5h://***@127.0.0.1:9050", proxiedSocket: true, sameConstants: true, afterClose: null, directSocket: true });
  const expectedTarget = ["HEAD", "PUT /upload", "nip-11", "relay socket"];
  for (const [label, hosts] of [["http", ["http forward blossom.proxy.test", "http forward relay.proxy.test"]], ["socks5h", ["socks5 CONNECT blossom.proxy.test", "socks5 CONNECT relay.proxy.test"]]] as const) {
    const run = report[label];
    assertEquals([run.uploaded, run.published, run.signerPublished, run.information], [true, true, true, "probe relay"], `${label}: ${stdout}`);
    for (const entry of expectedTarget) assert(run.target.some((seen: string) => seen.startsWith(entry)), `${label} reached ${entry}`);
    // Deploy publishing, init suggestions and the NIP-46 signer each opened their own relay socket.
    assertEquals(run.target.filter((seen: string) => seen === "relay socket").length, 3, `${label}: ${stdout}`);
    assertEquals(run.proxied, hosts);
  }
  const direct = report.direct;
  assertEquals([direct.uploaded, direct.published, direct.signerPublished, direct.target, direct.proxied], [false, false, false, [], []], stdout);
});
