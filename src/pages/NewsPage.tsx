import { useState, useEffect, useRef } from 'react';
import {
  Newspaper,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  Share2,
} from 'lucide-react';
import { db, type NewsArticle } from '@/services/db';
import { useAccessibleModal } from '@/hooks/useAccessibleModal';
import ResilientImage from '@/components/ResilientImage';

export default function NewsPage() {
  const [news, setNews] = useState<NewsArticle[]>(() => db.getNews());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeArticle, setActiveArticle] = useState<NewsArticle | null>(null);
  const [copiedArticle, setCopiedArticle] = useState(false);
  const articleModalRef = useRef<HTMLDivElement>(null);

  useAccessibleModal(
    Boolean(activeArticle),
    () => {
      setCopiedArticle(false);
      setActiveArticle(null);
    },
    articleModalRef
  );

  useEffect(() => {
    return db.subscribe(() => {
      setNews(db.getNews());
    });
  }, []);

  const categories = ['All', 'Free Fire', 'PUBG Mobile', 'EA SPORTS FC', 'Ethiopian Esports', 'Platform Update'];

  const filteredNews =
    selectedCategory === 'All'
      ? news
      : news.filter((n) => n.category.toLowerCase() === selectedCategory.toLowerCase());

  const featured = news.find((n) => n.featured) || news[0];

  return (
    <div className="relative min-h-screen pt-24 pb-16">
      <div className="container-x max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/10 border border-accent-500/30 px-3 py-1 text-xs font-bold text-accent-300 mb-2">
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" /> Community Hub &amp; Patch Notes
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">
            Ethiopian Gaming <span className="text-gradient">News &amp; Updates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Latest patch notes, Ethiopian tournament announcements, network latency optimizations, and community highlights.
          </p>
        </div>

        {/* Featured Article Card */}
        {featured && (
          <article className="group relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 sm:p-8 overflow-hidden hover:border-primary-500/40 transition-all mb-8 shadow-card">
            <div className="absolute right-0 top-0 -z-10 h-full w-1/2 opacity-20 group-hover:opacity-30 transition-opacity" aria-hidden="true">
              <ResilientImage src={featured.image} alt="" decorative className="h-full w-full object-cover" />
            </div>

            <div className="max-w-2xl">
              <span className="rounded-full bg-primary-500/20 border border-primary-500/40 px-3 py-1 text-xs font-bold text-primary-300 inline-block mb-3">
                ★ Featured Story • {featured.category}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                <button
                  type="button"
                  onClick={() => setActiveArticle(featured)}
                  className="text-left hover:text-primary-300 transition-colors cursor-pointer"
                >
                  {featured.title}
                </button>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-3 line-clamp-2">
                {featured.summary}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-5">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" /> {featured.publishedAt}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary-400" aria-hidden="true" /> {featured.readTime}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveArticle(featured)}
                  className="font-semibold text-primary-400 hover:underline flex items-center gap-1 ml-auto cursor-pointer min-h-[28px]"
                >
                  Read Full Article <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </article>
        )}

        {/* Category Filter */}
        <div role="group" aria-label="Filter news by category" className="flex items-center gap-2 overflow-x-auto pb-3 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary-500 text-ink-950 shadow-glow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid of Articles */}
        {filteredNews.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
            <Newspaper className="mx-auto h-10 w-10 text-slate-500 mb-3" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-white">No Articles in {selectedCategory}</h2>
            <p className="text-xs text-slate-400 mt-1">Switch category above to read the latest gaming news.</p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredNews.map((art) => (
            <article
              key={art.id}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-white/25 hover:bg-white/[0.05] transition-all"
            >
              <div className="relative h-44 overflow-hidden">
                <ResilientImage
                  src={art.image}
                  alt={art.title}
                  fallbackLabel={art.category}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute top-3 left-3 rounded-full bg-ink-950/80 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold text-white border border-white/10">
                  {art.category}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-base font-bold text-white line-clamp-2">
                    <button
                      type="button"
                      onClick={() => setActiveArticle(art)}
                      className="text-left hover:text-primary-300 transition-colors cursor-pointer"
                    >
                      {art.title}
                    </button>
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-3">
                    {art.summary}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-4 mt-4 border-t border-white/5">
                  <span>{art.publishedAt}</span>
                  <button
                    type="button"
                    onClick={() => setActiveArticle(art)}
                    aria-label={`Read ${art.title}`}
                    className="text-primary-400 font-semibold hover:translate-x-0.5 transition-transform flex items-center gap-1 cursor-pointer min-h-[28px]"
                  >
                    Read <ChevronRight className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        )}

        {/* Article Reader Modal */}
        {activeArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div
              className="fixed inset-0 bg-ink-950/85 backdrop-blur-md"
              aria-hidden="true"
              onClick={() => {
                setCopiedArticle(false);
                setActiveArticle(null);
              }}
            />
            <div
              ref={articleModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="news-article-modal-title"
              tabIndex={-1}
              className="relative z-10 w-full max-w-2xl rounded-2xl border border-white/15 bg-ink-900 shadow-2xl overflow-hidden my-6 focus:outline-none"
            >
              <div className="relative h-56 sm:h-72 w-full">
                <ResilientImage src={activeArticle.image} alt={activeArticle.title} fallbackLabel={activeArticle.category} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => {
                    setCopiedArticle(false);
                    setActiveArticle(null);
                  }}
                  aria-label="Close article modal"
                  className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-ink-950/80 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="absolute bottom-4 left-6 right-6">
                  <span className="rounded-full bg-primary-500 px-2.5 py-0.5 text-[10px] font-bold text-ink-950 uppercase tracking-wider">
                    {activeArticle.category}
                  </span>
                  <h2 id="news-article-modal-title" className="font-display text-xl sm:text-2xl font-bold text-white mt-1.5">
                    {activeArticle.title}
                  </h2>
                </div>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-3">
                  <span>Published: {activeArticle.publishedAt}</span>
                  <span>Source: <strong className="text-slate-200">{activeArticle.source}</strong></span>
                </div>

                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line space-y-3">
                  {activeArticle.content}
                </div>

                <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <a
                      href={activeArticle.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:underline min-h-[28px]"
                    >
                      View Original Release <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `${activeArticle.title}\n${activeArticle.summary}\nSource: ${activeArticle.sourceUrl}`;
                        navigator.clipboard?.writeText(text).catch(() => {});
                        setCopiedArticle(true);
                        setTimeout(() => setCopiedArticle(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Share2 className="h-3.5 w-3.5" aria-hidden="true" /> {copiedArticle ? 'Copied!' : 'Copy Summary'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCopiedArticle(false);
                      setActiveArticle(null);
                    }}
                    className="rounded-xl bg-primary-500 px-5 py-2 text-xs font-bold text-ink-950 hover:bg-primary-400 cursor-pointer"
                  >
                    Done Reading
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
