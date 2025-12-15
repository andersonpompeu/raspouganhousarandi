import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'company_partner';

interface UserRoleData {
  role: AppRole | null;
  companyId: string | null;
  loading: boolean;
}

export const useUserRole = (userId: string | undefined, authLoading: boolean = false) => {
  const [roleData, setRoleData] = useState<UserRoleData>({
    role: null,
    companyId: null,
    loading: true,
  });

  useEffect(() => {
    // Se auth ainda está carregando, mantém loading true
    if (authLoading) {
      return;
    }

    // Se não há userId e auth terminou, não há role
    if (!userId) {
      setRoleData({ role: null, companyId: null, loading: false });
      return;
    }

    const fetchRole = async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, company_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRoleData({ role: null, companyId: null, loading: false });
        return;
      }

      setRoleData({
        role: data?.role as AppRole || null,
        companyId: data?.company_id || null,
        loading: false,
      });
    };

    fetchRole();
  }, [userId, authLoading]);

  return roleData;
};
