import { createFileRoute } from "@tanstack/react-router";
import { listAppsFn } from "@/lib/apps.functions";

export const Route = createFileRoute("/apps/index/applist.json")({
  server: {
    handlers: {
      GET: async () => {
        const list = await listAppsFn();
        return new Response(JSON.stringify(list, null, 2), {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
