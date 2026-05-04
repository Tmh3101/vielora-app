export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  const response = await fetch("/api/auth/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to check email");
  }

  return response.json();
};
