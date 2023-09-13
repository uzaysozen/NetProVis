from pydantic import BaseModel


class Token(BaseModel):
    value: str


class Project(BaseModel):
    selected_project: str


class GKECluster(BaseModel):
    selected_cluster: str


class Pod(BaseModel):
    selected_pod: str
    resource_type: str


class CNF(BaseModel):
    cnf: str
