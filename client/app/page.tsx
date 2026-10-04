import { AuthGate } from '@/components/auth/AuthGate';
import { HomeContent } from '@/components/home/HomeContent';
import { AuthProvider } from '@/hooks/useAuth';

/**
 * Entry screen.
 *
 * `AuthGate` blocks the app until the Telegram handshake resolves, so the Home
 * page is only ever rendered for a verified user.
 */
export default function Page(): React.JSX.Element {
  return (
    <AuthProvider>
      <AuthGate>
        <HomeContent />
      </AuthGate>
    </AuthProvider>
  );
}
