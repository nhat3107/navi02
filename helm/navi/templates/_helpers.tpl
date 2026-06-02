{{/*
Expand the name of the chart.
*/}}
{{- define "navi.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "navi.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s" $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "navi.labels" -}}
helm.sh/chart: {{ include "navi.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: navi
{{- end }}

{{/*
Selector labels for a component
*/}}
{{- define "navi.selectorLabels" -}}
app.kubernetes.io/name: {{ .component }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Docker Hub image reference
Usage: {{ include "navi.image" (dict "root" . "name" .Values.images.apiGateway) }}
*/}}
{{- define "navi.image" -}}
{{- $root := .root -}}
{{- $name := .name -}}
{{ printf "%s/%s:%s" $root.Values.registry.dockerhubUsername $name $root.Values.registry.tag }}
{{- end }}

{{/*
Namespace — Helm 3 can use .Release.Namespace if we pass -n, but we also support values.namespace
*/}}
{{- define "navi.namespace" -}}
{{- .Values.namespace | default .Release.Namespace }}
{{- end }}

{{/*
Secret name
*/}}
{{- define "navi.secretName" -}}
navi-secrets
{{- end }}

{{/*
ConfigMap name
*/}}
{{- define "navi.configMapName" -}}
navi-config
{{- end }}

{{/*
Build AUTH_DATABASE_URL when not explicitly set
*/}}
{{- define "navi.authDatabaseUrl" -}}
{{- if .Values.secrets.authDatabaseUrl -}}
{{- .Values.secrets.authDatabaseUrl -}}
{{- else -}}
{{- printf "postgresql://%s:%s@postgres:5432/auth_db" .Values.secrets.postgresUser .Values.secrets.postgresPassword -}}
{{- end -}}
{{- end }}

{{- define "navi.userDatabaseUrl" -}}
{{- if .Values.secrets.userDatabaseUrl -}}
{{- .Values.secrets.userDatabaseUrl -}}
{{- else -}}
{{- printf "postgresql://%s:%s@postgres:5432/user_db" .Values.secrets.postgresUser .Values.secrets.postgresPassword -}}
{{- end -}}
{{- end }}

{{- define "navi.chatDb" -}}
{{- if .Values.secrets.chatDb -}}
{{- .Values.secrets.chatDb -}}
{{- else -}}
{{- printf "mongodb://%s:%s@mongo:27017/chat_db?authSource=admin" .Values.secrets.mongoRootUser .Values.secrets.mongoRootPassword -}}
{{- end -}}
{{- end }}

{{- define "navi.networkDbUrl" -}}
{{- if .Values.secrets.networkDbUrl -}}
{{- .Values.secrets.networkDbUrl -}}
{{- else -}}
{{- printf "mongodb://%s:%s@mongo:27017/network_db?authSource=admin" .Values.secrets.mongoRootUser .Values.secrets.mongoRootPassword -}}
{{- end -}}
{{- end }}

{{- define "navi.notificationDbUrl" -}}
{{- if .Values.secrets.notificationDbUrl -}}
{{- .Values.secrets.notificationDbUrl -}}
{{- else -}}
{{- printf "mongodb://%s:%s@mongo:27017/notification_db?authSource=admin" .Values.secrets.mongoRootUser .Values.secrets.mongoRootPassword -}}
{{- end -}}
{{- end }}
