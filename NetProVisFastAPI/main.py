from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from NetProVisFastAPI.models.api_models import *
from NetProVisFastAPI.util.helper_functions import *
import json
import subprocess

app = FastAPI()
access_token = None
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


@app.post("/login")
def login():
    global access_token
    access_token = None

    # Execute the gcloud command to log in and get the access token
    login_command = ["gcloud", "auth", "login"]
    gcloud_command = ["gcloud", "auth", "print-access-token"]

    try:
        # Run the gcloud auth login command to initiate the login process
        subprocess.run(login_command, check=True, shell=True)

        # After successful login, get the access token
        process = subprocess.Popen(gcloud_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
        stdout, stderr = process.communicate()

        if process.returncode == 0:  # If the command executed successfully
            # The access token is present in the stdout
            access_token = stdout.strip()
        else:
            error_msg = f"Error executing gcloud command: {stderr.strip()}"
            raise HTTPException(status_code=500, detail=error_msg)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail="Failed to log in with gcloud")

    if not access_token:
        raise HTTPException(status_code=500, detail="Failed to retrieve access token")

    return {"access_token": access_token}


@app.post("/logout")
def logout():
    global access_token

    # Execute the gcloud command to revoke all credentials
    gcloud_command = ["gcloud", "auth", "revoke", "--all"]
    try:
        # Run the gcloud command and capture the output
        process = subprocess.Popen(gcloud_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
        stdout, stderr = process.communicate()

        if process.returncode == 0:  # If the command executed successfully
            access_token = None
            return {"message": "Logged out successfully"}
        else:
            error_msg = f"Error executing gcloud command: {stderr.strip()}"
            raise HTTPException(status_code=500, detail=error_msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth_status")
def get_auth_status():
    if access_token:
        return {"authenticated": True}
    else:
        return {"authenticated": False}


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


@app.get("/get_cluster_cpu")
def get_cluster_cpu():
    global project, access_token
    project_id = project['projectId']
    if project_id:
        query = "fetch kubernetes.io/node/cpu/allocatable_utilization  | within (5m)"
        average_cpu_usage = get_cluster_resource_usage(access_token, project['projectId'], query)
        return average_cpu_usage
    else:
        raise HTTPException(status_code=500, detail="Could not find project id")


@app.get("/get_cluster_memory")
def get_cluster_memory():
    global project, access_token
    project_id = project['projectId']
    if project_id:
        query = "fetch kubernetes.io/node/memory/allocatable_utilization  | within (5m)"
        average_cpu_usage = get_cluster_resource_usage(access_token, project['projectId'], query)
        return average_cpu_usage
    else:
        raise HTTPException(status_code=500, detail="Could not find project id")


@app.get("/get_services")
def get_services():
    services_list = []

    # Execute the kubectl command to get the services
    kubectl_command = ["kubectl", "get", "services", "--output=json"]
    try:
        # Run the kubectl command and capture the output
        process = subprocess.Popen(kubectl_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        stdout, stderr = process.communicate()

        if process.returncode == 0:  # If the command executed successfully
            # Parse the output as JSON
            services_data = json.loads(stdout)
            # Extract the list of services from the parsed JSON
            services_list = services_data.get("items", [])
        else:
            raise HTTPException(status_code=500, detail=stderr)
    except Exception as e:
        raise HTTPException(status_code=500, detail=e)

    return services_list
