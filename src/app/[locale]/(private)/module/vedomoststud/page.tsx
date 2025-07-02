import { getTranslations } from 'next-intl/server';
import React from 'react';

import { LocaleProps } from '@/types/locale-props';
import { Session } from '@/app/[locale]/(private)/module/vedomoststud/components/session';

const INTL_NAMESPACE = 'private.vedomoststud';

export async function generateMetadata({ params }: LocaleProps) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: INTL_NAMESPACE });

  return {
    title: t('title'),
  };
}

export default async function SessionPage() {
  return <Session />;
}
