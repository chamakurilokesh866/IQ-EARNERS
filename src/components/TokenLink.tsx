"use client"

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { buildTokenUrl } from '@/lib/pageTokens';

interface TokenLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
  onClick?: () => void;
}

/**
 * Drop-in replacement for Next.js <Link> that automatically appends
 * the admin-managed security token to the URL before navigating.
 * Falls back to the plain href if no token is configured for the page.
 */
export default function TokenLink({ href, children, className, 'aria-label': ariaLabel, onClick }: TokenLinkProps) {
  const [url, setUrl] = useState<string>(href);

  useEffect(() => {
    buildTokenUrl(href)
      .then(setUrl)
      .catch(() => setUrl(href));
  }, [href]);

  return (
    <Link href={url} prefetch={false} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </Link>
  );
}
