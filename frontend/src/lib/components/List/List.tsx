import { Children, cloneElement, isValidElement, useState, type ReactNode } from 'react';

import { SearchBar } from '../SearchBar/SearchBar';

type ListProps = React.HTMLAttributes<HTMLUListElement> & {
  id?: string;
  hasSearch?: boolean;
};

export function List({ id, hasSearch, className = '', children, ...props }: ListProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLocaleLowerCase();
  
  const filteredChildren = hasSearch
    ? Children.map(children, (child) => {
        if (!isValidElement<ListItemProps>(child) || child.type !== ListItem) {
          return child;
        }

        const searchableText = getSearchableText(child.props.children).toLocaleLowerCase();
        const hasSearchableText = searchableText.length > 0;
        const hidden = normalizedQuery.length > 0
          && hasSearchableText
          && !searchableText.includes(normalizedQuery);

        return cloneElement(child, { hidden });
      })
    : children;

  return (
    <>
      {hasSearch ? <SearchBar value={query} onChange={setQuery} /> : null}
      <ul id={id} {...props} className={['flex flex-col gap-3', className].join(' ')}>
        {filteredChildren}
      </ul>
    </>
  );
}

function getSearchableText(node: ReactNode, isSearchable = false): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return isSearchable ? String(node) : '';
  }

  if (!isValidElement<{ children?: ReactNode; className?: string }>(node)) {
    return Children.toArray(node).map((child) => getSearchableText(child, isSearchable)).join(' ');
  }

  const classNames = node.props.className?.split(/\s+/) ?? [];
  const searchable = isSearchable || classNames.includes('searchable');

  return getSearchableText(node.props.children, searchable);
}

type ListItemProps = React.HTMLAttributes<HTMLLIElement> & {
  id?: string;
};

export function ListItem({ id, className = '', children, ...props }: ListItemProps) {
  return (
    <li id={id} {...props} className={['rounded-2xl border border-white/15 bg-white/5 p-4', className].join(' ')}>
      {children}
    </li>
  );
}
