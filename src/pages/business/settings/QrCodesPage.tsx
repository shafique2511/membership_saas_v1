import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Download, ExternalLink, Printer, QrCode, RefreshCw, Store } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { LoadingState } from '@/components/ui/LoadingState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAppContext } from '@/context/useAppContext'
import { toastError, toastSuccess } from '@/lib/toast'
import { getBusiness, type Business } from '@/services/businessSettings'
import {
  createTableBookingQrCode,
  getQrCodeAssets,
  QR_CODE_TYPES,
  qrTypeLabel,
  seedDefaultQrCodeAssets,
  setQrCodeActive,
  type QrCodeAsset,
} from '@/services/qrCodes'
import { createQrDataUrl, downloadDataUrl } from '@/utils/qr'
import { SettingsTabs } from './SettingsTabs'

function sanitizeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr-code'
}

function businessRouteToken(business: Business) {
  return business.slug || business.id
}

function brandedPrintHtml(business: Business, assets: QrCodeAsset[], previews: Record<string, string>) {
  const cards = assets
    .filter((asset) => asset.is_active && previews[asset.id])
    .map((asset) => `
      <section class="qr-card">
        <div class="brand">
          ${business.logo_url ? `<img src="${business.logo_url}" alt="" />` : '<div class="logo-fallback">LM</div>'}
          <div>
            <h2>${business.name}</h2>
            <p>${asset.label || qrTypeLabel(asset.qr_type)}</p>
          </div>
        </div>
        <img class="qr" src="${previews[asset.id]}" alt="QR code" />
        <h1>${asset.name}</h1>
        <p class="description">${asset.description || ''}</p>
        <p class="url">${asset.target_url}</p>
      </section>
    `)
    .join('')

  return `<!doctype html>
<html>
<head>
  <title>${business.name} QR sheet</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, Arial, sans-serif; color: #0f172a; background: #f8fafc; }
    main { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; padding: 20px; }
    .qr-card { min-height: 360px; break-inside: avoid; border: 1px solid #dbe3ea; border-radius: 18px; background: white; padding: 20px; text-align: center; }
    .brand { display: flex; align-items: center; gap: 12px; text-align: left; }
    .brand img, .logo-fallback { width: 44px; height: 44px; border-radius: 999px; object-fit: cover; background: #0f766e; color: white; display: grid; place-items: center; font-weight: 700; }
    h2 { margin: 0; font-size: 15px; }
    .brand p { margin: 2px 0 0; color: #64748b; font-size: 12px; }
    .qr { width: 188px; height: 188px; margin: 20px auto 12px; }
    h1 { margin: 0; font-size: 20px; }
    .description { min-height: 36px; color: #475569; font-size: 13px; line-height: 1.4; }
    .url { overflow-wrap: anywhere; color: #64748b; font-size: 10px; }
    @media print {
      body { background: white; }
      main { padding: 0; }
      .qr-card { border-color: #94a3b8; page-break-inside: avoid; }
    }
  </style>
</head>
<body><main>${cards}</main><script>window.onload = () => window.print()</script></body>
</html>`
}

export function QrCodesPage() {
  const { profile } = useAppContext()
  const businessId = profile?.business_id ?? ''
  const [business, setBusiness] = useState<Business | null>(null)
  const [assets, setAssets] = useState<QrCodeAsset[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [tableNumber, setTableNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const publicBase = useMemo(() => {
    if (!business) return ''
    return `${window.location.origin}/b/${businessRouteToken(business)}`
  }, [business])

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const [nextBusiness, nextAssets] = await Promise.all([
        getBusiness(businessId),
        getQrCodeAssets(businessId),
      ])
      setBusiness(nextBusiness)
      setAssets(nextAssets)
    } catch (error) {
      toastError(error, 'Failed to load QR codes')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  useEffect(() => {
    let cancelled = false
    async function generate() {
      const entries = await Promise.all(
        assets.map(async (asset) => [asset.id, await createQrDataUrl(asset.target_url)] as const),
      )
      if (!cancelled) setPreviews(Object.fromEntries(entries))
    }

    if (assets.length) {
      void generate()
    } else {
      setPreviews({})
    }

    return () => {
      cancelled = true
    }
  }, [assets])

  async function handleSeedDefaults() {
    if (!businessId) return
    setSaving(true)
    try {
      await seedDefaultQrCodeAssets(businessId, window.location.origin)
      toastSuccess('Default QR codes created')
      await load()
    } catch (error) {
      toastError(error, 'Failed to create default QR codes')
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateTableQr() {
    if (!business || !tableNumber.trim()) return
    setSaving(true)
    try {
      const cleanedTable = tableNumber.trim()
      await createTableBookingQrCode(
        business.id,
        cleanedTable,
        `${publicBase}/book?source=qr&intent=table&table=${encodeURIComponent(cleanedTable)}`,
      )
      setTableNumber('')
      toastSuccess('Table QR created')
      await load()
    } catch (error) {
      toastError(error, 'Failed to create table QR')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(asset: QrCodeAsset) {
    setSaving(true)
    try {
      await setQrCodeActive(asset.id, !asset.is_active)
      toastSuccess(asset.is_active ? 'QR code disabled' : 'QR code enabled')
      await load()
    } catch (error) {
      toastError(error, 'Failed to update QR code')
    } finally {
      setSaving(false)
    }
  }

  function handleDownload(asset: QrCodeAsset) {
    const dataUrl = previews[asset.id]
    if (!dataUrl) return
    downloadDataUrl(dataUrl, `${sanitizeFilename(asset.name)}.png`)
  }

  async function handleCopy(asset: QrCodeAsset) {
    await navigator.clipboard.writeText(asset.target_url)
    toastSuccess('QR link copied')
  }

  function handlePrint() {
    if (!business) return
    const printWindow = window.open('', '_blank', 'noopener,noreferrer')
    if (!printWindow) {
      toastError(new Error('Allow pop-ups to print the QR sheet.'))
      return
    }
    printWindow.document.write(brandedPrintHtml(business, assets, previews))
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="QR codes" description="Create branded QR codes for booking, membership, loyalty, portal, table booking, and reviews." />
        <SettingsTabs />
        <LoadingState label="Loading QR codes..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="QR codes"
        description="Create business-branded QR codes for counters, receipts, tables, and customer membership flows."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={saving}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!assets.length || saving}>
              <Printer className="mr-2 h-4 w-4" /> Print sheet
            </Button>
            <Button onClick={() => void handleSeedDefaults()} disabled={saving}>
              <QrCode className="mr-2 h-4 w-4" /> Create default set
            </Button>
          </div>
        )}
      />

      <SettingsTabs />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4 w-4 text-teal-600" />
            Recommended QR use cases
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Barber shop</p>
            <p className="mt-1 text-sm text-muted-foreground">Counter QR opens booking. Member QR opens the customer portal for membership status and booking history.</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="font-medium">Coffee shop</p>
            <p className="mt-1 text-sm text-muted-foreground">Table QR opens membership signup or table booking. Receipt QR opens reviews. Counter QR opens loyalty points.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create table booking QR</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field
            label="Table number"
            description="Use this for coffee shops, rooms, or event spaces that need a QR code tied to a specific table or location."
            htmlFor="tableNumber"
          >
            <Input
              id="tableNumber"
              value={tableNumber}
              onChange={(event) => setTableNumber(event.target.value)}
              placeholder="Example: A12"
            />
          </Field>
          <Button className="self-end" onClick={() => void handleCreateTableQr()} disabled={!tableNumber.trim() || saving}>
            Add table QR
          </Button>
        </CardContent>
      </Card>

      {!assets.length ? (
        <EmptyState
          title="No QR codes yet"
          description="Create the default set to generate business page, booking, membership, loyalty, portal, table booking, and review QR codes."
          actionLabel="Create default QR set"
          onAction={() => void handleSeedDefaults()}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {assets.map((asset) => (
            <Card key={asset.id} className={asset.is_active ? '' : 'opacity-70'}>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-[180px_1fr]">
                <div className="rounded-xl border bg-white p-4 text-center dark:bg-slate-950">
                  <div className="mb-3 flex items-center justify-center gap-2">
                    {business?.logo_url ? (
                      <img src={business.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-xs font-semibold text-white">LM</div>
                    )}
                    <span className="line-clamp-1 text-sm font-semibold">{business?.name}</span>
                  </div>
                  {previews[asset.id] ? (
                    <img src={previews[asset.id]} alt={`${asset.name} QR`} className="mx-auto h-32 w-32" />
                  ) : (
                    <div className="mx-auto h-32 w-32 animate-pulse rounded bg-muted" />
                  )}
                  <p className="mt-3 text-sm font-semibold">{asset.label || asset.name}</p>
                </div>

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{asset.name}</h3>
                        <StatusBadge status={asset.is_active ? 'active' : 'inactive'} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{asset.description || QR_CODE_TYPES.find((item) => item.type === asset.qr_type)?.description}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{asset.scan_count} scans</span>
                  </div>

                  <div className="rounded-md bg-muted p-3 text-xs">
                    <p className="mb-1 font-medium">{qrTypeLabel(asset.qr_type)}</p>
                    <a href={asset.target_url} target="_blank" rel="noopener noreferrer" className="break-all text-teal-700 hover:underline dark:text-teal-300">
                      {asset.target_url}
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleDownload(asset)} disabled={!previews[asset.id]}>
                      <Download className="mr-2 h-4 w-4" /> PNG
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void handleCopy(asset)}>
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(asset.target_url, '_blank', 'noopener,noreferrer')}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Open
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void handleToggle(asset)} disabled={saving}>
                      {asset.is_active ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
