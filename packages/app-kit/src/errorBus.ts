/** Bridges TanStack Query cache errors to the React toast/modal layer. */
type Handler = (error: unknown) => void;

let current: Handler = () => {};

export function setErrorHandler(fn: Handler) {
  current = fn;
}

export function reportError(error: unknown) {
  current(error);
}
