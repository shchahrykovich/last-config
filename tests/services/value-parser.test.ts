import { describe, it, expect } from "vitest";
import { parseConfigValue } from "@/services/value-parser";

describe("parseConfigValue", () => {
  describe("number type", () => {
    it("should parse valid number strings to numbers", () => {
      expect(parseConfigValue("42", "number")).toBe(42);
      expect(parseConfigValue("3.14", "number")).toBe(3.14);
      expect(parseConfigValue("-10", "number")).toBe(-10);
      expect(parseConfigValue("0", "number")).toBe(0);
    });

    it("should return original string for invalid numbers", () => {
      expect(parseConfigValue("not a number", "number")).toBe("not a number");
    });

    it("should parse empty string to 0", () => {
      // Number("") returns 0, not NaN
      expect(parseConfigValue("", "number")).toBe(0);
    });
  });

  describe("boolean type", () => {
    it("should parse 'true' to boolean true", () => {
      expect(parseConfigValue("true", "boolean")).toBe(true);
      expect(parseConfigValue("TRUE", "boolean")).toBe(true);
      expect(parseConfigValue("  true  ", "boolean")).toBe(true);
    });

    it("should parse 'false' to boolean false", () => {
      expect(parseConfigValue("false", "boolean")).toBe(false);
      expect(parseConfigValue("FALSE", "boolean")).toBe(false);
      expect(parseConfigValue("  false  ", "boolean")).toBe(false);
    });

    it("should return original string for non-boolean values", () => {
      expect(parseConfigValue("yes", "boolean")).toBe("yes");
      expect(parseConfigValue("no", "boolean")).toBe("no");
      expect(parseConfigValue("1", "boolean")).toBe("1");
    });
  });

  describe("string type", () => {
    it("should return value as-is for string type", () => {
      expect(parseConfigValue("hello", "string")).toBe("hello");
      expect(parseConfigValue("123", "string")).toBe("123");
      expect(parseConfigValue("true", "string")).toBe("true");
    });
  });

  describe("unknown type", () => {
    it("should default to string for unknown types", () => {
      expect(parseConfigValue("value", "unknown")).toBe("value");
      expect(parseConfigValue("value", "object")).toBe("value");
    });
  });
});
