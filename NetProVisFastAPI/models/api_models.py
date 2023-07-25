from pydantic import BaseModel


class Token(BaseModel):
    value: str


class Project(BaseModel):
    selected_project: str


class GKECluster(BaseModel):
    selected_cluster: str
