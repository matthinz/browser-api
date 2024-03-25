import { z } from "zod";

export const ClickCommandSchema = z.object({
  name: z.literal("click"),
  selector: z.string(),
});

export const NavigateCommandSchema = z.object({
  name: z.literal("navigate"),
  url: z.string().url(),
});

export const TypeCommandSchema = z.object({
  name: z.literal("type"),
  selector: z.string(),
  text: z.string().or(z.number()),
});

export const BrowserCommandSchema = ClickCommandSchema.or(
  NavigateCommandSchema,
).or(TypeCommandSchema);
