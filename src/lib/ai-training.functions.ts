import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAccountAuth } from "@/integrations/auth-supabase/auth-middleware";
import { getMyProfile } from "./account.server";
import {
  readInstructions,
  addInstruction,
  updateInstruction,
  deleteInstruction,
} from "./ai-training.server";

export type { AiInstruction } from "./ai-training.server";

async function assertAdmin(userId: string) {
  const me = await getMyProfile(userId);
  if (!me?.is_admin) throw new Error("Khusus admin.");
}

export const listInstructionsFn = createServerFn({ method: "GET" })
  .middleware([requireAccountAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    return readInstructions();
  });

export const addInstructionFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().min(5).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return addInstruction(data.text);
  });

export const updateInstructionFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().min(1).max(64), text: z.string().min(5).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return updateInstruction(data.id, data.text);
  });

export const deleteInstructionFn = createServerFn({ method: "POST" })
  .middleware([requireAccountAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    return deleteInstruction(data.id);
  });
