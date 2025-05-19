export interface ActionResponse<T> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}
