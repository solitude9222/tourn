import { api, apiBase, post } from "./backend";

/** Upload raw bytes in small requests; profiles store only the playback URL. */
export async function uploadAudioFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
  const mime = file.type || ({ mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", flac: "audio/flac", aac: "audio/aac", opus: "audio/ogg" }[file.name.split(".").pop()?.toLowerCase() || ""]);
  if (!mime?.startsWith("audio/")) throw new Error("Choose an MP3, WAV, OGG, M4A or other audio file.");
  if (!file.size) throw new Error("That audio file is empty. Choose another track.");
  const created = await post<{ id: string; chunkBytes: number }>("/api/media/audio", { mime, bytes: file.size });
  if (!created.ok) throw new Error(created.error);
  const { id, chunkBytes } = created.data;
  if (!id || !Number.isSafeInteger(chunkBytes) || chunkBytes <= 0) throw new Error("The upload could not be started. Please try again.");
  onProgress?.(0);
  for (let offset = 0, part = 0; offset < file.size; offset += chunkBytes, part++) {
    const upload = () => api(`/api/media/audio/${id}/chunks/${part}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file.slice(offset, offset + chunkBytes) });
    let result = await upload();
    if (!result.ok && (result.status === 0 || result.status >= 500)) result = await upload();
    if (!result.ok) throw new Error(result.error);
    onProgress?.(Math.round(Math.min(file.size, offset + chunkBytes) / file.size * 100));
  }
  const completed = await post<{ url: string }>(`/api/media/audio/${id}/complete`);
  if (!completed.ok) throw new Error(completed.error);
  return `${apiBase()}${completed.data.url}`;
}
