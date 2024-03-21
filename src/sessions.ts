import { BrowserSession } from "./browser-session.js";

export function getSessionById(
  sessions: Iterable<BrowserSession>,
  id: string,
): BrowserSession | undefined {
  if (id === "_last") {
    const ar = Array.from(sessions);
    return ar[ar.length - 1];
  }

  id = id.toLowerCase();

  for (const session of sessions) {
    if (session.id.toLowerCase() === id) {
      return session;
    }
  }
}
