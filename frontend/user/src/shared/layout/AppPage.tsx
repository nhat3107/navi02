import type { ReactNode } from 'react';

interface AppPageProps {
  children: ReactNode;
  mainClassName?: string;
  innerClassName?: string;
  /** Fill remaining viewport below the navbar (chat, etc.). */
  fill?: boolean;
}

export function AppPage({
  children,
  mainClassName = '',
  innerClassName = '',
  fill = false,
}: AppPageProps) {
  const isStack = mainClassName.includes('app-main--stack');
  const skipInner = fill || isStack || mainClassName.includes('p-0');

  return (
    <main
      className={`app-main${fill ? ' app-main--fill' : ''}${mainClassName ? ` ${mainClassName}` : ''}`}
    >
      {skipInner ? (
        children
      ) : (
        <div className={`app-main__inner${innerClassName ? ` ${innerClassName}` : ''}`}>
          {children}
        </div>
      )}
    </main>
  );
}
