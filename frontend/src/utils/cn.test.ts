import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("p-2", "text-sm")).toContain("p-2");
    expect(cn("p-2", "text-sm")).toContain("text-sm");
  });
});
