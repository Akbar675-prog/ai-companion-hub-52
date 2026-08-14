import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { chatCreditsFor, recordChatUsage } from "./ai-credits.server";
import { imageQuotaFor } from "./image-gen.server";

export const aiUsageFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => {
    const [chat, image] = await Promise.all([
      chatCreditsFor(context.userId),
      imageQuotaFor(context.userId),
    ]);
    return { chat, image };
  });

export const chatCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => chatCreditsFor(context.userId));

export const recordChatUsageFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        tokens: z.number().int().min(0).max(1_000_000),
        title: z.string().trim().max(60),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => recordChatUsage(context.userId, data.tokens, data.title));
