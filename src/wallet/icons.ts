/** Brand marks for the rows a wallet does not bring its own icon to (phone links, install links). */
const svg = (s: string) => `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
export const WALLET_MARKS: Record<string, string> = {
  phantom: svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#AB9FF2"/><path d="M6.5 18.6c1.7 0 3-1.5 3.8-2.7-.1.3-.2.6-.2.9 0 .8.5 1.3 1.2 1.3 1 0 2-.9 2.5-1.8 0 .1-.1.3-.1.4 0 .6.4 1 .9 1 1.7 0 3.5-3 3.5-5.7 0-2.1-1.1-4-3.8-4-4.8 0-10 5.9-10 9.7 0 1.5.8 1.9 2.2 1.9Zm11.2-7.6c0-.6.3-1 .8-1s.8.4.8 1-.3 1-.8 1-.8-.5-.8-1Zm2.6 0c0-.6.3-1 .8-1s.8.4.8 1-.3 1-.8 1-.8-.5-.8-1Z" fill="#FFFDF8"/></svg>'),
  solflare: svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28"><rect width="28" height="28" rx="6" fill="#FC7227"/><path d="m14 5 2.6 5.4L22 8l-2.4 5.4L25 16l-5.4 1.6L21 23l-5.4-2.6L14 26l-1.6-5.6L7 23l1.4-5.4L3 16l5.4-2.6L6 8l5.4 2.4Z" fill="#FFEF46"/></svg>'),
};
