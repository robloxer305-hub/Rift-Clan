"use client";

import { useState } from "react";
import { updateProfileAppearance } from "@/app/actions/profile";

type Props = {
  profileBackground: string | null;
  profileBanner: string | null;
};

export default function ProfileAppearanceForm({
  profileBackground,
  profileBanner,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost text-xs">
        Customize profile
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="profile-appearance-title" className="glass-panel w-full max-w-lg rounded-xl p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="profile-appearance-title" className="font-display text-xl font-bold uppercase">Customize profile</h2>
                <p className="mt-1 text-xs text-muted-foreground">Upload an image for your profile background or banner.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost px-2 py-1" aria-label="Close customization dialog">Close</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await updateProfileAppearance(new FormData(e.target));
              setOpen(false);
            }} className="grid gap-4">
              <ImageField name="profileBackground" label="Profile background" value={profileBackground} />
              <ImageField name="profileBanner" label="Profile banner" value={profileBanner} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" className="btn-primary text-xs">Upload and save</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function ImageField({ name, label, value }: { name: string; label: string; value: string | null }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
      <input
        name={name}
        type="file"
        accept="image/*"
        className="mt-2 w-full rounded-md border border-border bg-secondary/70 px-3 py-2 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-rift-red"
      />
      {value && <span className="mt-1 block text-[10px] text-emerald-400">Current image saved</span>}
    </label>
  );
}