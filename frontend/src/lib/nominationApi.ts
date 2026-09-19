const API_BASE_URL = "http://localhost:5000/api";

export interface NominationData {
  nomineeName: string;
  nomineeEmail: string;
  nomineePhone: string;
  relationship: string;
  personalMessage?: string;
  assetDistribution?: Record<string, number>;
}

export async function addNomination(data: NominationData) {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/nominations/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to add nomination");
  }

  return response.json();
}

export async function getNomination() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/nominations/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error("Failed to fetch nomination");
  }

  return response.json();
}

export async function deleteNomination() {
  const token = localStorage.getItem("token");
  const response = await fetch(`${API_BASE_URL}/nominations/`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete nomination");
  }

  return response.json();
}

export async function acknowledgeNomination(nominatorEmail: string) {
  const response = await fetch(`${API_BASE_URL}/nominations/acknowledge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nominatorEmail }),
  });

  if (!response.ok) {
    throw new Error("Failed to acknowledge nomination");
  }

  return response.json();
}
