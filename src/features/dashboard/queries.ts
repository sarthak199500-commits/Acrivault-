import { useQuery } from '@tanstack/react-query';
import { getOverview } from '@/mocks/api';

export function useOverview() {
  return useQuery({ queryKey: ['overview'], queryFn: getOverview });
}
