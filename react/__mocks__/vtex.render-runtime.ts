let query: Record<string, unknown> = {}
let segmentToken: string | undefined
const setQuery = jest.fn((val: Record<string, unknown>) => {
  query = val
})

export const setMockSegmentToken = (token: string | undefined) => {
  segmentToken = token
}

export const useRuntime = jest.fn(() => ({
  query,
  segmentToken,
  hints: {
    mobile: false,
    desktop: true,
  },
  setQuery,
}))

export const useSSR = jest.fn(() => ({
  isSSR: false,
}))

afterEach(() => {
  query = {}
  segmentToken = undefined
  setQuery.mockClear()
})
