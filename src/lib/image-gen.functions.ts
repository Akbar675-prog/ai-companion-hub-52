import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { generateImage, imageQuotaFor } from "./image-gen.server";

export const generateImageFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ prompt: z.string().trim().min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => generateImage(context.userId, data.prompt));

export const imageQuotaFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => imageQuotaFor(context.userId));
