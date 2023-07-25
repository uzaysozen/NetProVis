from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from NetProVisFastAPI.models.api_models import *
from NetProVisFastAPI.util.helper_functions import *
import json

app = FastAPI()
access_token = ""
project = {}
cluster = {}

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
def set_project(p: Project):
    global project
    project = json.loads(p.selected_project)
    return project


@app.post("/set_cluster")
def set_cluster(c: GKECluster):
    global cluster
    cluster = json.loads(c.selected_cluster)
    return cluster


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
    global access_token, project
    # Set the API endpoint and headers
    endpoint = f"https://container.googleapis.com/v1beta1/projects/{project['projectId']}/locations/-/clusters"
    headers = {"Authorization": f"Bearer {access_token}"}

    # Make the API request
    response = requests.get(endpoint, headers=headers)
    response.raise_for_status()  # Raise an exception if the request was unsuccessful

    # Get the list of clusters from the response
    clusters = response.json().get("clusters", [])
    return clusters


@app.post("/get_cluster_cpu")
def get_cluster_cpu():
    global project, access_token
    query = "fetch kubernetes.io/node/cpu/allocatable_utilization  | within (5m)"
    average_cpu_usage = get_cluster_resource_usage(access_token, project['projectId'], query)
    return average_cpu_usage


@app.post("/get_cluster_memory")
def get_cluster_memory():
    global project, access_token
    query = "fetch kubernetes.io/node/memory/allocatable_utilization  | within (5m)"
    average_cpu_usage = get_cluster_resource_usage(access_token, project['projectId'], query)
    return average_cpu_usage
