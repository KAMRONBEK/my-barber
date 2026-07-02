/**
 * Convert a Firestore-stored date field to an ISO string.
 *
 * A field written as a JS `Date` (e.g. `createdAt: new Date()`) comes back
 * from the real Firestore Admin SDK as a `Timestamp` instance, NOT a `Date`
 * — it has a `.toDate()` method instead. `new Date(timestamp)` on that
 * object silently produces an Invalid Date, and `.toISOString()` on an
 * Invalid Date throws `RangeError: Invalid time value`, which surfaces as a
 * 500 on any endpoint reading that field back.
 *
 * The Jest mock Firestore (tests/support/mockFirestore.ts) stores whatever
 * was written verbatim — a real `Date` stays a `Date` — so this bug doesn't
 * reproduce under test and only shows up against real Firestore.
 */
export function firestoreDateToIso(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return new Date(0).toISOString();
}
