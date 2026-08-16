export interface AppNotification {
  readonly id: string;
  readonly module: string;
  readonly eventType: string;
  readonly entityId?: string;
  readonly href?: string;
  readonly title: string;
  readonly message: string;
  readonly readAt?: string;
  readonly createdAt: string;
}
