'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavLinkProps {
  href: string;
  label: string;
  mobile?: boolean;
  onClick?: () => void;
}

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1);
  }

  return path;
}

function isActivePath(pathname: string, href: string) {
  const currentPath = normalizePath(pathname);
  const targetPath = normalizePath(href);
  const isLocaleRoot = targetPath.split('/').filter(Boolean).length === 1;

  if (isLocaleRoot) {
    return currentPath === targetPath;
  }

  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export function NavLink({
  href,
  label,
  mobile = false,
  onClick,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      onClick={isActive ? undefined : onClick}
      aria-current={isActive ? 'page' : undefined}
      tabIndex={isActive ? -1 : undefined}
      className={cn(
        'transition-colors',
        mobile ? 'block px-4 py-3' : 'inline-flex items-center',
        isActive
          ? 'pointer-events-none cursor-default font-medium text-burgundy'
          : 'text-brown-light hover:text-burgundy',
        mobile && isActive && 'bg-parchment-dark/80',
      )}
    >
      {label}
    </Link>
  );
}
