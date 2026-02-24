import { describe, it, expect } from 'vitest'
import {
  calculateHWECarrierFrequency,
  calculateSimplifiedCarrierFrequency,
} from '../src/calculations/carrier-frequency.js'

describe('calculateHWECarrierFrequency', () => {
  it('returns 0 for empty array', () => {
    expect(calculateHWECarrierFrequency([])).toBe(0)
  })

  it('returns correct HWE 2pq for a single allele frequency (CFTR global ~0.023)', () => {
    // q = 0.023, p = 0.977, 2pq = 2 * 0.977 * 0.023 = 0.044942
    const result = calculateHWECarrierFrequency([0.023])
    expect(result).toBeCloseTo(0.044942, 4)
  })

  it('returns correct HWE 2pq for multiple allele frequencies', () => {
    // q = 0.01 + 0.005 = 0.015, p = 0.985, 2pq = 2 * 0.985 * 0.015 = 0.02955
    const result = calculateHWECarrierFrequency([0.01, 0.005])
    expect(result).toBeCloseTo(0.02955, 5)
  })

  it('converges with simplified formula for very small q (< 0.001)', () => {
    // q = 0.001, p = 0.999, 2pq = 0.001998 ≈ 2*0.001 = 0.002
    const result = calculateHWECarrierFrequency([0.001])
    expect(result).toBeCloseTo(0.001998, 6)
  })

  it('handles a single variant with zero homozygotes (standard case)', () => {
    const result = calculateHWECarrierFrequency([0.01])
    // q = 0.01, 2pq = 2 * 0.99 * 0.01 = 0.0198
    expect(result).toBeCloseTo(0.0198, 6)
  })

  // Golden-value: CFTR global (gnomAD v4.0)
  it('GOLDEN: CFTR global q=0.023 -> HWE carrier freq toBeCloseTo(0.044942, 4)', () => {
    expect(calculateHWECarrierFrequency([0.023])).toBeCloseTo(0.044942, 4)
  })

  // Golden-value: GJB2 global (connexin 26, AR hearing loss)
  it('GOLDEN: GJB2 global q=0.011 -> HWE carrier freq toBeCloseTo(0.021758, 4)', () => {
    // q = 0.011, p = 0.989, 2pq = 2 * 0.989 * 0.011 = 0.021758
    expect(calculateHWECarrierFrequency([0.011])).toBeCloseTo(0.021758, 4)
  })

  it('correctly sums multiple AFs before applying HWE', () => {
    // q = 0.023 + 0.005 = 0.028, p = 0.972, 2pq = 2 * 0.972 * 0.028 = 0.054432
    const result = calculateHWECarrierFrequency([0.023, 0.005])
    expect(result).toBeCloseTo(0.054432, 5)
  })
})

describe('calculateSimplifiedCarrierFrequency', () => {
  it('returns 0 for empty array', () => {
    expect(calculateSimplifiedCarrierFrequency([])).toBe(0)
  })

  it('returns 2 * sum for single AF', () => {
    expect(calculateSimplifiedCarrierFrequency([0.023])).toBeCloseTo(0.046, 6)
  })

  it('returns 2 * sum for multiple AFs', () => {
    expect(calculateSimplifiedCarrierFrequency([0.01, 0.005])).toBeCloseTo(0.03, 6)
  })

  it('is always slightly larger than HWE for the same q', () => {
    const q = 0.023
    const hwe = calculateHWECarrierFrequency([q])
    const simplified = calculateSimplifiedCarrierFrequency([q])
    expect(simplified).toBeGreaterThan(hwe)
  })

  it('GOLDEN: CFTR simplified = 2 * 0.023 = 0.046', () => {
    expect(calculateSimplifiedCarrierFrequency([0.023])).toBeCloseTo(0.046, 6)
  })
})
