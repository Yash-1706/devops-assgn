# StockPilot - Inventory Management, from laptop to monitored Kubernetes

StockPilot is a small, realistic inventory-management web application for a warehouse team. It tracks
what is in stock, warns when an item drops below its reorder level, and keeps a ledger of every
stock movement (goods received, goods shipped). It is also the vehicle for a full DevOps
pipeline: the same code travels from a developer laptop through tests, container builds, a
security scan and a registry, onto AWS infrastructure created with Terraform, into a Kubernetes
cluster managed with Helm, where it autoscales and is monitored with Prometheus and Grafana.

**What the application does**

- Dashboard with KPI cards: total SKUs, units in stock, stock value, items that need attention
- Item table with stock-level bars, status badges (in stock / low stock / out of stock), search and category filters
- Create, edit and delete items; **receive** or **issue** stock with a reason
- Reorder list: everything at or below its reorder level
- Stock-movement ledger: an auditable history of every change, newest first
- Responsive UI (sidebar collapses, table turns into cards on phones), loading and backend-error states

```text
Developer -> Git/GitHub -> GitHub Actions
                              |-- pytest (SQLite test database)
                              |-- frontend build
                              |-- Docker build (backend + frontend)
                              |-- Trivy scan (fails on HIGH/CRITICAL)
                              `-- push to GHCR, tagged with the commit SHA
                                        |
   Terraform -> AWS VPC + EKS           v
                    |              Helm chart
                    v                   |
              Kubernetes  <-------------+
        +-----------+-----------+
     Frontend    Backend      PostgreSQL (PVC)
     (React +    (FastAPI)
      Nginx)        |  /metrics
        ^           v
     Ingress    Prometheus -> Grafana        HPA scales the backend on CPU
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, plain CSS, served by Nginx (unprivileged) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2, Alembic, Pydantic |
| Database | PostgreSQL 16 |
| Tests | pytest (+ FastAPI TestClient, in-memory SQLite) |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions, GitHub Container Registry (GHCR) |
| Security | Trivy image scanning |
| Infrastructure | Terraform (AWS VPC + EKS) |
| Orchestration | Kubernetes, Helm, Ingress (ingress-nginx), HPA |
| Observability | Prometheus (ServiceMonitor), Grafana, health/readiness endpoints |

## Repository layout

```text
.
├── backend/                 FastAPI app (app/), Alembic migrations (alembic/), tests (tests/), Dockerfile
├── frontend/                React + Vite app (src/), Nginx config, multi-stage Dockerfile
├── docker-compose.yml       Whole stack on one machine
├── terraform/               AWS VPC + EKS (see terraform/README.md)
├── k8s/                     namespace and StorageClass manifests
├── helm/stockpilot/         Helm chart (+ values-dev.yaml, values-eks.yaml)
├── monitoring/              kube-prometheus-stack values and the Grafana dashboard
├── troubleshooting/         two deliberately broken manifests for the troubleshooting lab
├── scripts/                 HPA load test, cluster add-on installer
├── docs/                    security notes and the grading checklist
└── .github/workflows/       CI/CD pipeline
```

---

## 1. Run it locally

### With Docker Compose (fastest)

Requirements: Docker Desktop / Docker Engine with Compose.

```bash
docker compose up --build
```

| URL | What |
|-----|------|
| http://localhost:3000 | the application |
| http://localhost:8000/docs | Swagger UI of the API |
| http://localhost:8000/health | liveness probe |
| http://localhost:8000/ready | readiness probe (checks the database) |
| http://localhost:8000/metrics | Prometheus metrics |

On the first start the backend container runs the Alembic migrations (which also load a few demo
items). Stop with `docker compose down`; add `-v` to delete the database volume as well.

### Backend only

Requirements: Python 3.12+ and a PostgreSQL database.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
export DATABASE_URL='postgresql+psycopg://stockpilot:stockpilot@localhost:5432/stockpilot'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### Frontend only (hot reload)

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173, /api is proxied to http://localhost:8000
```

## 2. API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/items` | list items; filters `?stock=low_stock`, `?category=`, `?q=` (name/SKU search) |
| GET | `/api/items/stats` | KPI numbers (totals, stock value, low / out of stock) |
| GET | `/api/items/{id}` | one item |
| POST | `/api/items` | create (409 if the SKU exists) |
| PUT | `/api/items/{id}` | update (only the fields sent change) |
| DELETE | `/api/items/{id}` | delete an item and its ledger |
| POST | `/api/items/{id}/adjust` | receive (`delta` > 0) or issue (`delta` < 0) stock; 409 if it would go below zero |
| GET | `/api/movements?limit=10` | latest stock-ledger entries |
| GET | `/`, `/health`, `/ready`, `/metrics` | service info, liveness, readiness, Prometheus |

`/health` only says "the process is alive" (cheap, no database). `/ready` runs `SELECT 1` and
returns `503` if the database is unreachable, which is what tells Kubernetes to stop sending
traffic to a pod.

## 3. Tests

```bash
cd backend
pytest -v
```

46 tests cover health/readiness/metrics, item CRUD, validation, filters, statistics, stock
adjustments and the ledger. They run against an in-memory SQLite database (`tests/conftest.py`
overrides the database dependency), so they never touch a real database and need no services.
`pytest.ini` sets the test path and import root.

## 4. Git and GitHub

Work is committed in small steps (`git log --oneline` tells the story). `.gitignore` keeps
`.env`, `__pycache__`, `node_modules`, `.venv`, Terraform state and `terraform.tfvars` out of the
repository, and `.gitattributes` keeps line endings as LF so Docker and shell scripts behave the
same on Windows.

## 5. Docker

- `backend/Dockerfile`: `python:3.12-slim`, dependencies installed first (layer cache), numeric non-root
  user (uid 10001), `HEALTHCHECK`, and a start command that runs `alembic upgrade head` and then
  `exec uvicorn`. A Postgres advisory lock in `alembic/env.py` makes replicas that start at the same
  time take turns migrating.
- `frontend/Dockerfile`: multi-stage. Stage 1 (`node:22-alpine`) runs `npm ci && npm run build`; stage 2
  (`nginxinc/nginx-unprivileged`, uid 101) only contains the static files and the Nginx config. Nginx
  forwards `/api` to the backend (`BACKEND_URL`), so the browser never needs the backend hostname.

```bash
docker build -t stockpilot-backend:local ./backend
docker build -t stockpilot-frontend:local ./frontend
```

## 6. CI/CD (GitHub Actions)

`.github/workflows/ci-cd.yml` runs on every push and pull request to `main`:

```text
test  (pytest + frontend build)        validate-infra (helm lint/template, terraform fmt/validate)
      \                                  /
       build-scan-push  (backend, frontend in parallel)
          1. docker build
          2. Trivy scan  -> fails the job on HIGH/CRITICAL
          3. docker push -> ghcr.io/<owner>/stockpilot-{backend,frontend}:<git sha>   (push to main only)
                 |
              deploy (helm upgrade --install on EKS; optional)
```

- **Quality gates:** a failing test stops the pipeline before any image is built; a vulnerable image is never pushed.
- **Tags are the commit SHA**, never `latest`: commit A produces image A, so what runs in the cluster is traceable to source.
- **Pushing needs no secrets:** the workflow uses the built-in `GITHUB_TOKEN`.
- **Package visibility:** GHCR packages start out private. For the cluster to pull them, either make both
  packages public (GitHub profile > Packages > package > Package settings > Change visibility) or create an
  image pull secret and pass `imagePullSecrets` to Helm.

### Deploying from CI (optional)

The `deploy` job is skipped until you opt in. Add in *Settings > Secrets and variables > Actions*:

| Kind | Name | Value |
|------|------|-------|
| Variable | `DEPLOY_ENABLED` | `true` |
| Variable | `AWS_REGION`, `EKS_CLUSTER_NAME` | `ap-south-1`, `stockpilot-eks` |
| Secret | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | an IAM user allowed to call `eks:DescribeCluster` and mapped in the cluster |
| Secret | `DB_PASSWORD` | PostgreSQL password for the release (optional) |

Never commit credentials; they only ever live in GitHub secrets.

## 7. Security scanning (Trivy)

Both images are scanned in the pipeline (`severity: HIGH,CRITICAL`, `exit-code: 1`, `ignore-unfixed: true`).
See [docs/SECURITY.md](docs/SECURITY.md) for what Trivy found when this project was first scanned, how it was fixed,
and how to read a result.

## 8. Terraform: AWS VPC + EKS

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars    # optional, the defaults work
terraform init
terraform plan
terraform apply                                  # about 15-20 minutes
aws eks update-kubeconfig --region ap-south-1 --name stockpilot-eks
```

Creates a VPC with public and private subnets in two availability zones, an internet gateway and a NAT
gateway, an EKS cluster and a managed node group (3 x `t3.medium`), plus the EBS CSI add-on for the database
volume. Full details, cost estimate and the correct teardown order are in [terraform/README.md](terraform/README.md).
**EKS and the NAT gateway cost money while they exist, so destroy the stack when you are done.**

## 9. Kubernetes and Helm

One-time cluster setup (Metrics Server for the HPA, ingress-nginx, gp3 StorageClass, Prometheus + Grafana):

```bash
scripts/install-cluster-addons.sh
```

Then deploy the application. The namespace manifest is applied first, as the course material does:

```bash
kubectl apply -f k8s/namespace.yaml

helm upgrade --install stockpilot ./helm/stockpilot \
  --namespace stockpilot \
  -f helm/stockpilot/values-eks.yaml \
  --set backend.image.tag=<git-sha> --set frontend.image.tag=<git-sha>

helm list -n stockpilot
kubectl get pods,svc,ingress,hpa -n stockpilot
helm test stockpilot -n stockpilot        # backend + database + frontend proxy smoke test
```

What the chart contains (`helm/stockpilot/templates/`):

| Template | Purpose |
|----------|---------|
| `backend-deployment`, `frontend-deployment` | 2 replicas each, probes, resource requests/limits, non-root, read-only root filesystem (backend), anti-affinity |
| `backend-service`, `frontend-service` | `ClusterIP` Services (a Service finds pods by label: no matching labels, no endpoints) |
| `postgres` | StatefulSet with a PersistentVolumeClaim and a headless Service. For production prefer Amazon RDS |
| `secret` | database credentials, wired into the backend as `DATABASE_URL` |
| `ingress` | `/` to the frontend; `/api`, `/docs` and `/openapi.json` to the backend |
| `hpa` | scales the backend from 2 to 6 pods at 50% CPU |
| `servicemonitor` | tells Prometheus to scrape `/metrics` |
| `poddisruptionbudgets`, `tests/` | availability during drains, `helm test` |

Run it on a **local cluster** (Docker Desktop, kind, minikube) with an ingress controller installed:

```bash
helm upgrade --install stockpilot ./helm/stockpilot -n stockpilot --create-namespace \
  -f helm/stockpilot/values-dev.yaml
# add "127.0.0.1 stockpilot.local" to your hosts file, then open http://stockpilot.local
```

`values-dev.yaml` expects locally built images (see Docker section).

Useful Helm ideas: `helm upgrade` to roll out a new image tag, `helm rollback stockpilot 1 -n stockpilot` to go back.

## 10. Ingress

An Ingress resource is only configuration; an Ingress *controller* implements it. On EKS that is
ingress-nginx, which creates an AWS load balancer:

```bash
kubectl get ingress -n stockpilot        # ADDRESS = the load balancer hostname
```

Open that address in a browser. `/` serves the React app and `/api` goes to FastAPI (Swagger UI at `/docs`).

## 11. Autoscaling (HPA)

```bash
kubectl get hpa -n stockpilot -w         # terminal 1
scripts/load-test.sh stockpilot 30 240   # terminal 2: 30 request loops for 4 minutes
```

CPU climbs above the 50% target and the HPA adds backend pods (up to 6). About two minutes after the load
stops it scales back down. The HPA needs `resources.requests.cpu` on the pods and a metrics provider (Metrics Server).

## 12. Monitoring (Prometheus + Grafana)

The backend exposes request counts and latency histograms at `/metrics`. `kube-prometheus-stack` is installed by
`scripts/install-cluster-addons.sh` using `monitoring/prometheus-values.yaml` and `monitoring/grafana-values.yaml`.
The chart's `ServiceMonitor` makes Prometheus scrape the backend; `monitoring/grafana-dashboard.yaml` provisions the
**StockPilot - API overview** dashboard (requests/s, error rate, p95 latency, CPU per pod, replica count).

```bash
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090   # Status > Targets: stockpilot-backend UP
kubectl port-forward -n monitoring svc/monitoring-grafana 3001:80                         # http://localhost:3001
kubectl get secret -n monitoring monitoring-grafana -o jsonpath="{.data.admin-password}" | base64 -d   # user: admin
```

## 13. Troubleshooting lab

Two deliberately broken manifests, each with the symptom, the cause and the fix written at the top of the file:

```bash
kubectl apply -f troubleshooting/broken-image.yaml     # ImagePullBackOff: wrong image tag
kubectl apply -f troubleshooting/broken-service.yaml   # Service has no endpoints: selector does not match pod labels
```

Investigate with `kubectl get pods`, `kubectl describe pod`, `kubectl get events --sort-by=.lastTimestamp`,
`kubectl get endpoints` and `kubectl get pods --show-labels`.

## 14. Live demo script

1. Open the app, receive some stock, create an item; show `/docs` and call the API.
2. Show the `items` and `stock_movements` tables in PostgreSQL (`docker compose exec db psql -U stockpilot`).
3. Change something small, `git commit`, `git push`.
4. Watch the Actions run: tests, build, Trivy, push; show the SHA-tagged images in GHCR.
5. Show the Terraform code and the AWS console (VPC, EKS).
6. `kubectl get pods,svc -n stockpilot`, `helm list -n stockpilot`, open the app through the Ingress address.
7. Run the load test and show the HPA scaling; show Prometheus targets and the Grafana dashboard.
8. Apply a broken manifest and troubleshoot it live.

## 15. Clean up

```bash
helm uninstall stockpilot -n stockpilot
helm uninstall monitoring -n monitoring
helm uninstall ingress-nginx -n ingress-nginx        # removes the AWS load balancer
kubectl delete pvc --all -n stockpilot               # removes the EBS volume
cd terraform && terraform destroy
```

Do the Helm and PVC steps **before** `terraform destroy`; otherwise the load balancer and volume keep the VPC alive and
the destroy hangs. See [docs/SUBMISSION.md](docs/SUBMISSION.md) for the grading checklist.
