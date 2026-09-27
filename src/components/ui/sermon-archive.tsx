import { formatSermonDate, watchUrlFor } from "../../content/sermon-feed";
import type { Sermon } from "../../content/types";
import { ButtonLink } from "./button-link";
import { Icon } from "./icon";

export type SermonArchiveProps = {
  sermons: Sermon[];
};

function groupByYear(sermons: Sermon[]) {
  const groups = new Map<string, Sermon[]>();

  for (const sermon of sermons) {
    const year = sermon.date.slice(0, 4);

    groups.set(year, [...(groups.get(year) ?? []), sermon]);
  }

  return [...groups.entries()];
}

function sourceLabel(sermon: Sermon) {
  if (sermon.youtubeId) {
    return "YouTube";
  }

  return sermon.facebookUrl ? "Facebook" : null;
}

function playAction(sermon: Sermon) {
  if (!sermon.youtubeId) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        class="sermon-row-play"
        data-on:click={`$sermon.videoId = '${sermon.youtubeId}'; document.getElementById('sermon-player')?.focus()`}
        aria-label={`Play ${sermon.title} in the player above`}
      >
        <Icon name="play" size={18} />
        <span>Play</span>
      </button>
      <a
        class="sermon-row-link"
        href={watchUrlFor(sermon.youtubeId)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Watch on YouTube
      </a>
    </>
  );
}

function facebookAction(sermon: Sermon) {
  if (!sermon.facebookUrl) {
    return null;
  }

  return (
    <ButtonLink
      className="sermon-row-link"
      href={sermon.facebookUrl}
      external
      icon="facebook"
      iconPosition="start"
    >
      Watch on Facebook
    </ButtonLink>
  );
}

export function SermonArchive({ sermons }: SermonArchiveProps) {
  if (sermons.length === 0) {
    return <p class="empty-state">No archived messages yet. Watch the latest on Facebook in the meantime.</p>;
  }

  return (
    <ol class="sermon-archive">
      {groupByYear(sermons).map(([year, entries]) => (
        <li key={year} class="sermon-archive-year-group">
          <h3 class="sermon-archive-year">{year}</h3>
          <ul class="sermon-archive-list">
            {entries.map((sermon) => {
              const source = sourceLabel(sermon);

              return (
                <li key={sermon.youtubeId ?? sermon.facebookUrl ?? `${sermon.date}-${sermon.title}`}>
                  <article class={`sermon-row${sermon.needsCuration ? " needs-curation" : ""}`}>
                    <div class="sermon-row-main">
                      <time class="sermon-row-date" datetime={sermon.date}>
                        {formatSermonDate(sermon.date)}
                      </time>
                      <h4 class="sermon-row-title">{sermon.title}</h4>
                      {sermon.speaker ? <p class="sermon-row-speaker">{sermon.speaker}</p> : null}
                    </div>
                    <div class="sermon-row-aside">
                      {source ? <span class="sermon-row-badge">{source}</span> : null}
                      {sermon.needsCuration ? <span class="sermon-row-flag">needs curation</span> : null}
                      {playAction(sermon)}
                      {facebookAction(sermon)}
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
}
