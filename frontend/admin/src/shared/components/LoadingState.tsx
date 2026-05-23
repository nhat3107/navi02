import { Spinner } from './Spinner';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <Spinner size={28} />
      <p>{label}</p>
    </div>
  );
}
