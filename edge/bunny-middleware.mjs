// Bunny Edge Scripting middleware for napplet.run; needs "Run script before cache" on the pull zone (see edge/README.md).
import * as BunnySDK from '@bunny.net/edgescript-sdk';
import { decorateResponse, rewriteRequest } from './markdown-negotiation.mjs';

// On Bunny the pull zone's own origin is used, so no origin URL is passed here.
BunnySDK.net.http
  .servePullZone()
  .onClientRequest((ctx) => Promise.resolve(rewriteRequest(ctx.request)))
  .onClientResponse((ctx) => Promise.resolve(decorateResponse(ctx.request, ctx.response)));
