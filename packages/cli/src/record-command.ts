/** Capture and select a clip using the maintained browser runner. */
import { dirname, relative, resolve } from "node:path";
import { configPath, readConfig } from "./config.ts";
import { runRecordingCli } from "./package-runner.ts";
import { normalizePreviewVideo } from "./preview-video.ts";

/**
 * Record a build and select its verified sidecar in the existing application listing.
 * @param argv Recording arguments; --config and --clear belong to this wrapper.
 * @param run Browser command adapter used by standalone builds and tests.
 * @returns Browser runner exit code.
 * @example await commandRecord(['--interactive', '--output', 'game.webm'])
 */
export async function commandRecord(argv: readonly string[], run: (args: readonly string[]) => Promise<number> | number = runRecordingCli): Promise<number> {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: napplet record [directory | --artifact <file>] [--interactive] [--output preview.webm] [--duration 6000] [--width 960] [--height 600] [--delay 1500] [--ready-selector <css>] [--actions recipe.json] [--config <file>]\n       napplet record --clear [--config <file>]\nDurations and delay use milliseconds. Recording selects zapstore.video; publishing still requires --zapstore.');
    return 0;
  }
  const args = [...argv];
  const configIndex = args.indexOf('--config');
  let path = configPath();
  if (configIndex >= 0) {
    const value = args[configIndex + 1];
    if (!value || value.startsWith('--')) throw new Error('Missing value for --config');
    path = resolve(value); args.splice(configIndex, 2);
  }
  const config = await readConfig(path);
  if (!config) throw new Error('Run napplet init before recording');
  const previous = await Deno.readTextFile(path);
  const raw = JSON.parse(previous);
  if (args.includes('--clear')) {
    if (args.length !== 1) throw new Error('--clear cannot be combined with recording options');
    if (raw.zapstore) delete raw.zapstore.video;
  } else {
    if (!config.zapstore) throw new Error('Recording selection requires zapstore.id and zapstore.name in config');
    const outputIndex = args.indexOf('--output');
    const output = outputIndex >= 0 ? args[outputIndex + 1] : 'preview.webm';
    if (!output || output.startsWith('--')) throw new Error('Missing value for --output');
    // Skip option values when locating an explicit directory or artifact.
    let hasTarget = args.includes('--artifact');
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--interactive') continue;
      if (args[i].startsWith('--')) i++;
      else hasTarget = true;
    }
    const code = await run(hasTarget ? args : [config.sourceDir, ...args]);
    if (code !== 0) return code;
    const sidecar = normalizePreviewVideo(JSON.parse(await Deno.readTextFile(`${output}.json`)))!;
    // Publication paths follow existing zapstore.images semantics (relative to caller cwd).
    raw.zapstore.video = { ...sidecar, file: relative(Deno.cwd(), sidecar.file), thumbnail: relative(Deno.cwd(), sidecar.thumbnail) };
  }
  if (await Deno.readTextFile(path) !== previous) throw new Error('Config changed during recording; clip preserved, selection not saved');
  const temporary = await Deno.makeTempFile({ dir: dirname(path), prefix: '.record-' });
  try {
    await Deno.writeTextFile(temporary, `${JSON.stringify(raw, null, 2)}\n`);
    await Deno.rename(temporary, path);
  } finally { await Deno.remove(temporary).catch((error) => { if (!(error instanceof Deno.errors.NotFound)) throw error; }); }
  console.log(args.includes('--clear') ? 'Video selection cleared; files preserved.' : 'Video selected. Review clip before napplet deploy --zapstore.');
  return 0;
}
