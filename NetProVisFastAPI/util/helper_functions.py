from datetime import timedelta, datetime
import copy
import httpx
import json
import pytz
import subprocess
from fastapi import HTTPException
from NetProVisFastAPI.k8s_templates import HPA_TEMPLATE
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
access_token = None
identity_token = None
shell = True
project = {}
cluster = {}
pods = []
tasks = []


def get_date_range(min_diff, given_date):
    given_datetime = given_date.astimezone(pytz.timezone('GMT'))
    # Calculate earlier datetime using timedelta
    earlier_datetime = given_datetime - timedelta(minutes=min_diff)
    # Format the date and time as 'YYYY/MM/DD-HH:MM:SS'
    formatted_earlier_datetime = earlier_datetime.strftime('%Y/%m/%d-%H:%M:%S')
    formatted_datetime = given_datetime.strftime('%Y/%m/%d-%H:%M:%S')
    return formatted_earlier_datetime, formatted_datetime


async def make_request_for_time_series(project_id, query):
    endpoint = f"https://monitoring.googleapis.com/v3/projects/{project_id}/timeSeries:query"
    headers = {"Authorization": f"Bearer {access_token}"}
    payload = {"query": query}

    # Make the API request
    response, status_code = await make_request(endpoint, method="post", data=payload, headers=headers)
    return response


async def get_cluster_resource_usage(project_id, query):
    data = await make_request_for_time_series(project_id, query)
    print(data)
    # Extract the 'doubleValue' values from the 'timeSeriesData' for each label value
    res_usage_values = []
    for time_series in data.get("timeSeriesData", []):
        res_usage_series = []
        for point_data in time_series.get("pointData", []):
            res_usage = point_data.get("values", [{}])[0].get("doubleValue", 0.0)
            res_usage_series.append(res_usage)
        res_usage_values.append(sum(res_usage_series) / len(res_usage_series))
    # Calculate the average CPU usage for each label value
    average_res_usage = sum(res_usage_values) / len(res_usage_values)

    print("Average Resource Usage for Each Label Value:")
    print("{}: {:.2%}".format(query.split(' ')[1], average_res_usage))

    return average_res_usage * 100


async def get_resource_time_series_data(project_id, query, resource_type):
    # Get the list of clusters from the response
    data = await make_request_for_time_series(project_id, query)
    result = []
    for series in data["timeSeriesData"]:
        for point in series["pointData"]:
            timestamp = point["timeInterval"]["endTime"]
            res_usage = point["values"][0]["doubleValue"] * 100  # Convert to percentage
            result.append({
                "timestamp": timestamp,
                f"{resource_type}_usage": res_usage
            })

    return result


def get_hpa_endpoint(namespace, pod_name):
    cluster_endpoint = cluster['privateClusterConfig']['publicEndpoint']
    return f"https://{cluster_endpoint}/apis/autoscaling/v2/namespaces/" \
           f"{namespace}/horizontalpodautoscalers/adaptive-hpa-for-{pod_name}"


async def get_existing_hpa(hpa_endpoint, headers):
    existing_hpa, status_code = await make_request(hpa_endpoint, method="get", headers=headers)
    return existing_hpa


def get_job_id(pod_name, res_type):
    return f"adaptive_hpa_job_for_{pod_name}_{res_type}"


def get_headers(token):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    return headers


def remove_scheduler_job(job_id):
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        return True
    return False


async def handle_all_resources_stop(hpa_endpoint, pod_name, headers):
    cpu_removed = remove_scheduler_job(get_job_id(pod_name, "cpu"))
    mem_removed = remove_scheduler_job(get_job_id(pod_name, "memory"))

    if cpu_removed and mem_removed:
        await make_request(hpa_endpoint, method="delete", headers=headers)
        return {"status": f"Job for pod {pod_name} for all resources stopped"}
    else:
        return {"status": f"Job for pod {pod_name} for all resources not found"}


async def handle_specific_resource_stop(hpa_endpoint, pod_name, resource_type, headers):
    if remove_scheduler_job(get_job_id(pod_name, resource_type)):
        await make_request(hpa_endpoint, method="delete", headers=headers)
        return {"status": f"Job for pod {pod_name} for {resource_type} stopped"}
    else:
        return {"status": f"Job for pod {pod_name} for {resource_type} not found"}


async def update_hpa_metrics(existing_hpa, resource_type, hpa_endpoint, headers):
    existing_hpa['spec']['metrics'] = [metric for metric in existing_hpa['spec']['metrics'] if
                                       metric['resource']['name'] != resource_type]
    await make_request(hpa_endpoint, method="put", data=existing_hpa, headers=headers)


async def delete_all_hpas():
    cluster_endpoint = cluster['privateClusterConfig']['publicEndpoint']
    namespace_endpoint = f"https://{cluster_endpoint}/api/v1/namespaces"

    headers = get_headers(access_token)

    all_namespaces = await get_all_namespaces(namespace_endpoint, headers)

    deleted_hpas_count = 0

    for ns in all_namespaces:
        namespace_name = ns['metadata']['name']
        deleted_hpas_count += await delete_hpas_in_namespace(namespace_name, cluster_endpoint, headers)

    return {"status": f"Deleted {deleted_hpas_count} HPAs across all namespaces."}


async def get_all_namespaces(endpoint, headers):
    response, status_code = await make_request(endpoint, headers=headers)
    return response.get('items', [])


async def delete_hpas_in_namespace(namespace_name, cluster_endpoint, headers):
    hpa_endpoint = f"https://{cluster_endpoint}/apis/autoscaling/v2/namespaces" \
                   f"/{namespace_name}/horizontalpodautoscalers"
    all_hpas = await get_all_hpas_in_namespace(hpa_endpoint, headers)

    deleted_count = 0
    for hpa in all_hpas:
        hpa_name = hpa['metadata']['name']
        await delete_individual_hpa(hpa_endpoint, hpa_name, headers)
        deleted_count += 1

        remove_scheduler_job(get_job_id(hpa_name, "cpu"))
        remove_scheduler_job(get_job_id(hpa_name, "memory"))

    return deleted_count


async def get_all_hpas_in_namespace(hpa_endpoint, headers):
    response, status_code = await make_request(hpa_endpoint, headers=headers)
    return response.get('items', [])


async def delete_individual_hpa(hpa_endpoint, hpa_name, headers):
    delete_endpoint = f"{hpa_endpoint}/{hpa_name}"
    await make_request(delete_endpoint, method="delete", headers=headers)

def get_current_date():
    current_datetime = datetime.now()
    formatted_datetime = current_datetime.strftime("%B %d, %Y, %I:%M:%S %p")
    return formatted_datetime


async def adaptive_hpa(pod, resource_type, pod_project, pod_cluster):
    project_id, cluster_name, cluster_zone = pod_project['projectId'], pod_cluster['name'], pod_cluster['zone']

    if not project_id or not cluster_name:
        raise HTTPException(status_code=500, detail="Could not find project id or cluster name")

    query = build_limit_utilization_query(project_id, cluster_name, cluster_zone, pod, resource_type)
    resource_limit_utilization = await get_resource_time_series_data(project_id, query, resource_type)

    threshold_value = await fetch_forecast_threshold(resource_limit_utilization)

    cluster_endpoint = pod_cluster['privateClusterConfig']['publicEndpoint']
    res = await create_hpa(cluster_endpoint,
                           "default", pod['metadata']['name'], pod['kind'], threshold_value, resource_type)


    update_tasks(json.dumps({
        "task" : f"{pod['metadata']['name']}: HPA threshold for {resource_type.upper()} was set to {threshold_value}%",
        "date" : get_current_date()
    }))
    print("Finished setting HPA threshold! Success!")
    return res


def build_limit_utilization_query(project_id, cluster_name, cluster_zone, pod, resource_type):
    pod_name, pod_type, pod_namespace = pod['metadata']['name'], pod['kind'], pod['metadata']['namespace']

    # Create the base query
    query = (f"fetch k8s_container | metric 'kubernetes.io/container/{resource_type}/limit_utilization' | filter "
             f"resource.project_id == '{project_id}' && "
             f"(metadata.system_labels.top_level_controller_name == '{pod_name}' && "
             f"metadata.system_labels.top_level_controller_type == '{pod_type}') && "
             f"(resource.cluster_name == '{cluster_name}' && resource.location == '{cluster_zone}' && "
             f"resource.namespace_name == '{pod_namespace}')")

    # Conditionally add the memory_type filter for memory resources
    if resource_type == "memory":
        query += " && (metric.memory_type == 'non-evictable')"

    # Add the rest of the query
    query += f" | group_by 1m, [value_limit_utilization_mean: mean(value.limit_utilization)] | every 1m | " \
             f"group_by [metadata.system_labels.top_level_controller_name], " \
             f"[value_limit_utilization_mean_percentile: percentile(value_limit_utilization_mean, 50)] | within(2h)"

    print(query)
    return query



async def fetch_forecast_threshold(resource_limit_utilization):
    endpoint = "https://europe-west3-netprovis-397212.cloudfunctions.net/forecast-resources"
    headers = get_headers(identity_token)
    payload = json.dumps(resource_limit_utilization)
    print("Payload: ", resource_limit_utilization)
    response, status_code = await make_request(endpoint, method="post", data=payload, headers=headers)

    return response.get('threshold')


async def create_hpa(cluster_endpoint, namespace, pod_name, pod_type, threshold_value, resource_type):
    global access_token

    endpoint = f"https://{cluster_endpoint}/apis/autoscaling/v2/namespaces/{namespace}/horizontalpodautoscalers"
    hpa_endpoint = f"{endpoint}/adaptive-hpa-for-{pod_name}"
    headers = get_headers(access_token)

    existing_hpa_metrics = await get_existing_hpa_metrics(hpa_endpoint, headers)
    updated_payload = json.dumps(generate_payload(pod_name,
                                                  pod_type, threshold_value, resource_type, existing_hpa_metrics))

    try:
        response, status_code = await make_request(method="post", url=endpoint, headers=headers, data=updated_payload)
        return response
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 409:  # HPA already exists, update it
            print(updated_payload)
            print("Threshold set: ", threshold_value, "%")
            response, status_code = await make_request(method="put",
                                                       url=hpa_endpoint, headers=headers, data=updated_payload)
            return response
        raise


async def get_existing_hpa_metrics(hpa_endpoint, headers):
    try:
        res, status_code = await make_request(hpa_endpoint, headers=headers)
        metrics = res.get('spec', {}).get('metrics', [])
        return metrics
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            return []
        raise  # if it's another status code error, re-raise the exception


def metric_exists(metrics_list, res_type):
    return any(metric['type'] == 'Resource' and metric['resource']['name'] == res_type for metric in metrics_list)


def generate_payload(pod_name, pod_type, threshold_value, resource_type, existing_hpa_metrics):
    payload = copy.deepcopy(HPA_TEMPLATE)
    payload['metadata']['name'] = f"adaptive-hpa-for-{pod_name}"
    payload['spec']['scaleTargetRef'].update({
        'kind': pod_type,
        'name': pod_name
    })

    # Check if a metric with the specified resource_type already exists
    for metric in existing_hpa_metrics:
        if metric.get("type", "") == "Resource" and metric.get("resource", {}).get("name", "") == resource_type:
            # Update the existing metric's averageUtilization
            metric["resource"]["target"]["averageUtilization"] = int(threshold_value)
            payload['spec']['metrics'] = existing_hpa_metrics
            break
    else:
        # If the metric doesn't exist, create a new one
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
        payload['spec']['metrics'].append(new_metric)

    return payload


async def make_request(url, method="get", data=None, headers=None):
    async with httpx.AsyncClient(verify=False, timeout=180.0) as client:
        request_kwargs = {
            "headers": headers
        }

        if method == "get":
            request_kwargs["params"] = data
        elif method in ["post", "put", "patch"]:
            request_kwargs["data"] = data

        resp = await getattr(client, method)(url, **request_kwargs)

    resp.raise_for_status()
    return resp.json(), resp.status_code


def create_hpa_payload(pod_name, pod_type, resource_type, threshold_value):
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
    Helper function to retrieve a specific token using gcloud command.
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
    global access_token, identity_token

    try:
        access_token = get_token("access_token")
        identity_token = get_token("identity_token")
        print(f"Access Token: {access_token}")
        print(f"Identity Token: {identity_token}")
    except Exception as e:
        print(f"Failed to retrieve tokens: {str(e)}")


def run_command(command):
    try:
        result = subprocess.run(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True,
            text=True,
            shell=False
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        error_string = f"Error running command: {e}"
        print(error_string)
        return error_string


async def deploy_with_helm(helm_repo_url, chart_name, image, cnf_name, params):
    run_command(["helm", "repo", "add", image, helm_repo_url])
    run_command(["helm", "repo", "update"])
    res = run_command(["helm", "install", cnf_name, chart_name, "--set",
                       f"resources.limits.cpu={params['cpuLimit']},"
                       f"resources.limits.memory={params['memoryLimit']},"
                       f"resources.requests.cpu={params['cpuRequested']},"
                       f"resources.requests.memory={params['memoryRequested']}"
                       ])

    # Fetch the external IP to access Kong (may need to wait a bit before the external IP is available)
    # print("Waiting for the Kong Gateway to be assigned an external IP. This may take a few minutes...")
    # kong_services = run_command(["kubectl", "get", "service", "-l", "app.kubernetes.io/name=kong", "-o", "jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}'"])

    # return f"Kong Gateway is accessible at: http://{kong_services.strip()}/"
    return res

def update_tasks(task):
    global tasks
    if len(tasks) > 100:
        tasks = tasks[1:]
        tasks.append(task)
    else:
        tasks.append(task)

