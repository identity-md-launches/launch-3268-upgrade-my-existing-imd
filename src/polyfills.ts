import { Buffer } from "buffer";
// The Solana and Raydium SDKs expect Node's Buffer in the browser.
(globalThis as any).Buffer ??= Buffer;
