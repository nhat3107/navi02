{{/*
Kubernetes namespace — defaults to Release namespace.
*/}}
{{- define "navi.namespace" -}}
{{- .Values.namespace | default .Release.Namespace }}
{{- end }}

{{/*
Full image reference for app images built by CI (registry/imageName:tag).
Infra images use the `image` field directly when `externalImage` is true.
*/}}
{{- define "navi.image" -}}
{{- $root := index . "root" -}}
{{- $svc := index . "svc" -}}
{{- if $svc.externalImage -}}
{{- printf "%s" $svc.image }}
{{- else -}}
{{- printf "%s/%s:%s" $root.Values.image.registry $svc.imageName $root.Values.image.tag }}
{{- end -}}
{{- end }}

{{/*
Kafka bootstrap — apps use $(BROKER_SERVICE_HOST):9092 (injected by Kubernetes service links).
*/}}
{{- define "navi.kafkaBrokers" -}}
$(BROKER_SERVICE_HOST):9092
{{- end }}
