import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

interface UpgradePromptProps {
  title?: string
  description?: string
  buttonText?: string
  buttonHref?: string
  variant?: 'card' | 'banner' | 'inline'
}

export function UpgradePrompt({
  title = 'Unlock more features',
  description = 'Upgrade your plan to access premium modules and higher limits.',
  buttonText = 'View plans',
  buttonHref = '/business/packages',
  variant = 'card',
}: UpgradePromptProps) {
  const navigate = useNavigate()

  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-4 rounded-lg bg-gradient-to-r from-amber-50 to-emerald-50 p-4 dark:from-amber-950 dark:to-emerald-950">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <Button size="sm" onClick={() => navigate(buttonHref)}>{buttonText}</Button>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
        <span className="flex-1 text-amber-800 dark:text-amber-200">{title}</span>
        <button onClick={() => navigate(buttonHref)} className="text-xs font-medium text-amber-700 underline dark:text-amber-300">
          {buttonText}
        </button>
      </div>
    )
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-emerald-50 dark:border-amber-800 dark:from-amber-950 dark:to-emerald-950">
      <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <Button onClick={() => navigate(buttonHref)}>{buttonText}</Button>
      </CardContent>
    </Card>
  )
}
