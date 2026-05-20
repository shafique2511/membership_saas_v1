import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLegalPage, type LegalPage as LegalPageRecord, type LegalPageSlug, fallbackLegalPages } from '@/services/legalPages'

export function LegalPage({ slug }: { slug: LegalPageSlug }) {
  const [page, setPage] = useState<LegalPageRecord>(fallbackLegalPages[slug])

  useEffect(() => {
    void getLegalPage(slug).then(setPage)
  }, [slug])

  return (
    <div className="min-h-screen bg-white px-6 py-16 text-slate-950 dark:bg-slate-950 dark:text-white">
      <article className="mx-auto max-w-3xl">
        <Link className="text-sm text-teal-700 dark:text-teal-300" to="/">Back to home</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Template legal page</p>
        <h1 className="mt-3 text-4xl font-semibold">{page.title}</h1>
        {page.summary ? <p className="mt-4 text-slate-600 dark:text-slate-300">{page.summary}</p> : null}
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          These are template legal pages, not final legal advice.
        </div>
        <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700 dark:text-slate-200">
          {page.body.split('\n\n').map((paragraph, index) => (
            <p key={`${slug}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </article>
    </div>
  )
}
