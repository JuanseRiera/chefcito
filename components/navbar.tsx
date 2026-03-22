import Link from 'next/link';
import { MobileNav } from './mobile-nav';

const navLinks = [
  { href: '/', label: 'My Recipes' },
  { href: '/extract', label: 'Extract Recipe' },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-parchment border-b border-parchment-dark">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-serif text-2xl text-charcoal">
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
        </ul>

        {/* Mobile hamburger — visible only on mobile */}
        <div className="md:hidden">
          <MobileNav links={navLinks} />
        </div>
      </nav>
    </header>
  );
}
