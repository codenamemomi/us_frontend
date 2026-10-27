import { BookOpen, Camera, Heart, LockKeyhole } from "lucide-react";
import { GlassCard, PageFrame, PageTitle } from "@/app/components/page-frame";

export default function MemoriesPage() {
  return (
    <PageFrame active="memories">
      <PageTitle
        eyebrow="your archive"
        title="Keep the small things."
        copy="The ordinary moments become the ones you reach for later."
      />

      <div className="grid gap-4 md:grid-cols-12">
        {/* featured memory */}
        <GlassCard className="md:col-span-7">
          <div className="flex items-center justify-between">
            <p className="eyebrow">this week</p>
            <Heart className="text-[var(--a)]" size={16} />
          </div>
          <p className="mt-6 font-display text-3xl font-bold leading-tight">
            &ldquo;The quiet Sunday we did absolutely nothing.&rdquo;
          </p>
          <p className="mt-3 text-sm text-white/45">Saved from today&apos;s question · just now</p>
        </GlassCard>

        {/* shared shelf */}
        <GlassCard className="md:col-span-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[.07] text-[var(--b)]">
              <Camera size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">Your shared shelf</h2>
              <p className="text-xs text-white/40">Photos, tiny wins, things worth keeping</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/50">
            Drop a photo, voice note, or one-liner here and it stays between you two.
          </p>
          <button className="mt-5 text-sm font-semibold text-[var(--a)]">
            Add a memory <span className="ml-2">+</span>
          </button>
        </GlassCard>

        {/* privacy note */}
        <GlassCard className="md:col-span-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[.07] text-white/50">
              <LockKeyhole size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">Just for us.</h2>
              <p className="text-xs text-white/40">Private by design</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/45">
            Your memories stay between the two of you. No feeds, no public.
          </p>
        </GlassCard>

        {/* all memories — book icon matching the nav */}
        <GlassCard className="md:col-span-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[.07] text-[var(--a)]">
              <BookOpen size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">All memories</h2>
              <p className="text-xs text-white/40">Your story, in order</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/50">Nothing saved yet. Start by answering today&apos;s question.</p>
        </GlassCard>
      </div>
    </PageFrame>
  );
}
