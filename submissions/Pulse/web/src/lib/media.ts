// ─────────────────────────────────────────────────────────────────────────────
// EDIT MANIFEST — paste your video/image links here.
//
// key   = slug of a team or player  (lowercase, spaces → dashes)
//         e.g. "argentina", "france", "messi", "haaland", "mbappe"
// video = a DIRECT playable url (.mp4 / .webm). Pinterest works: right-click a
//         video pin → "Copy video address" (v.pinimg.com/...mp4). Any hosted mp4 is fine.
// image = optional still (used if there's no video)
// poster= optional freeze-frame shown before the video loads
//
// Cards resolve in this order: this manifest → /edits/<slug>.jpg → Wikimedia photo → gradient.
// You don't need every team; anything missing just falls back and still looks good.
// ─────────────────────────────────────────────────────────────────────────────

export type Media = { video?: string; image?: string; poster?: string };

export const MEDIA: Record<string, Media> = {
  // Auto-sourced Pinterest video edits (local mp4 + still poster). Add/replace freely.
  "argentina": { video: "/videos/argentina.mp4", poster: "https://i.pinimg.com/736x/08/b6/0f/08b60f1fb5b89b62ad50dd3fa8dd7613.jpg" },
  "bellingham": { video: "/videos/bellingham.mp4", poster: "https://i.pinimg.com/736x/e3/16/8f/e3168f217f2cdebd5696285172da5e90.jpg" },
  "brazil": { video: "/videos/brazil.mp4", poster: "https://i.pinimg.com/736x/b9/a3/1a/b9a31a9984fcea35c72dd2d6e8cab809.jpg" },
  "england": { video: "/videos/england.mp4", poster: "https://i.pinimg.com/736x/b6/46/32/b6463200b3553a99ad1009144107471b.jpg" },
  "foden": { image: "https://i.pinimg.com/736x/38/17/7e/38177e72eb508d5e9dee0f7acc2bdd99.jpg" },
  "france": { video: "/videos/france.mp4", poster: "https://i.pinimg.com/736x/1c/97/56/1c97564c357c34469f8d88eda102378c.jpg" },
  "germany": { image: "https://i.pinimg.com/736x/61/08/50/610850f7446cae1f59bb229728c3502a.jpg" },
  "haaland": { video: "/videos/haaland.mp4", poster: "https://i.pinimg.com/736x/4c/b7/c7/4cb7c70a0acabe20a8d7bfacf549e3f2.jpg" },
  "kane": { video: "/videos/kane.mp4", poster: "https://i.pinimg.com/736x/7d/11/10/7d11101f907efaa0c414d65ce41ac9c7.jpg" },
  "mbappe": { video: "/videos/mbappe.mp4", poster: "https://i.pinimg.com/736x/eb/20/be/eb20be226b2a7de9d42de99b756546e7.jpg" },
  "messi": { video: "/videos/messi.mp4", poster: "https://i.pinimg.com/736x/10/a4/40/10a4403be6cba8062f4e9e3b57f1cdbe.jpg" },
  "netherlands": { image: "https://i.pinimg.com/736x/41/9f/71/419f715917e16851601cff805d3cf9c0.jpg" },
  "norway": { video: "/videos/norway.mp4", poster: "https://i.pinimg.com/736x/5c/23/4e/5c234eaedbcaaa6d272922012ac3f380.jpg" },
  "odegaard": { video: "/videos/odegaard.mp4", poster: "https://i.pinimg.com/736x/dc/24/9c/dc249ce52ea7ae738b5f3659797e0f2e.jpg" },
  "pedri": { image: "https://i.pinimg.com/736x/54/b6/42/54b64216b2159a84f6bc2680b16a685b.jpg" },
  "portugal": { video: "/videos/portugal.mp4", poster: "https://i.pinimg.com/736x/8c/c5/32/8cc5324513de8bb6ce628b2a84aae6cc.jpg" },
  "saka": { video: "/videos/saka.mp4", poster: "https://i.pinimg.com/736x/26/f4/be/26f4bec8374c4bcb39deaeb9aa5ded5b.jpg" },
  "spain": { video: "/videos/spain.mp4", poster: "https://i.pinimg.com/736x/75/fc/6c/75fc6ce3a1834390b4f540a5020d2ff1.jpg" },
  "switzerland": { video: "/videos/switzerland.mp4", poster: "https://i.pinimg.com/736x/77/bb/2b/77bb2bb046cbfdf62725d0ab3405ebec.jpg" },
  "vinicius": { video: "/videos/vinicius.mp4", poster: "https://i.pinimg.com/736x/7c/d2/fb/7cd2fbc36d3c649e29f26f0f47c8391f.jpg" },
  "yamal": { video: "/videos/yamal.mp4", poster: "https://i.pinimg.com/736x/88/c3/36/88c336ad7b40cbf313c92e2879b75f47.jpg" },
};

export function slugify(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** First matching media entry across candidate names (subject, last name, team…). */
export function mediaFor(names: (string | null | undefined)[]): Media | null {
  for (const n of names) {
    if (!n) continue;
    const s = slugify(n);
    if (MEDIA[s]) return MEDIA[s];
  }
  return null;
}
