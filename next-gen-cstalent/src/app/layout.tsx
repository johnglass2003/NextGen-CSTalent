/**
 * Root Layout
 * Main application layout with AuthProvider, Navbar and Footer
 */

import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'TalentBridge - Engineering Talent Pipeline',
  description:
    'Engineers vetting Engineers. Direct access to pre-vetted technical talent from the University of Florida.',
  keywords: ['engineering', 'talent', 'hiring', 'students', 'jobs'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
