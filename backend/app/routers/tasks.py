from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task
from app.schemas import Status, TaskCreate, TaskOut, TaskStats, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _get_or_404(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status_filter: Status | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    query = select(Task).order_by(Task.id.desc())
    if status_filter is not None:
        query = query.where(Task.status == status_filter)
    return db.scalars(query).all()


# declared before "/{task_id}" so "stats" is not parsed as a task id
@router.get("/stats", response_model=TaskStats)
def task_stats(db: Session = Depends(get_db)):
    counts = dict(db.execute(select(Task.status, func.count()).group_by(Task.status)).all())
    high_priority = db.scalar(
        select(func.count()).select_from(Task).where(Task.priority == "high", Task.status != "done")
    )
    return TaskStats(
        total=sum(counts.values()),
        todo=counts.get("todo", 0),
        in_progress=counts.get("in_progress", 0),
        done=counts.get("done", 0),
        high_priority=high_priority or 0,
    )


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, task_id)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskOut)
def update_task(task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = _get_or_404(db, task_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        # only assignee may be cleared; null for a required column is ignored
        if value is None and field != "assignee":
            continue
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = _get_or_404(db, task_id)
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
