/**
 * Removes the `page` pagination query-string param from the current URL without
 * triggering a navigation or reload (uses `history.replaceState`).
 *
 * A delivery-promise location change resets the PLP to the first page.
 * `vtex.search-result` derives the page from the `page` query string
 * (`SearchQuery.js`), so a stale `page=N` must not survive the soft refresh —
 * otherwise the URL and a later re-render/reload would point back at page N.
 */
export function removePageQueryParam(): void {
  if (
    typeof window === 'undefined' ||
    !window.history ||
    typeof window.history.replaceState !== 'function'
  ) {
    return
  }

  const url = new URL(window.location.href)

  if (!url.searchParams.has('page')) {
    return
  }

  url.searchParams.delete('page')

  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`
  )
}
