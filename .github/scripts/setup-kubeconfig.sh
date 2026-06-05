#!/bin/sh
# Writes $HOME/.kube/config from KUBE_CONFIG (raw YAML or base64) and verifies API access.
set -eu

if [ -z "${KUBE_CONFIG:-}" ]; then
  echo "::error::KUBE_CONFIG secret is empty"
  exit 1
fi

mkdir -p "$HOME/.kube"
CONFIG="$HOME/.kube/config"

# Strip CR for secrets copied from Windows.
KUBE_CLEAN="$(printf '%s' "$KUBE_CONFIG" | tr -d '\r')"

if printf '%s' "$KUBE_CLEAN" | grep -q '^apiVersion:'; then
  printf '%s' "$KUBE_CLEAN" > "$CONFIG"
else
  printf '%s' "$KUBE_CLEAN" | base64 -d > "$CONFIG"
fi
chmod 600 "$CONFIG"

if ! grep -q '^apiVersion:' "$CONFIG"; then
  echo "::error::KUBE_CONFIG is not valid kubeconfig YAML. Paste raw config or base64-encoded config."
  exit 1
fi

SERVER="$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}' 2>/dev/null || true)"
CONTEXT="$(kubectl config current-context 2>/dev/null || true)"

echo "Kubernetes context: ${CONTEXT:-unknown}"
echo "API server: ${SERVER:-unknown}"

case "$SERVER" in
  *://127.0.0.1:*|*://localhost:*|*://0.0.0.0:*|*://kubernetes.docker.internal:*)
    echo "::error::API server is local ($SERVER). GitHub Actions cannot reach a local cluster. Use a public/managed control-plane endpoint and a deploy service-account token in KUBE_CONFIG."
    exit 1
    ;;
  *://10.*|*://172.1[6-9].*|*://172.2[0-9].*|*://172.3[0-1].*|*://192.168.*)
    echo "::warning::API server uses a private RFC1918 address ($SERVER). Ensure the cluster API is reachable from the public internet (or use a self-hosted runner in the same network)."
    ;;
esac

if ! kubectl cluster-info >/dev/null 2>&1; then
  echo "::error::Cannot reach the Kubernetes API. Check KUBE_CONFIG credentials, CA data, and that the server URL is reachable from GitHub Actions."
  kubectl cluster-info || true
  exit 1
fi

kubectl get ns >/dev/null
echo "Cluster connection OK"
