import axios from "axios";

const runtimeBase =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "http://localhost:4000/api"
    : typeof window !== "undefined"
      ? `${window.location.origin}/api`
      : "http://localhost:4000/api");

const baseURL = runtimeBase;

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sims_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string })?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
};
