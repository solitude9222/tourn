import { api, apiBase, post } from "./backend";

/* Background video, uploaded in chunks.

   A hundred megabytes as a data URL would land in the profile document and
   every read of it; instead the bytes live in the media store and the profile
   only keeps the playback URL. The same chunked endpoint that serves audio is
   used, because it already streams ranges back for the <video> element. */

export const VIDEO_MAX_BYTES = 100 * 1024 * 1024;

export async function uploadVideoFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (!file.size) throw new Error("That video file is empty. Choose another one.");
  if (!file.type.startsWith("video/")) throw new Error("Choose an MP4, WebM or other video file.");
  const created = await post<{ id: string; chunkBytes: number }>("/api/media/audio", {
    mime: file.type || "video/mp4",
    bytes: file.size,
  });
  if (!created.ok) throw new Error(created.error);
  const { id, chunkBytes } = created.data;
  if (!id || !Number.isSafeInteger(chunkBytes) || chunkBytes <= 0) {
    throw new Error("The upload could not be started. Please try again.");
  }
  onProgress?.(0);
  for (let offset = 0, part = 0; offset < file.size; offset += chunkBytes, part++) {
    const upload = () =>
      api(`/api/media/audio/${id}/chunks/${part}`, {
        method: "PUT",
        headers: { "Content-Type": "application/octet-stream" },
        body: file.slice(offset, offset + chunkBytes),
      });
    let result = await upload();
    if (!result.ok && (result.status === 0 || result.status >= 500)) result = await upload();
    if (!result.ok) throw new Error(result.error);
    onProgress?.(Math.round((Math.min(file.size, offset + chunkBytes) / file.size) * 100));
  }
  const completed = await post<{ url: string }>(`/api/media/audio/${id}/complete`);
  if (!completed.ok) throw new Error(completed.error);
  return `${apiBase()}${completed.data.url}`;
}
