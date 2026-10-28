// What other packages' tests need to run the API in-process against the test
// Postgres (see docs/agents/testing.md): the app and fake Google sign-in.

export { createApp } from "../src/app.ts";
export { type FakeGoogle, fakeGoogle } from "./fake-google.ts";
