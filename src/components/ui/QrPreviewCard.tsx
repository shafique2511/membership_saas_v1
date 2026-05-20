import { QrCode } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QrPreviewCardProps {
  title: string
  description?: string
  qrDataUrl?: string
  code?: string
  status?: string
}

export function QrPreviewCard({ title, description, qrDataUrl, code, status = 'Active' }: QrPreviewCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <Badge variant={status.toLowerCase() === 'active' ? 'success' : 'muted'}>{status}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex aspect-square max-h-56 items-center justify-center rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800">
          {qrDataUrl ? (
            <img className="h-full w-full object-contain" src={qrDataUrl} alt={`${title} QR code`} />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <QrCode className="h-12 w-12" />
              <span className="text-xs">QR preview</span>
            </div>
          )}
        </div>
        {code ? <p className="mt-3 truncate text-xs text-slate-500">ID: {code}</p> : null}
      </CardContent>
    </Card>
  )
}
