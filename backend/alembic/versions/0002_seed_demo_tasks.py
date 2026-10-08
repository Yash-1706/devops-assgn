"""seed demo tasks

Gives a fresh environment a few rows so the dashboard is not empty during demos.
Only inserts when the table has no rows yet.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-08 19:35:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

DEMO_TASKS = [
    {"title": "Set up GitHub Actions pipeline", "description": "Run pytest, build images, push to GHCR.", "status": "done", "priority": "high", "assignee": "Asha"},
    {"title": "Scan images with Trivy", "description": "Fail the build on HIGH/CRITICAL findings.", "status": "in_progress", "priority": "high", "assignee": "Ravi"},
    {"title": "Provision EKS with Terraform", "description": "VPC, subnets, NAT gateway and a managed node group.", "status": "in_progress", "priority": "medium", "assignee": "Meera"},
    {"title": "Add Grafana dashboard", "description": "Request rate, latency and error rate panels.", "status": "todo", "priority": "medium", "assignee": "Asha"},
    {"title": "Tune HPA thresholds", "description": "Scale the backend on CPU utilisation.", "status": "todo", "priority": "low", "assignee": None},
]


def upgrade() -> None:
    tasks = sa.table(
        "tasks",
        sa.column("title", sa.String),
        sa.column("description", sa.Text),
        sa.column("status", sa.String),
        sa.column("priority", sa.String),
        sa.column("assignee", sa.String),
    )
    existing = op.get_bind().execute(sa.select(sa.func.count()).select_from(tasks)).scalar()
    if not existing:
        op.bulk_insert(tasks, DEMO_TASKS)


def downgrade() -> None:
    titles = [task["title"] for task in DEMO_TASKS]
    tasks = sa.table("tasks", sa.column("title", sa.String))
    op.execute(tasks.delete().where(tasks.c.title.in_(titles)))
