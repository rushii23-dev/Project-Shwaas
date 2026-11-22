import { ArrowRight } from "lucide-react";
import type { Photo as PhotoData } from "../../content/photos";
import { Link } from "../../router";
import { Photo } from "../../site/Photo";

/** A large photographic link card to another story page. */
export function ExploreCard({
  to,
  photo,
  title,
  body,
}: {
  to: "/world" | "/smog";
  photo: PhotoData;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="group relative isolate block aspect-[4/3] overflow-hidden rounded-[1.75rem] md:aspect-[5/4]">
      <Photo
        photo={photo}
        sizes="(min-width: 768px) 50vw, 100vw"
        credit={false}
        className="absolute inset-0 -z-10 h-full w-full"
        imgClassName="h-full w-full transition-transform duration-[1.4s] ease-[var(--ease-settle)] group-hover:scale-105"
      />
      <span className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent_35%,rgb(15_19_26/0.9)_100%)]" />
      <span className="flex h-full flex-col justify-end p-7 md:p-10">
        <span className="flex items-end justify-between gap-6">
          <span>
            <span className="block font-display text-[clamp(1.9rem,3.4vw,3rem)] leading-tight">{title}</span>
            <span className="mt-2 block max-w-[38ch] text-white/80">{body}</span>
          </span>
          <span className="grid size-14 shrink-0 place-items-center rounded-full border border-white/30 transition-colors group-hover:bg-accent group-hover:text-accent-ink">
            <ArrowRight aria-hidden="true" size={22} />
          </span>
        </span>
      </span>
    </Link>
  );
}
