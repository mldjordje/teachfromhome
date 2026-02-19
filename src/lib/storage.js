export const splitStoragePath = (fullPath) => {
  if (!fullPath || typeof fullPath !== "string") return null;
  const [bucket, ...parts] = fullPath.split("/");
  if (!bucket || !parts.length) return null;
  return { bucket, objectPath: parts.join("/") };
};

export const getFileExt = (filename) => {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "mp4";
};
