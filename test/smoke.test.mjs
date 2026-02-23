import test from "node:test";
import assert from "node:assert/strict";
import pluginRegister from "../dist/index.js";

test("exports a register function", () => {
	assert.equal(typeof pluginRegister, "function");
});
