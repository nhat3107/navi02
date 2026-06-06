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

{{- define "navi.kafkaAdvertisedListener" -}}
{{- printf "PLAINTEXT://broker.%s.svc.cluster.local:9092" (include "navi.namespace" .) }}
{{- end }}
