import { useState } from 'react'

export interface FilterValues {
  days: number
  branchId: string
  staffId: string
}

export function FilterBar({ onChange }: { onChange: (f: FilterValues) => void }) {
  const [days, setDays] = useState(30)
  const [branchId, setBranchId] = useState('')

  const apply = () => onChange({ days, branchId, staffId: '' })

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs font-medium">Period</label>
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={days}
          onChange={(e) => { setDays(Number(e.target.value)); onChange({ days: Number(e.target.value), branchId, staffId: '' }) }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium">Branch</label>
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm"
          value={branchId}
          onChange={(e) => setBranchId(e.target.value)}
        >
          <option value="">All branches</option>
        </select>
      </div>
      <button className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" onClick={apply}>Apply</button>
    </div>
  )
}
