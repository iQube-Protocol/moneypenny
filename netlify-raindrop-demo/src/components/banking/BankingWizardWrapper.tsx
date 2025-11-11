import React from 'react';
import { PersonaProvider } from '../../lib/personaStore';
import BankingWizard from './BankingWizard';

export default function BankingWizardWrapper() {
  return (
    <PersonaProvider>
      <BankingWizard />
    </PersonaProvider>
  );
}
