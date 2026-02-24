import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTemplateStore } from '../useTemplateStore'

// Mock navigator.language for predictable default language detection
vi.stubGlobal('navigator', { language: 'de-DE' })

describe('useTemplateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('default state', () => {
    it('initialises with genderStyle "*"', () => {
      const store = useTemplateStore()
      expect(store.genderStyle).toBe('*')
    })

    it('initialises with patientSex "male"', () => {
      const store = useTemplateStore()
      expect(store.patientSex).toBe('male')
    })

    it('initialises with enabledSections containing all 5 default sections for each perspective', () => {
      const store = useTemplateStore()
      const expected = ['geneIntro', 'inheritance', 'carrierFrequency', 'recurrenceRisk', 'recommendation']
      expect(store.enabledSections.affected).toEqual(expected)
      expect(store.enabledSections.carrier).toEqual(expected)
      expect(store.enabledSections.familyMember).toEqual(expected)
    })

    it('initialises with empty customSections', () => {
      const store = useTemplateStore()
      expect(store.customSections).toEqual({})
    })
  })

  describe('setLanguage', () => {
    it('changes language to "en"', () => {
      const store = useTemplateStore()
      store.setLanguage('en')
      expect(store.language).toBe('en')
    })

    it('changes language to "de"', () => {
      const store = useTemplateStore()
      store.setLanguage('en')
      store.setLanguage('de')
      expect(store.language).toBe('de')
    })
  })

  describe('setGenderStyle', () => {
    it('changes genderStyle to ":"', () => {
      const store = useTemplateStore()
      store.setGenderStyle(':')
      expect(store.genderStyle).toBe(':')
    })

    it('changes genderStyle to "traditional"', () => {
      const store = useTemplateStore()
      store.setGenderStyle('traditional')
      expect(store.genderStyle).toBe('traditional')
    })
  })

  describe('setPatientSex', () => {
    it('changes patientSex to "female"', () => {
      const store = useTemplateStore()
      store.setPatientSex('female')
      expect(store.patientSex).toBe('female')
    })
  })

  describe('toggleSection', () => {
    it('removes a section that is present', () => {
      const store = useTemplateStore()
      store.toggleSection('affected', 'geneIntro')
      expect(store.enabledSections.affected).not.toContain('geneIntro')
    })

    it('adds a section that is absent', () => {
      const store = useTemplateStore()
      // First remove it
      store.toggleSection('affected', 'geneIntro')
      // Then toggle back
      store.toggleSection('affected', 'geneIntro')
      expect(store.enabledSections.affected).toContain('geneIntro')
    })
  })

  describe('setSectionEnabled', () => {
    it('disables a section when enabled = false', () => {
      const store = useTemplateStore()
      store.setSectionEnabled('carrier', 'recommendation', false)
      expect(store.enabledSections.carrier).not.toContain('recommendation')
    })

    it('enables a section when enabled = true', () => {
      const store = useTemplateStore()
      store.setSectionEnabled('carrier', 'recommendation', false)
      store.setSectionEnabled('carrier', 'recommendation', true)
      expect(store.enabledSections.carrier).toContain('recommendation')
    })
  })

  describe('getEffectiveTemplate', () => {
    it('returns custom template when set', () => {
      const store = useTemplateStore()
      store.setLanguage('de')
      store.setCustomSection('affected.geneIntro', 'Custom text for geneIntro')
      const result = store.getEffectiveTemplate('affected', 'geneIntro')
      expect(result).toBe('Custom text for geneIntro')
    })

    it('returns default template when no custom override exists', () => {
      const store = useTemplateStore()
      store.setLanguage('de')
      const result = store.getEffectiveTemplate('affected', 'geneIntro')
      // Should be a non-empty string from the default German template
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('setCustomSection / resetCustomSection', () => {
    it('sets a custom section override', () => {
      const store = useTemplateStore()
      store.setCustomSection('familyMember.geneIntro', 'Custom family text')
      expect(store.customSections['familyMember.geneIntro']).toBe('Custom family text')
    })

    it('resets a specific custom section', () => {
      const store = useTemplateStore()
      store.setCustomSection('familyMember.geneIntro', 'Custom family text')
      store.resetCustomSection('familyMember.geneIntro')
      expect(store.customSections['familyMember.geneIntro']).toBeUndefined()
    })

    it('hasCustomization returns true when custom section is set', () => {
      const store = useTemplateStore()
      store.setCustomSection('affected.inheritance', 'My override')
      expect(store.hasCustomization('affected', 'inheritance')).toBe(true)
    })

    it('hasCustomization returns false when no override', () => {
      const store = useTemplateStore()
      expect(store.hasCustomization('affected', 'inheritance')).toBe(false)
    })
  })

  describe('resetAllCustomizations', () => {
    it('clears all custom sections', () => {
      const store = useTemplateStore()
      store.setCustomSection('affected.geneIntro', 'override1')
      store.setCustomSection('carrier.recommendation', 'override2')
      store.resetAllCustomizations()
      expect(store.customSections).toEqual({})
    })
  })

  describe('genderSuffix getter', () => {
    it('returns "*innen" for genderStyle "*"', () => {
      const store = useTemplateStore()
      store.setGenderStyle('*')
      expect(store.genderSuffix).toBe('*innen')
    })

    it('returns ":innen" for genderStyle ":"', () => {
      const store = useTemplateStore()
      store.setGenderStyle(':')
      expect(store.genderSuffix).toBe(':innen')
    })
  })
})
