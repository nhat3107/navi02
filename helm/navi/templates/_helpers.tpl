{{- define "navi.namespace" -}}
{{- .Values.namespace | default .Release.Namespace }}
{{- end }}

{{- define "navi.image" -}}
{{- $root := index . "root" -}}
{{- $name := index . "name" -}}
{{- printf "%s/%s:%s" $root.Values.image.registry $name $root.Values.image.tag }}
{{- end }}

{{- define "navi.kafkaBrokers" -}}
{{- .Values.kafka.brokers | default "broker:9092" }}
{{- end }}

{{- define "navi.kafkaAdvertised" -}}
{{- $host := (split ":" (include "navi.kafkaBrokers" .))._0 -}}
{{- printf "PLAINTEXT://%s:9092" $host }}
{{- end }}
