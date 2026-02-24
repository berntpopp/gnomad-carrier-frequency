import { describe, it, expect } from 'vitest'
import {
  calculateGeneticPrevalence,
  calculateBayesianPrevalence,
  formatPrevalence,
} from '../src/calculations/prevalence.js'

describe('calculateGeneticPrevalence', () => {
  it('returns 0 for empty array', () => {
    expect(calculateGeneticPrevalence([])).toBe(0)
  })

  it('returns q^2 from raw sum of AFs', () => {
    // q = 0.01 + 0.005 = 0.015, q^2 = 0.000225
    expect(calculateGeneticPrevalence([0.01, 0.005])).toBeCloseTo(0.000225, 6)
  })

  it('GOLDEN: CFTR global q=0.023 -> q^2 = 0.000529', () => {
    // q = 0.023, q^2 = 0.023^2 = 0.000529
    expect(calculateGeneticPrevalence([0.023])).toBeCloseTo(0.000529, 6)
  })

  it('GOLDEN: HEXA Ashkenazi Jewish q~1/58 -> prevalence toBeCloseTo(0.000297, 6)', () => {
    // Published carrier freq ~1:29, so q ≈ 1/58 = 0.017241
    // q^2 = 0.017241^2 = 0.000297...
    const q = 1 / 58
    expect(calculateGeneticPrevalence([q])).toBeCloseTo(0.000297, 6)
  })

  it('GOLDEN: GJB2 global q=0.011 -> q^2 = 0.000121', () => {
    // q = 0.011, q^2 = 0.011^2 = 0.000121
    expect(calculateGeneticPrevalence([0.011])).toBeCloseTo(0.000121, 6)
  })

  it('correctly sums multiple AFs before squaring', () => {
    // q = 0.005 + 0.003 = 0.008, q^2 = 0.000064
    expect(calculateGeneticPrevalence([0.005, 0.003])).toBeCloseTo(0.000064, 8)
  })

  it('is always computed from raw q (SumAF), NOT from carrier frequency', () => {
    // Verify: q^2 != (2pq)^2 / 4
    // For q=0.023: q^2 = 0.000529, but (2pq)^2/4 = (0.044942)^2/4 = 0.000505...
    const prevalence = calculateGeneticPrevalence([0.023])
    const incorrectFormula = Math.pow(2 * 0.977 * 0.023, 2) / 4
    expect(prevalence).not.toBeCloseTo(incorrectFormula, 4)
    expect(prevalence).toBeCloseTo(0.000529, 6)
  })
})

describe('calculateBayesianPrevalence', () => {
  it('returns genetic prevalence unchanged when penetrance is 1.0 (default)', () => {
    expect(calculateBayesianPrevalence(0.000529, 1.0)).toBeCloseTo(0.000529, 6)
  })

  it('scales genetic prevalence by penetrance', () => {
    // 0.000529 * 0.8 = 0.0004232
    expect(calculateBayesianPrevalence(0.000529, 0.8)).toBeCloseTo(0.0004232, 7)
  })

  it('returns 0 when penetrance is 0', () => {
    expect(calculateBayesianPrevalence(0.000529, 0.0)).toBe(0)
  })

  it('returns 0 when genetic prevalence is 0', () => {
    expect(calculateBayesianPrevalence(0, 1.0)).toBe(0)
  })

  it('GOLDEN: CFTR with full penetrance = q^2 = 0.000529', () => {
    expect(calculateBayesianPrevalence(0.000529, 1.0)).toBeCloseTo(0.000529, 6)
  })

  it('handles penetrance values between 0 and 1', () => {
    expect(calculateBayesianPrevalence(0.001, 0.5)).toBeCloseTo(0.0005, 6)
  })
})

describe('formatPrevalence', () => {
  it('returns "Not detected" strings for null', () => {
    const result = formatPrevalence(null)
    expect(result.ratio).toBe('Not detected')
    expect(result.percent).toBe('Not detected')
  })

  it('returns "Not detected" strings for 0', () => {
    const result = formatPrevalence(0)
    expect(result.ratio).toBe('Not detected')
    expect(result.percent).toBe('Not detected')
  })

  it('formats CFTR prevalence correctly (0.000529)', () => {
    // 1 / 0.000529 = 1890.36... -> 1:1,890
    // 0.000529 * 100 = 0.0529%
    const result = formatPrevalence(0.000529)
    expect(result.ratio).toBe('1:1,890')
    expect(result.percent).toBe('0.0529%')
  })

  it('formats 0.0001 correctly', () => {
    // 1 / 0.0001 = 10000 -> 1:10,000
    // 0.0001 * 100 = 0.0100%
    const result = formatPrevalence(0.0001)
    expect(result.ratio).toBe('1:10,000')
    expect(result.percent).toBe('0.0100%')
  })

  it('formats small prevalence with correct rounding', () => {
    // 1 / 0.000297 = 3367 -> 1:3,367
    const result = formatPrevalence(0.000297)
    expect(result.ratio).toMatch(/^1:\d+,\d+$/)
    expect(result.percent).toMatch(/^\d+\.\d{4}%$/)
  })
})
