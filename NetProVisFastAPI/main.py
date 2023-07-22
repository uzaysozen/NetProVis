from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI()
access_token = ""
project_id = ""
cluster_name = ""

# Configure CORS
origins = [
    "http://localhost:3000",  # Add your frontend URL here
    "http://localhost:8000",  # Add other allowed origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Token(BaseModel):
    value: str


class Project(BaseModel):
    id: str


class GKECluster(BaseModel):
    name: str


@app.post("/authenticate")
def authenticate(token: Token):
    global access_token
    access_token = token.value
    return "Access token: " + str(access_token)


@app.get("/user_info")
def user_info():
    global access_token
    # Set the API endpoint and headers
    endpoint = 'https://www.googleapis.com/oauth2/v3/userinfo'
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(endpoint, headers=headers)
    response.raise_for_status()  # Raise an exception if the request was unsuccessful

    user = response.json()
    return user


@app.post("/set_project")
def set_project(project: Project):
    global project_id
    project_id = project.id
    return "Project id: " + str(project_id)


@app.post("/set_cluster")
def set_cluster(cluster: GKECluster):
    global cluster_name
    cluster_name = cluster.name
    return "Cluster name: " + str(cluster_name)


@app.get("/projects")
def get_projects():
    global access_token
    # Set the API endpoint and headers
    endpoint = "https://cloudresourcemanager.googleapis.com/v1/projects"
    headers = {"Authorization": f"Bearer {access_token}"}

    # Make the API request
    response = requests.get(endpoint, headers=headers)
    response.raise_for_status()  # Raise an exception if the request was unsuccessful

    # Get the list of projects from the response
    projects = response.json().get("projects", [])

    # Process the projects
    # Do something with the projects

    return projects


@app.get("/clusters")
def get_clusters():
    global access_token, project_id
    # Set the API endpoint and headers
    endpoint = f"https://container.googleapis.com/v1beta1/projects/{str(project_id)}/locations/-/clusters"
    headers = {"Authorization": f"Bearer {access_token}"}

    # Replace {project_id} with your GCP project ID
    endpoint = endpoint.format(project_id=project_id)

    # Make the API request
    response = requests.get(endpoint, headers=headers)
    response.raise_for_status()  # Raise an exception if the request was unsuccessful

    # Get the list of clusters from the response
    clusters = response.json().get("clusters", [])

    # Process the clusters
    # Do something with the clusters

    return clusters
