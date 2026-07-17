export function normalizeDisplayName(name: string) {
  return name.normalize('NFC');
}

export function splitDisplayNameWords(name: string) {
  return normalizeDisplayName(name).split(' ');
}
