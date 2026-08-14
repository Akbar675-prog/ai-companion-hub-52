import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { getMyProfile } from "./account.server";
import { readFacts, addFact, updateFact, deleteFact } from "./ai-facts.server";

export type { AiFact } from "./ai-facts.server";

async function assertAdmin(userId: string) {
  const me = await getMyProfile(userId);
  if (!me?.is_admin) throw new Error("Khusus admin.");
}

export const listFactsFn = createServerFn({ method: "GET" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return readFacts();
  });

export const addFactFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z.object({ label: z.string().min(2).max(120), value: z.string().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return addFact(data.label, data.value);
  });

export const updateFactFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().min(1).max(64),
        label: z.string().min(2).max(120),
        value: z.string().min(1).max(1000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return updateFact(data.id, data.label, data.value);
  });

export const deleteFactFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return deleteFact(data.id);
  });
