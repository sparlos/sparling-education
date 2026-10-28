/** An answer from the API that the port can't turn into a result. */
export function unexpected(call: string, status: number) {
  return new Error(`[play] The API answered ${call} with ${status}`);
}
