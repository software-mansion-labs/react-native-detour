export function getRestOfPath(pathname: string) {
  const secondSlashIndex = pathname.indexOf('/', 1);
  if (secondSlashIndex === -1) {
    return '/';
  }

  return pathname.slice(secondSlashIndex);
}
