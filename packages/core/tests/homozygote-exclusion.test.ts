import { describe, it, expect } from 'vitest'
import {
  calculateVCR,
  calculateGCR,
} from '../src/calculations/homozygote-exclusion.js'

describe('calculateVCR', () => {
  it('returns 0 when AN is 0 (unsampled population)', () => {
    expect(calculateVCR(0, 0, 0)).toBe(0)
  })

  it('returns standard carrier rate when no homozygotes present', () => {
    // VCR = (AC - 2*0) / (AN/2) = 10 / 500 = 0.02
    expect(calculateVCR(10, 1000, 0)).toBeCloseTo(0.02, 6)
  })

  it('correctly excludes homozygotes from carrier count', () => {
    // VCR = (12 - 2*1) / (1000/2) = 10 / 500 = 0.02
    expect(calculateVCR(12, 1000, 1)).toBeCloseTo(0.02, 6)
  })

  it('handles larger homozygote count correctly', () => {
    // VCR = (100 - 2*5) / (10000/2) = 90 / 5000 = 0.018
    expect(calculateVCR(100, 10000, 5)).toBeCloseTo(0.018, 6)
  })

  it('returns 0 when AC equals 2*acHom (all alleles in homozygotes)', () => {
    // VCR = (4 - 2*2) / (1000/2) = 0 / 500 = 0
    expect(calculateVCR(4, 1000, 2)).toBe(0)
  })

  it('handles typical gnomAD-scale data', () => {
    // VCR = (500 - 2*10) / (100000/2) = 480 / 50000 = 0.0096
    expect(calculateVCR(500, 100000, 10)).toBeCloseTo(0.0096, 6)
  })
})

describe('calculateGCR', () => {
  it('returns 0 for empty array', () => {
    expect(calculateGCR([])).toBe(0)
  })

  it('returns same value as VCR for single variant', () => {
    expect(calculateGCR([0.02])).toBeCloseTo(0.02, 6)
  })

  it('applies inclusion-exclusion for two variants', () => {
    // GCR = 1 - (1-0.02)*(1-0.01) = 1 - 0.98*0.99 = 1 - 0.9702 = 0.0298
    expect(calculateGCR([0.02, 0.01])).toBeCloseTo(0.0298, 6)
  })

  it('applies inclusion-exclusion for three variants', () => {
    // GCR = 1 - (1-0.02)*(1-0.01)*(1-0.005) = 1 - 0.98*0.99*0.995
    // = 1 - 0.98 * 0.99 * 0.995 = 1 - 0.965169 = 0.034831...
    expect(calculateGCR([0.02, 0.01, 0.005])).toBeCloseTo(0.03471, 5)
  })

  it('result is always less than simple sum of VCRs (inclusion-exclusion principle)', () => {
    const vcrs = [0.02, 0.01]
    const gcr = calculateGCR(vcrs)
    const simpleSum = vcrs.reduce((a, b) => a + b, 0)
    expect(gcr).toBeLessThan(simpleSum)
  })

  it('handles variant with VCR of zero (no contribution)', () => {
    // GCR = 1 - (1-0.02)*(1-0) = 1 - 0.98*1 = 0.02
    expect(calculateGCR([0.02, 0])).toBeCloseTo(0.02, 6)
  })
})
