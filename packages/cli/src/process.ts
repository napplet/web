/** CommandResult shape used by subprocess execution helpers. */
export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** CommandOptions shape used by subprocess execution helpers. */
export interface CommandOptions {
  cwd?: string;
  input?: string;
}

/** CommandRunner union used by subprocess execution helpers. */
export type CommandRunner = (
  command: string,
  args: string[],
  options?: CommandOptions,
) => Promise<CommandResult>;

/** run command helper for subprocess execution. */
export async function runCommand(
  command: string,
  args: string[],
  cwdOrOptions: string | CommandOptions = Deno.cwd(),
): Promise<CommandResult> {
  const options = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  const child = new Deno.Command(command, {
    args,
    cwd: options.cwd ?? Deno.cwd(),
    stdin: options.input === undefined ? "null" : "piped",
    stdout: "piped",
    stderr: "piped",
  });
  const result = options.input === undefined
    ? await child.output()
    : await writeInputAndCollect(child, options.input);
  const decoder = new TextDecoder();
  return {
    code: result.code,
    stdout: decoder.decode(result.stdout),
    stderr: decoder.decode(result.stderr),
  };
}

async function writeInputAndCollect(
  command: Deno.Command,
  input: string,
): Promise<Deno.CommandOutput> {
  const child = command.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(input));
  await writer.close();
  return await child.output();
}

/** split command helper for subprocess execution. */
export function splitCommand(command: string): { command: string; args: string[] } {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  const executable = parts.shift();
  if (!executable) throw new Error("Command cannot be empty");
  return { command: executable, args: parts };
}
