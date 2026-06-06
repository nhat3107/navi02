#!/bin/sh
# Set kafka.brokers to the broker Service ClusterIP (no cluster DNS required).
# Usage: sh helm/navi/sync-kafka-broker.sh <namespace> <helm -f flags...>
set -eu

NS="${1:?namespace required}"
shift

[ -n "$NS" ] || NS=navi

HELM_FLAGS="$*"
KUBECTL="kubectl --insecure-skip-tls-verify"

wait_for_broker_ip() {
  i=0
  while [ "$i" -lt 90 ]; do
    if $KUBECTL get svc broker -n "$NS" >/dev/null 2>&1; then
      IP=$($KUBECTL get svc broker -n "$NS" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || true)
      case "$IP" in
        ""|None) ;;
        *) printf '%s' "$IP"; return 0 ;;
      esac
    fi
    i=$((i + 1))
    sleep 2
  done
  return 1
}

ensure_chart_applied() {
  helm upgrade --install navi helm/navi \
    --kube-insecure-skip-tls-verify \
    --namespace "$NS" \
    --create-namespace \
    $HELM_FLAGS \
    --wait=false \
    --timeout 10m
}

echo "Cleaning failed/evicted pods in namespace ${NS}..."
$KUBECTL delete pods -n "$NS" --field-selector status.phase=Failed \
  --ignore-not-found --grace-period=0 2>/dev/null || true

echo "Ensuring Helm release and broker Service exist in namespace ${NS}..."
ensure_chart_applied

if $KUBECTL get deployment broker -n "$NS" >/dev/null 2>&1; then
  $KUBECTL wait --for=condition=available deployment/broker -n "$NS" --timeout=300s || true
fi

IP=$(wait_for_broker_ip) || {
  echo "ERROR: broker Service has no ClusterIP in namespace ${NS}" >&2
  echo "--- helm status ---" >&2
  helm status navi -n "$NS" --kube-insecure-skip-tls-verify 2>&1 || true
  echo "--- services ---" >&2
  $KUBECTL get svc -n "$NS" 2>&1 || true
  echo "--- deployments ---" >&2
  $KUBECTL get deploy -n "$NS" 2>&1 || true
  exit 1
}

BROKERS="${IP}:9092"
echo "Syncing kafka.brokers=${BROKERS}"

helm upgrade --install navi helm/navi \
  --kube-insecure-skip-tls-verify \
  --namespace "$NS" \
  $HELM_FLAGS \
  --reuse-values \
  --set "kafka.brokers=${BROKERS}" \
  --wait --timeout 10m

echo "Kafka broker address: ${BROKERS}"
