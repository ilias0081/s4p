import { Link, useLocation } from 'react-router-dom';

type Tab = {
  label: string;
  to: string;
  isActive?: (pathname: string) => boolean;
};

type TabsProps = {
  tabs: Tab[];
};

export function Tabs({ tabs }: TabsProps) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Main navigation" className="flex h-full items-center gap-6">
      {tabs.map((tab) => {
        const isActive = tab.isActive?.(pathname) ?? pathname === tab.to;

        return (
          <Link
            key={tab.to}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'relative flex h-full items-center text-sm text-secondary transition hover:text-text',
              'after:absolute after:inset-x-0 after:-bottom-4 after:h-0.5 after:bg-primary after:content-[""]',
              isActive ? 'font-bold text-text' : 'after:hidden',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
