// Подпись блюда для дедупа избранного и звезды на блюдах, созданных из избранного.
export function favoriteSignature(
  name: string | undefined,
  items: { name: string; grams: number }[]
): string {
  const itemsPart = items
    .map((item) => `${item.name.trim().toLowerCase()}|${Math.round(item.grams)}`)
    .sort()
    .join(";");

  return `${(name ?? "").trim().toLowerCase()};${itemsPart}`;
}
