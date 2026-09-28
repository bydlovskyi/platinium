interface IUseRowRemovalOptions {
  rows: Readonly<Ref<{ id: string }[]>>
  page: Readonly<Ref<number>>
  setPage: (page: number) => Promise<void>
  refetch: () => Promise<void>
}

export function useRowRemoval ({ rows, page, setPage, refetch }: IUseRowRemovalOptions) {
  const { leavingRowKeys, playLeave } = useRowLeaveAnimation()

  // Stepping back avoids landing on an empty page after the last rows of a later page are removed.
  async function removeRows (ids: string[]): Promise<void> {
    const pageEmptied = rows.value.length > 0 && rows.value.every(row => ids.includes(row.id))

    await playLeave(ids)

    if (pageEmptied && page.value > 1) {
      await setPage(page.value - 1)
    } else {
      await refetch()
    }
  }

  return {
    leavingRowKeys,
    removeRows
  }
}
