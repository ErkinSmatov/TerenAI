import assert from "node:assert/strict";

import { hasHealthBlocks } from "../lib/profile/hasHealthBlocks";

assert.equal(hasHealthBlocks("glucometer"), true);
assert.equal(hasHealthBlocks("biohacking"), true);
assert.equal(hasHealthBlocks("weightControl"), false);
assert.equal(hasHealthBlocks(undefined), false);
assert.equal(hasHealthBlocks(null), false);

console.log("verifyHealthBlocks: OK");
