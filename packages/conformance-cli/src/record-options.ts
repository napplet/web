/** Authoring controls for short, silent gameplay recordings; not protocol limits. */
export interface RecordAction {
  type: 'click' | 'keyDown' | 'keyUp';
  atMs: number;
  x?: number;
  y?: number;
  key?: string;
}

export interface RecordOptions {
  directory: string;
  artifact?: string;
  output: string;
  width: number;
  height: number;
  duration: number;
  delay: number;
  interactive: boolean;
  actions?: string;
  readySelector?: string;
}

/**
 * Parse authoring options without starting a browser.
 * @param args CLI arguments after the record subcommand.
 * @returns Validated recording options.
 * @example parseRecordArgs(['dist', '--duration', '6000'])
 */
export function parseRecordArgs(args: readonly string[]): RecordOptions {
  const options: RecordOptions = { directory: '.', output: 'preview.webm', width: 960, height: 600, duration: 6000, delay: 1500, interactive: false };
  let target = false;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--interactive') { options.interactive = true; continue; }
    if (!flag.startsWith('-')) {
      if (target) throw new Error(`Unexpected recording argument: ${flag}`);
      options.directory = flag; target = true; continue;
    }
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    switch (flag) {
      case '--artifact': options.artifact = value; break;
      case '--output': options.output = value; break;
      case '--actions': options.actions = value; break;
      case '--ready-selector': options.readySelector = value; break;
      case '--width': options.width = integer(value, flag, 64, 1920); break;
      case '--height': options.height = integer(value, flag, 64, 1920); break;
      case '--duration': options.duration = integer(value, flag, 1000, 30000); break;
      case '--delay': options.delay = integer(value, flag, 0, 30000); break;
      default: throw new Error(`Unknown recording option: ${flag}`);
    }
  }
  if (!options.output.toLowerCase().endsWith('.webm')) throw new Error('--output must end in .webm');
  if (options.artifact && target) throw new Error('Use a directory or --artifact, not both');
  if (options.interactive && options.actions) throw new Error('Choose interactive capture or an action recipe');
  return options;
}

/**
 * Validate bounded input data before it controls the recording browser.
 * @param input Parsed recipe JSON.
 * @param options Capture duration and viewport bounds.
 * @returns Actions sorted by capture-relative time.
 * @example parseRecordActions([], parseRecordArgs([]))
 */
export function parseRecordActions(input: unknown, options: RecordOptions): RecordAction[] {
  if (!Array.isArray(input) || input.length > 128) throw new Error('Recording recipe must be an array of at most 128 actions');
  return input.map((value): RecordAction => {
    if (!value || typeof value !== 'object') throw new Error('Invalid recording action');
    const a = value as Record<string, unknown>;
    if (!Number.isInteger(a.atMs) || Number(a.atMs) < 0 || Number(a.atMs) >= options.duration) throw new Error('Action time must fall within the recording duration');
    if (a.type === 'click' && Number.isFinite(a.x) && Number.isFinite(a.y) && Number(a.x) >= 0 && Number(a.x) < options.width && Number(a.y) >= 0 && Number(a.y) < options.height) {
      return { type: 'click', atMs: Number(a.atMs), x: Number(a.x), y: Number(a.y) };
    }
    if ((a.type === 'keyDown' || a.type === 'keyUp') && typeof a.key === 'string' && /^(Arrow(Up|Down|Left|Right)|Space|Enter|Escape|[a-z0-9])$/.test(a.key)) {
      return { type: a.type, atMs: Number(a.atMs), key: a.key };
    }
    throw new Error('Invalid recording click or key');
  }).sort((a, b) => a.atMs - b.atMs);
}

function integer(value: string, flag: string, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${flag} must be an integer from ${min} to ${max}`);
  return number;
}
