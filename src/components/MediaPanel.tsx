import type { CourseMedia } from "@/types/course";
import { encodeAssetPath } from "@/lib/courses";

interface MediaPanelProps {
  media: CourseMedia[];
}

export function MediaPanel({ media }: MediaPanelProps) {
  if (media.length === 0) {
    return (
      <section className="content-band">
        <div className="content-inner">
          <p>No media assets have been linked for this unit yet.</p>
        </div>
      </section>
    );
  }

  const [primaryMedia, ...supportingMedia] = media;

  return (
    <section className="content-band" aria-labelledby="media-heading">
      <div className="content-inner split-layout">
        <div>
          <p className="eyebrow">Media</p>
          <h2 id="media-heading">Learning media</h2>
          <p>
            Source files are rendered from the published VPSHR folder in this repository and can be
            replaced without changing the page component.
          </p>
        </div>
        <div className="media-stack">
          <MediaItem media={primaryMedia} prominent />
          {supportingMedia.map((item) => (
            <MediaItem key={`${item.kind}-${item.src}`} media={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MediaItem({ media, prominent = false }: { media: CourseMedia; prominent?: boolean }) {
  const src = encodeAssetPath(media.src);
  const poster = media.poster ? encodeAssetPath(media.poster) : undefined;

  return (
    <figure className={prominent ? "media-item media-item-prominent" : "media-item"}>
      {media.kind === "video" && (
        <video controls preload="metadata" poster={poster}>
          <source src={src} type="video/mp4" />
        </video>
      )}
      {media.kind === "image" && <img src={src} alt="" />}
      {media.kind === "audio" && <audio controls src={src} />}
      {media.kind === "embed" && (
        <iframe title={media.title} src={src} loading="lazy" allowFullScreen />
      )}
      <figcaption>{media.title}</figcaption>
    </figure>
  );
}
