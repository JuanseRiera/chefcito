import Image from 'next/image';
import Link from 'next/link';
import { MobileNav } from './mobile-nav';
import { LanguageToggle } from './language-toggle';
import type { Dictionary } from '@/app/[lang]/dictionaries';
import type { Locale } from '@/lib/i18n/config';

interface NavbarProps {
  dict: Dictionary;
  lang: Locale;
}

export function Navbar({ dict, lang }: NavbarProps) {
  const navLinks = [
    { href: `/${lang}/`, label: dict.nav.myRecipes },
    { href: `/${lang}/extract`, label: dict.nav.extractRecipe },
  ];

  return (
    <header className="sticky top-0 z-50 bg-parchment border-b border-parchment-dark">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={`/${lang}/`}
          className="flex items-center gap-2 font-serif text-2xl text-charcoal"
        >
          <Image src="/logo.png" alt="" width={28} height={28} />
          Chefcito
        </Link>

        {/* Desktop nav links — hidden on mobile */}
        <ul className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-brown-light hover:text-burgundy transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <LanguageToggle />
          </li>
        </ul>

        {/* Mobile hamburger — visible only on mobile */}
        <div className="md:hidden flex items-center gap-3">
          <LanguageToggle />
          <MobileNav links={navLinks} />
        </div>
      </nav>
    </header>
  );
}
