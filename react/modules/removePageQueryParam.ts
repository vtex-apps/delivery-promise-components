/**
 * Removes the `page` pagination query-string param from the current URL without
 * triggering a navigation or reload (uses `history.replaceState`), and returns
 * the page number that was present before removal (defaults to `1`).
 *
 * A delivery-promise location change resets the PLP to the first page.
 * `vtex.search-result` derives the page from the `page` query string
 * (`SearchQuery.js`), so a stale `page=N` must not survive the soft refresh —
 * otherwise the URL and a later re-render/reload would point back at page N.
 *
 * The returned page number lets the caller detect a "deep page" (>= 2). The
 * fetch-more pagination counter lives in `search-result`'s `useFetchMore`
 * internal state, which is seeded at mount and only reset on
 * query/map/orderBy/priceRange changes — none of which a segment change
 * touches. A soft refetch alone therefore cannot rewind that counter, so the
 * caller reloads (landing on the now page-less URL) to re-initialize it.
 */
export function removePageQueryParam(): number {
  if (
    typeof window === 'undefined' ||
    !window.history ||
    typeof window.history.replaceState !== 'function'
  ) {
    return 1
  }

  const url = new URL(window.location.href)

  if (!url.searchParams.has('page')) {
    return 1
  }

  const parsedPage = Number(url.searchParams.get('page'))
  const previousPage =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1

  url.searchParams.delete('page')

  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  )

  return previousPage
}
