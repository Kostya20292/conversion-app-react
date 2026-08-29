export const uploadStorageKey = (jobId: string): string => `uploads/${jobId}/source`;

export const resultStorageKey = (jobId: string): string => `results/${jobId}/result`;

export const profileStorageKey = (userId: string, fileId: string): string =>
  `profile/${userId}/${fileId}/file`;
