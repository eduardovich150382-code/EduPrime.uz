'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Send, Mail, Phone } from 'lucide-react';

export default function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-400 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="text-xl font-bold">
                Edu<span className="text-primary-400">Prime</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm max-w-md">
              {t('description')}
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://t.me/EduPrimeuzbot"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
              >
                <Send size={18} />
              </a>
              <a
                href="mailto:info@eduprime.uz"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">{t('links')}</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/tests" className="hover:text-primary-400 transition-colors">
                  Testlar
                </Link>
              </li>
              <li>
                <Link href="/rating" className="hover:text-primary-400 transition-colors">
                  Reyting
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-primary-400 transition-colors">
                  Tariflar
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">{t('contact')}</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Send size={14} />
                <a href="https://t.me/EduPrimeuzbot" className="hover:text-primary-400 transition-colors">
                  @EduPrimeuzbot
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} />
                <span>info@eduprime.uz</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} EduPrime.uz — {t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
