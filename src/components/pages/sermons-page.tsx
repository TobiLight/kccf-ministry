import { ButtonLink } from "../ui/button-link";
import { Card } from "../ui/card";
import { Icon } from "../ui/icon";
import { PageHero } from "../ui/page-hero";
import { SectionHeading } from "../ui/section-heading";
import { SermonArchive } from "../ui/sermon-archive";
import { SermonPlayer } from "../ui/sermon-player";
import {
  distinctSermons,
  formatSermonDate,
  resolveSermons,
  stripPartSuffix,
  thumbnailHeight,
  thumbnailUrlFor,
  thumbnailWidth,
  watchUrlFor,
} from "../../content/sermon-feed";
import snapshot from "../../content/sermons.generated.json";
import { sermons } from "../../content/sermons";
import { site } from "../../content/site";
import type { Sermon } from "../../content/types";

const highlightLimit = 6;

function highlightActions(sermon: Sermon) {
  if (!sermon.youtubeId) {
    return null;
  }

  return (
    <div class="sermon-card-actions">
      <button
        type="button"
        class="sermon-row-play"
        data-on:click={`$sermon.videoId = ${JSON.stringify(sermon.youtubeId)}; document.getElementById('sermon-player')?.focus()`}
        aria-label={`Play message: ${stripPartSuffix(sermon.title)}`}
      >
        <Icon name="play" size={18} />
        <span>Play</span>
      </button>
      <a class="sermon-row-link" href={watchUrlFor(sermon.youtubeId)} target="_blank" rel="noopener noreferrer">
        Watch on YouTube
      </a>
    </div>
  );
}

export function SermonsPage() {
  const all = resolveSermons(sermons, snapshot);
  const playable = all.filter((sermon) => sermon.youtubeId);
  const [featured] = playable;
  const highlights = distinctSermons(playable, highlightLimit);
  const archive = all.filter((sermon) => sermon.youtubeId || sermon.facebookUrl);

  return (
    <>
      <PageHero
        eyebrow="Messages"
        title="Sermons"
        description="Feed your faith with messages that speak to the ordinary and extraordinary places where you live."
        image={site.images.worshipMoment}
      />

      <section class="live-banner-section">
        <div class="container live-banner">
          <div class="live-banner-mark" aria-hidden="true">
            <Icon name="facebook" size={30} />
          </div>
          <div>
            <p class="eyebrow text-primary!">Live from KCCF</p>
            <h2>Join us live on Facebook</h2>
            <p>Watch the message, worship with us, and stay connected wherever you are.</p>
          </div>
          <ButtonLink
            className="button button-primary"
            href={site.contact.facebookUrl}
            external
            icon="facebook"
            iconPosition="start"
          >
            Watch Live
          </ButtonLink>
        </div>
      </section>

      {playable.length > 0 ? (
        <section class="sermon-feature-section" aria-labelledby="featured-message-title">
          <div class="container">
            <SectionHeading
              id="featured-message-title"
              eyebrow="Latest message"
              title="Watch the Latest"
              description="Press play to watch here, or open the recording on YouTube."
            />
            <SermonPlayer sermon={featured} />
          </div>
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section class="sermon-list-section section-cream" aria-labelledby="sermon-highlights-title">
          <div class="container">
            <SectionHeading
              id="sermon-highlights-title"
              eyebrow="Highlights"
              title="A Word for the Journey"
              description="Messages that have stayed with us, on grace, prayer, purpose, and service."
            />
            <div class="card-grid card-grid-three">
              {highlights.map((sermon) => (
                <Card
                  className="sermon-card"
                  image={sermon.youtubeId ? thumbnailUrlFor(sermon.youtubeId) : undefined}
                  imageWidth={thumbnailWidth}
                  imageHeight={thumbnailHeight}
                  imageAlt=""
                  title={stripPartSuffix(sermon.title)}
                  description={[sermon.speaker, formatSermonDate(sermon.date)].filter(Boolean).join(" · ")}
                >
                  {highlightActions(sermon)}
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section class="sermon-archive-section" aria-labelledby="sermon-archive-title">
        <div class="container">
          <SectionHeading
            id="sermon-archive-title"
            eyebrow="Archive"
            title="Every Recorded Message"
            description="Browse the archive by year. New recordings appear here as soon as they are published."
          />
          <SermonArchive sermons={archive} />
          <div class="center-action">
            <ButtonLink
              className="button button-secondary"
              href={site.contact.facebookUrl}
              external
              icon="facebook"
              iconPosition="start"
            >
              View More on Facebook
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
