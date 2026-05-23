/** Shared broker list for Kafka clients in this app. */
export function kafkaBrokersFromEnv(): string[] {
  return (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const NOTIFICATION_REALTIME_TOPIC =
  'notification.realtime.delivered' as const;
