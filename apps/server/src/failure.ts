/** Infrastructure failures reach one entrypoint logging boundary. */
export class WorldFailure extends Error {
  readonly _tag = "WorldFailure";

  constructor(operation: string, cause?: unknown) {
    super(operation, { cause });
    this.name = "WorldFailure";
  }
}

/** The public HTTP boundary never returns provider or storage details. */
export function problem(status: number, message: string): Response {
  return Response.json(
    { type: "about:blank", title: message, status, _tag: "RequestFailure", message },
    { status, headers: { "content-type": "application/problem+json" } },
  );
}
