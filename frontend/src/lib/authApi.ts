import type { AuthUser } from "@/store/useStore";
import type { EmploymentStatus, GoalType } from "@/types/finance";

const AUTH_API_BASE_URL =
  import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

interface AuthResponse {
  token: string;
  user: AuthUser;
}

const parseError = async (res: Response) => {
  try {
    const data = await res.json();
    return data.message || `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
};

export async function registerRequest(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function loginRequest(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  return res.json();
}

export async function getMeRequest(token: string): Promise<AuthUser> {
  const res = await fetch(`${AUTH_API_BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = await res.json();
  return data.user;
}

export interface UpdateProfilePayload {
  name?: string;
  dob?: string;
  employmentStatus?: EmploymentStatus;
  monthlyIncome?: number;
  fixedExpenses?: number;
  variableExpenses?: number;
  goalType?: GoalType;
  targetAmount?: number;
  timelineMonths?: number;
  risk_answers?: number[];
}

export interface UpdatedProfileUser {
  _id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  dob?: string;
  employmentStatus?: EmploymentStatus;
  monthlyIncome?: number;
  fixedExpenses?: number;
  variableExpenses?: number;
  goalType?: GoalType;
  targetAmount?: number;
  timelineMonths?: number;
  risk_answers?: number[];
}

export async function updateProfileRequest(
  token: string,
  payload: UpdateProfilePayload,
): Promise<UpdatedProfileUser> {
  const res = await fetch(`${AUTH_API_BASE_URL}/api/users/me`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(await parseError(res));
  }

  const data = await res.json();
  return data.user;
}
