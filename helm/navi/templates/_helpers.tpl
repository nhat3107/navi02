{{- define "navi.namespace" -}}
{{- .Values.namespace | default .Release.Namespace }}
{{- end }}

{{- define "navi.image" -}}
{{- $root := index . "root" -}}
{{- $name := index . "name" -}}
{{- printf "%s/%s:%s" $root.Values.image.registry $name $root.Values.image.tag }}
{{- end }}

{{- define "navi.kafkaBroker" -}}
{{- printf "broker.%s.svc.cluster.local:9092" (include "navi.namespace" .) }}
{{- end }}

{{/*
  Prefer broker Service ClusterIP (no DNS). Falls back to FQDN on first install
  before the Service exists. CD runs patch-kafka-broker-ip.sh after deploy.
*/}}
{{- define "navi.kafkaBootstrap" -}}
{{- $ns := include "navi.namespace" . -}}
{{- $svc := lookup "v1" "Service" $ns "broker" -}}
{{- if and $svc $svc.spec.clusterIP (ne $svc.spec.clusterIP "None") -}}
{{- printf "%s:9092" $svc.spec.clusterIP -}}
{{- else -}}
{{- include "navi.kafkaBroker" . -}}
{{- end -}}
{{- end }}

{{- define "navi.kafkaAdvertisedListener" -}}
{{- $bootstrap := include "navi.kafkaBootstrap" . -}}
{{- $host := (split ":" $bootstrap)._0 -}}
{{- printf "PLAINTEXT://%s:9092" $host -}}
{{- end }}
