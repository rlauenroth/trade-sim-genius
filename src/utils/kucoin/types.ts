
export interface ActivityLogger {
  addKucoinSuccessLog: (endpoint: string, message?: string) => void;
  addKucoinErrorLog: (endpoint: string, error: Error) => void;
  addProxyStatusLog: (isConnected: boolean) => void;
}
