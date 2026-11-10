const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file could not be read."));
    reader.readAsDataURL(file);
  });
}

/**
 * Reads a picked audio file into a data URL for real in-browser playback.
 * There's no way to compress audio the way images get resized, so this just
 * enforces a size cap that keeps the rest of the profile comfortably inside
 * localStorage's quota.
 */
export async function audioFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("audio/")) {
    throw new Error("Choose an MP3, WAV, OGG or M4A file.");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("That file is too large. Keep it under 4 MB — roughly a minute of average-quality MP3.");
  }
  return readAsDataUrl(file);
}
