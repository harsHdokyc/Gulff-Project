// Re-export the base fixture from the package
// Override or extend test/expect here if needed
import { test as baseTest, expect as baseExpect } from "@playwright/test";

export const test = baseTest;
export const expect = baseExpect;
