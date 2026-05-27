declare module 'react-apollo' {
  interface DeliveryPromiseApolloClient {
    reFetchObservableQueries: (includeStandby?: boolean) => Promise<unknown[]>
  }

  export function useApolloClient(): DeliveryPromiseApolloClient | null
}
