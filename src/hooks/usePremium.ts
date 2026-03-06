import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';

export function usePremium() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsPremium(false); setLoading(false); return; }

    const fetchTier = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();
      setIsPremium(data?.tier === 'premium');
      setLoading(false);
    };
    fetchTier();

    const channel = supabase
      .channel('profile-tier')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        setIsPremium(payload.new.tier === 'premium');
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { isPremium, loading };
}
