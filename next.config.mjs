/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  headers: async () => {
    return [
      /*
       * No API response is cacheable, and none of them are public.
       *
       * /api/memorization/:path* and /api/flashcards/:path* used to be sent as
       * "public, max-age=31536000, immutable" on the grounds that the study
       * material is fixed. The material is, but those prefixes also cover the
       * per-learner endpoints under them — eligibility, progress, session, and
       * the item list itself, which carries the learner's own last answer. A
       * browser given an immutable response holds it for the year without ever
       * asking again, so mastery counts froze at whatever they were on the
       * first read and a finished sitting kept resuming from a saved position
       * the server had already deleted.
       *
       * "public" was the worse half: it invites any shared cache between the
       * app and the learner to keep one person's answers and hand them to the
       * next reader of the same URL.
       *
       * Every one of these routes is behind auth and can answer 401, which is
       * itself not a response worth keeping, so the rule covers /api wholesale
       * rather than trying to sort the fixed routes from the personal ones.
       */
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
