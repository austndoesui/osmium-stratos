import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// API helper function
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('jwt');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Custom hooks for different API endpoints
export function useVMs(options = {}) {
  return useQuery({
    queryKey: ['vms'],
    queryFn: () => apiCall('/vms'),
    staleTime: 30 * 1000, // 30 seconds
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

export function useHosts(options = {}) {
  return useQuery({
    queryKey: ['hosts'],
    queryFn: () => apiCall('/hosts'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useImages(options = {}) {
  return useQuery({
    queryKey: ['images'],
    queryFn: () => apiCall('/images'),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useInstanceConfig(hostId, instanceName, options = {}) {
  return useQuery({
    queryKey: ['instanceConfig', hostId, instanceName],
    queryFn: () => apiCall(`/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/config`),
    enabled: !!(hostId && instanceName),
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

export function useInstanceUsage(hostId, instanceName, options = {}) {
  return useQuery({
    queryKey: ['instanceUsage', hostId, instanceName],
    queryFn: () => apiCall(`/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/usage`),
    enabled: !!(hostId && instanceName),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    ...options,
  });
}

export function useSettings(options = {}) {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => apiCall('/settings'),
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

export function useUsers(options = {}) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiCall('/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useJobs(options = {}) {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: () => apiCall('/jobs'),
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
    ...options,
  });
}

export function useJob(jobId, options = {}) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: () => apiCall(`/jobs/${jobId}`),
    enabled: !!jobId,
    staleTime: 2 * 1000, // 2 seconds
    refetchInterval: 3 * 1000, // Refetch every 3 seconds
    ...options,
  });
}

// Mutation hooks for actions
export function useCreateInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ hostId, instanceData }) => 
      apiCall(`/hosts/${hostId}/vms`, {
        method: 'POST',
        body: JSON.stringify(instanceData),
      }),
    onSuccess: () => {
      // Invalidate and refetch VMs data
      queryClient.invalidateQueries(['vms']);
    },
  });
}

export function useDeleteInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ hostId, instanceName }) => 
      apiCall(`/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vms']);
    },
  });
}

export function useInstanceAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ hostId, instanceName, action }) => 
      apiCall(`/hosts/${hostId}/vms/${encodeURIComponent(instanceName)}/${action}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vms']);
    },
  });
}

export function useBulkOperation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ operation, instances }) => 
      apiCall(`/vms/bulk/${operation}`, {
        method: 'POST',
        body: JSON.stringify({ instances }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries(['vms']);
      queryClient.invalidateQueries(['jobs']);
    },
  });
}

// Prefetch utilities
export function usePrefetch() {
  const queryClient = useQueryClient();
  
  const prefetchVMs = () => {
    queryClient.prefetchQuery({
      queryKey: ['vms'],
      queryFn: () => apiCall('/vms'),
      staleTime: 30 * 1000,
    });
  };

  const prefetchHosts = () => {
    queryClient.prefetchQuery({
      queryKey: ['hosts'],
      queryFn: () => apiCall('/hosts'),
      staleTime: 2 * 60 * 1000,
    });
  };

  const prefetchImages = () => {
    queryClient.prefetchQuery({
      queryKey: ['images'],
      queryFn: () => apiCall('/images'),
      staleTime: 10 * 60 * 1000,
    });
  };

  return { prefetchVMs, prefetchHosts, prefetchImages };
}