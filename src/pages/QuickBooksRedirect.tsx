import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function QuickBooksRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const okParam = params.get('ok');
    const quickBooksConnected = okParam ? okParam === 'true' : true;
    const message = params.get('message') ?? undefined;

    navigate('/', {
      replace: true,
      state: { quickBooksConnected, quickBooksMessage: message }
    });
  }, [location.search, navigate]);

  return <div>Finishing QuickBooks setup…</div>;
}
