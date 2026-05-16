import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchFilterProps {
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function SearchFilter({ value, placeholder = 'Search', onChange }: SearchFilterProps) {
  return (
    <label className="relative block w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        value={value}
        placeholder={placeholder}
        className="pl-9"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
