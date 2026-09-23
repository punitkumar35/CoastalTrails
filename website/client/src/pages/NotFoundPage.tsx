import { useNavigate } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-line bg-elevated px-8 py-20 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-tide-glow/15 text-tide">
        <Compass className="h-6 w-6" />
      </div>
      <p className="overline mb-2">404 · Off the trail</p>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">This path doesn't exist</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-2">
        The page you're looking for may have drifted with the tide. Head back to the shoreline and explore the stays.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
        <Button onClick={() => navigate('/')}>
          <Home className="h-4 w-4" />
          Back to homestays
        </Button>
        <button
          onClick={() => navigate('/trails')}
          className="rounded-xl border border-line-2 bg-elevated px-4 py-2.5 text-xs font-semibold text-ink-2 transition-colors hover:border-tide hover:text-tide"
        >
          Trails & ferry
        </button>
      </div>
    </div>
  );
}
