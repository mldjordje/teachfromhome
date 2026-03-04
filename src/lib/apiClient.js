import { apiRequest } from "@library/edgeClient";

export const apiGet = async (path) => apiRequest({ path, method: "GET" });

export const apiPost = async (path, body = {}) => apiRequest({ path, method: "POST", body });

export const apiPatch = async (path, body = {}) => apiRequest({ path, method: "PATCH", body });

export const apiDelete = async (path, body = {}) => apiRequest({ path, method: "DELETE", body });
