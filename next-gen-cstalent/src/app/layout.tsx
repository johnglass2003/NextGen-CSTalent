/**
 * Root Layout
 * Main application layout with Navbar and Footer
 */

import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'NextGen-CSTalent - UF Engineering Talent Pipeline',
  description:
    'UF Engineers vetting UF Engineers. Direct access to pre-vetted technical talent from the University of Florida.',
  keywords: ['UF', 'engineering', 'talent', 'hiring', 'students', 'jobs'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
