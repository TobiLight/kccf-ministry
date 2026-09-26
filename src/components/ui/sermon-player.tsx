import { formatSermonDate, watchUrlFor } from "../../content/sermon-feed";
import { getImageSource } from "../../content/site";
import type { Sermon } from "../../content/types";
import { ButtonLink } from "./button-link";
import { Icon } from "./icon";

export type SermonPlayerProps = {
  sermon: Sermon;
  className?: string;
};

const playerSizes = "(min-width: 64rem) 60rem, 92vw";

export function SermonPlayer({ sermon, className = "" }: SermonPlayerProps) {
  const poster = sermon.image ? (
    <img
      class="sermon-facade-image"
      {...getImageSource(sermon.image, playerSizes)}
      alt=""
      loading="lazy"
    />
  ) : null;

  // The control is omitted rather than rendered with an empty id: a click that
  // assigned a blank signal would hide the facade and request a dead embed URL
  // with no way back. Task 6 can still set $sermon.videoId from an archive row.
  const control = sermon.youtubeId ? (
    <button
      type="button"
      class="sermon-facade-play"
      data-on:click={`$sermon.videoId = '${sermon.youtubeId}'`}
      aria-label={`Play message: ${sermon.title}`}
    >
      <Icon name="play" size={24} />
      <span class="sermon-facade-label">Play message</span>
    </button>
  ) : (
    <p class="sermon-facade-note">Video for this message is coming soon.</p>
  );

  return (
    <div class={`sermon-player ${className}`.trim()} id="sermon-player" tabindex={-1} data-signals='{"sermon":{"videoId":""}}'>
      <div class="sermon-player-frame">
        <div class="sermon-facade" data-show="$sermon.videoId === ''">
          {poster}
          {control}
        </div>
        <iframe
          class="sermon-player-embed"
          data-show="$sermon.videoId !== ''"
          data-attr:src="$sermon.videoId ? 'https://www.youtube-nocookie.com/embed/' + $sermon.videoId + '?rel=0&autoplay=1' : ''"
          title={sermon.title}
          loading="lazy"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
        />
      </div>
      <div class="sermon-player-meta">
        <h3 class="sermon-player-title">{sermon.title}</h3>
        <p class="sermon-player-byline">
          {[sermon.speaker, formatSermonDate(sermon.date), sermon.duration].filter(Boolean).join(" · ")}
        </p>
        {sermon.summary ? <p class="sermon-player-summary">{sermon.summary}</p> : null}
        {sermon.youtubeId ? (
          <ButtonLink
            className="text-link"
            href={watchUrlFor(sermon.youtubeId)}
            external
            icon="youtube"
            iconPosition="end"
          >
            Watch on YouTube
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
