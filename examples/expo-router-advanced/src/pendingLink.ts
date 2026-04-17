// Module-level storage for links intercepted by the native intent handler
// when the user is not signed in. useDetourGate reads from here after sign-in.

export type PendingLink = {
  route: string;
  type: "verified";
  params?: Record<string, string>;
} | null;

let _pendingLink: PendingLink = null;

export function setPendingLink(link: PendingLink) {
  _pendingLink = link;
}

export function consumePendingLink(): PendingLink {
  const link = _pendingLink;
  _pendingLink = null;
  return link;
}
