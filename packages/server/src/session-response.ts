import { z } from "zod";
import {
  BrowserSession,
  BrowserSessionHistoryItem,
} from "./browser-session.js";
import { BrowserCommand, BrowserLink } from "./browser/types.js";

export const SessionResponseSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.date(),
  url: z.string().url(),
  html: z.string(),
});

type SessionResponse = {
  id: string;
  createdAt: string;
  url: string;
  history: BrowserSessionHistoryItem[];
  html: string;
  links: BrowserLink[];
};

export async function formatSessionResponse(
  session: BrowserSession,
): Promise<SessionResponse> {
  const [url, html, links] = await Promise.all([
    session.browserTab.url(),
    session.browserTab.html(),
    session.browserTab.findLinks(),
  ]);

  return {
    id: session.id,
    createdAt: session.createdAt.toISOString(),
    url: url.toString(),
    history: session.history,
    html,
    links: cleanUpLinks(links),
  };
}
function cleanUpLinks(links: BrowserLink[]): BrowserLink[] {
  links = links.map((link) => {
    const cleanLink: BrowserLink = {
      ...link,
      classes: (link.classes ?? [])
        .map((c) => c.trim())
        .filter((c) => c != "")
        .sort(),
    };

    if (!cleanLink.classes?.length) {
      delete cleanLink.classes;
    }

    if (cleanLink.id === "") {
      delete cleanLink.id;
    }

    if (cleanLink.text === "") {
      delete cleanLink.text;
    }

    return cleanLink;
  });

  const linksByKey = links.reduce<Record<string, BrowserLink>>(
    (result, link) => {
      const key = [
        link.classes?.join(" ") ?? "",
        link.href?.toString() ?? "",
        link.id ?? "",
        link.selector ?? "",
        link.text ?? "",
        link.visible ? "visible" : "hidden",
      ]
        .map((item) => encodeURIComponent(item))
        .join("&");

      result[key] = result[key] ?? link;

      return result;
    },
    {},
  );

  return Object.values(linksByKey);
}
