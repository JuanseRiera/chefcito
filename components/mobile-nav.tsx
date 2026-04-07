'use client';

import { useState } from 'react';
import type { Dictionary } from '@/app/[lang]/dictionaries';
import { NavLink } from './nav-link';

interface MobileNavProps {
  links: { href: string; label: string }[];
  labels: Dictionary['mobileNav'];
}

export function MobileNav({ links, labels }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-brown hover:text-burgundy"
        aria-label={isOpen ? labels.closeMenu : labels.openMenu}
        aria-expanded={isOpen}
      >
        {isOpen ? (
          // X icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          // Hamburger icon
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-parchment border-b border-parchment-dark shadow-md z-40">
          <ul className="flex flex-col py-2">
            {links.map((link) => (
              <li key={link.href}>
                <NavLink
                  href={link.href}
                  label={link.label}
                  mobile
                  onClick={() => setIsOpen(false)}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
