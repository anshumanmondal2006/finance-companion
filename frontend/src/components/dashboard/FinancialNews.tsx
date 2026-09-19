import { useEffect, useState } from 'react';

const MODEL_API_URL = import.meta.env.VITE_MODEL_API_URL || 'http://localhost:8000';

export interface NewsArticle {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  imageUrl?: string;
}

const FinancialNews = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      try {
        const res = await fetch(`${MODEL_API_URL}/api/news`);
        if (!res.ok) throw new Error('Failed to load news');
        const data = await res.json();
        if (!cancelled && Array.isArray(data.articles)) {
          setArticles(data.articles);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load news');
          setArticles([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNews();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-card rounded-lg p-5 border h-full flex flex-col">
      <h3 className="font-semibold text-lg mb-4">
        Financial News
      </h3>

      {loading && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Loading latest news…
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-muted-foreground">{error}</p>
      )}

      {!loading && !error && articles.length > 0 && (
        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {articles.map((n, i) => {
            const content = (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                  {n.imageUrl ? (
                    <img
                      src={n.imageUrl}
                      alt={n.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                      NEWS
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-sm line-clamp-2">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.source}</p>
                </div>
              </div>
            );
            return n.url ? (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-md border hover:bg-muted transition-colors cursor-pointer"
              >
                {content}
              </a>
            ) : (
              <div key={i} className="p-3 rounded-md border hover:bg-muted/50">
                {content}
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-sm text-muted-foreground">No news available.</p>
      )}
    </div>
  );
};

export default FinancialNews;
