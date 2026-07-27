/** Guardian relationship catalogue with implied gender. */
export type RelationshipValue =
  | "father"
  | "mother"
  | "grandfather"
  | "grandmother"
  | "brother"
  | "sister"
  | "uncle"
  | "aunt"
  | "maternal_uncle"
  | "maternal_aunt"
  | "legal_guardian"
  | "other";

export type RelationshipOption = {
  value: RelationshipValue;
  label: string;
  gender: "male" | "female" | null;
};

export const RELATIONSHIPS: RelationshipOption[] = [
  { value: "father", label: "الأب", gender: "male" },
  { value: "mother", label: "الأم", gender: "female" },
  { value: "grandfather", label: "الجد", gender: "male" },
  { value: "grandmother", label: "الجدة", gender: "female" },
  { value: "brother", label: "الأخ", gender: "male" },
  { value: "sister", label: "الأخت", gender: "female" },
  { value: "uncle", label: "العم", gender: "male" },
  { value: "aunt", label: "العمة", gender: "female" },
  { value: "maternal_uncle", label: "الخال", gender: "male" },
  { value: "maternal_aunt", label: "الخالة", gender: "female" },
  { value: "legal_guardian", label: "ولي أمر شرعي", gender: null },
  { value: "other", label: "صلة أخرى", gender: null },
];

export const RELATIONSHIP_VALUES = RELATIONSHIPS.map((r) => r.value) as [
  RelationshipValue,
  ...RelationshipValue[],
];

export const relationshipLabel = (value: string) =>
  RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;

/** Gender implied by the relationship, or null when the user must pick. */
export const relationshipGender = (value: string): "male" | "female" | null =>
  RELATIONSHIPS.find((r) => r.value === value)?.gender ?? null;