export function name(id: string, name?: string): string {
  return name ? `${id}-${name}` : id;
}