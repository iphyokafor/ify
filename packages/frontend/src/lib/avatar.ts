type AvatarTone = {
  bg: string;
  text: string;
  ring: string;
};

// Pastel tones tuned for the dark navy surface.
const AVATAR_TONES: readonly AvatarTone[] = [
  { bg: "bg-violet-200", text: "text-violet-800", ring: "ring-violet-300/40" },
  { bg: "bg-emerald-200", text: "text-emerald-800", ring: "ring-emerald-300/40" },
  { bg: "bg-amber-200", text: "text-amber-800", ring: "ring-amber-300/40" },
  { bg: "bg-rose-200", text: "text-rose-800", ring: "ring-rose-300/40" },
  { bg: "bg-sky-200", text: "text-sky-800", ring: "ring-sky-300/40" },
  { bg: "bg-orange-200", text: "text-orange-800", ring: "ring-orange-300/40" },
];

export const avatarTone = (seed: string): AvatarTone => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.trunc(hash * 31 + (seed.codePointAt(i) ?? 0));
  }
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
};
