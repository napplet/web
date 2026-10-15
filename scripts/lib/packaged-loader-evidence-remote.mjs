import { nip19 } from 'nostr-tools';
import { verifyEvent } from 'nostr-tools/pure';

import {
  GIT_SHA,
  canonicalEndpoint,
  fail,
  readMetadata,
  sameStrings,
  scanSecret,
  sha256,
} from './packaged-loader-evidence-shared.mjs';

function parsePrivateTable(indexBytes) {
  const html = indexBytes.toString('utf8');
  const match = /<script type=["']application\/json["'] data-napplet-private-resource-table>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) fail('deployed index is missing the private resource table');

  let table;
  try {
    table = JSON.parse(match[1]);
  } catch {
    fail('deployed private resource table is invalid JSON');
  }
  if (!Array.isArray(table) || table.length === 0) {
    fail('deployed private resource table is empty');
  }
  return table;
}

function eventPathTags(event) {
  const paths = event.tags
    .filter((tag) => tag[0] === 'path')
    .map((tag, index) => {
      if (tag.length !== 3) fail(`manifest path tag ${index} is invalid`);
      return { path: tag[1], sha256: tag[2] };
    });
  const unique = new Set(paths.map((entry) => entry.path));
  if (unique.size !== paths.length) fail('manifest has duplicate paths');
  return paths;
}

export async function validateManifestAndBytes(
  timeline,
  services,
  computeAggregateHash,
) {
  if (
    typeof services?.queryRelay !== 'function' ||
    typeof services?.fetchBytes !== 'function'
  ) {
    fail('relay and fetch services are required');
  }

  let decoded;
  try {
    decoded = nip19.decode(timeline.manifest.naddr);
  } catch {
    fail('manifest naddr cannot be decoded');
  }
  if (decoded.type !== 'naddr') fail('manifest pointer is not an naddr');

  const pointer = decoded.data;
  if (
    pointer.pubkey !== timeline.manifest.author ||
    pointer.kind !== timeline.manifest.kind ||
    pointer.identifier !== timeline.manifest.dTag ||
    !sameStrings(pointer.relays ?? [], timeline.manifest.relays)
  ) {
    fail('manifest naddr identity does not match timeline');
  }

  const events = await services.queryRelay({
    relays: timeline.manifest.relays,
    filter: {
      kinds: [pointer.kind],
      authors: [pointer.pubkey],
      '#d': [pointer.identifier],
    },
  });
  if (!Array.isArray(events)) fail('relay query did not return events');

  const event = events.find((candidate) => candidate?.id === timeline.manifest.eventId);
  if (
    !event ||
    event.pubkey !== pointer.pubkey ||
    event.kind !== pointer.kind ||
    !verifyEvent(event)
  ) {
    fail('recorded manifest event is missing or invalid');
  }

  const dTags = event.tags.filter((tag) => tag[0] === 'd');
  if (
    dTags.length !== 1 ||
    dTags[0].length !== 2 ||
    dTags[0][1] !== pointer.identifier
  ) {
    fail('manifest d-tag does not match naddr');
  }

  const paths = eventPathTags(event);
  const recordedPaths = timeline.manifest.paths;
  if (
    paths.length !== recordedPaths.length ||
    !sameStrings(
      paths.map((entry) => `${entry.sha256} ${entry.path}`),
      recordedPaths.map((entry) => `${entry.sha256} ${entry.path}`),
    )
  ) {
    fail('recorded manifest paths do not match signed event');
  }

  const aggregateHash = computeAggregateHash(paths);
  const xTags = event.tags.filter((tag) => tag[0] === 'x' && tag[2] === 'aggregate');
  if (
    xTags.length !== 1 ||
    xTags[0].length !== 3 ||
    xTags[0][1] !== aggregateHash ||
    timeline.manifest.aggregateHash !== aggregateHash
  ) {
    fail('manifest aggregate does not match canonical path lines');
  }

  const eventServers = event.tags
    .filter((tag) => tag[0] === 'server' && tag.length === 2)
    .map((tag) => tag[1]);
  if (!sameStrings(eventServers, timeline.manifest.servers)) {
    fail('manifest server evidence does not match signed event');
  }

  const indexPath = paths.find((entry) => entry.path === timeline.manifest.index.path);
  if (
    !indexPath ||
    indexPath.sha256 !== timeline.manifest.index.sha256 ||
    !canonicalEndpoint(
      timeline.manifest.servers,
      indexPath.sha256,
      timeline.manifest.index.endpoint,
    )
  ) {
    fail('deployed index association is invalid');
  }

  let indexBytes;
  try {
    indexBytes = Buffer.from(
      await services.fetchBytes(timeline.manifest.index.endpoint),
    );
  } catch {
    fail('deployed index endpoint is unavailable');
  }
  if (
    indexBytes.length !== timeline.manifest.index.bytes ||
    sha256(indexBytes) !== timeline.manifest.index.sha256
  ) {
    fail('deployed index bytes do not match timeline and manifest');
  }

  const table = parsePrivateTable(indexBytes);
  if (table.length !== timeline.resources.length) {
    fail('resource evidence count does not match private table');
  }

  for (let index = 0; index < table.length; index += 1) {
    const tableEntry = table[index];
    const resource = timeline.resources[index];
    if (
      !tableEntry ||
      !resource ||
      tableEntry.source !== resource.source ||
      tableEntry.uri !== resource.uri ||
      tableEntry.sha256 !== resource.sha256 ||
      tableEntry.bytes !== resource.bytes ||
      resource.uri !== `blossom:sha256:${resource.sha256}` ||
      !canonicalEndpoint(
        timeline.manifest.servers,
        resource.sha256,
        resource.endpoint,
      )
    ) {
      fail(`resource association ${index} does not match private table`);
    }

    let value;
    try {
      value = Buffer.from(await services.fetchBytes(resource.endpoint));
    } catch {
      fail(`resource endpoint ${index} is unavailable`);
    }
    if (value.length !== resource.bytes || sha256(value) !== resource.sha256) {
      fail(`resource bytes ${index} do not match evidence`);
    }
  }
}

function requirePublicationServices(services) {
  const git = services?.git;
  const github = services?.github;
  if (!git || !github) fail('publication git and GitHub services are required');
  return { git, github };
}

function readPublicationState(publication) {
  const review = readMetadata(publication.reviewPath, 'review report');
  const verification = readMetadata(
    publication.verificationPath,
    'verification report',
  );
  const h1 = review.value('reviewed_sha');
  if (
    !h1 ||
    !GIT_SHA.test(h1) ||
    verification.value('reviewed_sha') !== h1 ||
    review.value('status') !== 'passed'
  ) {
    fail('H1 review provenance is invalid');
  }
  if (
    verification.value('status') !== 'gaps_found' ||
    verification.value('requirements_failed') !== '0' ||
    verification.value('publication_pending') !== 'true'
  ) {
    fail('H1 verification is not pending-aware');
  }
  return { h1, review, verification };
}

async function validatePublicationHeads(publication, git, h1) {
  const h2 = await git.localHead();
  if (
    !GIT_SHA.test(h2) ||
    h2 === h1 ||
    (await git.remoteHead(publication.head)) !== h2
  ) {
    fail('local and remote H2 do not match');
  }

  const baseHead = await git.remoteHead(publication.base);
  if (!GIT_SHA.test(baseHead) || !(await git.isAncestor(baseHead, h2))) {
    fail('publication base is not an H2 ancestor');
  }
  return h2;
}

function expectedMetadataPaths(publication) {
  const planPrefix = publication.reviewPath.replace('-REVIEW.md', '');
  return [
    `${planPrefix}-PLAN.md`,
    `${planPrefix}-RESEARCH.md`,
    `${planPrefix}-VALIDATION.md`,
    publication.reviewPath,
    publication.verificationPath,
    `${planPrefix}-SUMMARY.md`,
    '.planning/STATE.md',
  ];
}

async function validateMetadataOnlyDiff(git, h1, h2, metadataPaths) {
  const changedPaths = await git.diffPaths(h1, h2);
  if (
    !sameStrings(changedPaths, metadataPaths) ||
    new Set(changedPaths).size !== metadataPaths.length
  ) {
    fail('H1-to-H2 diff is not metadata-only');
  }
  if (
    (await git.treeHash(h1, metadataPaths)) !==
    (await git.treeHash(h2, metadataPaths))
  ) {
    fail('source or evidence changed between H1 and H2');
  }
}

async function validatePublicationPullRequest(github, publication, h1, h2) {
  const pr = await github.pullRequest({
    repo: publication.repo,
    head: publication.head,
    base: publication.base,
  });
  if (
    !pr ||
    pr.state !== 'OPEN' ||
    pr.merged ||
    pr.headSha !== h2 ||
    pr.head !== publication.head ||
    pr.base !== publication.base
  ) {
    fail('pull request state or refs do not match H2');
  }
  if (!pr.body.includes(h1) || !pr.body.includes(h2)) {
    fail('pull request body does not contain current H1/H2 evidence');
  }

  const timeline = await github.timeline({
    repo: publication.repo,
    number: pr.number,
  });
  if (
    !Array.isArray(timeline) ||
    timeline.some((entry) => /force/i.test(String(entry?.type ?? '')))
  ) {
    fail('pull request contains a force-push event');
  }
  return pr;
}

function validatePublicationSecretScan(review, verification, diffText, body, variants) {
  scanSecret(review.content, variants, 'review report');
  scanSecret(verification.content, variants, 'verification report');
  scanSecret(diffText, variants, 'H1-to-H2 diff');
  scanSecret(body, variants, 'pull request body');
}

export async function validatePublication(publication, services, variants) {
  const { git, github } = requirePublicationServices(services);
  const { h1, review, verification } = readPublicationState(publication);
  const h2 = await validatePublicationHeads(publication, git, h1);
  const metadataPaths = expectedMetadataPaths(publication);
  await validateMetadataOnlyDiff(git, h1, h2, metadataPaths);
  const pr = await validatePublicationPullRequest(github, publication, h1, h2);
  const diffText = await git.diffText(h1, h2);
  validatePublicationSecretScan(
    review,
    verification,
    diffText,
    pr.body,
    variants,
  );
  return { h1, h2, pr: pr.number };
}
