#!/bin/sh
# Writes KUBE_CONFIG to ~/.kube/config and skips TLS verify (k3s certs often lack the public API IP).
set -eu

if [ -z "${KUBE_CONFIG:-}" ]; then
  echo "ERROR: KUBE_CONFIG secret is empty" >&2
  exit 1
fi

mkdir -p "$HOME/.kube"
printf '%s' "$KUBE_CONFIG" > "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"

CLUSTER=$(kubectl config view -o jsonpath='{.clusters[0].name}')
if [ -z "$CLUSTER" ]; then
  echo "ERROR: kubeconfig has no clusters" >&2
  exit 1
fi

kubectl config set-cluster "$CLUSTER" --insecure-skip-tls-verify=true

echo "Cluster: $CLUSTER"
echo "Server:  $(kubectl config view -o jsonpath="{.clusters[?(@.name==\"$CLUSTER\")].cluster.server}")"
kubectl cluster-info --request-timeout=15s
