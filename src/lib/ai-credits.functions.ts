import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import {
  adminCreditDashboard,
  adminSetCredits,
  chatCreditsFor,
  recordChatUsage,
} from "./ai-credits.server";
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

export const adminCreditDashboardFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().trim().max(80).default("") }).parse(d))
  .handler(async ({ data, context }) => adminCreditDashboard(context.userId, data.query));

export const adminSetCreditsFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        targetUserId: z.string().uuid().optional(),
        chatLimit: z.number().int().min(0).max(1_000_000_000),
        imageLimit: z.number().int().min(0).max(1_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => adminSetCredits(context.userId, data));
