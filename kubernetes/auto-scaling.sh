#!/bin/bash

# ETL System Auto-scaling Configuration for Kubernetes
# This script sets up horizontal pod autoscaling based on CPU and memory usage

# Create namespace
kubectl create namespace etl-system --dry-run=client -o yaml | kubectl apply -f -

# Create ConfigMap for application configuration
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: etl-config
  namespace: etl-system
data:
  NODE_ENV: "production"
  DATABASE_URL: "postgresql://etl_user:\${DB_PASSWORD}@postgres-service:5432/etl_database"
  REDIS_URL: "redis://redis-service:6379"
  NEXTAUTH_SECRET: "\${NEXTAUTH_SECRET}"
  NEXTAUTH_URL: "https://your-domain.com"
EOF

# Create PostgreSQL Deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: etl-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: "etl_database"
        - name: POSTGRES_USER
          value: "etl_user"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: etl-system
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
EOF

# Create Redis Deployment
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: etl-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command: ["redis-server", "--maxmemory", "256mb", "--maxmemory-policy", "allkeys-lru"]
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: etl-system
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
EOF

# Create ETL Application Deployment with Auto-scaling
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: etl-app
  namespace: etl-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: etl-app
  template:
    metadata:
      labels:
        app: etl-app
    spec:
      containers:
      - name: etl-app
        image: your-registry/etl-system:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: etl-config
              key: NODE_ENV
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: etl-config
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: etl-config
              key: REDIS_URL
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: nextauth-secret
        - name: NEXTAUTH_URL
          valueFrom:
            configMapKeyRef:
              name: etl-config
              key: NEXTAUTH_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: etl-app-service
  namespace: etl-system
spec:
  selector:
    app: etl-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
EOF

# Create Horizontal Pod Autoscaler
cat <<EOF | kubectl apply -f -
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: etl-app-hpa
  namespace: etl-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: etl-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 15
EOF

# Create PersistentVolumeClaims
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: etl-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 20Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
  namespace: etl-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
EOF

# Create Ingress for Load Balancing
cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: etl-ingress
  namespace: etl-system
  annotations:
    kubernetes.io/ingress.class: "nginx"
    nginx.ingress.kubernetes.io/load-balance: "least_conn"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: etl-app-service
            port:
              number: 80
EOF

echo "✅ Auto-scaling configuration applied successfully!"
echo "📊 Check status with: kubectl get hpa -n etl-system"
echo "🔍 View pods with: kubectl get pods -n etl-system"
echo "📈 Monitor metrics: kubectl top pods -n etl-system"