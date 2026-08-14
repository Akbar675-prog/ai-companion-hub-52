import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { readAiProfile, writeAiProfile } from "./ai-profile.server";

export const getAiProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => readAiProfile(context.userId));

export const saveAiProfileFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        nickname: z.string().trim().max(40),
        fullName: z.string().trim().max(80),
        age: z.number().int().min(1).max(120).nullable(),
        about: z.string().trim().max(600),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => writeAiProfile(context.userId, data));
