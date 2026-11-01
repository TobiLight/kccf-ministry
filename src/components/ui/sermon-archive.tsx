import { formatSermonDate, watchUrlFor } from "../../content/sermon-feed";
import type { Sermon } from "../../content/types";
import { ButtonLink } from "./button-link";
import { Icon } from "./icon";

export const archivePageSize = 15;

export type SermonArchiveProps = {
  sermons: Sermon[];
  page?: number;
};

function pageCountFor(total: number) {
  return Math.max(1, Math.ceil(total / archivePageSize));
}

function clampPage(page: number, pageCount: number) {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.floor(page)), pageCount);
}

function pageHref(page: number) {
  return page <= 1 ? "/sermons" : `/sermons?page=${page}`;
}

function paginationNav(currentPage: number, pageCount: number) {
  if (pageCount <= 1) {
    return null;
  }

  return (
    <nav class="sermon-pagination" aria-label="Sermon archive pagination">
      {currentPage > 1 ? (
        <a class="sermon-pagination-link" href={pageHref(currentPage - 1)}>
          Previous
        </a>
      ) : null}
      <ul class="sermon-pagination-pages">
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <li key={pageNumber}>
            <a
              class="sermon-pagination-link"
              href={pageHref(pageNumber)}
              aria-current={pageNumber === currentPage ? "page" : undefined}
            >
              {pageNumber}
            </a>
          </li>
        ))}
      </ul>
      {currentPage < pageCount ? (
        <a class="sermon-pagination-link" href={pageHref(currentPage + 1)}>
          Next
        </a>
      ) : null}
    </nav>
  );
}

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
        data-on:click={`$sermon.videoId = ${JSON.stringify(sermon.youtubeId)}; document.getElementById('sermon-player')?.focus()`}
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

export function SermonArchive({ sermons, page }: SermonArchiveProps) {
  if (sermons.length === 0) {
    return <p class="empty-state">No archived messages yet. Watch the latest on Facebook in the meantime.</p>;
  }

  const pageCount = pageCountFor(sermons.length);
  const currentPage = clampPage(page ?? 1, pageCount);
  const start = (currentPage - 1) * archivePageSize;
  const visible = sermons.slice(start, start + archivePageSize);

  return (
    <>
      <ol class="sermon-archive">
        {groupByYear(visible).map(([year, entries]) => (
          <li key={year} class="sermon-archive-year-group">
            <h3 class="sermon-archive-year">{year}</h3>
            <ul class="sermon-archive-list">
              {entries.map((sermon) => {
                const source = sourceLabel(sermon);

                return (
                  <li key={sermon.youtubeId ?? sermon.facebookUrl ?? `${sermon.date}-${sermon.title}`}>
                    <article class="sermon-row">
                      <div class="sermon-row-main">
                        <time class="sermon-row-date" datetime={sermon.date}>
                          {formatSermonDate(sermon.date)}
                        </time>
                        <h4 class="sermon-row-title">{sermon.title}</h4>
                        {sermon.speaker ? <p class="sermon-row-speaker">{sermon.speaker}</p> : null}
                      </div>
                      <div class="sermon-row-aside">
                        {source ? <span class="sermon-row-badge">{source}</span> : null}
                        {sermon.needsCuration ? <span class="sermon-row-flag" /> : null}
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
      {paginationNav(currentPage, pageCount)}
    </>
  );
}
