from datetime import datetime, timedelta
import copy
import httpx
import json
import subprocess
from fastapi import HTTPException
from NetProVisFastAPI.k8s_templates import HPA_TEMPLATE
from apscheduler.schedulers.asyncio import AsyncIOScheduler

# Initialize global variables and scheduler
scheduler = AsyncIOScheduler()
access_token = None
identity_token = None
shell = True  # Determines if commands should be run in a shell environment
project = {}
cluster = {}
tasks = []  # List to store tasks performed by the application
resources = {}
past_thresholds = {}

async def make_request_for_time_series(project_id, query):
    """
    Asynchronously makes a request to the time series API.

    Args:
    project_id (str): The Google Cloud project ID.
    query (str): The query string for the time series API.

    Returns:
    dict: The response from the time series API.
    """
    endpoint = f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries:query"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"query": query}

    response, status_code = await make_request(endpoint, method="post", data=payload, headers=headers)
    return response

async def get_cluster_resource_usage(project_id, query):
    """
    Retrieves the average resource usage of a cluster.

    Args:
    project_id (str): The Google Cloud project ID.
    query (str): The query string to retrieve resource usage.

    Returns:
    float: The average resource usage as a percentage.
    """
    data = await make_request_for_time_series(project_id, query)
    res_usage_values = []
    for time_series in data.get("timeSeriesData", []):
        res_usage_series = [point_data.get("values", [{}])[0].get("doubleValue", 0.0)
                            for point_data in time_series.get("pointData", [])]
        res_usage_values.append(sum(res_usage_series) / len(res_usage_series) if res_usage_series else 0)
    return (sum(res_usage_values) / len(res_usage_values)) * 100 if res_usage_values else 0

async def get_resource_time_series_data(project_id, query, resource_type):
    """
    Retrieves time series data for a specific resource.

    Args:
    project_id (str): The Google Cloud project ID.
    query (str): The query string to retrieve time series data.
    resource_type (str): The type of resource (e.g., 'cpu', 'memory').

    Returns:
    list: A list of dictionaries containing time series data.
    """
    data = await make_request_for_time_series(project_id, query)
    result = []
    for series in data.get("timeSeriesData", []):
        for point in series.get("pointData", []):
            timestamp = point.get("timeInterval", {}).get("endTime", "").replace('Z', '+00:00')
            timestamp_dt = datetime.fromisoformat(timestamp).strftime("%B %d, %Y, %I:%M:%S %p")
            res_usage = point.get("values", [{}])[0].get("doubleValue", 0.0) * 100  # Convert to percentage
            result.append({
                "timestamp": timestamp_dt,
                f"{resource_type}_usage": res_usage
            })
    return result

def get_hpa_endpoint(namespace, pod_name):
    """
    Constructs the endpoint URL for Horizontal Pod Autoscaler (HPA).

    Args:
    namespace (str): The Kubernetes namespace.
    pod_name (str): The name of the pod.

    Returns:
    str: The HPA endpoint URL.
    """
    cluster_endpoint = cluster.get('privateClusterConfig', {}).get('publicEndpoint', '')
    return f"https://{cluster_endpoint}/apis/autoscaling/v2/namespaces/{namespace}/horizontalpodautoscalers/adaptive-hpa-for-{pod_name}"

async def get_existing_hpa(hpa_endpoint, headers):
    """
    Retrieves an existing HPA configuration.

    Args:
    hpa_endpoint (str): The endpoint to fetch HPA.
    headers (dict): Headers for the HTTP request.

    Returns:
    dict: The existing HPA configuration.
    """
    existing_hpa, status_code = await make_request(hpa_endpoint, method="get", headers=headers)
    return existing_hpa

def get_job_id(pod_name, res_type):
    """
    Generates a job ID for a pod and resource type.

    Args:
    pod_name (str): The name of the pod.
    res_type (str): The resource type (e.g., 'cpu', 'memory').

    Returns:
    str: The generated job ID.
    """
    return f"adaptive_hpa_job_for_{pod_name}_{res_type}"

def get_headers(token):
    """
    Generates headers for an HTTP request using a token.

    Args:
    token (str): The token to be used in the Authorization header.

    Returns:
    dict: Headers for the HTTP request.
    """
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def remove_scheduler_job(job_id):
    """
    Removes a job from the scheduler.

    Args:
    job_id (str): The ID of the job to remove.

    Returns:
    bool: True if the job was removed, False otherwise.
    """
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        return True
    return False

async def handle_all_resources_stop(hpa_endpoint, pod_name, headers):
    """
    Handles stopping of HPA for all resources of a pod.

    Args:
    hpa_endpoint (str): The HPA endpoint.
    pod_name (str): The name of the pod.
    headers (dict): Headers for the HTTP request.

    Returns:
    dict: Status message of the operation.
    """
    cpu_removed = remove_scheduler_job(get_job_id(pod_name, "cpu"))
    mem_removed = remove_scheduler_job(get_job_id(pod_name, "memory"))

    if cpu_removed and mem_removed:
        await make_request(hpa_endpoint, method="delete", headers=headers)
        return {"status": f"Job for pod {pod_name} for all resources stopped"}
    else:
        return {"status": f"Job for pod {pod_name} for all resources not found"}

async def handle_specific_resource_stop(hpa_endpoint, pod_name, resource_type, headers):
    """
    Handles stopping of HPA for a specific resource of a pod.

    Args:
    hpa_endpoint (str): The HPA endpoint.
    pod_name (str): The name of the pod.
    resource_type (str): The resource type (e.g., 'cpu', 'memory').
    headers (dict): Headers for the HTTP request.

    Returns:
    dict: Status message of the operation.
    """
    if remove_scheduler_job(get_job_id(pod_name, resource_type)):
        await make_request(hpa_endpoint, method="delete", headers=headers)
        return {"status": f"Job for pod {pod_name} for {resource_type} stopped"}
    else:
        return {"status": f"Job for pod {pod_name} for {resource_type} not found"}

async def update_hpa_metrics(existing_hpa, resource_type, hpa_endpoint, headers):
    """
    Updates the metrics of an existing HPA configuration.

    Args:
    existing_hpa (dict): The existing HPA configuration.
    resource_type (str): The resource type to update (e.g., 'cpu', 'memory').
    hpa_endpoint (str): The endpoint to update HPA.
    headers (dict): Headers for the HTTP request.

    Returns:
    None
    """
    existing_hpa['spec']['metrics'] = [metric for metric in existing_hpa['spec']['metrics']
                                       if metric['resource']['name'] != resource_type]
    await make_request(hpa_endpoint, method="put", data=existing_hpa, headers=headers)

async def delete_all_hpas():
    """
    Deletes all HPAs in the current cluster.

    Returns:
    dict: Status message of the operation.
    """
    if cluster:
        cluster_endpoint = cluster.get('privateClusterConfig', {}).get('publicEndpoint', '')
        namespace_endpoint = f"https://{cluster_endpoint}/api/v1/namespaces"

        headers = get_headers(access_token)

        all_namespaces = await get_all_namespaces(namespace_endpoint, headers)

        deleted_hpas_count = 0

        for ns in all_namespaces:
            namespace_name = ns.get('metadata', {}).get('name', '')
            deleted_hpas_count += await delete_hpas_in_namespace(namespace_name, cluster_endpoint, headers)

        return {"status": f"Deleted {deleted_hpas_count} HPAs across all namespaces."}
    else:
        return {"status": "Cluster is not available."}

async def get_all_namespaces(endpoint, headers):
    """
    Retrieves all namespaces from the cluster.

    Args:
    endpoint (str): The endpoint to fetch namespaces.
    headers (dict): Headers for the HTTP request.

    Returns:
    list: A list of all namespaces.
    """
    response, status_code = await make_request(endpoint, headers=headers)
    return response.get('items', [])

async def delete_hpas_in_namespace(namespace_name, cluster_endpoint, headers):
    """
    Deletes all HPAs in a specific namespace.

    Args:
    namespace_name (str): The name of the namespace.
    cluster_endpoint (str): The cluster endpoint.
    headers (dict): Headers for the HTTP request.

    Returns:
    int: The count of deleted HPAs.
    """
    hpa_endpoint = f"https://{cluster_endpoint}/apis/autoscaling/v2/namespaces/{namespace_name}/horizontalpodautoscalers"
    all_hpas = await get_all_hpas_in_namespace(hpa_endpoint, headers)

    deleted_count = 0
    for hpa in all_hpas:
        hpa_name = hpa.get('metadata', {}).get('name', '')
        await delete_individual_hpa(hpa_endpoint, hpa_name, headers)
        deleted_count += 1

        remove_scheduler_job(get_job_id(hpa_name, "cpu"))
        remove_scheduler_job(get_job_id(hpa_name, "memory"))

    return deleted_count

async def get_all_hpas_in_namespace(hpa_endpoint, headers):
    """
    Retrieves all HPAs in a specific namespace.

    Args:
    hpa_endpoint (str): The endpoint to fetch HPAs.
    headers (dict): Headers for the HTTP request.

    Returns:
    list: A list of all HPAs in the namespace.
    """
    response, status_code = await make_request(hpa_endpoint, headers=headers)
    return response.get('items', [])

async def delete_individual_hpa(hpa_endpoint, hpa_name, headers):
    """
    Deletes an individual HPA.

    Args:
    hpa_endpoint (str): The endpoint to delete HPA.
    hpa_name (str): The name of the HPA to delete.
    headers (dict): Headers for the HTTP request.

    Returns:
    None
    """
    delete_endpoint = f"{hpa_endpoint}/{hpa_name}"
    await make_request(delete_endpoint, method="delete", headers=headers)

def get_current_date():
    """
    Returns the current date and time in a formatted string.

    Returns:
    str: The current date and time.
    """
    current_datetime = datetime.now()
    return current_datetime.strftime("%B %d, %Y, %I:%M:%S %p")

async def get_resource_request_utilization(project_id, cluster_name, cluster_zone, pod, resource_type):
    """
    Retrieves resource request utilization for a specific pod.

    Args:
    project_id (str): The Google Cloud project ID.
    cluster_name (str): The name of the GKE cluster.
    cluster_zone (str): The zone of the GKE cluster.
    pod (dict): The pod for which to retrieve resource utilization.
    resource_type (str): The resource type (e.g., 'cpu', 'memory').

    Returns:
    list: A list of dictionaries containing resource request utilization data.
    """
    query = build_request_utilization_query(project_id, cluster_name, cluster_zone, pod, resource_type)
    resource_request_utilization = await get_resource_time_series_data(project_id, query, resource_type)
    return resource_request_utilization


async def adaptive_hpa(pod, resource_type, pod_project, pod_cluster):
    """
    Performs adaptive Horizontal Pod Autoscaling based on resource utilization.

    Args:
    pod (dict): The pod information.
    resource_type (str): The resource type for autoscaling ('cpu' or 'memory').
    pod_project (dict): Project information.
    pod_cluster (dict): Cluster information.

    Returns:
    dict: The response from creating or updating the HPA.
    """
    pod_name = ""
    try:
        project_id = pod_project.get('projectId', '')
        cluster_name = pod_cluster.get('name', '')
        cluster_zone = pod_cluster.get('zone', '')
        pod_name = pod.get('metadata', {}).get('name', '')

        if not project_id or not cluster_name:
            raise HTTPException(status_code=500, detail="Project id or cluster name not found")

        resource_request_utilization = await get_resource_request_utilization(project_id, cluster_name, cluster_zone, pod, resource_type)
        threshold_value = await fetch_forecast_threshold(resource_request_utilization)

        # Prepare and send request to create or update the HPA
        cluster_endpoint = pod_cluster.get('privateClusterConfig', {}).get('publicEndpoint', '')
        res = await create_hpa(cluster_endpoint, "cnf-namespace", pod_name, pod.get('kind', ''), threshold_value, resource_type)

        # Log task and update threshold history
        task = f"{pod_name}: HPA threshold for {resource_type.upper()} set to {threshold_value}%"
        update_tasks(json.dumps({"task": task, "date": get_current_date()}))
        past_thresholds.setdefault(pod_name, {}).setdefault(resource_type, {}).setdefault("thresholdValues", []).append({get_current_date(): threshold_value})
        past_thresholds[pod_name][resource_type].setdefault("values", []).append({get_current_date(): resource_request_utilization[0][resource_type + "_usage"]})

        # Limit the size of past_thresholds dictionary
        if len(past_thresholds[pod_name][resource_type]["thresholdValues"]) > 100:
            past_thresholds[pod_name][resource_type]["thresholdValues"].pop(0)
            past_thresholds[pod_name][resource_type]["values"].pop(0)

        return res
    except Exception as e:
        job_id = f"adaptive_hpa_job_for_{pod['metadata'].get('name', '')}_{resource_type}"
        scheduler.remove_job(job_id)
        update_tasks(json.dumps({"task": f"{pod_name}: Error in Adaptive HPA activation. Deactivated.", "date": get_current_date()}))
        raise HTTPException(status_code=500, detail="An error occurred in adaptive HPA.")

def build_request_utilization_query(project_id, cluster_name, cluster_zone, pod, resource_type):
    """
    Builds a query to fetch resource request utilization data.

    Args:
    project_id (str): The Google Cloud project ID.
    cluster_name (str): The name of the GKE cluster.
    cluster_zone (str): The zone of the GKE cluster.
    pod (dict): The pod information.
    resource_type (str): The resource type (e.g., 'cpu', 'memory').

    Returns:
    str: The constructed query string.
    """
    pod_name, pod_type, pod_namespace = pod['metadata'].get('name', ''), pod.get('kind', ''), pod['metadata'].get('namespace', '')
    query = (f"fetch k8s_container | metric 'kubernetes.io/container/{resource_type}/request_utilization' | filter "
             f"resource.project_id == '{project_id}' && "
             f"(metadata.system_labels.top_level_controller_name == '{pod_name}' && "
             f"metadata.system_labels.top_level_controller_type == '{pod_type}') && "
             f"(resource.cluster_name == '{cluster_name}' && resource.location == '{cluster_zone}' && "
             f"resource.namespace_name == '{pod_namespace}')")
    if resource_type == "memory":
        query += " && (metric.memory_type == 'non-evictable')"
    query += " | group_by 1m, [value_request_utilization_mean: mean(value.request_utilization)] | every 1m | group_by [metadata.system_labels.top_level_controller_name], [value_request_utilization_mean_aggregate: aggregate(value_request_utilization_mean)] | within(80m)"
    return query

async def fetch_forecast_threshold(resource_request_utilization):
    """
    Fetches the forecasted threshold for resource utilization.

    Args:
    resource_request_utilization (list): List of resource utilization data points.

    Returns:
    float: The forecasted threshold value.
    """
    endpoint = "https://europe-west3-netprovis-397212.cloudfunctions.net/forecast-resources"
    headers = get_headers(identity_token)
    payload = json.dumps(resource_request_utilization)
    response, status_code = await make_request(endpoint, method="post", data=payload, headers=headers)
    return response.get('threshold')

async def create_hpa(cluster_endpoint, namespace, pod_name, pod_type, threshold_value, resource_type):
    """
    Creates or updates a Horizontal Pod Autoscaler for a given pod and resource type.

    Args:
    cluster_endpoint (str): The endpoint of the cluster.
    namespace (str): The Kubernetes namespace.
    pod_name (str): The name of the pod.
    pod_type (str): The type of the pod.
    threshold_value (int): The threshold value for scaling.
    resource_type (str): The resource type ('cpu' or 'memory').

    Returns:
    dict: The response from the HPA creation or update.
    """
    endpoint = f"https://{cluster_endpoint}/apis/autoscaling/v2/namespaces/{namespace}/horizontalpodautoscalers"
    hpa_endpoint = f"{endpoint}/adaptive-hpa-for-{pod_name}"
    headers = get_headers(access_token)

    existing_hpa_metrics = await get_existing_hpa_metrics(hpa_endpoint, headers)
    updated_payload = json.dumps(generate_payload(pod_name, pod_type, threshold_value, resource_type, existing_hpa_metrics))

    try:
        response, status_code = await make_request(method="post", url=endpoint, headers=headers, data=updated_payload)
        return response
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 409:  # HPA already exists, update it
            response, status_code = await make_request(method="put", url=hpa_endpoint, headers=headers, data=updated_payload)
            return response
        raise

async def get_existing_hpa_metrics(hpa_endpoint, headers):
    """
    Retrieves existing HPA metrics from a given HPA endpoint.

    Args:
    hpa_endpoint (str): The endpoint of the HPA.
    headers (dict): Headers for the HTTP request.

    Returns:
    list: A list of existing HPA metrics.
    """
    try:
        res, status_code = await make_request(hpa_endpoint, headers=headers)
        return res.get('spec', {}).get('metrics', [])
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return []
        raise


def metric_exists(metrics_list, res_type):
    """
    Determines if a metric for a specified resource type exists in a list of metrics.

    Args:
    metrics_list (list of dict): A list of metrics, where each metric is represented as a dictionary.
    res_type (str): The resource type to check (e.g., 'cpu', 'memory').

    Returns:
    bool: True if a metric for the specified resource type exists, False otherwise.
    """
    return any(metric['type'] == 'Resource' and metric['resource']['name'] == res_type for metric in metrics_list)



def generate_payload(pod_name, pod_type, threshold_value, resource_type, existing_hpa_metrics):
    """
    Generates the payload for creating or updating an HPA.

    Args:
    pod_name (str): The name of the pod.
    pod_type (str): The type of the pod.
    threshold_value (int): The threshold value for scaling.
    resource_type (str): The resource type ('cpu' or 'memory').
    existing_hpa_metrics (list): The existing HPA metrics.

    Returns:
    dict: The generated payload for the HPA.
    """
    payload = copy.deepcopy(HPA_TEMPLATE)
    payload['metadata']['name'] = f"adaptive-hpa-for-{pod_name}"
    payload['spec']['scaleTargetRef'].update({
        'kind': pod_type,
        'name': pod_name
    })

    # Update existing metrics or append new one
    existing = any(metric['type'] == 'Resource' and metric['resource']['name'] == resource_type for metric in existing_hpa_metrics)
    if existing:
        # Update the existing metric's threshold
        for metric in existing_hpa_metrics:
            if metric['type'] == 'Resource' and metric['resource']['name'] == resource_type:
                metric['resource']['target']['averageUtilization'] = int(threshold_value)
    else:
        # Append a new metric if not found
        new_metric = {
            "type": "Resource",
            "resource": {
                "name": resource_type,
                "target": {
                    "type": "Utilization",
                    "averageUtilization": int(threshold_value)
                }
            }
        }
        existing_hpa_metrics.append(new_metric)

    payload['spec']['metrics'] = existing_hpa_metrics
    return payload


async def make_request(url, method="get", data=None, headers=None):
    """
    Makes an asynchronous HTTP request.

    Args:
    url (str): The URL for the request.
    method (str): The HTTP method (e.g., 'get', 'post').
    data (dict, optional): The payload for the request.
    headers (dict, optional): The headers for the request.

    Returns:
    tuple: A tuple containing the JSON response and the status code.
    """
    async with httpx.AsyncClient(verify=False, timeout=180.0) as client:
        request_kwargs = {"headers": headers}
        if method == "get":
            request_kwargs["params"] = data
        elif method in ["post", "put", "patch"]:
            request_kwargs["data"] = data
        response = await getattr(client, method)(url, **request_kwargs)
        response.raise_for_status()
        return response.json(), response.status_code


def create_hpa_payload(pod_name, pod_type, resource_type, threshold_value):
    """
    Creates a payload for a Horizontal Pod Autoscaler (HPA) based on specified parameters.

    Args:
    pod_name (str): The name of the pod for which the HPA is being created.
    pod_type (str): The type of the pod (e.g., 'Deployment', 'ReplicaSet').
    resource_type (str): The type of resource to scale (e.g., 'cpu', 'memory').
    threshold_value (int): The threshold value for resource utilization to trigger scaling.

    Returns:
    dict: A dictionary representing the HPA payload.
    """
    hpa = copy.deepcopy(HPA_TEMPLATE)
    hpa['metadata']['name'] = f"adaptive-hpa-for-{pod_name}"
    hpa['spec']['scaleTargetRef']['kind'] = pod_type
    hpa['spec']['scaleTargetRef']['name'] = pod_name
    hpa['spec']['metrics'].append({
        "type": "Resource",
        "resource": {
            "name": resource_type,
            "target": {
                "type": "Utilization",
                "averageUtilization": int(threshold_value)
            }
        }
    })
    return hpa


def get_token(token_name):
    """
    Helper function to retrieve an auth token using gcloud command.

    Args:
    token_name (str): The name of the token type (e.g., 'access_token', 'identity_token')

    Returns:
    str: The token value with whitespaces removed.

    Raises:
    ValueError: If token name is invalid.
    """
    token_command_map = {
        "access_token": ["gcloud", "auth", "print-access-token"],
        "identity_token": ["gcloud", "auth", "print-identity-token"]
    }

    command = token_command_map.get(token_name)

    if not command:
        raise ValueError(f"Invalid token name: {token_name}")

    stdout = run_command(command)
    return stdout.strip()


def refresh_tokens():
    """
    Refreshes the access and identity tokens using gcloud commands.

    Updates the global access_token and identity_token variables.
    """
    global access_token, identity_token
    try:
        access_token = get_token("access_token")
        identity_token = get_token("identity_token")
    except Exception as e:
        print(f"Failed to retrieve tokens: {str(e)}")


def run_command(command):
    """
    Runs a shell command and returns its output.

    Args:
    command (list): The command to run.

    Returns:
    str: The output of the command.
    """
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            text=True,
            shell=shell
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        return f"Error running command: {e}"


def update_tasks(task):
    """
    Updates the list of tasks performed by the application.

    Args:
    task (str): The task information in JSON format.

    Ensures the list does not exceed 100 entries.
    """
    global tasks
    if len(tasks) > 100:
        tasks.pop(0)
    tasks.append(task)

def create_cnf_namespace():
    """
    Creates a Kubernetes namespace for CNFs.

    Runs a kubectl command to apply the namespace configuration.
    """
    run_command(["kubectl", "apply", "-f", "./NetProVisFastAPI/configuration/namespace.yaml"])


def build_network_stats_query(project_id, cluster, metric):
    """
    Builds a query to fetch network statistics.

    Args:
    project_id (str): The Google Cloud project ID.
    cluster (str): The name of the cluster.
    metric (str): The network metric to query (e.g., 'egress_bytes_count').

    Returns:
    str: The constructed query for network statistics.
    """
    query = (f"fetch networking.googleapis.com/node_flow/{metric} | "
             f"filter (resource.project_id == '{project_id}') && (resource.cluster_name == '{cluster}') | "
             f"within(10m) | group_by [], [sum({metric})]")
    return query

async def get_network_stats_ingress_egress(project_id, cluster, metric, index):
    """
    Retrieves network ingress or egress statistics.

    Args:
    project_id (str): The Google Cloud project ID.
    cluster (str): The name of the cluster.
    metric (str): The network metric to query.
    index (int): The index of the time series data to fetch.

    Returns:
    int: The network statistics value.
    """
    query = build_network_stats_query(project_id, cluster, metric)
    data = await make_request_for_time_series(project_id, query)
    time_series_data = data.get('timeSeriesData', [])
    first_point_data = time_series_data[0].get('pointData', []) if time_series_data else []
    first_values = first_point_data[index].get('values', []) if first_point_data else []
    value_key = 'doubleValue' if metric == 'rtt' else 'int64Value'
    result = first_values[0].get(value_key, 0) if first_values else 0
    return int(result)

def create_detailed_network_stats(metric, value, index):
    """
    Creates a dictionary with detailed network statistics.

    Args:
    metric (str): The network metric name.
    value (int): The value of the network metric.
    index (int): The time offset for the metric.

    Returns:
    dict: A dictionary containing detailed network statistics.
    """
    date = datetime.now() - timedelta(minutes=index * 10)  # Adjusting time offset
    unit = "ms" if metric == 'rtt' else "B"
    return {
        "Name": f"networking.googleapis.com/node_flow/{metric}",
        "Value": value,
        "Unit": unit,
        "LastUpdated": date.strftime("%B %d, %Y, %I:%M:%S %p")
    }

async def deploy_with_helm(helm_repo_url, chart_name, image, cnf_name, params):
    """
    Deploys a CNF using Helm.

    Args:
    helm_repo_url (str): The URL of the Helm repository.
    chart_name (str): The name of the Helm chart.
    image (str): The name of the image to use.
    cnf_name (str): The name of the CNF to deploy.
    params (dict): Parameters for the CNF deployment.

    Returns:
    str: The result of the Helm deployment command.
    """
    # Add Helm repository and update
    run_command(["helm", "repo", "add", image, helm_repo_url])
    run_command(["helm", "repo", "update"])

    # Check if the release already exists
    existing_release = run_command(["helm", "list", "-q", "-n", "cnf-namespace", "--filter", f"^{cnf_name}$"])
    if existing_release.strip():
        # Delete existing release if present
        run_command(["helm", "delete", cnf_name, "-n", "cnf-namespace"])

    # Prepare and execute Helm install command
    helm_install_cmd = [
        "helm", "install", cnf_name, chart_name, "--set",
        f"resources.limits.cpu={params['cpuLimit']},resources.limits.memory={params['memoryLimit']},"
        f"resources.requests.cpu={params['cpuRequested']},resources.requests.memory={params['memoryRequested']}",
        "--namespace", "cnf-namespace"
    ]

    # Additional settings for specific CNFs
    if cnf_name == "vpn":
        helm_install_cmd.extend(["--set", "persistence.enabled=false"])

    # Deploy the Helm chart
    return run_command(helm_install_cmd)

async def request_deploy_cnf(cnf_name, params):
    """
    Handles the request to deploy a CNF.

    Args:
    cnf_name (str): The name of the CNF to deploy.
    params (dict): Parameters for the CNF deployment.

    Returns:
    str: The result of the CNF deployment process.

    Raises:
    HTTPException: If deployment fails or if invalid CNF name is provided.
    """
    # Mapping of CNF names to their respective Helm chart URLs and chart names
    helm_chart_urls = {
        'gateway': ("https://charts.konghq.com", "kong/kong", "kong"),
        'firewall': ("https://ergon.github.io/airlock-helm-charts/", "airlock/microgateway", "airlock"),
        'load-balancer': ("https://charts.bitnami.com/bitnami", "nginx/nginx", "nginx"),
        'ids': ("https://falcosecurity.github.io/charts", "falco/falco", "falco"),  # Falco as IDS
        'vpn': ("http://helm.devtron.ai/", "devtron/openvpn ", "devtron"),  # OpenVPN
        'dns-server': ("https://coredns.github.io/helm", "coredns/coredns", "coredns"),  # CoreDNS
        'message-broker': ("https://charts.bitnami.com/bitnami", "rabbitmq/rabbitmq", "rabbitmq"),  # RabbitMQ
        'network-monitoring': (
            "https://prometheus-community.github.io/helm-charts", "prometheus-community/prometheus",
            "prometheus-community")
    }

    if cnf_name not in helm_chart_urls:
        raise HTTPException(status_code=400, detail=f"Invalid CNF name: {cnf_name}")

    chart_url, chart, release_name = helm_chart_urls[cnf_name]
    try:
        res = await deploy_with_helm(chart_url, chart, release_name, cnf_name, params)
        if res.startswith("Error"):
            raise HTTPException(status_code=500, detail=res)
        update_tasks(json.dumps({
            "task": f"{cnf_name} deployed with parameters {params}.",
            "date": get_current_date()
        }))
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
