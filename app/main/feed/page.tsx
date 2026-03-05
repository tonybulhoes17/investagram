'use client'

import { QuoteBar } from '@/components/cotacoes/QuoteBar'
import { FeedList } from '@/components/feed/FeedList'
import { StoriesPolls } from '@/components/feed/StoriesPolls'
import { useAuth } from '@/hooks/useAuth'

export default function FeedPage() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen">
      <QuoteBar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-white">Feed</h1>
          <span className="text-xs text-brand-muted bg-brand-surface px-3 py-1 rounded-full border border-brand-border">
            Relevância
          </span>
        </div>

        {/* Stories de enquetes */}
        <StoriesPolls />

        <FeedList userId={user?.id} />
      </div>
    </div>
  )
}
