import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/input'
import { listLegalPages, saveLegalPage, type LegalPage, type LegalPageSlug } from '@/services/legalPages'

export function LegalPagesAdminPage() {
  const [pages, setPages] = useState<LegalPage[]>([])
  const [selectedSlug, setSelectedSlug] = useState<LegalPageSlug>('terms')
  const [draft, setDraft] = useState<LegalPage | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    void listLegalPages().then((nextPages) => {
      setPages(nextPages)
      setDraft(nextPages.find((page) => page.slug === selectedSlug) ?? nextPages[0] ?? null)
    })
  }, [])

  function selectPage(slug: LegalPageSlug) {
    setSelectedSlug(slug)
    setDraft(pages.find((page) => page.slug === slug) ?? null)
    setMessage('')
  }

  async function handleSave() {
    if (!draft) return
    setSaving(true)
    setMessage('')
    try {
      const saved = await saveLegalPage(draft)
      setPages((current) => current.map((page) => (page.slug === saved.slug ? saved : page)))
      setDraft(saved)
      setMessage('Legal page saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save legal page.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal pages"
        description="Edit public template legal pages. These templates are not final legal advice."
        actions={<Button onClick={handleSave} disabled={saving || !draft}>{saving ? 'Saving...' : 'Save page'}</Button>}
      />

      {message ? <div className="rounded-md bg-teal-50 p-3 text-sm text-teal-700 dark:bg-teal-950/30 dark:text-teal-200">{message}</div> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pages.map((page) => (
              <button
                key={page.slug}
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${selectedSlug === page.slug ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'}`}
                onClick={() => selectPage(page.slug)}
              >
                <span className="block font-medium">{page.title}</span>
                <span className="text-xs text-slate-500">/{page.slug}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{draft?.title ?? 'Select a page'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {draft ? (
              <>
                <Field label="Title" description="Public heading shown on the legal page.">
                  <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
                </Field>
                <Field label="Summary" description="Short description below the title.">
                  <Input value={draft.summary ?? ''} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} />
                </Field>
                <Field label="Body" description="Plain text content. Separate paragraphs with a blank line.">
                  <textarea
                    className="min-h-96 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 dark:border-slate-700 dark:bg-slate-900"
                    value={draft.body}
                    onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                  />
                </Field>
                <label className="flex items-start gap-2 text-sm">
                  <input className="mt-1" type="checkbox" checked={draft.is_published} onChange={(event) => setDraft({ ...draft, is_published: event.target.checked })} />
                  <span>
                    <span className="font-medium">Published</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">When enabled, this legal page is visible publicly.</span>
                  </span>
                </label>
              </>
            ) : (
              <p className="text-sm text-slate-500">No legal page selected.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
