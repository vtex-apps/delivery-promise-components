declare module 'react-apollo' {
  import type { DocumentNode } from 'graphql'

  interface DeliveryPromiseObservableQuery {
    queryName?: string
    variables?: Record<string, unknown>
    refetch: (variables?: Record<string, unknown>) => Promise<unknown>
  }

  interface DeliveryPromiseApolloClient {
    // One-off query used by client.ts (pickupPointAvailability / catalogCount).
    query: <T = unknown>(options: {
      query: DocumentNode
      variables?: Record<string, unknown>
      fetchPolicy?: 'network-only'
    }) => Promise<{ data: T }>
    // Last-resort broad refetch (apollo-client 2.6); kept for completeness.
    reFetchObservableQueries?: (includeStandby?: boolean) => Promise<unknown[]>
    // Internal enumeration source (apollo-client 2.6 — non-public, accessed
    // defensively to refetch a subset of observable queries by operation name).
    queryManager?: {
      queries?: Map<
        string,
        { observableQuery: DeliveryPromiseObservableQuery | null }
      >
    }
  }

  export function useApolloClient(): DeliveryPromiseApolloClient | null
}
