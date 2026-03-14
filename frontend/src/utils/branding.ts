export const buildAssetUrl = (pathValue?: string | null, version?: string | number | null) => {
  if (!pathValue) {
    return null;
  }

  if (/^https?:\/\//i.test(pathValue)) {
    return pathValue;
  }

  const baseUrl = import.meta.env.VITE_UPLOAD_BASE_URL || window.location.origin;
  const normalizedPath = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  const url = `${baseUrl}${normalizedPath}`;
  if (!version) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(String(version))}`;
};

export const isValidImageFile = (file: File) => {
  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  return validTypes.includes(file.type);
};

export const formatAcceptedImageTypes = () => "PNG, JPG, JPEG or SVG";

export const getBrandingVersion = (updatedAt?: string | number | null, pathValue?: string | null) => updatedAt || pathValue || null;
