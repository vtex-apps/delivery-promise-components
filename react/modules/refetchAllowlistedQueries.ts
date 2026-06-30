import { QUERY_VARIABLE_OVERRIDES, REFRESHABLE_QUERY_NAMES } from '../constants'

interface RefreshableObservableQuery {
  queryName?: string
  variables?: Record<string, unknown>
  refetch: (variables?: Record<string, unknown>) => Promise<unknown>
}

interface RefetchableClient {
  queryManager?: {
    queries?: Map<
      string,
      { observableQuery: RefreshableObservableQuery | null }
    >
  }
}

export interface RefetchOutcome {
  /** Number of allowlisted, observable queries a refetch was issued for. */
  attempted: number
  /** True when internals were inaccessible or at least one refetch rejected. */
  failed: boolean
}

/**
 * Refetches only the allowlisted, currently-observable store-resources queries.
 *
 * apollo-client 2.6 has no public subset-refetch API (`refetchQueries({ include })`
 * arrived in @apollo/client v3), so we enumerate the QueryManager's observable
 * queries and filter by operation name. Per-query overrides from
 * `QUERY_VARIABLE_OVERRIDES` are computed from and merged on top of each query's
 * existing variables (e.g. `productSearchV3` resets to the first page —
 * `from: 0` and `to: page size - 1`).
 *
 * When the internal `queryManager.queries` map is unreachable, `failed: true` is
 * returned so the caller can fall back to a hard reload. Each refetch is settled
 * independently so a single rejection does not abort the others.
 */
export async function refetchAllowlistedQueries(
  client: RefetchableClient
): Promise<RefetchOutcome> {
  const queries = client?.queryManager?.queries

  if (!queries || typeof queries.forEach !== 'function') {
    return { attempted: 0, failed: true }
  }

  const refetches: Array<Promise<boolean>> = []

  queries.forEach((info) => {
    const observableQuery = info?.observableQuery
    const queryName = observableQuery?.queryName

    if (
      !observableQuery ||
      typeof observableQuery.refetch !== 'function' ||
      !queryName ||
      !REFRESHABLE_QUERY_NAMES.includes(queryName)
    ) {
      return
    }

    const buildOverride = QUERY_VARIABLE_OVERRIDES[queryName]
    const existingVariables = observableQuery.variables ?? {}
    const variables = buildOverride
      ? { ...existingVariables, ...buildOverride(existingVariables) }
      : undefined

    refetches.push(
      // Resolve → false (ok), reject → true (failed); settle independently.
      Promise.resolve(observableQuery.refetch(variables)).then(
        () => false,
        () => true
      )
    )
  })

  const outcomes = await Promise.all(refetches)

  return {
    attempted: outcomes.length,
    failed: outcomes.some(Boolean),
  }
}
