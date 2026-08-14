import { MeshDriftShader } from "@/components/ui/mesh-drift-shader";
import { AiAvatar } from "@/components/ui/plasma-shader";
import { ShiningText } from "@/components/ui/shining-text";

/** Kotak indikator saat AI sedang membuat gambar (background shader Mesh drift). */
export function GeneratingImageCard({ label = "Membuat gambar..." }: { label?: string }) {
  return (
    <div className="flex gap-2">
      <AiAvatar className="mt-1 size-7 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="relative w-full max-w-[320px] overflow-hidden rounded-[28px] bg-surface-variant">
          <MeshDriftShader className="absolute inset-0 h-full w-full" />
          <div className="relative aspect-square w-full p-4">
            <span className="rounded-full bg-black/35 px-3 py-1 backdrop-blur-sm">
              <ShiningText text={label} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
