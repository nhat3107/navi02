import { Spinner } from './Spinner';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status">
      <Spinner size={28} />
      <span>{label}</span>
    </div>
  );
}
