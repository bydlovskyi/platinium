import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'

function setup ({ rowIds, page }: { rowIds: string[]; page: number }) {
  const setPage = vi.fn().mockResolvedValue(undefined)
  const refetch = vi.fn().mockResolvedValue(undefined)

  let rowRemoval!: ReturnType<typeof useRowRemoval>

  const HostComponent = defineComponent({
    setup () {
      rowRemoval = useRowRemoval({
        rows: ref(rowIds.map(id => ({ id }))),
        page: ref(page),
        setPage,
        refetch
      })

      return () => null
    }
  })

  mount(HostComponent)

  return { rowRemoval, setPage, refetch }
}

describe('useRowRemoval', () => {
  it('steps back a page when every visible row on a later page is removed', async () => {
    const { rowRemoval, setPage, refetch } = setup({ rowIds: ['row-1', 'row-2'], page: 3 })

    await rowRemoval.removeRows(['row-1', 'row-2'])

    expect(setPage).toHaveBeenCalledWith(2)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('refetches when some visible rows remain', async () => {
    const { rowRemoval, setPage, refetch } = setup({ rowIds: ['row-1', 'row-2'], page: 3 })

    await rowRemoval.removeRows(['row-1'])

    expect(refetch).toHaveBeenCalled()
    expect(setPage).not.toHaveBeenCalled()
  })

  it('refetches when the first page is emptied', async () => {
    const { rowRemoval, setPage, refetch } = setup({ rowIds: ['row-1'], page: 1 })

    await rowRemoval.removeRows(['row-1'])

    expect(refetch).toHaveBeenCalled()
    expect(setPage).not.toHaveBeenCalled()
  })

  it('marks the removed rows as leaving until the animation ends', async () => {
    const { rowRemoval } = setup({ rowIds: ['row-1', 'row-2'], page: 1 })

    const removal = rowRemoval.removeRows(['row-1'])

    expect(rowRemoval.leavingRowKeys.value).toEqual(['row-1'])

    await removal

    expect(rowRemoval.leavingRowKeys.value).toEqual([])
  })
})
