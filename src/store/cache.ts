/**
 * Hand-off cache for list → detail screens (the API returns full orders in
 * the list, and some have no single-item endpoint).
 */
const store = new Map<string, unknown>();

export const putCached = <T>(kind: string, id: string, value: T) => store.set(`${kind}:${id}`, value);
export const getCached = <T>(kind: string, id: string): T | undefined => store.get(`${kind}:${id}`) as T | undefined;
export const putMany = <T extends Record<string, any>>(kind: string, items: T[], key = 'id') => items.forEach((i) => putCached(kind, String(i[key]), i));
