const defaultMaxUploadSizeBytes = 50 * 1024 * 1024;

export function getMaxUploadSizeBytes(): number {
  const configuredValue = Number(process.env.MAX_UPLOAD_SIZE_BYTES ?? defaultMaxUploadSizeBytes);

  return Number.isSafeInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : defaultMaxUploadSizeBytes;
}
