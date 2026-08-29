export type ApiErrorCode =
  | 'invalid_request'
  | 'unsupported_conversion'
  | 'invalid_file_type'
  | 'file_too_large'
  | 'unauthorized'
  | 'not_found'
  | 'gone'
  | 'conversion_failed'
  | 'rate_limited'
  | 'internal_error'
  | 'conversion_timeout';

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

export type ApiErrorContext = 'login' | 'register' | 'session' | 'download' | 'share';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type JobFileFormat = 'jpg' | 'png' | 'pdf' | 'docx';

export type ConversionJob = {
  id: string;
  status: JobStatus;
  source_format?: JobFileFormat;
  target_format?: JobFileFormat;
  download_url?: string;
  expires_at?: string;
  saved_to_profile?: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  saveConversions?: boolean;
  telegramId?: string | null;
};

export type AuthUserDto = {
  id: string;
  email: string;
  display_name: string;
  save_conversions: boolean;
  telegram_id: string | null;
};

export type RegisterDto = AuthUserDto & {
  api_key: string;
};
