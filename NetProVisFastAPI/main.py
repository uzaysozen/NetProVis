from datetime import datetime
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from NetProVisFastAPI.models.api_models import *
from NetProVisFastAPI.util import helper_functions
from NetProVisFastAPI.util.helper_functions import *
import os

app = FastAPI()

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


@app.on_event("startup")
async def startup_event():
    if os.name != 'nt':  # Windows
        helper_functions.shell = False
    helper_functions.scheduler.start()


@app.on_event("shutdown")
async def shutdown_event():
    await delete_all_hpas()
    helper_functions.scheduler.shutdown()


@app.post("/login")
async def login():
    # Execute the gcloud command to log in
    login_command = ["gcloud", "auth", "login"]

    try:
        # Run the gcloud auth login command to initiate the login process
        run_command(login_command)
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


@app.post("/logout")
def logout():
    # Execute the gcloud command to revoke all credentials
    gcloud_command = ["gcloud", "auth", "revoke", "--all"]
    try:
        run_command(gcloud_command)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    helper_functions.access_token, helper_functions.cluster, helper_functions.project = None, None, None
    helper_functions.scheduler.remove_job("refresh_tokens")
    return {"message": "Logged out successfully"}


@app.get("/auth_status")
def get_auth_status():
    if helper_functions.access_token and helper_functions.identity_token:
        return {"authenticated": True}
    else:
        return {"authenticated": False}


@app.get("/user_info")
async def user_info():
    # Set the API endpoint and headers
    endpoint = 'https://www.googleapis.com/oauth2/v3/userinfo'
    headers = {"Authorization": f"Bearer {helper_functions.access_token}"}
    user, status_code = await make_request(url=endpoint, headers=headers)
    return user


@app.post("/set_project")
def set_project(p: Project):
    helper_functions.cluster = None
    helper_functions.project = json.loads(p.selected_project)
    return project


@app.post("/set_cluster")
def set_cluster(c: GKECluster):
    cluster = json.loads(c.selected_cluster)
    print(cluster)
    if cluster != {}:
        helper_functions.cluster = cluster
        gcloud_command = ['gcloud', 'container', 'clusters', 'get-credentials', helper_functions.cluster['name'],
                          '--zone', helper_functions.cluster['zone'],
                          '--project', helper_functions.project['projectId']]

        try:
            run_command(gcloud_command)
            create_cnf_namespace()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        return helper_functions.cluster
    else:
        helper_functions.cluster = cluster


@app.get("/projects")
async def get_projects():
    # Set the API endpoint and headers
    endpoint = "https://cloudresourcemanager.googleapis.com/v1/projects"
    headers = {"Authorization": f"Bearer {helper_functions.access_token}"}

    # Make the API request
    response, status_code = await make_request(url=endpoint, headers=headers)

    # Get the list of projects from the response
    projects = response.get("projects", [])
    return projects


@app.get("/clusters")
async def get_clusters():
    if helper_functions.project:
        project_id = helper_functions.project['projectId']
        # Set the API endpoint and headers
        endpoint = f"https://container.googleapis.com/v1beta1/projects/{project_id}/locations/-/clusters"
        headers = {"Authorization": f"Bearer {helper_functions.access_token}"}

        # Make the API request
        response, status_code = await make_request(url=endpoint, headers=headers)

        # Get the list of clusters from the response
        clusters = response.get("clusters", [])
        return clusters
    else:
        return []


@app.get("/get_cluster_cpu")
async def get_cluster_cpu():
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        if project_id and cluster_name:
            query = "fetch k8s_node" + \
                    "| metric 'kubernetes.io/node/cpu/allocatable_utilization'" + \
                    f"| filter (resource.cluster_name == '{cluster_name}')" + \
                    "| within(5m) "

            average_cpu_usage = await get_cluster_resource_usage(project_id, query)
            return average_cpu_usage
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0


@app.get("/get_cluster_memory")
async def get_cluster_memory():
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        if project_id and cluster_name:
            query = "fetch k8s_node" + \
                    "| metric 'kubernetes.io/node/memory/allocatable_utilization'" + \
                    f"| filter (resource.cluster_name == '{cluster_name}')" + \
                    "| within(5m) "
            average_memory_usage = await get_cluster_resource_usage(project_id, query)
            return average_memory_usage
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0


@app.get("/get_resources")
def get_resources():
    if helper_functions.cluster:
        resources = ["deployments", "statefulsets", "daemonsets"]
        all_resources = []

        for resource in resources:
            kubectl_command = ["kubectl", "get", resource, "--output=json", "--namespace=cnf-namespace"]
            try:
                stdout = run_command(kubectl_command)
                resource_data = json.loads(stdout)
                all_resources.extend(resource_data.get("items", []))
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error fetching {resource}: {str(e)}")
        print(all_resources)
        return all_resources
    else:
        return []


@app.post("/activate_hpa")
async def activate_hpa(p: Pod):
    pod = json.loads(p.selected_pod)
    resource_type = p.resource_type
    all_resources = ['cpu', 'memory']

    job_ids = [f"adaptive_hpa_job_for_{pod['metadata']['name']}_{res}" for res in
               (all_resources if resource_type == 'all' else [resource_type])]

    for job_id in job_ids:
        resource = job_id.split('_')[-1]
        if not helper_functions.scheduler.get_job(job_id):
            helper_functions.scheduler.add_job(adaptive_hpa,
                                               'interval', minutes=1,
                                               args=[pod, resource, helper_functions.project, helper_functions.cluster],
                                               id=job_id)
            update_tasks(json.dumps({
                "task": f"{pod['metadata']['name']}: Adaptive HPA for {resource_type.upper()} was activated.",
                "date": get_current_date()
            }))
            await adaptive_hpa(pod, resource, helper_functions.project, helper_functions.cluster)

    print(f"Scheduler activated for pod {pod['metadata']['name']} for {resource_type} resources")

    return {"status": f"Scheduler activated for pod {pod['metadata']['name']} for {resource_type} resources"}


@app.post("/stop_hpa")
async def stop_hpa(p: Pod):
    pod = json.loads(p.selected_pod)
    resource_type = p.resource_type
    pod_name = pod['metadata']['name']
    namespace = pod['metadata']['namespace']
    hpa_endpoint = get_hpa_endpoint(namespace, pod_name)
    headers = get_headers(helper_functions.access_token)
    update_tasks(json.dumps({
        "task": f"{pod['metadata']['name']}: Adaptive HPA for {resource_type.upper()} was deactivated.",
        "date": get_current_date()
    }))

    if resource_type == "all":
        return await handle_all_resources_stop(hpa_endpoint, pod_name, headers)
    else:
        return await handle_specific_resource_stop(hpa_endpoint, pod_name, resource_type, headers)


@app.post("/deploy_cnf")
async def deploy_cnf(c: CNF):
    cnf_name = c.cnf.lower().replace(" ", "-")
    limit_params = json.loads(c.params)
    print(limit_params)
    # file_path = os.path.join("NetProVisFastAPI", "deployments", f"{cnf_name}-deployment.yml")

    # if not os.path.exists(file_path):
    # raise HTTPException(status_code=404, detail=f"Deployment file not found: {file_path}")

    await request_deploy_cnf(cnf_name ,limit_params)


@app.get("/get_tasks")
def get_tasks():
    return helper_functions.tasks


@app.get("/get_past_thresholds")
def get_past_thresholds():
    print(helper_functions.past_thresholds)
    return helper_functions.past_thresholds


@app.post("/get_resource_request_utilization")
async def get_resource_request_utilization(p: Pod):
    pod = json.loads(p.selected_pod)
    resource_type = p.resource_type
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        cluster_zone = helper_functions.cluster['zone']
        try:
            res = await helper_functions.get_resource_request_utilization(project_id, cluster_name, cluster_zone, pod,
                                                                          resource_type)
            return res
        except Exception as e:
            raise HTTPException(status_code=500, detail=e)
    else:
        raise HTTPException(status_code=500, detail="Could not get resource request utilization!")


@app.get("/get_node_network_stats")
async def get_node_network_stats():
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
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


@app.get("/get_node_network_stats_table")
async def get_node_network_stats_table():
    if helper_functions.project and helper_functions.cluster:
        project_id = helper_functions.project['projectId']
        cluster_name = helper_functions.cluster['name']
        result = []
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
                result.extend([create_detailed_network_stats("egress_bytes_count", egress_bytes_count, i),
                               create_detailed_network_stats("egress_packets_count", egress_packets_count, i),
                               create_detailed_network_stats("ingress_bytes_count ", ingress_bytes_count, i),
                               create_detailed_network_stats("ingress_packets_count", ingress_packets_count, i),
                               create_detailed_network_stats("rtt", round_trip_time, i)])
            return result
        else:
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")
    else:
        return 0
