from datetime import datetime
from fastapi import FastAPI, HTTPException
from starlette.middleware.cors import CORSMiddleware
from NetProVisFastAPI.models.api_models import *
from NetProVisFastAPI.util import helper_functions
from NetProVisFastAPI.util.helper_functions import *
import os

app = FastAPI()

# Configure Cross-Origin Resource Sharing (CORS) to allow requests from specific origins.
origins = [
    "http://localhost:3000",  # Frontend URL
    "http://localhost:8000",  # Other allowed origins
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Startup event handler
@app.on_event("startup")
async def startup_event():
    # Disable shell execution for non-Windows environments
    if os.name != 'nt':
        helper_functions.shell = False
    helper_functions.scheduler.start()


# Shutdown event handler
@app.on_event("shutdown")
async def shutdown_event():
    # Clean up resources on shutdown
    await delete_all_hpas()
    helper_functions.scheduler.shutdown()


# Login route to authenticate with Google Cloud
@app.post("/login")
async def login():
    # Command to authenticate with Google Cloud
    login_command = ["gcloud", "auth", "login"]

    try:
        # Attempt to authenticate
        run_command(login_command)
        # Schedule token refresh every 30 minutes
        helper_functions.scheduler.add_job(refresh_tokens, trigger='interval', minutes=30, id="refresh_tokens")
        refresh_tokens()
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to log in with gcloud")

    if not helper_functions.access_token or not helper_functions.identity_token:
        raise HTTPException(status_code=500, detail="Failed to retrieve tokens")

    return {
        "access_token": helper_functions.access_token,
        "identity_token": helper_functions.identity_token
    }


# Logout route to revoke Google Cloud credentials
@app.post("/logout")
def logout():
    # Command to revoke all Google Cloud credentials
    gcloud_command = ["gcloud", "auth", "revoke", "--all"]
    try:
        run_command(gcloud_command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Reset stored tokens and project/cluster information
    helper_functions.access_token, helper_functions.cluster, helper_functions.project = None, None, None
    helper_functions.scheduler.remove_job("refresh_tokens")
    return {"message": "Logged out successfully"}


# Route to check authentication status
@app.get("/auth_status")
def get_auth_status():
    # Check if access and identity tokens are available
    if helper_functions.access_token and helper_functions.identity_token:
        return {"authenticated": True}
    else:
        return {"authenticated": False}


# Route to retrieve user information from Google Cloud
@app.get("/user_info")
async def user_info():
    # Endpoint and headers for user info request
    endpoint = 'https://www.googleapis.com/oauth2/v3/userinfo'
    headers = {"Authorization": f"Bearer {helper_functions.access_token}"}
    user, status_code = await make_request(url=endpoint, headers=headers)
    return user


# Route to set the Google Cloud project
@app.post("/set_project")
def set_project(p: Project):
    # Reset cluster selection when changing projects
    helper_functions.cluster = None
    # Store the selected project information
    helper_functions.project = json.loads(p.selected_project)
    return project


# Route to set the Google Kubernetes Engine (GKE) cluster
@app.post("/set_cluster")
def set_cluster(c: GKECluster):
    cluster = json.loads(c.selected_cluster)
    # Set cluster information if a cluster is selected
    if cluster != {}:
        helper_functions.cluster = cluster
        gcloud_command = ['gcloud', 'container', 'clusters', 'get-credentials', helper_functions.cluster['name'],
                          '--zone', helper_functions.cluster['zone'],
                          '--project', helper_functions.project['projectId']]
        try:
            # Authenticate with the selected GKE cluster
            run_command(gcloud_command)
            create_cnf_namespace()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        return helper_functions.cluster
    else:
        # Reset cluster selection if no cluster is selected
        helper_functions.cluster = cluster


# Route to retrieve the list of projects
@app.get("/projects")
async def get_projects():
    # Set the API endpoint and headers for fetching Google Cloud projects
    endpoint = "https://cloudresourcemanager.googleapis.com/v1/projects"
    headers = {"Authorization": f"Bearer {helper_functions.access_token}"}

    # Make the API request to retrieve projects
    response, status_code = await make_request(url=endpoint, headers=headers)

    # Extract and return the list of projects from the response
    projects = response.get("projects", [])
    return projects


# Route to retrieve the list of GKE clusters
@app.get("/clusters")
async def get_clusters():
    if helper_functions.project:
        project_id = helper_functions.project['projectId']
        # Set the API endpoint and headers for fetching clusters
        endpoint = f"https://container.googleapis.com/v1beta1/projects/{project_id}/locations/-/clusters"
        headers = {"Authorization": f"Bearer {helper_functions.access_token}"}

        # Make the API request to retrieve clusters
        response, status_code = await make_request(url=endpoint, headers=headers)

        # Extract and return the list of clusters from the response
        clusters = response.get("clusters", [])
        return clusters
    else:
        return []


# Route to get CPU utilization of the selected GKE cluster
@app.get("/get_cluster_cpu")
async def get_cluster_cpu():
    # Verify that project and cluster are selected
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        # Only proceed if project ID and cluster name are available
        if project_id and cluster_name:
            # Query for CPU utilization metric
            query = "fetch k8s_node" + \
                    "| metric 'kubernetes.io/node/cpu/allocatable_utilization'" + \
                    f"| filter (resource.cluster_name == '{cluster_name}')" + \
                    "| within(5m) "
            # Retrieve and return the average CPU usage
            average_cpu_usage = await get_cluster_resource_usage(project_id, query)
            return average_cpu_usage
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0


# Route to get memory utilization of the selected GKE cluster
@app.get("/get_cluster_memory")
async def get_cluster_memory():
    # Ensure that project and cluster information are available
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        # Proceed only if project ID and cluster name are present
        if project_id and cluster_name:
            # Query for memory utilization metric
            query = "fetch k8s_node" + \
                    "| metric 'kubernetes.io/node/memory/allocatable_utilization'" + \
                    f"| filter (resource.cluster_name == '{cluster_name}')" + \
                    "| within(5m) "
            # Retrieve and return the average memory usage
            average_memory_usage = await get_cluster_resource_usage(project_id, query)
            return average_memory_usage
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0


# Route to retrieve information about resources in the cluster
@app.get("/get_resources")
def get_resources():
    # Ensure that a cluster is selected
    if helper_functions.cluster:
        resources = ["deployments", "statefulsets", "daemonsets"]
        all_resources = []

        # Gather information for each resource type
        for resource in resources:
            kubectl_command = ["kubectl", "get", resource, "--output=json", "--namespace=cnf-namespace"]
            try:
                stdout = run_command(kubectl_command)
                resource_data = json.loads(stdout)
                all_resources.extend(resource_data.get("items", []))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error fetching {resource}: {str(e)}")
        # Store and return all collected resource data
        helper_functions.resources = all_resources
        return all_resources
    else:
        # Return empty list if no cluster is selected
        helper_functions.resources = []
        return []


# Route to activate Horizontal Pod Autoscaling (HPA) for a specific pod
@app.post("/activate_hpa")
async def activate_hpa(p: Pod):
    pod = json.loads(p.selected_pod)
    resource_type = p.resource_type
    all_resources = ['cpu', 'memory']

    # Generate job IDs for scheduling adaptive HPA tasks
    job_ids = [f"adaptive_hpa_job_for_{pod['metadata']['name']}_{res}" for res in
               (all_resources if resource_type == 'all' else [resource_type])]

    # Schedule adaptive HPA tasks
    for job_id in job_ids:
        resource = job_id.split('_')[-1]
        if not helper_functions.scheduler.get_job(job_id):
            helper_functions.scheduler.add_job(adaptive_hpa,
                                               'interval', minutes=1,
                                               args=[pod, resource, helper_functions.project, helper_functions.cluster],
                                               id=job_id)
            # Log task activation
            update_tasks(json.dumps({
                "task": f"{pod['metadata']['name']}: Adaptive HPA for {resource_type.upper()} was activated.",
                "date": get_current_date()
            }))
            # Initialize adaptive HPA for the selected pod
            await adaptive_hpa(pod, resource, helper_functions.project, helper_functions.cluster)

    return {"status": f"Scheduler activated for pod {pod['metadata']['name']} for {resource_type} resources"}


# Route to stop HPA for a specific pod
@app.post("/stop_hpa")
async def stop_hpa(p: Pod):
    pod = json.loads(p.selected_pod)
    resource_type = p.resource_type
    pod_name = pod['metadata']['name']
    namespace = pod['metadata']['namespace']
    hpa_endpoint = get_hpa_endpoint(namespace, pod_name)
    headers = get_headers(helper_functions.access_token)

    # Log task deactivation
    update_tasks(json.dumps({
        "task": f"{pod['metadata']['name']}: Adaptive HPA for {resource_type.upper()} was deactivated.",
        "date": get_current_date()
    }))

    # Handle stopping of HPA based on the resource type
    if resource_type == "all":
        return await handle_all_resources_stop(hpa_endpoint, pod_name, headers)
    else:
        return await handle_specific_resource_stop(hpa_endpoint, pod_name, resource_type, headers)


# Route to deploy a CNF (Cloud-Native Function)
@app.post("/deploy_cnf")
async def deploy_cnf(c: CNF):
    cnf_name = c.cnf.lower().replace(" ", "-")
    limit_params = json.loads(c.params)
    # Request deployment of the CNF with specified parameters
    await request_deploy_cnf(cnf_name, limit_params)


# Route to retrieve a list of tasks performed by the application
@app.get("/get_tasks")
def get_tasks():
    return helper_functions.tasks


# Route to retrieve past threshold data
@app.get("/get_past_thresholds")
def get_past_thresholds():
    return helper_functions.past_thresholds


# Route to get resource request utilization for a specific pod
@app.post("/get_resource_request_utilization")
async def get_resource_request_utilization(p: Pod):
    pod = json.loads(p.selected_pod)
    resource_type = p.resource_type
    # Ensure that project and cluster are selected
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        cluster_zone = helper_functions.cluster['zone']
        try:
            # Retrieve and return resource request utilization for the specified pod and resource type
            res = await helper_functions.get_resource_request_utilization(project_id, cluster_name, cluster_zone, pod,
                                                                          resource_type)
            return res
        except Exception as e:
            raise HTTPException(status_code=500, detail=e)
    else:
        raise HTTPException(status_code=500, detail="Could not get resource request utilization!")


# Route to get network statistics for nodes in the cluster
@app.get("/get_node_network_stats")
async def get_node_network_stats():
    # Ensure that project and cluster are selected
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        # Retrieve and return network statistics if project ID and cluster name are available
        if project_id and cluster_name:
            egress_bytes_count = await get_network_stats_ingress_egress(project_id, cluster_name, "egress_bytes_count",
                                                                        1)
            egress_packets_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                          "egress_packets_count", 1)
            ingress_bytes_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                         "ingress_bytes_count", 1)
            ingress_packets_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                           "ingress_packets_count", 1)
            round_trip_time = await get_network_stats_ingress_egress(project_id, cluster_name, "rtt", 1)
            return (
                egress_bytes_count, egress_packets_count, ingress_bytes_count, ingress_packets_count, round_trip_time)
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0


# Route to get detailed network statistics in a tabular format
@app.get("/get_node_network_stats_table")
async def get_node_network_stats_table():
    # Ensure that project and cluster are selected
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        result = []
        # Retrieve network statistics for different time frames
        if project_id and cluster_name:
            for i in range(1, 6):
                egress_bytes_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                            "egress_bytes_count", i)
                egress_packets_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                              "egress_packets_count", i)
                ingress_bytes_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                             "ingress_bytes_count", i)
                ingress_packets_count = await get_network_stats_ingress_egress(project_id, cluster_name,
                                                                               "ingress_packets_count", i)
                round_trip_time = await get_network_stats_ingress_egress(project_id, cluster_name, "rtt", i)
                # Append detailed statistics to the result
                result.extend([
                    create_detailed_network_stats("egress_bytes_count", egress_bytes_count, i),
                    create_detailed_network_stats("egress_packets_count", egress_packets_count, i),
                    create_detailed_network_stats("ingress_bytes_count", ingress_bytes_count, i),
                    create_detailed_network_stats("ingress_packets_count", ingress_packets_count, i),
                    create_detailed_network_stats("rtt", round_trip_time, i)])
            return result
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0


# Route to retrieve report details including project, cluster, tasks, thresholds, and workloads
@app.get("/get_report_details")
def get_report_details():
    result = {
        "project": helper_functions.project,
        "cluster": helper_functions.cluster,
        "tasks": helper_functions.tasks,
        "past_thresholds": helper_functions.past_thresholds,
        "workloads": helper_functions.resources
    }
    return result
