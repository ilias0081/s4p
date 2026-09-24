type ListProps = React.HTMLAttributes<HTMLUListElement> & {
  id?: string;
};

export function List({ id, className = '', children, ...props }: ListProps) {
  return (
    <ul id={id} {...props} className={['flex flex-col gap-3', className].join(' ')}>
      {children}
    </ul>
  );
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
