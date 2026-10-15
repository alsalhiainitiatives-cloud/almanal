import { describe, expect, it } from "vitest";
import { normalizeQurra } from "./student-import";

describe("normalizeQurra", () => {
  it("treats نعم as approved Qurra support", () => expect(normalizeQurra("نعم")).toBe("approved"));
  it("treats لا as not requested", () => expect(normalizeQurra("لا")).toBe("not_requested"));
  it("maps قيد المراجعة to school review", () => expect(normalizeQurra("قيد المراجعة")).toBe("waiting_school_review"));
  it("leaves empty cells untouched", () => expect(normalizeQurra("")).toBeNull());
  it("flags unknown values", () => expect(normalizeQurra("ربما")).toBe("invalid"));
});
