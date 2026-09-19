import { useStore } from '../store/useStore';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Helper function to grab the token from Zustand and format the headers
const getAuthHeaders = () => {
  // We use .getState() to read the token outside of a React component
  const token = useStore.getState().authToken; 
  
  if (!token) {
    throw new Error('User is not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// 1. Fetch the plan on page load
export const fetchRetirementPlan = async () => {
  const response = await fetch(`${API_BASE_URL}/api/retirement-plan`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch retirement plan');
  }

  return response.json(); // Returns { hasPlan: boolean, data: planObject }
};

// 2. Generate and save a new plan
export const generateRetirementPlan = async (payload: any) => {
  // Note: We'll need to make sure this POST route exists on your backend next!
  const response = await fetch(`${API_BASE_URL}/api/retirement-plan/generate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to generate plan');
  }

  return response.json(); // Should return the newly generated plan data
};