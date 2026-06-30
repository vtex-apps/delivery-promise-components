declare module 'react-apollo' {
  interface DeliveryPromiseObservableQuery {
    queryName?: string
    variables?: Record<string, unknown>
    refetch: (variables?: Record<string, unknown>) => Promise<unknown>
  }

  interface DeliveryPromiseApolloClient {
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
