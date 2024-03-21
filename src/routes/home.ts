import { Request, Response } from "express";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";

type HomeRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
  workingDir: string;
};

export function homeRoute({
  logger,
  sessions,
  workingDir,
}: HomeRouteOptions): (req: Request, res: Response) => void {
  return (req, res) => {
    res.render("home.ejs", {
      sessions,
    });
  };
}
