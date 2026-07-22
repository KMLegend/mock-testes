import { useState } from 'react';

export function useFiltros() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  return {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter
  };
}
