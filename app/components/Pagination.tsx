"use client";

import { useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";

export interface PaginationProps {
  /** The currently active page (1-indexed). */
  currentPage: number;
  /** Total number of pages. Must be >= 0. */
  totalPages: number;
  /** Invoked when the user selects a page. */
  onPageChange: (page: number) => void;
  /** Number of page buttons shown around the current page. Defaults to 1. */
  siblingCount?: number;
  /** Number of page buttons shown beside first/last pages. Defaults to 1. */
  boundaryCount?: number;
  /** Accessible label for the navigation region. */
  ariaLabel?: string;
  /** Show first/last shortcut buttons. Defaults to true. */
  showFirstLast?: boolean;
  /** Disable all interaction (e.g. while a request is in flight). */
  disabled?: boolean;
  /** Render an inline loading indicator in place of the active page number. */
  isLoading?: boolean;
  /** Visible label for the "previous" button. */
  prevLabel?: string;
  /** Visible label for the "next" button. */
  nextLabel?: string;
  /** Ellipsis separator text. */
  ellipsisLabel?: string;
}

export interface PageItem {
  type: "page" | "ellipsis";
  page?: number;
  key: string;
}

const DEFAULT_SIBLING_COUNT = 1;
const DEFAULT_BOUNDARY_COUNT = 1;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Builds the ordered list of page items (numbers and ellipsis markers) to
 * render, collapsing long page ranges with ellipsis separators.
 */
export function buildPageItems(
  currentPage: number,
  totalPages: number,
  siblingCount = DEFAULT_SIBLING_COUNT,
  boundaryCount = DEFAULT_BOUNDARY_COUNT,
): PageItem[] {
  if (totalPages <= 0) {
    return [];
  }

  const current = clamp(currentPage, 1, totalPages);

  // When the total is small, render every page with no ellipsis.
  if (totalPages <= 2 * boundaryCount + 2 * siblingCount + 3) {
    return Array.from({ length: totalPages }, (_, i) => ({
      type: "page" as const,
      page: i + 1,
      key: `page-${i + 1}`,
    }));
  }

  const startPages = new Set<number>();
  const endPages = new Set<number>();
  const middlePages = new Set<number>();

  for (let i = 1; i <= boundaryCount; i += 1) {
    startPages.add(i);
    endPages.add(totalPages - i + 1);
  }

  const middleStart = current - siblingCount;
  const middleEnd = current + siblingCount;
  for (let i = middleStart; i <= middleEnd; i += 1) {
    if (i >= 1 && i <= totalPages) {
      middlePages.add(i);
    }
  }

  const ordered = Array.from(
    new Set<number>([...startPages, ...middlePages, ...endPages]),
  ).sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;

  for (const page of ordered) {
    if (page - previous > 1) {
      items.push({ type: "ellipsis", key: `ellipsis-${previous}-${page}` });
    }
    items.push({ type: "page", page, key: `page-${page}` });
    previous = page;
  }

  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = DEFAULT_SIBLING_COUNT,
  boundaryCount = DEFAULT_BOUNDARY_COUNT,
  ariaLabel = "Pagination",
  showFirstLast = true,
  disabled = false,
  isLoading = false,
  prevLabel = "Previous page",
  nextLabel = "Next page",
  ellipsisLabel = "More pages",
}: PaginationProps) {
  const current = clamp(currentPage, 1, Math.max(1, totalPages));
  const hasPrevious = current > 1;
  const hasNext = current < totalPages;
  const disabledFirst = disabled || !showFirstLast || !hasPrevious;
  const disabledPrev = disabled || !hasPrevious;
  const disabledNext = disabled || !hasNext;
  const disabledLast = disabled || !showFirstLast || !hasNext;

  const items = useMemo(
    () => buildPageItems(current, totalPages, siblingCount, boundaryCount),
    [current, totalPages, siblingCount, boundaryCount],
  );

  const handleChange = useCallback(
    (page: number) => {
      if (disabled || isLoading) {
        return;
      }
      const target = clamp(page, 1, Math.max(1, totalPages));
      if (target !== currentPage) {
        onPageChange(target);
      }
    },
    [disabled, isLoading, totalPages, currentPage, onPageChange],
  );

  const baseButtonClasses =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-theme-primary focus-visible:outline-none";
  const enabledClasses =
    "border border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.12] hover:text-white";
  const disabledClasses =
    "border border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed";
  const activeClasses =
    "border border-theme-primary bg-theme-primary text-white shadow-[0_0_14px_rgba(var(--color-theme-primary-rgb),0.4)]";

  const navButtonClass = (isDisabled: boolean) =>
    `${baseButtonClasses} ${isDisabled ? disabledClasses : enabledClasses}`;

  return (
    <nav
      className="flex w-full items-center justify-center gap-1 py-2"
      aria-label={ariaLabel}
      data-testid="pagination"
    >
      {showFirstLast && (
        <button
          type="button"
          onClick={() => handleChange(1)}
          disabled={disabledFirst || isLoading}
          aria-label="Go to first page"
          className={navButtonClass(disabledFirst || isLoading)}
        >
          <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={() => handleChange(current - 1)}
        disabled={disabledPrev || isLoading}
        aria-label={prevLabel}
        className={navButtonClass(disabledPrev || isLoading)}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      <ul className="flex items-center gap-1">
        {items.map((item) => {
          if (item.type === "ellipsis") {
            return (
              <li
                key={item.key}
                className="flex h-9 min-w-9 items-center justify-center px-1 text-sm text-white/40 select-none"
                aria-hidden="true"
                data-testid="pagination-ellipsis"
              >
                {ellipsisLabel}
              </li>
            );
          }

          const page = item.page as number;
          const isCurrent = page === current;
          const isDisabled = disabled || isLoading;

          if (isCurrent && isLoading) {
            return (
              <li key={item.key}>
                <span
                  className={`${baseButtonClasses} ${activeClasses}`}
                  role="status"
                  aria-label={`Loading page ${page}`}
                  data-testid="pagination-loading"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                </span>
              </li>
            );
          }

          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => handleChange(page)}
                disabled={isDisabled}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={`Page ${page}`}
                className={`${baseButtonClasses} ${
                  isCurrent ? activeClasses : isDisabled ? disabledClasses : enabledClasses
                }`}
              >
                {page}
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={() => handleChange(current + 1)}
        disabled={disabledNext || isLoading}
        aria-label={nextLabel}
        className={navButtonClass(disabledNext || isLoading)}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>

      {showFirstLast && (
        <button
          type="button"
          onClick={() => handleChange(totalPages)}
          disabled={disabledLast || isLoading}
          aria-label="Go to last page"
          className={navButtonClass(disabledLast || isLoading)}
        >
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Page ${current} of ${totalPages}`}
      </div>
    </nav>
  );
}

export default Pagination;
