export async function collectExportPages<T>(read: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, size = 1000) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += size) {
    const { data, error } = await read(offset, offset + size - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < size) return rows;
  }
}