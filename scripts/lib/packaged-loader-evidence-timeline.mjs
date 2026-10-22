import {
  ROOT_KEYS,
  SESSION_NAMES,
  exactKeys,
  fail,
  hash,
  integer,
  sameStrings,
  string,
} from './packaged-loader-evidence-shared.mjs';

function validateBrowser(browser) {
  exactKeys(browser, ['name', 'version'], 'browser');
  string(browser.name, 'browser.name');
  string(browser.version, 'browser.version');
}

function validateManifestShape(manifest) {
  exactKeys(
    manifest,
    [
      'aggregateHash',
      'author',
      'dTag',
      'eventId',
      'index',
      'kind',
      'naddr',
      'paths',
      'relays',
      'servers',
    ],
    'manifest',
  );
  string(manifest.naddr, 'manifest.naddr');
  hash(manifest.eventId, 'manifest.eventId');
  hash(manifest.author, 'manifest.author');
  integer(manifest.kind, 'manifest.kind');
  string(manifest.dTag, 'manifest.dTag');
  if (
    !Array.isArray(manifest.relays) ||
    manifest.relays.length === 0 ||
    manifest.relays.some((relay) => typeof relay !== 'string')
  ) {
    fail('manifest.relays must be non-empty strings');
  }
  if (
    !Array.isArray(manifest.servers) ||
    manifest.servers.length === 0 ||
    manifest.servers.some((server) => typeof server !== 'string')
  ) {
    fail('manifest.servers must be non-empty strings');
  }
  if (!Array.isArray(manifest.paths)) {
    fail('manifest.paths must be an array');
  }
  hash(manifest.aggregateHash, 'manifest.aggregateHash');
  exactKeys(manifest.index, ['bytes', 'endpoint', 'path', 'sha256'], 'manifest.index');
  string(manifest.index.path, 'manifest.index.path');
  string(manifest.index.endpoint, 'manifest.index.endpoint');
  if (integer(manifest.index.bytes, 'manifest.index.bytes') < 0) {
    fail('manifest.index.bytes must not be negative');
  }
  hash(manifest.index.sha256, 'manifest.index.sha256');
}

function validateResourceShape(resource, index) {
  exactKeys(
    resource,
    ['bytes', 'endpoint', 'sha256', 'source', 'uri'],
    `resources[${index}]`,
  );
  string(resource.source, `resources[${index}].source`);
  string(resource.uri, `resources[${index}].uri`);
  string(resource.endpoint, `resources[${index}].endpoint`);
  if (integer(resource.bytes, `resources[${index}].bytes`) < 0) {
    fail(`resources[${index}].bytes must not be negative`);
  }
  hash(resource.sha256, `resources[${index}].sha256`);
}

function validateResources(resources) {
  if (!Array.isArray(resources) || resources.length === 0) {
    fail('resources must be a non-empty array');
  }
  for (const [index, resource] of resources.entries()) {
    validateResourceShape(resource, index);
  }
}

function validateScreenshotShape(screenshot, index) {
  exactKeys(
    screenshot,
    ['file', 'height', 'session', 'sha256', 'state', 'width'],
    `screenshots[${index}]`,
  );
  string(screenshot.state, `screenshots[${index}].state`);
  string(screenshot.file, `screenshots[${index}].file`);
  string(screenshot.session, `screenshots[${index}].session`);
  if (
    integer(screenshot.width, `screenshots[${index}].width`) < 1 ||
    integer(screenshot.height, `screenshots[${index}].height`) < 1
  ) {
    fail(`screenshots[${index}] dimensions must be positive`);
  }
  hash(screenshot.sha256, `screenshots[${index}].sha256`);
}

function validateScreenshotsShape(screenshots) {
  if (!Array.isArray(screenshots)) fail('screenshots must be an array');
  for (const [index, screenshot] of screenshots.entries()) {
    validateScreenshotShape(screenshot, index);
  }
}

function validateTraceShape(trace) {
  exactKeys(trace, ['file', 'sha256'], 'trace');
  string(trace.file, 'trace.file');
  hash(trace.sha256, 'trace.sha256');
}

export function validateTimelineShape(timeline) {
  exactKeys(timeline, ROOT_KEYS, 'timeline');
  if (timeline.schemaVersion !== 1) fail('unsupported timeline schemaVersion');
  validateBrowser(timeline.browser);
  validateManifestShape(timeline.manifest);
  validateResources(timeline.resources);
  validateScreenshotsShape(timeline.screenshots);
  validateTraceShape(timeline.trace);
}

function eventKeys(event) {
  if (event.type === 'state') return ['at', 'state', 'type'];
  if (event.type === 'request') return ['at', 'attempt', 'source', 'type'];
  if (event.type === 'terminal') {
    return ['at', 'attempt', 'outcome', 'source', 'type'];
  }
  if (event.type === 'cancel' || event.type === 'retry') {
    return ['at', 'source', 'type'];
  }
  if (event.type === 'navigation' || event.type === 'final-app') {
    return ['at', 'type'];
  }
  fail('session event has an unknown type');
}

function orderedIndex(events, predicate, label) {
  const index = events.findIndex(predicate);
  if (index < 0) fail(`session is missing ${label}`);
  return index;
}

function validateSessionEventStream(session, openedAt, closedAt) {
  let previous = openedAt - 1;
  const terminals = new Set();
  for (const [eventIndex, event] of session.events.entries()) {
    exactKeys(event, eventKeys(event), `${session.name}.events[${eventIndex}]`);
    const at = integer(event.at, `${session.name}.events[${eventIndex}].at`);
    if (at <= previous || at < openedAt || at >= closedAt) {
      fail(`${session.name} events are not strictly monotonic within session bounds`);
    }
    previous = at;
    if (event.type === 'state') {
      string(event.state, `${session.name}.events[${eventIndex}].state`);
    }
    if ('source' in event) {
      string(event.source, `${session.name}.events[${eventIndex}].source`);
    }
    if (
      'attempt' in event &&
      integer(event.attempt, `${session.name}.events[${eventIndex}].attempt`) < 1
    ) {
      fail('attempt must be positive');
    }
    if (event.type === 'terminal') {
      if (!['success', 'failure', 'cancelled'].includes(event.outcome)) {
        fail('terminal outcome is invalid');
      }
      const key = `${event.source}:${event.attempt}`;
      if (terminals.has(key)) fail('duplicate terminal event');
      terminals.add(key);
    }
  }
}

function validateSessionNavigation(session) {
  const navigation = orderedIndex(
    session.events,
    (event) => event.type === 'navigation',
    'navigation',
  );
  const initial = orderedIndex(
    session.events,
    (event) => event.type === 'state' && event.state === 'initial',
    'initial state',
  );
  const finalApp = orderedIndex(
    session.events,
    (event) => event.type === 'final-app',
    'final application',
  );
  if (!(navigation < initial && initial < finalApp)) {
    fail(`${session.name} has invalid navigation/final application order`);
  }
}

function validateSessionShape(session, sessionIndex) {
  exactKeys(
    session,
    ['closed', 'closedAt', 'events', 'name', 'openedAt'],
    `sessions[${sessionIndex}]`,
  );
  string(session.name, `sessions[${sessionIndex}].name`);
  const openedAt = integer(session.openedAt, `sessions[${sessionIndex}].openedAt`);
  const closedAt = integer(session.closedAt, `sessions[${sessionIndex}].closedAt`);
  if (
    session.closed !== true ||
    !Array.isArray(session.events) ||
    session.events.length === 0
  ) {
    fail(`${session.name} must be closed with events`);
  }
  validateSessionEventStream(session, openedAt, closedAt);
  validateSessionNavigation(session);
}

function validateLongSession(long) {
  const request = long.events.find((event) => event.type === 'request');
  const active = long.events.find(
    (event) => event.type === 'state' && event.state === 'active',
  );
  const sample = long.events.find(
    (event) => event.type === 'state' && event.state === 'active-35s',
  );
  const terminal = long.events.find(
    (event) =>
      event.type === 'terminal' &&
      event.source === request?.source &&
      event.attempt === request?.attempt,
  );
  if (
    !request ||
    !active ||
    !sample ||
    !terminal ||
    !(request.at < active.at && active.at < sample.at && sample.at < terminal.at)
  ) {
    fail('long session does not prove a pending active request');
  }

  const activeDurationMs = sample.at - active.at;
  if (activeDurationMs < 35_000) fail('derived active duration is below 35 seconds');

  const partial = orderedIndex(
    long.events,
    (event) => event.type === 'state' && event.state === 'partial',
    'partial state',
  );
  const ready = orderedIndex(
    long.events,
    (event) => event.type === 'state' && event.state === 'ready',
    'ready state',
  );
  const finalApp = orderedIndex(
    long.events,
    (event) => event.type === 'final-app',
    'final application',
  );
  if (!(partial < ready && ready < finalApp)) {
    fail('long session has invalid partial/ready/handoff order');
  }
  return activeDurationMs;
}

function assertIncreasingOrder(values, message) {
  if (values.some((value, index) => index > 0 && value <= values[index - 1])) {
    fail(message);
  }
}

function validateRetrySession(retry) {
  const retryOrder = [
    orderedIndex(
      retry.events,
      (event) => event.type === 'terminal' && event.outcome === 'failure',
      'failed terminal',
    ),
    orderedIndex(
      retry.events,
      (event) => event.type === 'state' && event.state === 'error',
      'error state',
    ),
    orderedIndex(retry.events, (event) => event.type === 'retry', 'retry'),
    orderedIndex(
      retry.events,
      (event) => event.type === 'request' && event.attempt === 2,
      'retry request',
    ),
    orderedIndex(
      retry.events,
      (event) =>
        event.type === 'terminal' &&
        event.attempt === 2 &&
        event.outcome === 'success',
      'retry success',
    ),
    orderedIndex(
      retry.events,
      (event) => event.type === 'state' && event.state === 'ready',
      'ready state',
    ),
  ];
  assertIncreasingOrder(retryOrder, 'retry session order is invalid');
}

function validateCancelSession(cancel) {
  const cancelOrder = [
    orderedIndex(cancel.events, (event) => event.type === 'cancel', 'cancel'),
    orderedIndex(
      cancel.events,
      (event) => event.type === 'terminal' && event.outcome === 'cancelled',
      'cancelled terminal',
    ),
    orderedIndex(
      cancel.events,
      (event) => event.type === 'state' && event.state === 'cancelled',
      'cancelled state',
    ),
    orderedIndex(cancel.events, (event) => event.type === 'retry', 'retry'),
    orderedIndex(
      cancel.events,
      (event) => event.type === 'request' && event.attempt === 2,
      'retry request',
    ),
    orderedIndex(
      cancel.events,
      (event) =>
        event.type === 'terminal' &&
        event.attempt === 2 &&
        event.outcome === 'success',
      'retry success',
    ),
  ];
  assertIncreasingOrder(cancelOrder, 'cancel session order is invalid');
}

function validateSessionNames(sessions) {
  if (!Array.isArray(sessions)) fail('sessions must be an array');
  const names = sessions.map((session) => session.name);
  if (
    !sameStrings(names, SESSION_NAMES) ||
    new Set(names).size !== SESSION_NAMES.length
  ) {
    fail('required sessions do not match');
  }
}

export function validateSessions(timeline) {
  validateSessionNames(timeline.sessions);
  for (const [sessionIndex, session] of timeline.sessions.entries()) {
    validateSessionShape(session, sessionIndex);
  }

  const long = timeline.sessions.find(
    (session) => session.name === 'packaged-loader-long',
  );
  const activeDurationMs = validateLongSession(long);

  const retry = timeline.sessions.find(
    (session) => session.name === 'packaged-loader-retry',
  );
  validateRetrySession(retry);

  const cancel = timeline.sessions.find(
    (session) => session.name === 'packaged-loader-cancel',
  );
  validateCancelSession(cancel);
  return activeDurationMs;
}
