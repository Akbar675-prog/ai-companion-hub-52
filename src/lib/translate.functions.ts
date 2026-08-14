import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { translateBatch } from "./translate.server";

const schema = z.object({
  texts: z.array(z.string()).min(1).max(240),
  lang: z.string().min(2).max(12),
  langName: z.string().min(2).max(60),
});

export const translateTextsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => translateBatch(data.texts, data.lang, data.langName));
