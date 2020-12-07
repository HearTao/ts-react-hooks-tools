export const outsideValue = 1;

export function useMemo(...values: unknown[]): never {
    throw new Error('Should never call, ' + values);
}
