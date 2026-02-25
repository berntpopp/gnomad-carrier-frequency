import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAppStore } from "../useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("default state", () => {
    it("starts with disclaimerAcknowledged: false", () => {
      const store = useAppStore();
      expect(store.disclaimerAcknowledged).toBe(false);
    });

    it("starts with disclaimerAcknowledgedAt: null", () => {
      const store = useAppStore();
      expect(store.disclaimerAcknowledgedAt).toBeNull();
    });

    it("starts with onboardingDismissed: false", () => {
      const store = useAppStore();
      expect(store.onboardingDismissed).toBe(false);
    });
  });

  describe("shouldShowDisclaimer getter", () => {
    it("returns true initially (disclaimer not acknowledged)", () => {
      const store = useAppStore();
      expect(store.shouldShowDisclaimer).toBe(true);
    });

    it("returns false after disclaimer is acknowledged", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      expect(store.shouldShowDisclaimer).toBe(false);
    });
  });

  describe("acknowledgeDisclaimer", () => {
    it("sets disclaimerAcknowledged to true", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      expect(store.disclaimerAcknowledged).toBe(true);
    });

    it("sets disclaimerAcknowledgedAt to a timestamp", () => {
      const store = useAppStore();
      const before = Date.now();
      store.acknowledgeDisclaimer();
      const after = Date.now();
      expect(store.disclaimerAcknowledgedAt).toBeGreaterThanOrEqual(before);
      expect(store.disclaimerAcknowledgedAt).toBeLessThanOrEqual(after);
    });

    it("acknowledgedDate getter returns a non-null string after acknowledgment", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      expect(typeof store.acknowledgedDate).toBe("string");
      expect(store.acknowledgedDate).not.toBeNull();
    });
  });

  describe("resetDisclaimer", () => {
    it("resets disclaimerAcknowledged to false", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      store.resetDisclaimer();
      expect(store.disclaimerAcknowledged).toBe(false);
    });

    it("resets disclaimerAcknowledgedAt to null", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      store.resetDisclaimer();
      expect(store.disclaimerAcknowledgedAt).toBeNull();
    });
  });

  describe("shouldShowOnboarding getter", () => {
    it("returns false when disclaimer not yet acknowledged", () => {
      const store = useAppStore();
      expect(store.shouldShowOnboarding).toBe(false);
    });

    it("returns true after disclaimer acknowledged and onboarding not yet dismissed", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      expect(store.shouldShowOnboarding).toBe(true);
    });

    it("returns false after onboarding is dismissed", () => {
      const store = useAppStore();
      store.acknowledgeDisclaimer();
      store.dismissOnboarding();
      expect(store.shouldShowOnboarding).toBe(false);
    });
  });

  describe("dismissOnboarding", () => {
    it("sets onboardingDismissed to true", () => {
      const store = useAppStore();
      store.dismissOnboarding();
      expect(store.onboardingDismissed).toBe(true);
    });
  });

  describe("acknowledgedDate getter", () => {
    it("returns null before acknowledgment", () => {
      const store = useAppStore();
      expect(store.acknowledgedDate).toBeNull();
    });
  });
});
