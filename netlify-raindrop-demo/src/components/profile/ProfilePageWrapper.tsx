import React from 'react';
import { PersonaProvider } from '../../lib/personaStore';
import ProfilePage from './ProfilePage';

export default function ProfilePageWrapper() {
  return (
    <PersonaProvider>
      <ProfilePage />
    </PersonaProvider>
  );
}
