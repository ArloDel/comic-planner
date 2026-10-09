/**
 * Relasi hasil `select` PostgREST punya dua bentuk: many-to-one (`plans.item_id`
 * → `items`) dibalas sebagai objek tunggal, sedangkan one-to-many
 * (`items.listings`) sebagai array. `asArray` menormalkan keduanya ke array
 * supaya tipe embed cukup ditulis `T | T[] | null` — jadi guard-nya jadi
 * kewajiban compiler, bukan `Array.isArray` yang diulang di tiap pemakaian.
 */
export function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}
