import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminSettings() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to Configuration page as default
    navigate('/admin/settings/config', { replace: true });
  }, [navigate]);

  return null;
}
