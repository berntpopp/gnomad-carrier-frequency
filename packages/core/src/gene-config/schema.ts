import { z } from "zod";

/**
 * Disease identifier schema — at least one of omimId or mondoId must be present
 */
export const DiseaseIdentifierSchema = z
  .object({
    omimId: z
      .string()
      .regex(/^\d{6}$/, "OMIM ID must be exactly 6 digits")
      .optional(),
    mondoId: z
      .string()
      .regex(
        /^MONDO:\d{7}$/,
        "MONDO ID must be in format MONDO:XXXXXXX (7 digits)",
      )
      .optional(),
    name: z.string().min(1, "Disease name is required"),
  })
  .refine(
    (data) => data.omimId !== undefined || data.mondoId !== undefined,
    "At least one disease identifier (omimId or mondoId) must be provided",
  );

/**
 * Filter configuration overrides — all fields optional, overrides factory defaults
 * Field names match FilterConfig interface in packages/core/src/types/filter.ts
 */
export const FilterConfigOverrideSchema = z
  .object({
    lofHcEnabled: z.boolean().optional(),
    missenseEnabled: z.boolean().optional(),
    clinvarEnabled: z.boolean().optional(),
    clinvarStarThreshold: z.number().int().min(0).max(4).optional(),
    clinvarIncludeConflicting: z.boolean().optional(),
    clinvarConflictingThreshold: z.number().int().min(50).max(100).optional(),
  })
  .optional();

/**
 * Individual condition/disease profile within a gene config
 */
export const ConditionProfileSchema = z.object({
  profileId: z.string().min(1, "Profile ID is required"),
  displayName: z.string().min(1, "Display name is required"),
  isDefault: z.boolean(),
  disease: DiseaseIdentifierSchema,
  penetrance: z.number().min(0).max(1).optional(),
  filterOverrides: FilterConfigOverrideSchema,
  variantExclusions: z.array(z.string()).optional(),
  notes: z.string().optional(),
  references: z
    .array(z.string().url("References must be valid URLs"))
    .optional(),
});

/**
 * Root gene configuration schema
 * Enforces exactly one default profile across all profiles
 */
export const GeneConfigSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    geneSymbol: z.string().min(1).max(20),
    displayName: z.string().optional(),
    omimGeneId: z
      .string()
      .regex(/^\d{6}$/, "OMIM Gene ID must be exactly 6 digits")
      .optional(),
    inheritance: z.enum(["AR", "XL", "AD"]).optional(),
    profiles: z
      .array(ConditionProfileSchema)
      .min(1, "At least one profile is required"),
  })
  .refine((data) => {
    const defaultProfiles = data.profiles.filter((p) => p.isDefault);
    return defaultProfiles.length === 1;
  }, "Exactly one profile must have isDefault: true");

// Inferred TypeScript types
export type GeneConfig = z.infer<typeof GeneConfigSchema>;
export type ConditionProfile = z.infer<typeof ConditionProfileSchema>;
export type DiseaseIdentifier = z.infer<typeof DiseaseIdentifierSchema>;
export type FilterConfigOverride = z.infer<typeof FilterConfigOverrideSchema>;
