#!/bin/sh
# Set kafka.brokers to the broker Service ClusterIP (no cluster DNS required).
# Usage: sh helm/navi/sync-kafka-broker.sh <namespace> <helm-values-files...>
set -eu

NS="${1:?namespace required}"
shift

wait_for_ip() {
  i=0
  while [ "$i" -lt 60 ]; do
    IP=$(kubectl get svc broker -n "$NS" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || true)
    case "$IP" in
      ""|None) i=$((i + 1)); sleep 2 ;;
      *) printf '%s' "$IP"; return 0 ;;
    esac
  done
  return 1
}

IP=$(wait_for_ip) || {
  echo "ERROR: broker Service has no ClusterIP in namespace ${NS}" >&2
  exit 1
}

BROKERS="${IP}:9092"
echo "Syncing kafka.brokers=${BROKERS}"

helm upgrade navi helm/navi \
  --kube-insecure-skip-tls-verify \
  --namespace "$NS" \
  "$@" \
  --reuse-values \
  --set "kafka.brokers=${BROKERS}" \
  --wait --timeout 10m

echo "Kafka broker address: ${BROKERS}"
