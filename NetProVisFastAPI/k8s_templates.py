HPA_TEMPLATE = {
    "apiVersion": "autoscaling/v2",
    "kind": "HorizontalPodAutoscaler",
    "metadata": {
        "name": ""
    },
    "spec": {
        "scaleTargetRef": {
            "apiVersion": "apps/v1",
            "kind": "",
            "name": ""
        },
        "minReplicas": 1,
        "maxReplicas": 6,
        "metrics": []
    }
}


def get_cnf_template(cnf_name):
    """Return Kubernetes template for given CNF name."""

    # Base CNF template
    cnf_template = {
        "apiVersion": "apps/v1",
        "kind": "Deployment",
        "metadata": {
            "name": ""
        },
        "spec": {
            "replicas": 1,
            "template": {
                "metadata": {
                    "labels": {
                        "app": ""
                    }
                },
                "spec": {
                    "containers": [
                        {
                            "name": "",
                            "image": "",
                            "ports": [
                                {
                                    "containerPort": 80
                                }
                            ]
                        }
                    ]
                }
            }
        }
    }

    # Customization for different CNFs
    if cnf_name == "Firewall":
        cnf_template["metadata"]["name"] = "firewall-cnf"
        cnf_template["spec"]["template"]["metadata"]["labels"]["app"] = "firewall-cnf"
        cnf_template["spec"]["template"]["spec"]["containers"][0]["name"] = "firewall-container"
        cnf_template["spec"]["template"]["spec"]["containers"][0]["image"] = "firewall-image:latest"

    elif cnf_name == "IDS":
        cnf_template["metadata"]["name"] = "ids-cnf"
        cnf_template["spec"]["template"]["metadata"]["labels"]["app"] = "ids-cnf"
        cnf_template["spec"]["template"]["spec"]["containers"][0]["name"] = "ids-container"
        cnf_template["spec"]["template"]["spec"]["containers"][0]["image"] = "ids-image:latest"

    elif cnf_name == "LoadBalancer":
        cnf_template["metadata"]["name"] = "loadbalancer-cnf"
        cnf_template["spec"]["template"]["metadata"]["labels"]["app"] = "loadbalancer-cnf"
        cnf_template["spec"]["template"]["spec"]["containers"][0]["name"] = "loadbalancer-container"
        cnf_template["spec"]["template"]["spec"]["containers"][0]["image"] = "loadbalancer-image:latest"

    # Add more CNFs in a similar fashion...

    return cnf_template


# Example
if __name__ == "__main__":
    firewall_template = get_cnf_template("Firewall")
    print(firewall_template)
    import subprocess

    filename = "deployments/gateway-deployment.yml"

    command = f'if exist "{filename}" (echo exists) else (echo not exists)'
    result = subprocess.check_output(command, shell=True).decode("utf-8").strip()

    if result == "exists":
        print("File exists!")
    else:
        print("File does not exist.")
