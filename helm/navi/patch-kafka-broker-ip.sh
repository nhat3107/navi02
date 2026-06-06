#!/bin/sh
# Point all services at the broker Service ClusterIP (avoids flaky k3s/CoreDNS).
# Usage: sh helm/navi/patch-kafka-broker-ip.sh [namespace]
set -eu

NS="${1:-navi}"

wait_for_broker_ip() {
  i=0
  while [ "$i" -lt 60 ]; do
    IP=$(kubectl get svc broker -n "$NS" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || true)
    case "$IP" in
      ""|None)
        i=$((i + 1))
        sleep 2
        ;;
      *)
        printf '%s' "$IP"
        return 0
        ;;
    esac
  done
  return 1
}

IP=$(wait_for_broker_ip) || {
  echo "ERROR: broker Service has no ClusterIP in namespace ${NS}" >&2
  exit 1
}

BROKERS="${IP}:9092"
ADVERTISED="PLAINTEXT://${IP}:9092"

echo "Kafka bootstrap: ${BROKERS}"

kubectl patch configmap navi-config -n "$NS" --type merge \
  -p "{\"data\":{\"KAFKA_BROKERS\":\"${BROKERS}\"}}"

kubectl set env deployment/broker -n "$NS" \
  KAFKA_ADVERTISED_LISTENERS="${ADVERTISED}"

kubectl rollout status deployment/broker -n "$NS" --timeout=180s

for dep in api-gateway auth-service user-service chat-service network-service notification-service ai-service; do
  if kubectl get deployment "$dep" -n "$NS" >/dev/null 2>&1; then
    kubectl set env deployment/"$dep" -n "$NS" KAFKA_BROKERS="${BROKERS}"
  fi
done

kubectl rollout restart deployment -n "$NS" \
  api-gateway auth-service user-service chat-service network-service notification-service ai-service \
  2>/dev/null || true

echo "Kafka patched to ClusterIP ${BROKERS}"
