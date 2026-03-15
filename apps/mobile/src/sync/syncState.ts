let generation = 0;

export function getSyncGeneration(): number {
  return generation;
}

export function invalidateSync(): void {
  generation++;
}
