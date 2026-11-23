{{/* Nhãn chung gắn vào mọi tài nguyên (selector vẫn dùng nhãn `app` đơn giản). */}}
{{- define "devops-app.labels" -}}
app.kubernetes.io/name: devops-app
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end }}

{{/* Init container chờ DB mở cổng. Chạy bằng user thường (65534), không phải root. */}}
{{- define "devops-app.waitForDb" -}}
- name: wait-for-db
  image: {{ .Values.waitForDbImage }}
  command:
    - sh
    - -c
    - until nc -z {{ .Values.database.serviceName }} {{ .Values.database.port }}; do echo "Waiting for PostgreSQL"; sleep 2; done
  securityContext:
    runAsNonRoot: true
    runAsUser: 65534
    runAsGroup: 65534
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    capabilities:
      drop: ["ALL"]
  resources:
    requests: { cpu: 10m, memory: 16Mi }
    limits: { cpu: 50m, memory: 32Mi }
{{- end }}

{{/* Bảo mật cấp pod cho container backend (image dùng user 10001). */}}
{{- define "devops-app.backendPodSecurityContext" -}}
runAsNonRoot: true
runAsUser: 10001
runAsGroup: 10001
seccompProfile:
  type: RuntimeDefault
{{- end }}

{{/* Bảo mật cấp container: không leo quyền, bỏ mọi capability, root filesystem chỉ đọc. */}}
{{- define "devops-app.containerSecurityContext" -}}
allowPrivilegeEscalation: false
readOnlyRootFilesystem: true
capabilities:
  drop: ["ALL"]
{{- end }}

{{/* Mount CA bundle của RDS khi rdsCa.enabled. */}}
{{- define "devops-app.rdsCaMount" -}}
{{- if .Values.rdsCa.enabled }}
- name: rds-ca
  mountPath: {{ .Values.rdsCa.mountPath }}
  readOnly: true
{{- end }}
{{- end }}

{{- define "devops-app.rdsCaVolume" -}}
{{- if .Values.rdsCa.enabled }}
- name: rds-ca
  configMap:
    name: {{ .Values.rdsCa.configMapName }}
{{- end }}
{{- end }}
