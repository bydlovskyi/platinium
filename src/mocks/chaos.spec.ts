import { chaos } from './chaos'

describe('chaos', () => {
  afterEach(() => chaos.clearChaos())

  describe('latency', () => {
    it('defaults to zero latency under test, so the suite stays fast and deterministic', () => {
      expect(chaos.getLatency()).toBe(0)
    })

    it('setLatency() changes the configured latency', () => {
      chaos.setLatency(250)

      expect(chaos.getLatency()).toBe(250)
    })

    it('setLatency() clamps a negative value to zero', () => {
      chaos.setLatency(-100)

      expect(chaos.getLatency()).toBe(0)
    })

    it('clearChaos() resets latency back to the environment default', () => {
      chaos.setLatency(999)

      chaos.clearChaos()

      expect(chaos.getLatency()).toBe(0)
    })
  })

  describe('failNextRequest (one-shot)', () => {
    it('is undefined for a path with no forced failure registered', () => {
      expect(chaos.consumeForcedFailure('/events')).toBeUndefined()
    })

    it('returns the forced status for a matching path', () => {
      chaos.failNextRequest({ path: '/events', status: 500 })

      expect(chaos.consumeForcedFailure('/events')).toEqual({ status: 500 })
    })

    it('is consumed after one match — the next call for the same path returns undefined', () => {
      chaos.failNextRequest({ path: '/events', status: 500 })

      chaos.consumeForcedFailure('/events')

      expect(chaos.consumeForcedFailure('/events')).toBeUndefined()
    })

    it('only affects the registered path, not others', () => {
      chaos.failNextRequest({ path: '/events', status: 500 })

      expect(chaos.consumeForcedFailure('/categories')).toBeUndefined()
    })
  })

  describe('failPersistently', () => {
    it('returns the forced status on every call until cleared', () => {
      chaos.failPersistently({ path: '/tickets', status: 503 })

      expect(chaos.consumeForcedFailure('/tickets')).toEqual({ status: 503 })
      expect(chaos.consumeForcedFailure('/tickets')).toEqual({ status: 503 })
      expect(chaos.consumeForcedFailure('/tickets')).toEqual({ status: 503 })
    })

    it('clearPersistentFailure() clears only the given path', () => {
      chaos.failPersistently({ path: '/tickets', status: 503 })
      chaos.failPersistently({ path: '/events', status: 500 })

      chaos.clearPersistentFailure('/tickets')

      expect(chaos.consumeForcedFailure('/tickets')).toBeUndefined()
      expect(chaos.consumeForcedFailure('/events')).toEqual({ status: 500 })
    })

    it('a later call for the same path overwrites the previously forced status', () => {
      chaos.failPersistently({ path: '/tickets', status: 503 })
      chaos.failPersistently({ path: '/tickets', status: 418 })

      expect(chaos.consumeForcedFailure('/tickets')).toEqual({ status: 418 })
    })
  })

  describe('interaction between one-shot and persistent failures', () => {
    it('a one-shot failure takes precedence over a persistent failure for the same path', () => {
      chaos.failPersistently({ path: '/tickets', status: 503 })
      chaos.failNextRequest({ path: '/tickets', status: 418 })

      expect(chaos.consumeForcedFailure('/tickets')).toEqual({ status: 418 })
    })

    it('falls back to the persistent failure once the one-shot failure is consumed', () => {
      chaos.failPersistently({ path: '/tickets', status: 503 })
      chaos.failNextRequest({ path: '/tickets', status: 418 })

      chaos.consumeForcedFailure('/tickets')

      expect(chaos.consumeForcedFailure('/tickets')).toEqual({ status: 503 })
    })
  })

  describe('clearChaos', () => {
    it('clears one-shot failures, persistent failures and latency together', () => {
      chaos.setLatency(500)
      chaos.failNextRequest({ path: '/events', status: 500 })
      chaos.failPersistently({ path: '/tickets', status: 503 })

      chaos.clearChaos()

      expect(chaos.getLatency()).toBe(0)
      expect(chaos.consumeForcedFailure('/events')).toBeUndefined()
      expect(chaos.consumeForcedFailure('/tickets')).toBeUndefined()
    })
  })
})
