import { useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Power } from 'lucide-react';
import { api } from '../api';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '339873617760-a6clnch30qndp1qccv2bhr94d7e79br3.apps.googleusercontent.com';

export default function LoginScreen({ onSession }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSuccess = async ({ credential }) => {
    setBusy(true);
    setError('');
    try {
      const { token, user, expiresAt } = await api.loginWithGoogle(credential);
      onSession({ token, user, expiresAt });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <main className="login">
        <div className="mark" aria-hidden="true"><Power size={36} strokeWidth={2.4} /></div>
        <h1>הבית שלי</h1>
        <p>התחברו עם חשבון Google כדי לשלוט במכשירים ובתזמונים.</p>
        {busy ? (
          <p role="status">מתחברים… אם השרת ישן, זה יכול לקחת עד דקה.</p>
        ) : (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('ההתחברות עם Google נכשלה, נסו שוב')}
            useOneTap
            locale="he"
            shape="pill"
            size="large"
          />
        )}
        {error && <p className="error-text" role="alert">{error}</p>}
      </main>
    </GoogleOAuthProvider>
  );
}
