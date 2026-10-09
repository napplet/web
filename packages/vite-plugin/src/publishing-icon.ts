/** Icon authoring inputs; decoded bytes determine the NIP-5D icon hash. */
import { createHash } from 'node:crypto';
import type { Nip5aManifestOptions } from './types.js';

const supported = new Set(['image/png', 'image/jpeg', 'image/webp']);
export interface PublishingIcon { sha256: string; mimeType: string; url?: string }

export function resolvePublishingIcon(
  option: Nip5aManifestOptions['icon'],
  links: Array<{ href: string; type?: string }>,
): PublishingIcon | undefined {
  const candidates = links.flatMap((link) => {
    const match = /^data:([^;,]+)(;base64)?,(.*)$/is.exec(link.href);
    if (!match || !supported.has(match[1].toLowerCase())) return [];
    const mimeType = match[1].toLowerCase();
    if (link.type && link.type.toLowerCase() !== mimeType) return [];
    try {
      const data = match[2] ? Uint8Array.from(atob(decodeURIComponent(match[3])), (c) => c.charCodeAt(0)) : decodeDataBytes(match[3]);
      return data.length ? [fromBytes(data, mimeType)] : [];
    } catch { return []; }
  });
  if (!option) return candidates[0];
  if (!supported.has(option.mimeType)) throw new Error('[nip5a-manifest] icon MIME type must be image/png, image/jpeg, or image/webp');
  if (option.data) {
    if (!option.data.length) throw new Error('[nip5a-manifest] icon data must not be empty');
    const icon = fromBytes(option.data, option.mimeType);
    if (option.sha256 && option.sha256 !== icon.sha256) throw new Error('[nip5a-manifest] icon sha256 does not match supplied data');
    return icon;
  }
  if (!option.sha256 || !/^[0-9a-f]{64}$/.test(option.sha256)) throw new Error('[nip5a-manifest] icon requires data or a lowercase sha256');
  const found = candidates.find((icon) => icon.sha256 === option.sha256 && icon.mimeType === option.mimeType);
  if (found) return found;
  console.warn('[nip5a-manifest] icon hash has no matching image bytes; supply icon.data to embed it for standalone HTML recovery. Upload the icon blob separately.');
  return { sha256: option.sha256, mimeType: option.mimeType };
}

function fromBytes(data: Uint8Array, mimeType: string): PublishingIcon {
  return { sha256: createHash('sha256').update(data).digest('hex'), mimeType, url: `data:${mimeType};base64,${Buffer.from(data).toString('base64')}` };
}

function decodeDataBytes(value: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '%') {
      if (!/^[0-9a-f]{2}$/i.test(value.slice(i + 1, i + 3))) throw new Error('Invalid data URL');
      bytes.push(parseInt(value.slice(i + 1, i + 3), 16)); i += 2;
    } else bytes.push(...new TextEncoder().encode(value[i]));
  }
  return new Uint8Array(bytes);
}
