import type { Dictionary } from '@/app/[lang]/dictionaries';

interface FooterProps {
  dict: Dictionary;
}

export function Footer({ dict }: FooterProps) {
  return (
    <footer className="border-t border-parchment-dark py-6 mt-auto">
      <div className="max-w-5xl mx-auto px-4 text-center text-brown-light text-sm">
        <span className="font-serif">Chefcito</span> —{' '}
        {dict.footer.tagline}
      </div>
    </footer>
  );
}
