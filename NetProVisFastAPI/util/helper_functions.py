from datetime import datetime, timedelta
import copy
import httpx
import json
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
tasks = []
resources = {}
past_thresholds = {}


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
            timestamp_str = timestamp.replace('Z', '+00:00')
            timestamp_dt = datetime.fromisoformat(timestamp_str).strftime("%B %d, %Y, %I:%M:%S %p")
            result.append({
                "timestamp": timestamp_dt,
                f"{resource_type}_usage": res_usage
            })
    print(result)

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
    if cluster:
        cluster_endpoint = cluster['privateClusterConfig']['publicEndpoint']
        namespace_endpoint = f"https://{cluster_endpoint}/api/v1/namespaces"

        headers = get_headers(access_token)

        all_namespaces = await get_all_namespaces(namespace_endpoint, headers)

        deleted_hpas_count = 0

        for ns in all_namespaces:
            namespace_name = ns['metadata']['name']
            deleted_hpas_count += await delete_hpas_in_namespace(namespace_name, cluster_endpoint, headers)

        return {"status": f"Deleted {deleted_hpas_count} HPAs across all namespaces."}
    else:
        return {"status": f"Cluster is not available."}


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


async def get_resource_request_utilization(project_id, cluster_name, cluster_zone, pod, resource_type):
    query = build_request_utilization_query(project_id, cluster_name, cluster_zone, pod, resource_type)
    resource_request_utilization = await get_resource_time_series_data(project_id, query, resource_type)
    return resource_request_utilization


async def adaptive_hpa(pod, resource_type, pod_project, pod_cluster):
    try:
        project_id, cluster_name, cluster_zone = pod_project['projectId'], pod_cluster['name'], pod_cluster['zone']
        pod_name = pod['metadata']['name']
        if not project_id or not cluster_name:
            update_tasks(json.dumps({
                "task": f"{pod_name}: An error occurred while Adaptive HPA for {resource_type.upper()} was activating.",
                "date": get_current_date()
            }))
            raise HTTPException(status_code=500, detail="Could not find project id or cluster name")

        resource_request_utilization = await get_resource_request_utilization(project_id, cluster_name, cluster_zone, pod,
                                                                              resource_type)

        threshold_value = await fetch_forecast_threshold(resource_request_utilization)

        cluster_endpoint = pod_cluster['privateClusterConfig']['publicEndpoint']
        res = await create_hpa(cluster_endpoint,
                               "cnf-namespace", pod['metadata']['name'], pod['kind'], threshold_value, resource_type)
        # Add threshold setting log to the tasks
        update_tasks(json.dumps({
            "task": f"{pod_name}: HPA threshold for {resource_type.upper()} was set to {threshold_value}%",
            "date": get_current_date()
        }))

        past_thresholds.setdefault(pod_name, {}).setdefault(resource_type, {}).setdefault("thresholdValues", []).append(
            {get_current_date(): threshold_value})
        past_thresholds.setdefault(pod_name, {}).setdefault(resource_type, {}).setdefault("values", []).append(
            {get_current_date(): resource_request_utilization[0][resource_type + "_usage"]})
        # Limit the size of past_thresholds dict
        if len(past_thresholds[pod_name][resource_type]["thresholdValues"]) > 100:
            past_thresholds[pod_name][resource_type]["thresholdValues"].pop(0)
            past_thresholds[pod_name][resource_type]["values"].pop(0)

        print("Finished setting HPA threshold! Success!")
        return res
    except Exception as e:
        job_id = f"adaptive_hpa_job_for_{pod['metadata']['name']}_{resource_type}"
        scheduler.remove_job(job_id)
        update_tasks(json.dumps({
            "task": f"{pod['metadata']['name']}: An error occurred while trying to run. Adaptive HPA for {resource_type.upper()} was deactivated.",
            "date": get_current_date()
        }))
        print(f"Error in job {job_id}: {e}. Job has been removed.")
        raise HTTPException(status_code=500, detail="An error occurred while trying to run.")


def build_request_utilization_query(project_id, cluster_name, cluster_zone, pod, resource_type):
    pod_name, pod_type, pod_namespace = pod['metadata']['name'], pod['kind'], pod['metadata']['namespace']

    # Create the base query
    query = (f"fetch k8s_container | metric 'kubernetes.io/container/{resource_type}/request_utilization' | filter "
             f"resource.project_id == '{project_id}' && "
             f"(metadata.system_labels.top_level_controller_name == '{pod_name}' && "
             f"metadata.system_labels.top_level_controller_type == '{pod_type}') && "
             f"(resource.cluster_name == '{cluster_name}' && resource.location == '{cluster_zone}' && "
             f"resource.namespace_name == '{pod_namespace}')")

    # Conditionally add the memory_type filter for memory resources
    if resource_type == "memory":
        query += " && (metric.memory_type == 'non-evictable')"

    # Add the rest of the query
    query += f" | group_by 1m, [value_request_utilization_mean: mean(value.request_utilization)] | every 1m | " \
             f"group_by [metadata.system_labels.top_level_controller_name], " \
             f"[value_request_utilization_mean_aggregate: aggregate(value_request_utilization_mean)] | within(2h)"

    print(query)
    return query


async def fetch_forecast_threshold(resource_request_utilization):
    endpoint = "https://europe-west3-netprovis-397212.cloudfunctions.net/forecast-resources"
    headers = get_headers(identity_token)
    payload = json.dumps(resource_request_utilization)
    print("Payload: ", resource_request_utilization)
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
    print("generate_payload: ", existing_hpa_metrics)
    existing = False
    # Check if a metric with the specified resource_type already exists
    for metric in existing_hpa_metrics:
        if metric.get("type", "") == "Resource" and metric.get("resource", {}).get("name", "") == resource_type:
            # Update the existing metric's averageUtilization
            metric["resource"]["target"]["averageUtilization"] = int(threshold_value)
            payload['spec']['metrics'] = existing_hpa_metrics
            existing = True

    if not (existing):
        payload['spec']['metrics'] = existing_hpa_metrics
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
            shell=shell
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        error_string = f"Error running command: {e}"
        print(error_string)
        return error_string


def update_tasks(task):
    global tasks
    if len(tasks) > 100:
        tasks = tasks[1:]
        tasks.append(task)
    else:
        tasks.append(task)


def create_cnf_namespace():
    run_command(["kubectl", "apply", "-f", "./NetProVisFastAPI/configuration/namespace.yaml"])


def build_network_stats_query(project_id, cluster, metric):
    result = (f"fetch"
              f" networking.googleapis.com/node_flow/{metric}|"
              f" filter (resource.project_id == '{project_id}') && (resource.cluster_name == '{cluster}') |"
              f" within(10m) |"
              f" group_by [], [sum({metric})]")
    return result


async def get_network_stats_ingress_egress(project_id, cluster, metric, index):
    query = build_network_stats_query(project_id, cluster, metric)
    data = await make_request_for_time_series(project_id, query)
    time_series_data = data['timeSeriesData']
    first_point_data = time_series_data[0]['pointData']
    first_values = first_point_data[index]['values']
    if (metric == 'rtt'):
        result = first_values[0]['doubleValue']
    else:
        result = first_values[0]['int64Value']
    return int(result)


def create_detailed_network_stats(metric, value, index):
    date = datetime.now() - timedelta(minutes=index + 1)
    if metric == 'rtt':
        return {"Name": "networking.googleapis.com/node_flow/" + metric, "Value": value, "Unit": "ms",
                "LastUpdated": date.strftime("%B %d, %Y, %I:%M:%S %p"), }
    return {"Name": "networking.googleapis.com/node_flow/" + metric, "Value": value, "Unit": "B",
            "LastUpdated": date.strftime("%B %d, %Y, %I:%M:%S %p"), }


async def deploy_with_helm(helm_repo_url, chart_name, image, cnf_name, params):
    # Add helm repo and update
    run_command(["helm", "repo", "add", image, helm_repo_url])
    run_command(["helm", "repo", "update"])

    # Check if release already exists
    existing_release = run_command(["helm", "list", "-q", "-n", "cnf-namespace", "--filter", f"^{cnf_name}$"])
    if existing_release.strip():  # Assuming run_command returns output as a string and strips newline characters
        run_command(["helm", "delete", cnf_name, "-n", "cnf-namespace"])

    # Prepare helm install command
    helm_install_cmd = ["helm", "install", cnf_name, chart_name, "--set",
                        f"resources.limits.cpu={params['cpuLimit']},"
                        f"resources.limits.memory={params['memoryLimit']},"
                        f"resources.requests.cpu={params['cpuRequested']},"
                        f"resources.requests.memory={params['memoryRequested']}",
                        "--namespace", "cnf-namespace"]

    # Disable Persistent Volume Claim for VPN
    if cnf_name == "vpn":
        helm_install_cmd.append("--set")
        helm_install_cmd.append("persistence.enabled=false")

    # Deploy helm chart
    res = run_command(helm_install_cmd)
    return res




async def request_deploy_cnf(cnf_name, params):
    if not (cluster and project):
        raise HTTPException(status_code=500, detail="Could not deploy!")

    helm_chart_urls = {
        'gateway': ("https://charts.konghq.com", "kong/kong", "kong"),
        'firewall': ("https://ergon.github.io/airlock-helm-charts/", "airlock/microgateway", "airlock"),
        'load-balancer': ("https://charts.bitnami.com/bitnami", "nginx/nginx", "nginx"),
        'ids': ("https://falcosecurity.github.io/charts", "falco/falco", "falco"),  # Falco as IDS
        'vpn': ("http://helm.devtron.ai/", "devtron/openvpn ", "devtron"),  # OpenVPN
        'dns-server': ("https://coredns.github.io/helm", "coredns/coredns", "coredns"),  # CoreDNS
        'message-broker': ("https://charts.bitnami.com/bitnami", "rabbitmq/rabbitmq", "rabbitmq"),  # RabbitMQ
        'network-monitoring': (
        "https://prometheus-community.github.io/helm-charts", "prometheus-community/prometheus", "prometheus-community")
    }

    if cnf_name in helm_chart_urls:
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

    else:
        raise HTTPException(status_code=400, detail=f"Invalid CNF name: {cnf_name}")
