from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from NetProVisFastAPI.models.api_models import *
from NetProVisFastAPI.util.helper_functions import *
import json
import subprocess
import httpx
from asyncio import get_event_loop, new_event_loop, set_event_loop
from apscheduler.schedulers.background import BackgroundScheduler

app = FastAPI()
access_token = None
identity_token = None
project = {}
cluster = {}
scheduler = BackgroundScheduler()
scheduler.start()

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


@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()


@app.post("/login")
def login():
    global access_token, identity_token
    # Execute the gcloud command to log in and get the tokens
    login_command = ["gcloud", "auth", "login"]
    token_commands = {
        "access_token": ["gcloud", "auth", "print-access-token"],
        "identity_token": ["gcloud", "auth", "print-identity-token"]
    }

    tokens = {}

    try:
        # Run the gcloud auth login command to initiate the login process
        subprocess.run(login_command, check=True, shell=True)

        for token_name, command in token_commands.items():
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, shell=True)
            stdout, stderr = process.communicate()

            if process.returncode == 0:
                tokens[token_name] = stdout.strip()
            else:
                raise HTTPException(status_code=500, detail=f"Error executing {command}: {stderr.strip()}")

    except subprocess.CalledProcessError:
        raise HTTPException(status_code=500, detail="Failed to log in with gcloud")

    if "access_token" in tokens:
        access_token = tokens["access_token"]
    if "identity_token" in tokens:
        identity_token = tokens["identity_token"]

    if not access_token or not identity_token:
        raise HTTPException(status_code=500, detail="Failed to retrieve tokens")

    return tokens


@app.post("/logout")
def logout():
    global access_token, cluster, project

    # Execute the gcloud command to revoke all credentials
    gcloud_command = ["gcloud", "auth", "revoke", "--all"]
    try:
        # Run the gcloud command and capture the output
        process = subprocess.Popen(gcloud_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                                   shell=True)
        stdout, stderr = process.communicate()

        if process.returncode == 0:  # If the command executed successfully
            access_token, cluster, project = None, None, None
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
    global project, cluster
    cluster = None
    project = json.loads(p.selected_project)
    return project


@app.post("/set_cluster")
def set_cluster(c: GKECluster):
    global cluster, project
    cluster = json.loads(c.selected_cluster)
    gcloud_command = ['gcloud', 'container', 'clusters', 'get-credentials', cluster['name'],
                      '--zone', cluster['zone'],
                      '--project', project['projectId']]

    try:
        # Run the gcloud command and capture the output
        result = subprocess.run(gcloud_command, capture_output=True, text=True, check=True, shell=True)

        # Check if the command executed successfully
        if result.returncode == 0:
            return cluster
        else:
            raise HTTPException(status_code=500, detail="Failed to set cluster")
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=str(e))


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
    global project, access_token, cluster
    project_id = project['projectId']
    cluster_name = cluster['name']
    if project_id and cluster_name:
        query = "fetch k8s_node" + \
                "| metric 'kubernetes.io/node/cpu/allocatable_utilization'" + \
                f"| filter (resource.cluster_name == '{cluster_name}')" + \
                "| within(5m) "

        average_cpu_usage = get_cluster_resource_usage(access_token, project['projectId'], query)
        return average_cpu_usage
    else:
        raise HTTPException(status_code=500, detail="Could not find project id or cluster name")


@app.get("/get_cluster_memory")
def get_cluster_memory():
    global project, access_token, cluster
    project_id = project['projectId']
    cluster_name = cluster['name']
    if project_id and cluster_name:
        query = "fetch k8s_node" + \
                "| metric 'kubernetes.io/node/memory/allocatable_utilization'" + \
                f"| filter (resource.cluster_name == '{cluster_name}')" + \
                "| within(5m) "
        average_memory_usage = get_cluster_resource_usage(access_token, project['projectId'], query)
        return average_memory_usage
    else:
        raise HTTPException(status_code=500, detail="Could not find project id or cluster name")


@app.get("/get_apps")
def get_apps():
    # Execute the kubectl command to get the services
    kubectl_command = ["kubectl", "get", "deployments", "--output=json"]
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


@app.post("/activate_hpa")
def activate_hpa(p: Pod):
    pod = json.loads(p.selected_pod)
    # Create a unique job ID based on the pod's name
    job_id = f"adaptive_hpa_job_for_{pod['metadata']['name']}"

    # Check if job already exists to avoid adding multiple jobs
    if not scheduler.get_job(job_id):
        scheduler.add_job(run_adaptive_hpa_sync, 'interval', minutes=1, args=[pod], id=job_id)
        return {"status": f"Scheduler activated for pod {pod['metadata']['name']}"}
    else:
        return {"status": f"Scheduler already running for pod {pod['metadata']['name']}"}


@app.post("/stop_hpa")
def stop_hpa(p: Pod):
    pod = json.loads(p.selected_pod)
    # Create a unique job ID based on the pod's name
    job_id = f"adaptive_hpa_job_for_{pod['metadata']['name']}"

    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        return {"status": f"Job for pod {pod['metadata']['name']} stopped"}
    else:
        return {"status": f"Job for pod {pod['metadata']['name']} not found"}


def run_adaptive_hpa_sync(pod):
    loop = new_event_loop()
    set_event_loop(loop)
    loop.run_until_complete(adaptive_hpa(pod))
    loop.close()


async def adaptive_hpa(pod):
    global project, access_token, cluster, identity_token

    project_id, cluster_name, pod_type, pod_name, cluster_zone = (
        project['projectId'],
        cluster['name'],
        pod['kind'],
        pod['metadata']['name'],
        cluster['zone']
    )

    if project_id and cluster_name:
        query = (f"fetch k8s_container | metric 'kubernetes.io/container/cpu/limit_utilization' | filter "
                 f"resource.project_id == '{project_id}' && "
                 f"(metadata.system_labels.top_level_controller_name == '{pod_name}' && "
                 f"metadata.system_labels.top_level_controller_type == '{pod_type}') && "
                 f"(resource.cluster_name == '{cluster_name}' && resource.location == '{cluster_zone}' && "
                 f"resource.namespace_name == 'default') | group_by 1m, [value_limit_utilization_mean: mean("
                 f"value.limit_utilization)] | every 5m | group_by [resource.pod_name], "
                 f"[value_limit_utilization_mean_percentile: percentile(value_limit_utilization_mean, 50)] | within(10h)")

        resource_limit_utilization = get_resource_time_series_data(access_token, project['projectId'], query)

        endpoint = "https://europe-west3-netprovis-397212.cloudfunctions.net/forecast-resources"
        headers = {
            "Authorization": f"Bearer {identity_token}",
            "Content-Type": "application/json"
        }
        payload = json.dumps(resource_limit_utilization)

        # Make the HTTP POST request
        try:
            # Use httpx for async request
            async with httpx.AsyncClient() as client:
                response = await client.post(endpoint, data=payload, headers=headers, timeout=310)
            response.raise_for_status()  # Check if the request was successful
        except httpx.HTTPError as err:  # Notice the change here from requests to httpx
            error_msg = f"Error when calling the forecast-resources endpoint: {err}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg) from err

        print(response.json())
        return response.json()  # Return the JSON response
    else:
        raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
