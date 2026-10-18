import { expect, test } from "bun:test";
import { taskAssignee } from "../src/lib/task-input";
test("Unassigned saves a null owner, never a UUID placeholder", () => {
  expect(taskAssignee("unassigned")).toBeNull();
  expect(taskAssignee("")).toBeNull();
  expect(taskAssignee("a380989e-0b99-4a63-b534-07ab001f6d6d")).toBe("a380989e-0b99-4a63-b534-07ab001f6d6d");
});