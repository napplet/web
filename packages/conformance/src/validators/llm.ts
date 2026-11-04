import type { EnvelopeError } from './envelope-types.js';

/**
 * NAP-LLM request schema checks for napplet-emitted envelopes.
 * Living proposal: https://github.com/napplet/naps/pull/134 (Schemas, Wire Protocol).
 *
 * Every request carries `type`, a nonempty `id`, and exactly the parameters in
 * its API row. Input records reject unknown fields and explicit `null`; optional
 * fields may be omitted. Image data is standard padded base64 without whitespace.
 * Tool definitions use portable unique names and object-rooted schemas; an
 * explicit toolChoice needs tools (and a listed forced name); thinking and tool
 * calls appear only in assistant messages; each call is answered exactly once by
 * an adjacent, name-matching toolResult, and call ids are unique.
 * These checks test the napplet's emitted request, not runtime policy limits,
 * selection ownership, or consent.
 */

type Check = (value: unknown) => boolean;
type Fields = Record<string, Check>;

const text: Check = (value) => typeof value === 'string';
const nonemptyText: Check = (value) => typeof value === 'string' && value.length > 0;
const boolean: Check = (value) => typeof value === 'boolean';
const oneOf = (...allowed: readonly string[]): Check => (value) => typeof value === 'string' && allowed.includes(value);
/** RFC 4648 standard alphabet, padded, no whitespace, at least one quantum. */
const base64: Check = (value) =>
  typeof value === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value) && value.length >= 4;

function exactRecord(required: Fields, optional: Fields = {}): Check {
  return (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const data = value as Record<string, unknown>;
    if (Object.keys(data).some((key) => !(key in required) && !(key in optional))) return false;
    return Object.entries(required).every(([key, check]) => check(data[key]))
      && Object.entries(optional).every(([key, check]) => data[key] === undefined || check(data[key]));
  };
}

const nonemptyList = (item: Check): Check => (value) => Array.isArray(value) && value.length > 0 && value.every(item);
const list = (item: Check): Check => (value) => Array.isArray(value) && value.every(item);
const plainObject: Check = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const positiveInteger: Check = (value) => typeof value === 'number' && Number.isInteger(value) && value > 0;
const finiteNumber: Check = (value) => typeof value === 'number' && Number.isFinite(value);
/** Portable tool names (NAP-LLM Tool). */
const toolName: Check = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
/** JSON Schema with root `type: "object"`; its keywords are not unknown record fields. */
const objectSchema: Check = (value) => plainObject(value) && (value as Record<string, unknown>).type === 'object';

const textPart = exactRecord({ type: oneOf('text'), text });
const imagePart = exactRecord({ type: oneOf('image'), mimeType: oneOf('image/png', 'image/jpeg', 'image/webp'), data: base64 });
const thinkingPart = exactRecord({ type: oneOf('thinking'), text });
const toolCallPart = exactRecord({ type: oneOf('toolCall'), toolCallId: nonemptyText, name: nonemptyText, arguments: plainObject });
/** `toolResult` content permits only text and image; thinking and tool calls only appear in assistant messages. */
const userPart: Check = (value) => textPart(value) || imagePart(value);
const assistantPart: Check = (value) => userPart(value) || thinkingPart(value) || toolCallPart(value);
const contentMessage = (role: string, part: Check): Check => exactRecord({ role: oneOf(role), content: nonemptyList(part) });
const toolResultMessage = exactRecord(
  { role: oneOf('toolResult'), content: nonemptyList(userPart), toolCallId: nonemptyText, toolName: nonemptyText },
  { isError: boolean },
);
const message: Check = (value) => contentMessage('system', userPart)(value) || contentMessage('user', userPart)(value)
  || contentMessage('assistant', assistantPart)(value) || toolResultMessage(value);
const tool = exactRecord({ name: toolName }, { description: text, parameters: objectSchema });
const toolChoice: Check = (value) => oneOf('auto', 'none', 'required')(value) || exactRecord({ type: oneOf('tool'), name: nonemptyText })(value);
const requirements = exactRecord({}, { model: nonemptyText, images: boolean, json: boolean, tools: boolean });
const generationShape = exactRecord(
  { handle: nonemptyText, messages: nonemptyList(message) },
  { format: oneOf('text', 'json'), maxTokens: positiveInteger, temperature: finiteNumber, tools: list(tool), toolChoice },
);

type Record_ = Record<string, unknown>;

/**
 * Cross-field rules of a structurally valid GenerationRequest (NAP-LLM Tool,
 * ToolChoice, Message). Returns the first violated rule, or `undefined`.
 */
function generationRule(request: Record_): string | undefined {
  const tools = (request.tools as Record_[] | undefined) ?? [];
  const names = tools.map((entry) => entry.name as string);
  if (new Set(names).size !== names.length) return 'tool names must be unique within tools';
  if (request.toolChoice !== undefined) {
    if (!tools.length) return 'an explicit toolChoice requires a non-empty tools list';
    const choice = request.toolChoice as Record_ | string;
    if (typeof choice === 'object' && !names.includes(choice.name as string)) return 'a forced tool name must appear in tools';
  }
  const messages = request.messages as Record_[];
  const seen = new Set<string>();
  for (let index = 0; index < messages.length; index += 1) {
    const current = messages[index];
    if (current.role === 'toolResult') return 'a toolResult message must immediately follow the assistant turn whose call it answers';
    if (current.role !== 'assistant') continue;
    const calls = (current.content as Record_[]).filter((part) => part.type === 'toolCall');
    const expected = new Map<string, string>();
    for (const call of calls) {
      const id = call.toolCallId as string;
      if (seen.has(id)) return 'tool call ids must be unique within the conversation';
      seen.add(id);
      expected.set(id, call.name as string);
    }
    while (messages[index + 1]?.role === 'toolResult') {
      const result = messages[index + 1];
      const id = result.toolCallId as string;
      if (!expected.has(id)) return 'each toolResult must answer exactly one call in the immediately preceding assistant turn';
      if (expected.get(id) !== result.toolName) return 'toolResult toolName must match the answered call';
      expected.delete(id);
      index += 1;
    }
    if (expected.size) return 'every tool call needs one toolResult immediately after its assistant turn';
  }
  return undefined;
}

const generationRequest: Check = (value) => generationShape(value) && generationRule(value as Record_) === undefined;

const PAYLOADS: Record<string, { required?: Fields; optional?: Fields }> = {
  'llm.select': { optional: { requirements } },
  'llm.describe': { required: { handle: nonemptyText } },
  'llm.generate': { required: { request: generationRequest } },
  'llm.cancel': { required: { requestId: nonemptyText } },
};

/**
 * Validate a NAP-LLM request's parameters against the living schema.
 * @param type Envelope discriminant, already known to be an llm request.
 * @param envelope The napplet-emitted request.
 * @param errors Accumulator for validation problems.
 */
export function validateLlmRequest(type: string, envelope: Record<string, unknown>, errors: EnvelopeError[]): void {
  const schema = PAYLOADS[type];
  if (!schema) return;
  const required = schema.required ?? {};
  const optional = schema.optional ?? {};
  if (envelope.id !== undefined && !nonemptyText(envelope.id)) {
    errors.push({ code: 'wrong-type', field: 'id', message: 'NAP-LLM request ids are non-empty text' });
  }
  for (const field of Object.keys(envelope)) {
    if (field === 'type' || field === 'id' || field in required || field in optional) continue;
    errors.push({ code: 'forbidden-field', field,
      message: `Field "${field}" is not a parameter of ${type}; NAP-LLM requests carry exactly their API row parameters` });
  }
  for (const [field, check] of Object.entries({ ...required, ...optional })) {
    const value = envelope[field];
    if (value === undefined) {
      if (field in required) errors.push({ code: 'missing-field', field, message: `Field "${field}" is required by ${type}` });
      continue;
    }
    if (!check(value)) {
      const rule = field === 'request' && generationShape(value) ? generationRule(value as Record_) : undefined;
      errors.push({ code: 'wrong-type', field, message: rule
        ? `Field "${field}" violates NAP-LLM: ${rule}`
        : `Field "${field}" must match the NAP-LLM ${type} schema` });
    }
  }
}
