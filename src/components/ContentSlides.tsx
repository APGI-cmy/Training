import type { ContentSlide } from "@/types/course";
import { encodeAssetPath } from "@/lib/courses";

interface ContentSlidesProps {
  slides: ContentSlide[];
}

export function ContentSlides({ slides }: ContentSlidesProps) {
  return (
    <section className="content-band muted-band" aria-labelledby="slides-heading">
      <div className="content-inner">
        <p className="eyebrow">Slides</p>
        <h2 id="slides-heading">Core content</h2>
        <div className="slide-grid">
          {slides.map((slide) => (
            <article className="slide-card" key={slide.title}>
              {slide.thumbnail && <img src={encodeAssetPath(slide.thumbnail)} alt="" />}
              <div>
                <h3>{slide.title}</h3>
                <p>{slide.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
