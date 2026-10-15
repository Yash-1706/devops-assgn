# Grading checklist (GRADING.md, 100 points)

Legend: **Done** = in the repository and verified. **You** = needs your AWS account, your GitHub UI or a screenshot
that only you can take.

> The application domain (inventory management) and all code were written for this project, as the rubric's
> plagiarism rule requires. The DevOps layer follows the course architecture.

| Module | Pts | Status | Where / how |
|--------|----:|--------|-------------|
| M1 Application | 10 | Done + screenshot | `backend/app`, `backend/alembic/versions` (3 migrations), `frontend/src`, `docker-compose.yml`. **You:** screenshot of http://localhost:3000 |
| M2 Testing | 10 | Done + screenshot | `backend/tests` (48 tests, SQLite test DB), `backend/pytest.ini`, `tests/conftest.py`. **You:** screenshot of `pytest -v` ([output](evidence/pytest-output.txt)) |
| M3 Git/GitHub | 5 | Done | public repo, more than 50 small commits (the rubric asks for 10), `.gitignore` excludes `.env`, `__pycache__`, `node_modules`, `.venv`. **You:** screenshot of the commit history |
| M4 Docker | 10 | Done + screenshots | both Dockerfiles (frontend is multi-stage), non-root users, 3-service compose. **You:** screenshots of `docker compose up --build` and the app ([evidence](evidence/compose-smoke-test.txt)) |
| M5 CI/CD | 15 | Done + GHCR screenshot | `.github/workflows/ci-cd.yml`: triggers on push to `main`, pytest gates the build, frontend build, both images built, pushed to GHCR, tagged with the commit SHA (no `latest`). **You:** Actions run URL (Actions tab, a green run) and a screenshot of the GHCR packages page |
| M6 DevSecOps | 5 | Done + screenshot | Trivy step for both images, `exit-code: 1` on HIGH/CRITICAL. Written explanation: [SECURITY.md](SECURITY.md). **You:** screenshot of the Trivy step output in the Actions run |
| M7 Terraform | 15 | Code validated; apply is **You** | `terraform/` (VPC with 2 public subnets, EKS + managed node group, `terraform.tfvars.example`); `terraform init`, `fmt` and `validate` pass. **You:** `terraform plan`, `apply` and `destroy` with AWS credentials, AWS console screenshot (VPC + EKS), destroy screenshot |
| M8 Kubernetes + Helm | 15 | Chart tested locally; EKS is **You** | `k8s/namespace.yaml`, `helm/stockpilot`: 2 replicas each, ClusterIP Services, Ingress `/` and `/api`. Tested on a local cluster ([evidence](evidence/local-kubernetes-test.txt)). **You:** the same on EKS: `kubectl get pods -n stockpilot`, `kubectl get svc`, `helm list`, browser through the Ingress address |
| M9 Observability | 10 | `/metrics` done; stack is **You** | `/metrics` endpoint, `monitoring/*` values, dashboard, `ServiceMonitor`. **You:** `curl .../metrics` screenshot, Prometheus Targets (UP), Grafana dashboard with data |
| M10 Docs + presentation | 5 | README done; demo is **You** | `README.md` (root), demo script in section 14 |

## What was verified, and what was not

Verified on this machine: the 48 tests, all migrations (SQLite and PostgreSQL), concurrent migrations, the Compose stack
end to end, both images against Trivy (clean), the GitHub Actions run (green: tests, builds, Trivy, GHCR push),
`actionlint`, `terraform fmt/init/validate`, `helm lint/template`, and a real installation of the Helm chart on a local
Kubernetes cluster (pods, PVC, Ingress, HPA scaling 2 to 6, `helm test`, both troubleshooting labs). The Grafana dashboard
queries were run against a Prometheus scraping the real backend.

Not verified (needs AWS or a full Prometheus stack): `terraform plan/apply` against AWS, the EKS deployment, the Helm
`ServiceMonitor` and Grafana inside a cluster, and the `deploy` job of the pipeline. Expect small adjustments on first
contact with EKS (for example the AWS load balancer address, add-on timing, or node capacity for Prometheus).

## Before you submit

1. Make the two GHCR packages public (or the cluster cannot pull them): GitHub profile > Packages > `stockpilot-backend` /
   `stockpilot-frontend` > Package settings > Change visibility.
2. `terraform apply`, then `scripts/install-cluster-addons.sh`, then the Helm install (README sections 8 and 9).
3. Take the screenshots listed above while the stack is running.
4. **Run `terraform destroy` (after the Helm uninstalls in the README) so the AWS bill stops.**
5. Never commit AWS keys. Check with `git log -p | grep -i "AKIA"` (should print nothing).
